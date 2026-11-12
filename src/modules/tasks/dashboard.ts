export type DashboardTask = {
  id: string;
  title: string;
  deadline: string | null;
  roleId: string;
  ownerId: string | null;
  status: string;
  blocked: boolean;
  overdue: boolean;
  stale_unaccepted: boolean;
  accepted: boolean | null;
  obsolete: boolean;
  hasProblem: boolean;
  lifecycle: string;
  roleActive: boolean;
};

export type DashboardViewer = { id: string; isOrganizer: boolean; leadRoleIds: string[] };

export type DashboardRow = DashboardTask & {
  waitingExternal: boolean;
  notAccepted: boolean;
  staleDays: boolean;
};

export type Dashboard = {
  needsYou: DashboardRow[];
  atRisk: DashboardRow[];
  inactiveRoleTasks: number;
};

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const byDeadline = (a: DashboardTask, b: DashboardTask) =>
  cmp(a.deadline ?? "9999-12-31", b.deadline ?? "9999-12-31") ||
  cmp(a.title, b.title) ||
  cmp(a.id, b.id);

/** The only home of the Dashboard section rules: each in-scope Task lands in exactly one section. */
export function classifyDashboard(tasks: DashboardTask[], viewer: DashboardViewer): Dashboard {
  const owns = (t: DashboardTask) => t.ownerId === viewer.id;
  const leads = (t: DashboardTask) => viewer.leadRoleIds.includes(t.roleId);
  const inScope = (t: DashboardTask) => viewer.isOrganizer || leads(t) || owns(t);
  const isNotAccepted = (t: DashboardTask) => owns(t) && t.accepted === false;
  // Stale Tasks belong to someone who manages the Role, not to a plain holder.
  const manages = (t: DashboardTask) => viewer.isOrganizer || leads(t);

  const live = tasks.filter((t) => t.lifecycle === "active" && !t.obsolete);
  const scoped = live.filter(inScope);
  const inactiveRoleTasks = viewer.isOrganizer ? scoped.filter((t) => !t.roleActive).length : 0;
  const listed = scoped.filter((t) => t.roleActive);

  const row = (t: DashboardTask): DashboardRow => ({
    ...t,
    waitingExternal: t.status === "waiting_external",
    notAccepted: isNotAccepted(t),
    staleDays: t.stale_unaccepted,
  });

  const open = listed.filter((t) => t.status !== "done");
  // Order of Story 5.1: Decision Tasks (not built yet), then Problems, overdue, stale, not yet accepted.
  // A Problem may sit on a done Task, so this group reads from every listed Task.
  const groups = [
    listed.filter((t) => t.hasProblem),
    open.filter((t) => t.overdue),
    open.filter((t) => t.stale_unaccepted && manages(t)),
    open.filter(isNotAccepted),
  ];
  const seen = new Set<string>();
  const needsYou = groups.flatMap((g) =>
    g
      .filter((t) => !seen.has(t.id))
      .toSorted(byDeadline)
      .map((t) => (seen.add(t.id), row(t))),
  );

  const rest = open.filter((t) => !seen.has(t.id));
  const atRisk = [
    ...rest.filter((t) => t.status === "waiting_external").toSorted(byDeadline),
    ...rest.filter((t) => t.status !== "waiting_external" && t.blocked).toSorted(byDeadline),
  ].map(row);

  return {
    needsYou,
    atRisk,
    inactiveRoleTasks,
  };
}

export type RoleSummary = {
  roleId: string;
  readable: boolean;
  done: number;
  open: number;
  overdue: number;
};

/**
 * One summary per active Role, in the order given. Counts cover every live Task of a Role the viewer
 * can read (the Organizer, or a joined holder), not only those left after Needs you and At risk.
 */
export function summarizeRoles(
  tasks: DashboardTask[],
  roles: { id: string; active: boolean }[],
  viewer: { isOrganizer: boolean; memberRoleIds: string[] },
): RoleSummary[] {
  const live = tasks.filter((t) => t.lifecycle === "active" && !t.obsolete);
  return roles
    .filter((r) => r.active)
    .map((r) => {
      const readable = viewer.isOrganizer || viewer.memberRoleIds.includes(r.id);
      const mine = readable ? live.filter((t) => t.roleId === r.id) : [];
      const done = mine.filter((t) => t.status === "done").length;
      return {
        roleId: r.id,
        readable,
        done,
        open: mine.length - done,
        overdue: mine.filter((t) => t.status !== "done" && t.overdue).length,
      };
    });
}
