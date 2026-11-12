import { describe, expect, it } from "vitest";
import {
  classifyDashboard,
  summarizeRoles,
  type DashboardTask,
  type DashboardViewer,
} from "./dashboard";

let n = 0;
const task = (over: Partial<DashboardTask> = {}): DashboardTask => ({
  id: `t${++n}`,
  title: `Task ${n}`,
  deadline: "2026-12-01",
  roleId: "A",
  ownerId: null,
  status: "not_started",
  blocked: false,
  overdue: false,
  stale_unaccepted: false,
  accepted: null,
  obsolete: false,
  hasProblem: false,
  lifecycle: "active",
  roleActive: true,
  ...over,
});
const organizer: DashboardViewer = { id: "org", isOrganizer: true, leadRoleIds: [] };
const holder: DashboardViewer = { id: "me", isOrganizer: false, leadRoleIds: [] };
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);
const total = (d: ReturnType<typeof classifyDashboard>) => d.needsYou.length + d.atRisk.length;

describe("classifyDashboard", () => {
  it("shows a triple-flag Task once, with all flags", () => {
    const t = task({ overdue: true, blocked: true, ownerId: "me", accepted: false });
    const d = classifyDashboard([t], holder);
    expect(d.needsYou).toHaveLength(1);
    expect(d.needsYou[0]).toMatchObject({ blocked: true, overdue: true, notAccepted: true });
    expect(d.atRisk).toHaveLength(0);
    expect(total(d)).toBe(1);
  });

  it("puts a Problem first, once, with the other flags kept", () => {
    const o = task({ overdue: true, deadline: "2026-11-01" });
    const p = task({ hasProblem: true, overdue: true, blocked: true, deadline: "2026-11-30" });
    const d = classifyDashboard([o, p], organizer);
    expect(ids(d.needsYou)).toEqual([p.id, o.id]);
    expect(d.needsYou[0]).toMatchObject({ hasProblem: true, overdue: true, blocked: true });
    expect(total(d)).toBe(2);
  });

  it("orders Problems by deadline then title, and keeps a done Task's Problem", () => {
    const b = task({ hasProblem: true, deadline: "2026-12-02", title: "B" });
    const a = task({ hasProblem: true, deadline: "2026-12-02", title: "A", status: "done" });
    const early = task({ hasProblem: true, deadline: "2026-12-01" });
    expect(ids(classifyDashboard([b, a, early], organizer).needsYou)).toEqual([
      early.id,
      a.id,
      b.id,
    ]);
  });

  it("shows a Problem only within the viewer's scope", () => {
    const mine = task({ hasProblem: true, ownerId: "me" });
    const mate = task({ hasProblem: true, ownerId: "mate" });
    expect(ids(classifyDashboard([mine, mate], holder).needsYou)).toEqual([mine.id]);
  });

  it("orders the Organizer's overdue before stale, each by deadline", () => {
    const stale = task({ stale_unaccepted: true, deadline: "2026-11-01", roleId: "C" });
    const o2 = task({ overdue: true, deadline: "2026-11-20", roleId: "B" });
    const o1 = task({ overdue: true, deadline: "2026-11-10" });
    const d = classifyDashboard([stale, o2, o1], organizer);
    expect(ids(d.needsYou)).toEqual([o1.id, o2.id, stale.id]);
  });

  it("limits a holder to owned Tasks", () => {
    const mine1 = task({ ownerId: "me", accepted: true, overdue: true });
    const mine2 = task({ ownerId: "me", accepted: true });
    const mate = task({ ownerId: "mate", overdue: true });
    const d = classifyDashboard([mine1, mine2, mate], holder);
    expect(ids(d.needsYou)).toEqual([mine1.id]);
  });

  it("gives a lead their Role's Tasks plus owned ones", () => {
    const lead: DashboardViewer = { id: "me", isOrganizer: false, leadRoleIds: ["X"] };
    const x = task({ roleId: "X", overdue: true });
    const y = task({ roleId: "Y", overdue: true });
    const staleX = task({ roleId: "X", stale_unaccepted: true });
    const d = classifyDashboard([x, y, staleX], lead);
    expect(ids(d.needsYou)).toEqual([x.id, staleX.id]);
  });

  it("does not show stale Tasks of a Role-mate to a plain holder", () => {
    const stale = task({ stale_unaccepted: true, ownerId: "mate" });
    expect(classifyDashboard([stale], holder).needsYou).toHaveLength(0);
  });

  it("lists an owned unaccepted Task as Not yet accepted", () => {
    const t = task({ ownerId: "me", accepted: false });
    const d = classifyDashboard([t], holder);
    expect(d.needsYou[0]).toMatchObject({ id: t.id, notAccepted: true });
  });

  it("puts waiting before blocked in At risk, each by deadline", () => {
    const b2 = task({ blocked: true, deadline: "2026-12-05" });
    const b1 = task({ blocked: true, deadline: "2026-12-02" });
    const w = task({ status: "waiting_external", deadline: "2026-12-09" });
    const d = classifyDashboard([b2, b1, w], organizer);
    expect(ids(d.atRisk)).toEqual([w.id, b1.id, b2.id]);
    expect(d.atRisk[0]?.waitingExternal).toBe(true);
  });

  it("summarises active Roles in order, counting overdue and open only for open Tasks", () => {
    const roles = [
      { id: "A", active: true },
      { id: "B", active: true },
      { id: "C", active: false },
    ];
    const s = summarizeRoles(
      [
        task({ status: "done", overdue: true }),
        task({ status: "in_progress" }),
        task({ overdue: true }),
        task({ roleId: "B", status: "done" }),
        task({ roleId: "C" }),
      ],
      roles,
      { isOrganizer: true, memberRoleIds: [] },
    );
    expect(s).toEqual([
      { roleId: "A", readable: true, done: 1, open: 2, overdue: 1 },
      { roleId: "B", readable: true, done: 1, open: 0, overdue: 0 },
    ]);
  });

  it("gives an unreadable Role no counts and skips obsolete, dismissed and proposed Tasks", () => {
    const roles = [
      { id: "A", active: true },
      { id: "B", active: true },
    ];
    const s = summarizeRoles(
      [
        task(),
        task({ obsolete: true }),
        task({ lifecycle: "dismissed" }),
        task({ lifecycle: "proposed" }),
        task({ roleId: "B" }),
      ],
      roles,
      { isOrganizer: false, memberRoleIds: ["A"] },
    );
    expect(s).toEqual([
      { roleId: "A", readable: true, done: 0, open: 1, overdue: 0 },
      { roleId: "B", readable: false, done: 0, open: 0, overdue: 0 },
    ]);
  });

  it("counts inactive Role Tasks for the Organizer only and never lists them", () => {
    const t = task({ roleActive: false, overdue: true, ownerId: "me" });
    const o = classifyDashboard([t], organizer);
    expect(o.inactiveRoleTasks).toBe(1);
    expect(total(o)).toBe(0);
    expect(classifyDashboard([t], holder).inactiveRoleTasks).toBe(0);
  });

  it("excludes obsolete, dismissed and proposed Tasks everywhere", () => {
    const d = classifyDashboard(
      [
        task({ obsolete: true, overdue: true }),
        task({ lifecycle: "dismissed" }),
        task({ lifecycle: "proposed" }),
      ],
      organizer,
    );
    expect(total(d)).toBe(0);
    expect(d.inactiveRoleTasks).toBe(0);
  });

  it("lists each in-scope Task at most once across Needs you and At risk", () => {
    const tasks = [
      task({ overdue: true }),
      task({ stale_unaccepted: true }),
      task({ blocked: true }),
      task({ status: "waiting_external" }),
      task({ status: "done" }),
      task({ ownerId: "me", accepted: false }),
      task(),
    ];
    expect(total(classifyDashboard(tasks, organizer))).toBe(4);
    expect(total(classifyDashboard(tasks, holder))).toBe(1);
  });

  it("does not list an owned Task with unknown acceptance", () => {
    const t = task({ ownerId: "me", accepted: null });
    expect(classifyDashboard([t], holder).needsYou).toHaveLength(0);
  });

  it("lists a lead's own Tasks in a Role they do not lead", () => {
    const lead: DashboardViewer = { id: "me", isOrganizer: false, leadRoleIds: ["X"] };
    const over = task({ roleId: "Y", ownerId: "me", accepted: true, overdue: true });
    const fresh = task({ roleId: "Y", ownerId: "me", accepted: false, deadline: "2026-12-09" });
    const other = task({ roleId: "Y", ownerId: "mate", overdue: true });
    expect(ids(classifyDashboard([over, fresh, other], lead).needsYou)).toEqual([
      over.id,
      fresh.id,
    ]);
  });

  it("sorts stale Tasks by who manages them", () => {
    const lead: DashboardViewer = { id: "me", isOrganizer: false, leadRoleIds: ["X"] };
    const late = task({ ownerId: "me", accepted: false, deadline: "2026-12-09", roleId: "Y" });
    const staleY = task({
      ownerId: "me",
      accepted: false,
      stale_unaccepted: true,
      deadline: "2026-12-20",
      roleId: "Y",
    });
    const staleX = task({
      ownerId: "me",
      accepted: false,
      stale_unaccepted: true,
      deadline: "2026-12-30",
      roleId: "X",
    });
    // Plain holder: no stale group, so the earlier deadline comes first.
    expect(ids(classifyDashboard([staleY, late], holder).needsYou)).toEqual([late.id, staleY.id]);
    // Lead: own stale Task in a led Role goes to the stale group, ahead of Not yet accepted.
    expect(ids(classifyDashboard([late, staleX], lead).needsYou)).toEqual([staleX.id, late.id]);
  });

  it("sorts Tasks without a deadline last, then by id when deadline and title match", () => {
    const none = task({ overdue: true, deadline: null, title: "A" });
    const b = task({ overdue: true, id: "b", title: "Same" });
    const a = task({ overdue: true, id: "a", title: "Same" });
    expect(ids(classifyDashboard([none, b, a], organizer).needsYou)).toEqual(["a", "b", none.id]);
  });

  it("returns empty sections for no Tasks", () => {
    expect(classifyDashboard([], organizer)).toEqual({
      needsYou: [],
      atRisk: [],
      inactiveRoleTasks: 0,
    });
  });
});
