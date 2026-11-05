import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const getClaims = vi.fn();
const updated = vi.fn();
const eqUpdatedAt = vi.fn(() => ({ select: updated }));
const read = vi.fn();
const eq = (rows: unknown) => ({ eq: () => rows });
const from = () => ({
  update: () => ({ eq: () => ({ eq: eqUpdatedAt }) }),
  select: () => eq({ single: read }),
});
const revalidatePath = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc, from }), getClaims }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const {
  addDependency,
  addSubtask,
  createTask,
  delegateTask,
  dismissTask,
  promoteSubtask,
  removeDependency,
  removeStatusNote,
  restoreTask,
  setTaskStatus,
  updateTask,
} = await import("./actions");

const eventId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const taskId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const roleId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
const create = (extra: Record<string, string> = {}) =>
  form({
    eventId,
    id: taskId,
    roleId,
    title: " Book hall ",
    description: "",
    kind: "date",
    deadline: "2027-01-15",
    daysBefore: "",
    ...extra,
  });
const edit = (extra: Record<string, string> = {}) =>
  form({
    eventId,
    taskId,
    expected: "2026-11-03T10:00:00.123456+00:00",
    title: "Book hall",
    description: "",
    kind: "days",
    deadline: "",
    daysBefore: "14",
    ...extra,
  });

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ sub: "u1" });
  rpc.mockResolvedValue({ error: null });
  updated.mockResolvedValue({ data: [{ updated_at: "fresh" }], error: null });
  read.mockResolvedValue({ data: { updated_at: "moved" }, error: null });
});

