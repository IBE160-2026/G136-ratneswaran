import type { createClient } from "@/lib/supabase/server";
import { roleKeys } from "@/modules/events/roles";

export type TimelineRole = {
  id: string;
  key: string;
  active: boolean;
  /** False for a Role whose Tasks the viewer may not read: the lane then carries no Task data. */
  readable: boolean;
  holders: { name: string; pending: boolean }[];
  lead: string | null;
};

export type TimelineTask = {
  id: string;
  roleId: string;
  parentId: string | null;
  title: string;
  deadline: string;
  createdAt: string;
  lifecycle: string;
  obsolete: boolean;
  dependsOn: string[];
  /** Decision Tasks are Target (Story 4.8); the loader passes none. */
  decision?: "open" | "resolved" | null;
};

export type TimelineEvent = { id: string; timeZone: string | null; endsAt: string | null };

export type TimelineBar = {
  id: string;
  title: string;
  /** ISO dates (YYYY-MM-DD) in the Event zone. */
  start: string;
  end: string;
  days: number;
  /** The start was after the end, so the bar collapsed to a marker at the deadline. */
  marker: boolean;
  point: "filled" | "outline" | null;
  obsolete: boolean;
  dependsOn: string[];
  children: TimelineBar[];
};

export type TimelineLane = {
  roleId: string;
  key: string;
  readable: boolean;
  holders: TimelineRole["holders"];
  lead: string | null;
  empty: boolean;
  tasks: TimelineBar[];
};

export type Timeline = {
  lanes: TimelineLane[];
  axis: { start: string; end: string; today: string } | null;
  inactiveRoleTasks: number;
  obsoleteCount: number;
};

const zoneDate = (d: Date, zone: string | null) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: zone ?? "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

/** The calendar date it is in the Event's zone (no zone: UTC). */
export const eventToday = (now: Date, zone: string | null) => zoneDate(now, zone);

