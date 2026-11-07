import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computeTimeline,
  eventToday,
  loadTimelineInput,
  type TimelineRole,
  type TimelineTask,
} from "./timeline";

const event = { id: "e1", timeZone: "Europe/Oslo", endsAt: "2026-12-20T20:00:00Z" };
const role = (id: string, over: Partial<TimelineRole> = {}): TimelineRole => ({
  id,
  key: id,
  active: true,
  readable: true,
  holders: [],
  lead: null,
  ...over,
});
const task = (id: string, over: Partial<TimelineTask> = {}): TimelineTask => ({
  id,
  roleId: "r1",
  parentId: null,
  title: `T ${id}`,
  deadline: "2026-12-01",
  createdAt: "2026-11-01T10:00:00Z",
  lifecycle: "active",
  obsolete: false,
  status: "not_started",
  delegated: false,
  accepted: false,
  dependsOn: [],
  ...over,
});
const run = (tasks: TimelineTask[], roles = [role("r1")], o = {}) =>
  computeTimeline(roles, tasks, event, "2026-11-06", o);
const ids = (t: ReturnType<typeof run>, lane = 0) => t.lanes[lane].tasks.map((b) => b.id);

afterEach(() => vi.restoreAllMocks());

describe("computeTimeline", () => {
  it("orders by dependency before deadline, then ties by deadline, created_at, id", () => {
    const t = run([
      task("a", { deadline: "2026-12-10" }),
      task("b", { deadline: "2026-12-01", dependsOn: ["a"] }),
      task("d", { deadline: "2026-12-05" }),
      task("c", { deadline: "2026-12-05", createdAt: "2026-11-02T10:00:00Z" }),
    ]);
    expect(ids(t)).toEqual(["d", "c", "a", "b"]);
    expect(run([task("b"), task("a")])).toEqual(run([task("a"), task("b")]));
    expect(ids(run([task("b"), task("a")]))).toEqual(["a", "b"]);
  });

  it("places bars from created date or latest dependency, collapsing to a marker", () => {
    const t = run([
      task("a", { deadline: "2026-12-10", createdAt: "2026-11-30T23:30:00Z" }),
      task("b", { deadline: "2026-12-14", dependsOn: ["a"] }),
      task("c", { deadline: "2026-12-05", dependsOn: ["a"] }),
    ]);
    const [a, b, c] = ["a", "b", "c"].map((id) => t.lanes[0].tasks.find((x) => x.id === id)!);
    expect(a).toMatchObject({ start: "2026-12-01", end: "2026-12-10", days: 10, marker: false });
    expect(b).toMatchObject({ start: "2026-12-10", days: 5 });
    expect(c).toMatchObject({ start: "2026-12-05", days: 1, marker: true });
  });

  it("nests Subtasks and lifts orphans to the top level", () => {
    const t = run([
      task("p"),
      task("s", { parentId: "p" }),
      task("o", { parentId: "gone", obsolete: true }),
      task("q", { parentId: "o" }),
    ]);
    expect(ids(t)).toEqual(["p", "q"]);
    expect(t.lanes[0].tasks[0].children.map((c) => c.id)).toEqual(["s"]);
  });

  it("makes one lane per active Role, empty ones tagged, and counts inactive Role Tasks for the Organizer", () => {
    const roles = [role("r1"), role("r2"), role("r3", { active: false })];
    const tasks = [task("x", { roleId: "r3" }), task("y", { roleId: "r3" })];
    const org = run(tasks, roles, { isOrganizer: true });
    expect(org.lanes.map((l) => [l.roleId, l.empty])).toEqual([
      ["r1", true],
      ["r2", true],
    ]);
    expect(org.inactiveRoleTasks).toBe(2);
    expect(run(tasks, roles).inactiveRoleTasks).toBe(0);
  });

  it("gives an unreadable lane no Task data at all", () => {
    const t = run(
      [task("secret", { roleId: "r2", title: "Hidden title", deadline: "2027-05-05" })],
      [
        role("r1"),
        role("r2", { readable: false, lead: "Dana", holders: [{ name: "Dana", pending: false }] }),
      ],
    );
    expect(t.lanes[1]).toMatchObject({ tasks: [], lead: "Dana" });
    expect(t.axis).toBeNull();
    expect(JSON.stringify(t)).not.toMatch(/secret|Hidden title|2027-05-05/);
  });

  it("ignores dependencies on unreadable Roles", () => {
    const t = run(
      [
        task("a", { dependsOn: ["z"], deadline: "2026-12-01" }),
        task("z", { roleId: "r2", deadline: "2026-11-20" }),
      ],
      [role("r1"), role("r2", { readable: false })],
    );
    expect(t.lanes[0].tasks[0]).toMatchObject({ start: "2026-11-01", dependsOn: [] });
  });

  it("falls back to deadline order on a cycle, terminates and logs only ids", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const t = run([
      task("a", { deadline: "2026-12-02", dependsOn: ["b"], title: "SECRET A" }),
      task("b", { deadline: "2026-12-01", dependsOn: ["a"] }),
    ]);
    expect(ids(t)).toEqual(["b", "a"]);
    expect(log).toHaveBeenCalledWith("timeline cycle", { eventId: "e1", roleId: "r1" });
  });

  it("hides non-active and, by default, obsolete Tasks, which still set dependants' starts", () => {
    const tasks = [
      task("o", { obsolete: true, deadline: "2026-12-08" }),
      task("d", { lifecycle: "dismissed" }),
      task("p", { lifecycle: "proposed" }),
      task("n", { dependsOn: ["o"], deadline: "2026-12-12" }),
    ];
    const hidden = run(tasks);
    expect(ids(hidden)).toEqual(["n"]);
    expect(hidden.obsoleteCount).toBe(1);
    const shown = run(tasks, [role("r1")], { includeObsolete: true });
    expect(ids(shown)).toEqual(["o", "n"]);
    expect(shown.lanes[0].tasks[0].obsolete).toBe(true);
    expect(shown.lanes[0].tasks[1].start).toBe("2026-12-08");
    expect(hidden.lanes[0].tasks[0].start).toBe("2026-12-08");
  });

  it("drops a hidden obsolete dependency from dependsOn but keeps it in the start", () => {
    const t = run([
      task("o", { obsolete: true, deadline: "2026-12-08" }),
      task("n", { dependsOn: ["o"], deadline: "2026-12-12" }),
    ]);
    expect(t.lanes[0].tasks[0]).toMatchObject({ id: "n", dependsOn: [], start: "2026-12-08" });
  });

  it("derives the display status with the precedence obsolete, done, overdue, waiting, in progress, not started", () => {
    const t = run(
      [
        task("a", { deadline: "2026-11-01" }),
        task("b", { deadline: "2026-11-01", status: "done" }),
        task("c", { deadline: "2026-11-01", obsolete: true }),
        task("d", { status: "waiting_external" }),
        task("e", { status: "in_progress" }),
        task("f"),
      ],
      [role("r1")],
      { includeObsolete: true },
    );
    const by = Object.fromEntries(t.lanes[0].tasks.map((b) => [b.id, b]));
    expect(by.a).toMatchObject({ status: "overdue", overdueDays: 5 });
    expect(by.b).toMatchObject({ status: "done", overdueDays: 0 });
    expect(by.c).toMatchObject({ status: "obsolete", overdueDays: 0 });
    expect(["d", "e", "f"].map((id) => by[id].status)).toEqual([
      "waiting",
      "inProgress",
      "notStarted",
    ]);
  });

  it("blocks on live, open dependencies only and names the earliest-deadline blocker", () => {
    const t = run([
      task("x", { deadline: "2026-12-05", title: "Late blocker" }),
      task("y", { deadline: "2026-12-02", title: "Early blocker" }),
      task("z", { deadline: "2026-12-01", status: "done" }),
      task("w", { deadline: "2026-12-01", obsolete: true }),
      task("b", { deadline: "2026-12-20", dependsOn: ["x", "y", "z", "w"] }),
      task("c", { deadline: "2026-12-20", dependsOn: ["z", "w"] }),
    ]);
    const by = Object.fromEntries(t.lanes[0].tasks.map((b) => [b.id, b]));
    expect(by.b).toMatchObject({ blocked: true, waitsFor: "Early blocker" });
    expect(by.c).toMatchObject({ blocked: false, waitsFor: null });
  });

  it("flags delegated, unaccepted, open Tasks as not accepted", () => {
    const t = run([
      task("a", { delegated: true }),
      task("b", { delegated: true, accepted: true }),
      task("c"),
      task("d", { delegated: true, status: "done" }),
    ]);
    expect(t.lanes[0].tasks.map((b) => b.notAccepted)).toEqual([true, false, false, false]);
  });

  it("marks Decision points", () => {
    const t = run([
      task("a", { decision: "open" }),
      task("b", { decision: "resolved" }),
      task("c"),
    ]);
    expect(t.lanes[0].tasks.map((b) => b.point)).toEqual(["filled", "outline", null]);
  });

  it("covers Tasks after the Event and handles 300 Tasks over 12 Roles", () => {
    const roles = Array.from({ length: 12 }, (_, i) => role(`r${i}`));
    const tasks = Array.from({ length: 300 }, (_, i) =>
      task(`t${String(i).padStart(3, "0")}`, {
        roleId: `r${i % 12}`,
        deadline: `2027-01-${String((i % 28) + 1).padStart(2, "0")}`,
      }),
    );
    const t = computeTimeline(roles, tasks, event, "2026-11-06");
    expect(t.lanes).toHaveLength(12);
    expect(t.lanes.reduce((n, l) => n + l.tasks.length, 0)).toBe(300);
    expect(t.axis).toEqual({ start: "2026-11-01", end: "2027-01-28", today: "2026-11-06" });
  });

  it("uses the Event end when it is later than every deadline, and UTC without a zone", () => {
    const t = computeTimeline(
      [role("r1")],
      [task("a")],
      { ...event, timeZone: null },
      "2026-11-06",
    );
    expect(t.axis?.end).toBe("2026-12-20");
  });
});

