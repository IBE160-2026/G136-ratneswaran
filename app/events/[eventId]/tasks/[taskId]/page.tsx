import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getClaims } from "@/lib/supabase/server";
import { eventPath, isDraft, isPast } from "@/modules/events/list";
import { loadEvent } from "../../load-event";
import type { Candidate } from "./delegate-panel";
import type { HistoryEntry, ProblemEntry } from "./status-panel";
import { daysSince } from "../task-row";
import { TaskDetail } from "./task-detail";

type Props = { params: Promise<{ eventId: string; taskId: string }> };

export async function generateMetadata() {
  const t = await getTranslations("tasks");
  return { title: `${t("surface")} – Arrangly` };
}

// One Task in full (UX-DR13). A Task the caller cannot see is the same no-access page as an unknown one (UX-DR24).
export default async function TaskPage({ params }: Props) {
  const { eventId, taskId } = await params;
  const claims = await getClaims();
  if (!claims) redirect(`/login?next=${eventPath(eventId)}/tasks/${taskId}`);
  const event = await loadEvent(eventId);
  if (!z.uuid().safeParse(taskId).success) notFound();
  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .select(
      "id, title, description, deadline, days_before, status, lifecycle, obsolete, owner_user_id, delegated_at, accepted_at, role_id, parent_task_id, updated_at",
    )
    .eq("id", taskId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw new Error("Could not load the task");
  if (!task) notFound();
  const [
    roleResult,
    leadResult,
    peersResult,
    linksResult,
    stateResult,
    historyResult,
    namesResult,
    logResult,
    problemResult,
  ] = await Promise.all([
    supabase.from("roles").select("key").eq("id", task.role_id).single(),
    supabase
      .from("role_members")
      .select("id")
      .eq("role_id", task.role_id)
      .eq("user_id", claims.sub)
      .eq("is_lead", true)
      .not("joined_at", "is", null),
    // Parents and dependencies stay within one Role, so the Role's other Tasks are every candidate and every link.
    supabase
      .from("tasks")
      .select("id, title, status, deadline, lifecycle, parent_task_id")
      .eq("role_id", task.role_id)
      .neq("id", task.id)
      .order("deadline")
      .order("title"),
    supabase.from("task_dependencies").select("depends_on_id").eq("task_id", task.id),
    supabase
      .from("task_state")
      .select("blocked, blocked_by, blocked_by_count, blocks_count, overdue_days, stale_unaccepted")
      .eq("id", task.id)
      .single(),
    supabase
      .from("status_history")
      .select("id, to_status, note, note_removed_at, changed_by, created_at")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false }),
    // An author is named only when the caller can read their Team row; the Organizer has none.
    supabase
      .from("role_members")
      .select("user_id, name, role_id, joined_at")
      .eq("event_id", eventId),
    supabase
      .from("task_assignment_log")
      .select("from_user")
      .eq("task_id", task.id)
      .eq("kind", "delegated")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("problems")
      .select("id, note, raised_by, raised_at, resolved_at, resolved_by, resolution_note")
      .eq("task_id", task.id),
  ]);
  if (
    roleResult.error ||
    leadResult.error ||
    peersResult.error ||
    linksResult.error ||
    stateResult.error ||
    historyResult.error ||
    namesResult.error ||
    logResult.error ||
    problemResult.error
  ) {
    throw new Error("Could not load the task");
  }
  const t = await getTranslations("events");
  const readOnly = !isDraft(event) && isPast(event, new Date());
  const lead = event.organizer_id === claims.sub || leadResult.data.length > 0;
  const canEdit = lead && !readOnly;
  const dismissed = task.lifecycle === "dismissed";
  const ownsIt = task.owner_user_id === claims.sub;
  // The owner of a delegated Task accepts it first (Story 4.6); the lead and the Organizer are not held back.
  const waitingForAccept =
    ownsIt && !lead && task.delegated_at !== null && task.accepted_at === null;
  const canSetStatus =
    !readOnly &&
    task.lifecycle === "active" &&
    !task.obsolete &&
    (lead || (ownsIt && !waitingForAccept));
  const names = new Map(namesResult.data.map((member) => [member.user_id, member.name]));
  const isOrganizer = event.organizer_id === claims.sub;
  const td = await getTranslations("tasks.detail.delegate");
  const nameOf = (id: string | null | undefined) =>
    id === claims.sub
      ? td("youObject")
      : id && id === event.organizer_id
        ? td("organizer")
        : (id && names.get(id)) || null;
  const canAccept =
    ownsIt &&
    task.accepted_at === null &&
    !readOnly &&
    task.lifecycle === "active" &&
    !task.obsolete &&
    task.status !== "done";
  const canDelegate =
    lead && !readOnly && task.lifecycle === "active" && !task.obsolete && task.status !== "done";
  // The Organizer picks anyone on the Team or themself; the lead only a joined holder of the Role.
  const pool = new Map<string, Candidate>();
  if (isOrganizer) pool.set(claims.sub, { userId: claims.sub, name: null, pending: false });
  for (const member of namesResult.data) {
    if (!isOrganizer && (member.role_id !== task.role_id || member.joined_at === null)) continue;
    const seen = pool.get(member.user_id);
    pool.set(member.user_id, {
      userId: member.user_id,
      name: member.name,
      pending: member.joined_at === null && (seen?.pending ?? true),
    });
  }
  const candidates = [...pool.values()].filter((person) => person.userId !== task.owner_user_id);
  const history = historyResult.data.map((row) => ({
    id: row.id,
    toStatus: row.to_status as HistoryEntry["toStatus"],
    note: row.note,
    noteRemoved: row.note_removed_at !== null,
    author: (row.changed_by && names.get(row.changed_by)) || null,
    createdAt: row.created_at,
    canRemove: !readOnly && (event.organizer_id === claims.sub || row.changed_by === claims.sub),
  }));
  const problems = problemResult.data;
  const open = task.obsolete ? undefined : problems.find((p) => p.resolved_at === null);
  const problemHistory: ProblemEntry[] = problems.flatMap((p) => [
    {
      id: p.id,
      problem: "raised" as const,
      note: p.note,
      author: nameOf(p.raised_by),
      createdAt: p.raised_at,
    },
    ...(p.resolved_at
      ? [
          {
            id: p.id,
            problem: "resolved" as const,
            note: p.resolution_note,
            author: nameOf(p.resolved_by),
            createdAt: p.resolved_at,
          },
        ]
      : []),
  ]);
  const entries = [...history, ...problemHistory].toSorted(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  );
  const canLink = (canEdit || (task.owner_user_id === claims.sub && !readOnly)) && !dismissed;
  const peers = peersResult.data;
  const waitingFor = new Set(linksResult.data.map((link) => link.depends_on_id));
  const parent = peers.find((peer) => peer.id === task.parent_task_id);
  const state = stateResult.data;
  const blocker = peers.find((peer) => peer.id === state.blocked_by);
  const links = {
    parent: parent ? { id: parent.id, title: parent.title } : null,
    subtasks: peers.filter(
      (peer) => peer.parent_task_id === task.id && peer.lifecycle === "active",
    ),
    dependsOn: peers.filter((peer) => waitingFor.has(peer.id)),
    candidates: peers
      .filter((peer) => peer.lifecycle === "active" && !waitingFor.has(peer.id))
      .map((peer) => ({ id: peer.id, title: peer.title })),
    blockedBy:
      state.blocked && blocker && !dismissed && task.status !== "done"
        ? { title: blocker.title, more: state.blocked_by_count ?? 0 }
        : null,
    blocksCount: state.blocks_count ?? 0,
    canLink,
    canPromote: canEdit,
  };
  return (
    <TaskDetail
      eventId={eventId}
      task={task}
      roleName={t(`roles.${roleResult.data.key}.name`)}
      canEdit={canEdit}
      canSetStatus={canSetStatus}
      overdueDays={task.lifecycle === "active" ? state.overdue_days : null}
      history={entries}
      problem={{
        note: open?.note ?? null,
        raisedBy: open ? nameOf(open.raised_by) : null,
        canAct: (lead || ownsIt) && !readOnly && task.lifecycle === "active" && !task.obsolete,
      }}
      canDelegate={canDelegate}
      candidates={candidates}
      ownerName={nameOf(task.owner_user_id)}
      accepted={
        task.owner_user_id &&
        task.lifecycle === "active" &&
        !task.obsolete &&
        task.status !== "done"
          ? task.accepted_at !== null
          : null
      }
      canAccept={canAccept}
      staleDays={
        isOrganizer && state.stale_unaccepted && task.delegated_at
          ? daysSince(task.delegated_at)
          : null
      }
      heldBefore={nameOf(logResult.data[0]?.from_user)}
      links={links}
      hasStart={event.starts_at !== null && event.time_zone !== null}
    />
  );
}
