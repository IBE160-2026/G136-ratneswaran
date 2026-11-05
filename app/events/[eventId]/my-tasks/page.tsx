import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient, getClaims } from "@/lib/supabase/server";
import { eventPath } from "@/modules/events/list";
import { byAcceptanceAndDeadline } from "@/modules/tasks/my-tasks";
import { loadEvent } from "../load-event";
import { daysSince, type ListedTask } from "../tasks/task-row";
import { HolderTeam } from "../team/holder-team";
import { MyTasksView } from "./my-tasks-view";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props) {
  if (!(await getClaims())) return { title: "Arrangly" };
  const t = await getTranslations();
  const event = await loadEvent((await params).eventId);
  return {
    title: `${t("tasks.mine.surface")} – ${event.name ?? t("events.draft.untitled")} – Arrangly`,
  };
}

// The viewer's own Tasks and the Team. RLS decides which Tasks the viewer may see at all.
export default async function MyTasksPage({ params }: Props) {
  const { eventId } = await params;
  const claims = await getClaims();
  if (!claims) redirect(`/login?next=${eventPath(eventId)}/my-tasks`);
  const event = await loadEvent(eventId);
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
    supabase.from("roles").select("id, key").eq("event_id", eventId),
    supabase
      .from("task_state")
      .select(
        "id, blocked, blocked_by, blocked_by_count, blocks_count, overdue_days, accepted, stale_unaccepted, is_pending, obsolete",
      )
      .eq("event_id", eventId),
    supabase.from("role_members").select("user_id, name").eq("event_id", eventId),
  ]);
  if (tasksResult.error || rolesResult.error || stateResult.error || namesResult.error) {
    throw new Error("Could not load my tasks");
  }
  const organizer = event.organizer_id === claims.sub;
  const roleName = new Map(rolesResult.data.map((r) => [r.id, t(`events.roles.${r.key}.name`)]));
  const names = new Map(namesResult.data.map((member) => [member.user_id, member.name]));
  const ownerName = (id: string | null) =>
    id === claims.sub
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
    };
    return { row, obsolete: state?.obsolete === true, pending: state?.is_pending === true };
  });
  const mine = listed.filter((x) => x.row.owner_user_id === claims.sub);
  const owned = mine.filter((x) => !x.obsolete).map((x) => x.row);
  const obsolete = mine.filter((x) => x.obsolete).map((x) => x.row);
  const pending = listed
    .filter((x) => x.pending && !x.obsolete)
    .map((x) => x.row)
    .toSorted(byAcceptanceAndDeadline);
  return (
    <div className="flex max-w-2xl flex-col gap-6 py-12">
      <h1 className="text-large-title">{t("tasks.mine.title")}</h1>
      <MyTasksView
        eventId={eventId}
        owned={owned.toSorted(byAcceptanceAndDeadline)}
        obsolete={obsolete.toSorted(byAcceptanceAndDeadline)}
        pending={pending}
      />
      <HolderTeam eventId={eventId} embedded />
    </div>
  );
}