const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
const byDate = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** AD-13: computed per request, never stored. Pure; the same input always gives the same output. */
export function computeTimeline(
  roles: TimelineRole[],
  tasks: TimelineTask[],
  event: TimelineEvent,
  today: string,
  options: { includeObsolete?: boolean; isOrganizer?: boolean } = {},
): Timeline {
  const live = tasks.filter((t) => t.lifecycle === "active");
  const readableIds = new Set(roles.filter((r) => r.readable).map((r) => r.id));
  const byId = new Map(live.filter((t) => readableIds.has(t.roleId)).map((t) => [t.id, t]));
  const createdDay = (t: TimelineTask) => zoneDate(new Date(t.createdAt), event.timeZone);
  const compare = (a: TimelineTask, b: TimelineTask) =>
    byDate(a.deadline, b.deadline) || byDate(a.createdAt, b.createdAt) || byDate(a.id, b.id);

  // Obsolete Tasks still define dependants' starts, so the start is read from the full set.
  const startOf = (t: TimelineTask) => {
    const deps = t.dependsOn.flatMap((id) => byId.get(id)?.deadline ?? []);
    return deps.length > 0 ? deps.reduce((a, b) => (a > b ? a : b)) : createdDay(t);
  };

  const shown = (t: TimelineTask) => options.includeObsolete || !t.obsolete;

  /** Topological by dependency among siblings, smallest rank first; a cycle falls back to plain rank order. */
  const order = (group: TimelineTask[], roleId: string) => {
    const ids = new Set(group.map((t) => t.id));
    const waiting = new Map(group.map((t) => [t.id, t.dependsOn.filter((d) => ids.has(d))]));
    const out: TimelineTask[] = [];
    const left = [...group].sort(compare);
    while (left.length > 0) {
      const i = left.findIndex((t) => waiting.get(t.id)!.every((d) => out.some((o) => o.id === d)));
      if (i < 0) {
        console.error("timeline cycle", { eventId: event.id, roleId });
        return [...group].sort(compare);
      }
      out.push(left.splice(i, 1)[0]);
    }
    return out;
  };

  const bar = (t: TimelineTask, children: TimelineBar[]): TimelineBar => {
    const start = startOf(t);
    const marker = start > t.deadline;
    const from = marker ? t.deadline : start;
    return {
      id: t.id,
      title: t.title,
      start: from,
      end: t.deadline,
      days: Math.max(1, dayNumber(t.deadline) - dayNumber(from) + 1),
      marker,
      point: t.decision === "open" ? "filled" : t.decision === "resolved" ? "outline" : null,
      obsolete: t.obsolete,
      dependsOn: t.dependsOn.filter((d) => byId.has(d)),
      children,
    };
  };

  const bars: TimelineBar[] = [];
  let obsoleteCount = 0;
  const lanes = roles
    .filter((r) => r.active)
    .map((r): TimelineLane => {
      const head = {
        roleId: r.id,
        key: r.key,
        readable: r.readable,
        holders: r.holders,
        lead: r.lead,
      };
      if (!r.readable) return { ...head, empty: true, tasks: [] };
      const mine = live.filter((t) => t.roleId === r.id);
      obsoleteCount += mine.filter((t) => t.obsolete).length;
      const visible = mine.filter(shown);
      const visibleIds = new Set(visible.map((t) => t.id));
      const kids = new Map<string, TimelineTask[]>();
      const top: TimelineTask[] = [];
      for (const t of visible) {
        if (t.parentId && visibleIds.has(t.parentId)) {
          kids.set(t.parentId, [...(kids.get(t.parentId) ?? []), t]);
        } else top.push(t);
      }
      const laneTasks = order(top, r.id).map((t) =>
        bar(
          t,
          order(kids.get(t.id) ?? [], r.id).map((c) => bar(c, [])),
        ),
      );
      const flat = (list: TimelineBar[]): TimelineBar[] => list.flatMap((b) => [b, ...b.children]);
      bars.push(...flat(laneTasks));
      return { ...head, empty: laneTasks.length === 0, tasks: laneTasks };
    });

  const inactive = new Set(roles.filter((r) => !r.active).map((r) => r.id));
  const inactiveRoleTasks = options.isOrganizer
    ? live.filter((t) => inactive.has(t.roleId)).length
    : 0;

  let axis: Timeline["axis"] = null;
  if (bars.length > 0) {
    const eventEnd = event.endsAt ? zoneDate(new Date(event.endsAt), event.timeZone) : "";
    const latest = bars.reduce((m, b) => (b.end > m ? b.end : m), eventEnd);
    axis = {
      start: bars.reduce((m, b) => (b.start < m ? b.start : m), bars[0].start),
      end: latest,
      today,
    };
  }
  return { lanes, axis, inactiveRoleTasks, obsoleteCount };
}

/** Exactly two queries: Roles with their members, then active Tasks with their dependencies, under the viewer's RLS. */
export async function loadTimelineInput(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  viewerId: string,
  isOrganizer: boolean,
) {
  const [rolesResult, tasksResult] = await Promise.all([
    supabase
      .from("roles")
      .select("id, key, active, role_members(user_id, name, is_lead, joined_at)")
      .eq("event_id", eventId),
    supabase
      .from("tasks")
      .select(
        "id, role_id, parent_task_id, title, deadline, created_at, lifecycle, obsolete, task_dependencies!task_dependencies_task_id_fkey(depends_on_id)",
      )
      .eq("event_id", eventId)
      .eq("lifecycle", "active"),
  ]);
  if (rolesResult.error || tasksResult.error) throw new Error("Could not load timeline");
  const roles: TimelineRole[] = [...rolesResult.data]
    .sort((a, b) => roleKeys.indexOf(a.key) - roleKeys.indexOf(b.key))
    .map((r) => ({
      id: r.id,
      key: r.key,
      active: r.active,
      readable: isOrganizer || r.role_members.some((m) => m.user_id === viewerId && m.joined_at),
      holders: r.role_members.map((m) => ({ name: m.name, pending: !m.joined_at })),
      lead: r.role_members.find((m) => m.is_lead)?.name ?? null,
    }));
  const tasks: TimelineTask[] = tasksResult.data.flatMap((t) =>
    t.deadline
      ? [
          {
            id: t.id,
            roleId: t.role_id,
            parentId: t.parent_task_id,
            title: t.title,
            deadline: t.deadline,
            createdAt: t.created_at,
            lifecycle: t.lifecycle,
            obsolete: t.obsolete,
            dependsOn: t.task_dependencies.map((d) => d.depends_on_id),
          },
        ]
      : [],
  );
  return { roles, tasks };
}
