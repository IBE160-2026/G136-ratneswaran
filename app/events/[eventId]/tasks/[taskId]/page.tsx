import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getClaims } from "@/lib/supabase/server";
import { eventPath, isDraft, isPast } from "@/modules/events/list";
import { loadEvent } from "../../load-event";
import type { HistoryEntry } from "./status-panel";
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
      .select("blocked, blocked_by, blocked_by_count, blocks_count, overdue_days")
      .eq("id", task.id)
      .single(),
    supabase
      .from("status_history")
      .select("id, to_status, note, note_removed_at, changed_by, created_at")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false }),
    // An author is named only when the caller can read their Team row; the Organizer has none.
    supabase.from("role_members").select("user_id, name").eq("event_id", eventId),
  ]);
  if (
    roleResult.error ||
    leadResult.error ||
    peersResult.error ||
    linksResult.error ||
    stateResult.error ||
    historyResult.error ||
    namesResult.error
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
  const history = historyResult.data.map((row) => ({
    id: row.id,
    toStatus: row.to_status as HistoryEntry["toStatus"],
    note: row.note,
    noteRemoved: row.note_removed_at !== null,
    author: (row.changed_by && names.get(row.changed_by)) || null,
    createdAt: row.created_at,
    canRemove: !readOnly && (event.organizer_id === claims.sub || row.changed_by === claims.sub),
  }));
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
      history={history}
      links={links}
      hasStart={event.starts_at !== null && event.time_zone !== null}
    />
  );
}
