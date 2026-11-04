import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getClaims } from "@/lib/supabase/server";
import { eventPath, isDraft, isPast } from "@/modules/events/list";
import { loadEvent } from "../../load-event";
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
      "id, title, description, deadline, days_before, status, lifecycle, owner_user_id, role_id, parent_task_id, updated_at",
    )
    .eq("id", taskId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw new Error("Could not load the task");
  if (!task) notFound();
  const [roleResult, leadResult, peersResult, linksResult, stateResult] = await Promise.all([
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
      .select("blocked, blocked_by, blocked_by_count, blocks_count")
      .eq("id", task.id)
      .single(),
  ]);
  if (
    roleResult.error ||
    leadResult.error ||
    peersResult.error ||
    linksResult.error ||
    stateResult.error
  ) {
    throw new Error("Could not load the task");
  }
  const t = await getTranslations("events");
  const readOnly = !isDraft(event) && isPast(event, new Date());
  const lead = event.organizer_id === claims.sub || leadResult.data.length > 0;
  const canEdit = lead && !readOnly;
  const dismissed = task.lifecycle === "dismissed";
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
      links={links}
      hasStart={event.starts_at !== null && event.time_zone !== null}
    />
  );
}
