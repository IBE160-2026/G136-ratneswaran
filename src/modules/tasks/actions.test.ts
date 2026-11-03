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

const { createTask, dismissTask, restoreTask, updateTask } = await import("./actions");

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