describe("eventToday", () => {
  it("follows the Event zone either side of midnight", () => {
    expect(eventToday(new Date("2026-11-06T22:59:00Z"), "Europe/Oslo")).toBe("2026-11-06");
    expect(eventToday(new Date("2026-11-06T23:00:00Z"), "Europe/Oslo")).toBe("2026-11-07");
    expect(eventToday(new Date("2026-11-06T23:00:00Z"), null)).toBe("2026-11-06");
  });

  it("is right across the 2026-10-25 DST change", () => {
    expect(eventToday(new Date("2026-10-24T21:59:00Z"), "Europe/Oslo")).toBe("2026-10-24");
    expect(eventToday(new Date("2026-10-24T22:00:00Z"), "Europe/Oslo")).toBe("2026-10-25");
    expect(eventToday(new Date("2026-10-25T22:59:00Z"), "Europe/Oslo")).toBe("2026-10-25");
    expect(eventToday(new Date("2026-10-25T23:00:00Z"), "Europe/Oslo")).toBe("2026-10-26");
  });
});

describe("loadTimelineInput lanes", () => {
  const member = (user_id: string, joined_at: string | null, is_lead = false) => ({
    user_id,
    name: user_id,
    is_lead,
    joined_at,
  });
  const load = (roles: unknown[], tasks: unknown[], viewer: string, organizer: boolean) => {
    const query = (data: unknown) => {
      const q = { eq: () => q, then: (f: (v: unknown) => unknown) => f({ data, error: null }) };
      return { select: () => q };
    };
    const from = (table: string) => query(table === "roles" ? roles : tasks);
    return loadTimelineInput({ from } as never, "e1", viewer, organizer);
  };

  it("marks readability and pending holders, and sorts Roles in roleKeys order", async () => {
    const roles = [
      { id: "b", key: "guests", active: true, role_members: [member("u", null)] },
      { id: "a", key: "venue", active: true, role_members: [member("u", "x")] },
      { id: "c", key: "program", active: true, role_members: [] },
    ];
    const keys = (await load(roles, [], "u", false)).roles;
    expect(keys.map((r) => r.key)).toEqual(["venue", "guests", "program"]);
    expect(keys.map((r) => r.readable)).toEqual([true, false, false]);
    expect(keys[1].holders).toEqual([{ name: "u", pending: true }]);
    expect((await load(roles, [], "other", true)).roles.every((r) => r.readable)).toBe(true);
  });

  it("lets the Organizer or a joined Lead of an active Role create", async () => {
    const lead = (active: boolean, joined: string | null) => [
      { id: "a", key: "venue", active, role_members: [member("u", joined, true)] },
    ];
    expect((await load(lead(true, "x"), [], "u", false)).canCreate).toBe(true);
    expect((await load(lead(false, "x"), [], "u", false)).canCreate).toBe(false);
    expect((await load(lead(true, null), [], "u", false)).canCreate).toBe(false);
    expect((await load([], [], "o", true)).canCreate).toBe(true);
  });

  it("drops a Task without a deadline", async () => {
    const t = {
      id: "t",
      role_id: "a",
      parent_task_id: null,
      title: "x",
      deadline: null,
      created_at: "x",
      lifecycle: "active",
      obsolete: false,
      status: "not_started",
      owner_user_id: null,
      accepted_at: null,
      task_dependencies: [],
    };
    expect((await load([], [t], "u", true)).tasks).toEqual([]);
  });
});
describe("loadTimelineInput", () => {
  it("runs exactly two queries for 300 Tasks", async () => {
    const query = (data: unknown) => {
      const q = { eq: () => q, then: (f: (v: unknown) => unknown) => f({ data, error: null }) };
      return { select: () => q };
    };
    const tasks = Array.from({ length: 300 }, (_, i) => ({
      id: `t${i}`,
      role_id: "r1",
      parent_task_id: null,
      title: "x",
      deadline: "2026-12-01",
      created_at: "2026-11-01T00:00:00Z",
      lifecycle: "active",
      obsolete: false,
      status: "not_started",
      owner_user_id: null,
      accepted_at: null,
      task_dependencies: [],
    }));
    const roles = [
      {
        id: "r1",
        key: "venue",
        active: true,
        role_members: [{ user_id: "u", name: "Ann", is_lead: true, joined_at: "x" }],
      },
    ];
    const from = vi.fn((table: string) => query(table === "roles" ? roles : tasks));
    const out = await loadTimelineInput({ from } as never, "e1", "u", false);
    expect(from).toHaveBeenCalledTimes(2);
    expect(out.tasks).toHaveLength(300);
    expect(out.roles[0]).toMatchObject({ readable: true, lead: "Ann" });
  });

  it("throws when a query fails", async () => {
    const q = {
      eq: () => q,
      then: (f: (v: unknown) => unknown) => f({ data: null, error: { message: "x" } }),
    };
    await expect(
      loadTimelineInput({ from: () => ({ select: () => q }) } as never, "e1", "u", true),
    ).rejects.toThrow();
  });
});
