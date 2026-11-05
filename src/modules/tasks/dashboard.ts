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
  lifecycle: string;
  roleActive: boolean;
};

export type DashboardViewer = { id: string; isOrganizer: boolean; leadRoleIds: string[] };

export type DashboardRow = DashboardTask & {
  waitingExternal: boolean;
  notAccepted: boolean;
  staleDays: boolean;
};

export type RoleSummary = { roleId: string; done: number; open: number; overdue: number };

export type Dashboard = {
  needsYou: DashboardRow[];
  atRisk: DashboardRow[];
  onTrack: RoleSummary[];
  onTrackCount: number;
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
  const groups = [
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
  const riskIds = new Set(atRisk.map((t) => t.id));

  const summaries = new Map<string, RoleSummary>();
  const onTrackTasks = listed.filter((t) => !seen.has(t.id) && !riskIds.has(t.id));
  for (const t of onTrackTasks) {
    const s = summaries.get(t.roleId) ?? { roleId: t.roleId, done: 0, open: 0, overdue: 0 };
    if (t.status === "done") s.done++;
    else s.open++;
    if (t.overdue) s.overdue++;
    summaries.set(t.roleId, s);
  }

  return {
    needsYou,
    atRisk,
    onTrack: [...summaries.values()],
    onTrackCount: onTrackTasks.length,
    inactiveRoleTasks,
  };
}