describe("createTask", () => {
  it("creates with a fixed date and opens the Task", async () => {
    await expect(createTask(null, create())).rejects.toThrow(
      `REDIRECT /events/${eventId}/tasks/${taskId}`,
    );
    expect(rpc).toHaveBeenCalledWith("tasks_create", {
      p_id: taskId,
      p_role_id: roleId,
      p_title: "Book hall",
      p_description: undefined,
      p_deadline: "2027-01-15",
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/events/${eventId}`, "layout");
  });

  it("sends days before as a number", async () => {
    await expect(createTask(null, create({ kind: "days", daysBefore: "14" }))).rejects.toThrow(
      "REDIRECT",
    );
    expect(rpc).toHaveBeenCalledWith(
      "tasks_create",
      expect.objectContaining({ p_days_before: 14 }),
    );
  });

  it.each(["-1", "366", "1.5", "", "abc"])(
    "refuses %j days before without calling the database",
    async (days) => {
      expect(await createTask(null, create({ kind: "days", daysBefore: days }))).toMatchObject({
        ok: false,
        error: { fields: { daysBefore: "tasks.errors.daysBefore" } },
      });
      expect(rpc).not.toHaveBeenCalled();
    },
  );

  it("refuses a blank title, a long title and a bad date", async () => {
    expect(await createTask(null, create({ title: "  " }))).toMatchObject({
      error: { fields: { title: "tasks.errors.title" } },
    });
    expect(await createTask(null, create({ title: "a".repeat(121) }))).toMatchObject({
      error: { fields: { title: "tasks.errors.title" } },
    });
    expect(await createTask(null, create({ deadline: "2027-02-31" }))).toMatchObject({
      error: { fields: { deadline: "tasks.errors.deadline" } },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "forbidden", "tasks.errors.forbidden"],
    ["55000", "read_only", "tasks.errors.readOnly"],
    ["40001", "concurrent", "tasks.errors.concurrent"],
    ["22023", "invalid_input", "tasks.errors.invalidInput"],
    ["XX000", "unavailable", "tasks.errors.unavailable"],
  ])("maps %s to %s", async (code, name, message) => {
    rpc.mockResolvedValue({ error: { code } });
    expect(await createTask(null, create())).toMatchObject({
      ok: false,
      error: { code: name, message },
    });
  });

  it("logs ids and the code, never the title", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ error: { code: "42501" } });
    await createTask(null, create({ title: "Secret surprise" }));
    expect(JSON.stringify(log.mock.calls)).not.toContain("Secret surprise");
    log.mockRestore();
  });

  it("sends a signed-out caller to log in", async () => {
    getClaims.mockResolvedValue(null);
    await expect(createTask(null, create())).rejects.toThrow(
      `REDIRECT /login?next=/events/${eventId}/tasks`,
    );
  });
});

describe("updateTask", () => {
  it("sets the deadline first, then edits the text guarded by the returned updated_at", async () => {
    rpc.mockResolvedValue({ data: "fresh", error: null });
    expect(await updateTask(null, edit())).toEqual({ ok: true, data: null });
    expect(rpc).toHaveBeenCalledWith("tasks_set_deadline", {
      p_task_id: taskId,
      p_expected: "2026-11-03T10:00:00.123456+00:00",
      p_days_before: 14,
    });
    expect(eqUpdatedAt).toHaveBeenCalledWith("updated_at", "fresh");
  });

  it("reports a concurrent edit when no row matched the returned updated_at", async () => {
    rpc.mockResolvedValue({ data: "fresh", error: null });
    updated.mockResolvedValue({ data: [], error: null });
    expect(await updateTask(null, edit())).toMatchObject({
      ok: false,
      error: { code: "concurrent" },
    });
  });

  it("maps a stale deadline call to the concurrent edit and saves no text", async () => {
    rpc.mockResolvedValue({ error: { code: "40001" } });
    updated.mockClear();
    expect(await updateTask(null, edit())).toMatchObject({ ok: false });
    expect(updated).not.toHaveBeenCalled();
    expect(await updateTask(null, edit())).toMatchObject({
      ok: false,
      error: { code: "concurrent" },
    });
  });
});

describe("dismissTask and restoreTask", () => {
  const input = { eventId, taskId, expected: "2026-11-03T10:00:00.123456+00:00" };

  it("passes the raw expected string and returns the moved updated_at", async () => {
    expect(await dismissTask(input)).toEqual({ ok: true, data: { updatedAt: "moved" } });
    expect(rpc).toHaveBeenCalledWith("tasks_dismiss", {
      p_task_id: taskId,
      p_expected: input.expected,
    });
    expect(await restoreTask(input)).toEqual({ ok: true, data: { updatedAt: "moved" } });
    expect(rpc).toHaveBeenLastCalledWith("tasks_restore", {
      p_task_id: taskId,
      p_expected: input.expected,
    });
  });

  it("refuses malformed input and maps a stale call", async () => {
    expect(await dismissTask({ ...input, taskId: "nope" })).toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ error: { code: "40001" } });
    expect(await dismissTask(input)).toMatchObject({ ok: false, error: { code: "concurrent" } });
  });
});

describe("addSubtask", () => {
  const parentId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const subtask = (extra: Record<string, string> = {}) =>
    form({
      eventId,
      id: taskId,
      parentId,
      roleId,
      title: " Order flowers ",
      kind: "date",
      deadline: "2027-01-10",
      daysBefore: "",
      ...extra,
    });

  it("creates through tasks_create with the parent and stays on the page", async () => {
    expect(await addSubtask(null, subtask())).toEqual({ ok: true, data: null });
    expect(rpc).toHaveBeenCalledWith("tasks_create", {
      p_id: taskId,
      p_role_id: roleId,
      p_title: "Order flowers",
      p_parent_id: parentId,
      p_deadline: "2027-01-10",
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/events/${eventId}`, "layout");
  });

  it("refuses a blank title and a bad date without calling the database", async () => {
    expect(await addSubtask(null, subtask({ title: " ", deadline: "2027-02-31" }))).toMatchObject({
      error: { fields: { title: "tasks.errors.title", deadline: "tasks.errors.deadline" } },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("explains a nesting or parent refusal in its own words", async () => {
    rpc.mockResolvedValue({ error: { code: "23514" } });
    expect(await addSubtask(null, subtask())).toMatchObject({
      ok: false,
      error: { message: "tasks.errors.subtaskInvalid" },
    });
  });
});

describe("promoteSubtask", () => {
  const input = { eventId, taskId, expected: "2026-11-03T10:00:00.123456+00:00" };

  it("passes the raw expected string", async () => {
    expect(await promoteSubtask(input)).toEqual({ ok: true, data: null });
    expect(rpc).toHaveBeenCalledWith("tasks_promote_subtask", {
      p_task_id: taskId,
      p_expected: input.expected,
    });
  });

  it("maps a stale call to the concurrent edit", async () => {
    rpc.mockResolvedValue({ error: { code: "40001" } });
    expect(await promoteSubtask(input)).toMatchObject({ error: { code: "concurrent" } });
  });
});

describe("dependencies", () => {
  const input = { eventId, taskId, dependsOnId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" };

  it("adds and removes through the matching function", async () => {
    expect(await addDependency(input)).toEqual({ ok: true, data: null });
    expect(rpc).toHaveBeenLastCalledWith("tasks_add_dependency", {
      p_task_id: taskId,
      p_depends_on_id: input.dependsOnId,
    });
    expect(await removeDependency(input)).toEqual({ ok: true, data: null });
    expect(rpc).toHaveBeenLastCalledWith("tasks_remove_dependency", {
      p_task_id: taskId,
      p_depends_on_id: input.dependsOnId,
    });
  });

  it("refuses malformed ids", async () => {
    expect(await addDependency({ ...input, dependsOnId: "nope" })).toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("explains a cycle or a cross-Role refusal, and denies a non-owner", async () => {
    rpc.mockResolvedValue({ error: { code: "23514" } });
    expect(await addDependency(input)).toMatchObject({
      error: { message: "tasks.errors.dependencyInvalid" },
    });
    rpc.mockResolvedValue({ error: { code: "42501" } });
    expect(await addDependency(input)).toMatchObject({ error: { code: "forbidden" } });
  });
});

describe("restoring under a dismissed parent", () => {
  it("maps 22023 to its own message", async () => {
    rpc.mockResolvedValue({ error: { code: "22023" } });
    expect(
      await restoreTask({ eventId, taskId, expected: "2026-11-03T10:00:00.123456+00:00" }),
    ).toMatchObject({ ok: false, error: { message: "tasks.errors.parentDismissed" } });
  });
});

describe("dismissing with open links", () => {
  it("maps 55006 to its own message", async () => {
    rpc.mockResolvedValue({ error: { code: "55006" } });
    expect(
      await dismissTask({ eventId, taskId, expected: "2026-11-03T10:00:00.123456+00:00" }),
    ).toMatchObject({ ok: false, error: { code: "has_links", message: "tasks.errors.hasLinks" } });
  });
});

describe("setTaskStatus", () => {
  const input = {
    eventId,
    taskId,
    expected: "2026-11-03T10:00:00.123456+00:00",
    status: "in_progress",
    note: " Called the hall ",
  };

  it("trims the note and returns the moved updated_at as the raw string", async () => {
    rpc.mockResolvedValue({ data: "2026-11-04T10:00:00.654321+00:00", error: null });
    expect(await setTaskStatus(input)).toEqual({
      ok: true,
      data: { updatedAt: "2026-11-04T10:00:00.654321+00:00" },
    });
    expect(rpc).toHaveBeenCalledWith("tasks_set_status", {
      p_task_id: taskId,
      p_expected: input.expected,
      p_status: "in_progress",
      p_note: "Called the hall",
    });
  });

  it("sends no note when it is blank", async () => {
    rpc.mockResolvedValue({ data: "x", error: null });
    await setTaskStatus({ ...input, note: "   " });
    expect(rpc).toHaveBeenCalledWith(
      "tasks_set_status",
      expect.objectContaining({ p_note: undefined }),
    );
  });

  it("refuses overdue, a long note and a bad id without calling the database", async () => {
    expect(await setTaskStatus({ ...input, status: "overdue" })).toMatchObject({ ok: false });
    expect(await setTaskStatus({ ...input, note: "a".repeat(501) })).toMatchObject({ ok: false });
    expect(await setTaskStatus({ ...input, taskId: "nope" })).toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps accept-first, a stale edit and a denial", async () => {
    rpc.mockResolvedValue({ error: { code: "55007" } });
    expect(await setTaskStatus(input)).toMatchObject({
      error: { code: "accept_first", message: "tasks.errors.acceptFirst" },
    });
    rpc.mockResolvedValue({ error: { code: "40001" } });
    expect(await setTaskStatus(input)).toMatchObject({ error: { code: "concurrent" } });
    rpc.mockResolvedValue({ error: { code: "42501" } });
    expect(await setTaskStatus(input)).toMatchObject({ error: { code: "forbidden" } });
  });
});

describe("removeStatusNote", () => {
  const input = { eventId, historyId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" };

  it("calls the function with the history id", async () => {
    expect(await removeStatusNote(input)).toEqual({ ok: true, data: null });
    expect(rpc).toHaveBeenCalledWith("tasks_remove_status_note", { p_history_id: input.historyId });
  });

  it("denies someone else's note and refuses a bad id", async () => {
    rpc.mockResolvedValue({ error: { code: "42501" } });
    expect(await removeStatusNote(input)).toMatchObject({ error: { code: "forbidden" } });
    expect(await removeStatusNote({ ...input, historyId: "nope" })).toMatchObject({ ok: false });
  });
});

describe("delegateTask", () => {
  const input = {
    eventId,
    taskId,
    expected: "2026-11-03T10:00:00.123456+00:00",
    newOwner: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  };

  it("calls the function and returns the moved updated_at as the raw string", async () => {
    rpc.mockResolvedValue({ data: "2026-11-04T10:00:00.654321+00:00", error: null });
    expect(await delegateTask(input)).toEqual({
      ok: true,
      data: { updatedAt: "2026-11-04T10:00:00.654321+00:00" },
    });
    expect(rpc).toHaveBeenCalledWith("tasks_delegate", {
      p_task_id: taskId,
      p_new_owner: input.newOwner,
      p_expected: input.expected,
    });
  });

  it("refuses a bad id without calling the database", async () => {
    expect(await delegateTask({ ...input, newOwner: "nope" })).toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps a denial, a stale edit, an inactive Task and a read-only Event", async () => {
    rpc.mockResolvedValue({ error: { code: "42501" } });
    expect(await delegateTask(input)).toMatchObject({ error: { code: "forbidden" } });
    rpc.mockResolvedValue({ error: { code: "40001" } });
    expect(await delegateTask(input)).toMatchObject({ error: { code: "concurrent" } });
    rpc.mockResolvedValue({ error: { code: "22023" } });
    expect(await delegateTask(input)).toMatchObject({ error: { code: "invalid_input" } });
    rpc.mockResolvedValue({ error: { code: "55000" } });
    expect(await delegateTask(input)).toMatchObject({ error: { code: "read_only" } });
  });
});
