import { getTranslations } from "next-intl/server";
import { cache } from "react";
import { roleKeys } from "@/modules/events/roles";
import { createClient } from "@/lib/supabase/server";
import type { DashboardTask } from "@/modules/tasks/dashboard";
import { daysSince, type ListedTask } from "./task-row";

/** Active Tasks of the Event as the viewer's session and RLS return them, mapped once for My tasks and the Dashboard. */
export const loadListed = cache(async function loadListed(
  event: { id: string; organizer_id: string },
  viewerId: string,
  notes = false,
) {
  const eventId = event.id;
  const t = await getTranslations();
  const supabase = await createClient();
  const [tasksResult, rolesResult, stateResult, namesResult] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, deadline, status, owner_user_id, delegated_at, lifecycle, role_id, parent_task_id",
      )
      .eq("event_id", eventId)
      .eq("lifecycle", "active"),
    supabase.from("roles").select("id, key, active").eq("event_id", eventId),
    supabase
      .from("task_state")
      .select(
        "id, blocked, blocked_by, blocked_by_count, blocks_count, overdue, overdue_days, accepted, stale_unaccepted, is_pending, obsolete",
      )
      .eq("event_id", eventId),
    supabase
      .from("role_members")
      .select("user_id, name, role_id, is_lead, joined_at")
      .eq("event_id", eventId),
  ]);
  if (tasksResult.error || rolesResult.error || stateResult.error || namesResult.error) {
    throw new Error("Could not load tasks");
  }
  // The latest live note (not removed) among the moves into Waiting on external.
  const externalNotes = new Map<string, string | null>();
  const waitingIds = tasksResult.data
    .filter((x) => x.status === "waiting_external")
    .map((x) => x.id);
  if (notes && waitingIds.length > 0) {
    const history = await supabase
      .from("status_history")
      .select("task_id, note, note_removed_at")
      .in("task_id", waitingIds)
      .eq("to_status", "waiting_external")
      .order("created_at", { ascending: false });
    if (history.error) throw new Error("Could not load tasks");
    for (const h of history.data) {
      if (h.note && !h.note_removed_at && !externalNotes.has(h.task_id)) {
        externalNotes.set(h.task_id, h.note);
      }
    }
  }
  const organizer = event.organizer_id === viewerId;
  const roleName = new Map(rolesResult.data.map((r) => [r.id, t(`events.roles.${r.key}.name`)]));
  const roleActive = new Map(rolesResult.data.map((r) => [r.id, r.active]));
  const names = new Map(namesResult.data.map((member) => [member.user_id, member.name]));
  const leadRoleIds = namesResult.data
    .filter((m) => m.user_id === viewerId && m.is_lead && m.joined_at)
    .map((m) => m.role_id);
  const ownerName = (id: string | null) =>
    id === viewerId
      ? t("tasks.detail.delegate.youObject")
      : id && id === event.organizer_id
        ? t("tasks.detail.delegate.organizer")
        : ((id && names.get(id)) ?? null);
  const titles = new Map(tasksResult.data.map((task) => [task.id, task.title]));
  const states = new Map(stateResult.data.map((state) => [state.id, state]));
  const subtaskCount = new Map<string, number>();
  for (const task of tasksResult.data) {
    if (task.parent_task_id) {
      subtaskCount.set(task.parent_task_id, (subtaskCount.get(task.parent_task_id) ?? 0) + 1);
    }
  }
  const listed = tasksResult.data.map((task) => {
    const state = states.get(task.id);
    const open = !state?.obsolete && task.status !== "done";
    const waiting = state?.blocked && open;
    const row: ListedTask = {
      ...task,
      roleName: roleName.get(task.role_id) ?? "",
      waitsFor: waiting ? (titles.get(state.blocked_by ?? "") ?? null) : null,
      waitsForMore: state?.blocked_by_count ?? 0,
      blocks: state?.blocks_count ?? 0,
      ownerName: ownerName(task.owner_user_id),
      accepted: task.owner_user_id && open ? (state?.accepted ?? false) : null,
      staleDays:
        organizer && state?.stale_unaccepted && task.delegated_at
          ? daysSince(task.delegated_at)
          : null,
      overdueDays: state?.overdue_days ?? null,
      subtasks: subtaskCount.get(task.id) ?? 0,
      externalNote: externalNotes.get(task.id) ?? null,
    };
    const dash: DashboardTask = {
      id: task.id,
      title: task.title,
      deadline: task.deadline,
      roleId: task.role_id,
      ownerId: task.owner_user_id,
      status: task.status,
      blocked: state?.blocked === true,
      overdue: state?.overdue === true,
      stale_unaccepted: state?.stale_unaccepted === true,
      accepted: row.accepted,
      obsolete: state?.obsolete === true,
      lifecycle: task.lifecycle,
      roleActive: roleActive.get(task.role_id) ?? false,
    };
    return { row, dash, obsolete: dash.obsolete, pending: state?.is_pending === true };
  });
  const memberRoleIds = namesResult.data
    .filter((m) => m.user_id === viewerId && m.joined_at)
    .map((m) => m.role_id);
  const roles = rolesResult.data
    .map((r) => ({ ...r, name: roleName.get(r.id) ?? "" }))
    .toSorted((a, b) => roleKeys.indexOf(a.key) - roleKeys.indexOf(b.key));
  return { listed, leadRoleIds, memberRoleIds, roles, members: namesResult.data };
});
