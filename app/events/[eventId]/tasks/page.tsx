import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient, getClaims } from "@/lib/supabase/server";
import { eventPath, isDraft, isPast } from "@/modules/events/list";
import { roleKeys } from "@/modules/events/roles";
import { loadEvent } from "../load-event";
import { RestoreButton } from "./restore-button";
import { TaskForm } from "./task-form";
import { TaskRow } from "./task-row";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props) {
  if (!(await getClaims())) return { title: "Arrangly" };
  const t = await getTranslations();
  const event = await loadEvent((await params).eventId);
  return {
    title: `${t("tasks.surface")} – ${event.name ?? t("events.draft.untitled")} – Arrangly`,
  };
}

// The Tasks of an Event: RLS shows the Organizer every Task and a Role-holder their Role's.
export default async function TasksPage({ params }: Props) {
  const { eventId } = await params;
  const claims = await getClaims();
  if (!claims) redirect(`/login?next=${eventPath(eventId)}/tasks`);
  const event = await loadEvent(eventId);
  const t = await getTranslations();
  const supabase = await createClient();
  const [tasksResult, rolesResult, leadResult, stateResult] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, title, deadline, status, owner_user_id, lifecycle, role_id, parent_task_id, updated_at",
      )
      .eq("event_id", eventId)
      .order("deadline", { ascending: true, nullsFirst: false })
      .order("title"),
    supabase.from("roles").select("id, key, active").eq("event_id", eventId),
    supabase
      .from("role_members")
      .select("role_id")
      .eq("event_id", eventId)
      .eq("user_id", claims.sub)
      .eq("is_lead", true)
      .not("joined_at", "is", null),
    supabase
      .from("task_state")
      .select("id, blocked, blocked_by, blocked_by_count, blocks_count, overdue_days")
      .eq("event_id", eventId),
  ]);
  if (tasksResult.error || rolesResult.error || leadResult.error || stateResult.error) {
    throw new Error("Could not load the tasks");
  }
  const organizer = event.organizer_id === claims.sub;
  const led = new Set(leadResult.data.map((member) => member.role_id));
  const roleName = new Map(rolesResult.data.map((r) => [r.id, t(`events.roles.${r.key}.name`)]));
  const creatable = rolesResult.data
    .filter((role) => role.active && (organizer || led.has(role.id)))
    .toSorted((a, b) => roleKeys.indexOf(a.key) - roleKeys.indexOf(b.key))
    .map((role) => ({ id: role.id, name: roleName.get(role.id) ?? "" }));
  // Published past and cancelled Events are read-only; the database refuses their changes too.
  const readOnly = !isDraft(event) && isPast(event, new Date());
  const titles = new Map(tasksResult.data.map((task) => [task.id, task.title]));
  const states = new Map(stateResult.data.map((state) => [state.id, state]));
  const subtaskCount = new Map<string, number>();
  for (const task of tasksResult.data) {
    if (task.parent_task_id && task.lifecycle === "active") {
      subtaskCount.set(task.parent_task_id, (subtaskCount.get(task.parent_task_id) ?? 0) + 1);
    }
  }
  const tasks = tasksResult.data.map((task) => {
    const state = states.get(task.id);
    // A Task that is dismissed or Done is not waiting, whatever its blockers do.
    const waiting = state?.blocked && task.lifecycle === "active" && task.status !== "done";
    return {
      ...task,
      roleName: roleName.get(task.role_id) ?? "",
      waitsFor: waiting ? (titles.get(state.blocked_by ?? "") ?? null) : null,
      waitsForMore: state?.blocked_by_count ?? 0,
      blocks: state?.blocks_count ?? 0,
      overdueDays: task.lifecycle === "active" ? (state?.overdue_days ?? null) : null,
      subtasks: subtaskCount.get(task.id) ?? 0,
    };
  });
  // A Subtask is listed on its parent's page, not here.
  const live = tasks.filter((task) => task.lifecycle !== "dismissed" && !task.parent_task_id);
  const dismissed = tasks.filter((task) => task.lifecycle === "dismissed");
  return (
    <div className="flex max-w-2xl flex-col gap-6 py-12">
      <h1 className="text-large-title">{t("tasks.title")}</h1>
      <p className="text-muted-foreground">{t(readOnly ? "tasks.readOnly" : "tasks.intro")}</p>

      {!readOnly && creatable.length === 0 && (
        <p className="text-muted-foreground">{t("tasks.create.noRoles")}</p>
      )}
      {!readOnly && creatable.length > 0 && (
        <section
          aria-labelledby="new-task"
          className="bg-card flex flex-col gap-3 rounded-md border p-4"
        >
          <h2 id="new-task" className="text-headline">
            {t("tasks.create.title")}
          </h2>
          <TaskForm
            eventId={eventId}
            hasStart={event.starts_at !== null && event.time_zone !== null}
            initial={{ title: "", description: "", kind: "date", deadline: "", daysBefore: "" }}
            mode={{ create: { roles: creatable } }}
          />
        </section>
      )}

      {live.length === 0 ? (
        <p className="text-muted-foreground">{t("tasks.empty")}</p>
      ) : (
        <section aria-labelledby="task-count" className="flex flex-col gap-2">
          <h2 id="task-count" className="text-headline">
            {t("tasks.count", { count: live.length })}
          </h2>
          <ul role="list" className="divide-border flex flex-col divide-y">
            {live.map((task) => (
              <TaskRow key={task.id} eventId={eventId} task={task} />
            ))}
          </ul>
        </section>
      )}

      {dismissed.length > 0 && (
        <details>
          <summary className="min-h-touch flex cursor-pointer items-center">
            {t("tasks.showDismissed", { count: dismissed.length })}
          </summary>
          <ul role="list" className="divide-border flex flex-col divide-y">
            {dismissed.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="min-w-0 break-words">{task.title}</span>
                {!readOnly && (organizer || led.has(task.role_id)) && (
                  <span className="ml-auto">
                    <RestoreButton
                      eventId={eventId}
                      taskId={task.id}
                      expected={task.updated_at}
                      title={task.title}
                    />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
