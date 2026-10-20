import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const getClaims = vi.fn();
const contacts = vi.fn();
const from = () => ({ select: () => ({ eq: contacts }) });
const revalidatePath = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc, from }), getClaims }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const { addGuests, removeGuest, restoreGuest, updateGuest } = await import("./actions");

const eventId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const form = (rows: string) => {
  const data = new FormData();
  data.set("eventId", eventId);
  data.set("rows", rows);
  return data;
};
const reason = (key: string) => `guests.add.reasons.${key}`;

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ sub: "u1" });
  contacts.mockResolvedValue({ data: [], error: null });
  rpc.mockResolvedValue({ data: [], error: null });
});

describe("addGuests", () => {
  it("adds the valid rows and revalidates the Event's pages", async () => {
    expect(await addGuests(null, form("Ann Berg, ann@x.no\nBo\tbo@x.no"))).toEqual({
      ok: true,
      data: { added: 2, failed: [] },
    });
    expect(rpc).toHaveBeenCalledWith("guests_add", {
      p_event_id: eventId,
      p_rows: [
        { name: "Ann Berg", email: "ann@x.no" },
        { name: "Bo", email: "bo@x.no" },
      ],
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/events/${eventId}`, "layout");
  });

  it("reports failed rows next to the added ones", async () => {
    contacts.mockResolvedValue({ data: [{ email: "Cia@x.no" }], error: null });
    expect(await addGuests(null, form("Ann, ann@x.no\nDan, dan@\nCia, cia@x.no"))).toEqual({
      ok: true,
      data: {
        added: 1,
        failed: [
          { line: "Dan, dan@", reason: reason("invalidEmail") },
          { line: "Cia, cia@x.no", reason: reason("alreadyListed") },
        ],
      },
    });
  });

  it("does not call the database when every row fails", async () => {
    const result = await addGuests(null, form("Dan, dan@"));
    expect(result).toMatchObject({ ok: true, data: { added: 0 } });
    expect(rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("counts an email another tab added first as a duplicate", async () => {
    rpc.mockResolvedValue({ data: ["ANN@x.no"], error: null });
    expect(await addGuests(null, form("Ann, ann@x.no\nBo, bo@x.no"))).toEqual({
      ok: true,
      data: { added: 1, failed: [{ line: "Ann, ann@x.no", reason: reason("duplicate") }] },
    });
  });

  it("refuses empty input and input over 100 000 characters", async () => {
    expect(await addGuests(null, form(" \n "))).toMatchObject({
      ok: false,
      error: { code: "invalid_input", fields: { rows: "guests.add.errors.empty" } },
    });
    expect(await addGuests(null, form("x".repeat(100_001)))).toMatchObject({
      ok: false,
      error: { code: "invalid_input", fields: { rows: "guests.add.errors.tooLong" } },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "forbidden"],
    ["55000", "read_only"],
    ["23514", "invalid_input"],
    ["22023", "invalid_input"],
    ["XX000", "unavailable"],
  ])("maps database error %s to %s and logs no guest data", async (code, expected) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { code } });
    expect(await addGuests(null, form("Ann Berg, ann@x.no"))).toMatchObject({
      ok: false,
      error: { code: expected },
    });
    expect(log).toHaveBeenCalledWith("addGuests failed", { eventId, userId: "u1", code });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/Ann|ann@x\.no/);
    log.mockRestore();
  });

  it("refuses when the existing list cannot be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    contacts.mockResolvedValue({ data: null, error: { code: "08006" } });
    expect(await addGuests(null, form("Ann, ann@x.no"))).toMatchObject({
      ok: false,
      error: { code: "unavailable" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends a signed-out caller to log in", async () => {
    getClaims.mockResolvedValue(null);
    await expect(addGuests(null, form("Ann, ann@x.no"))).rejects.toThrow(
      `REDIRECT /login?next=/events/${eventId}/guests`,
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses a malformed event id", async () => {
    const data = form("Ann, ann@x.no");
    data.set("eventId", "nope");
    expect(await addGuests(null, data)).toMatchObject({
      ok: false,
      error: { code: "invalid_input" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});

const guestId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const edit = (name: string, email: string) => {
  const data = new FormData();
  data.set("eventId", eventId);
  data.set("guestId", guestId);
  data.set("name", name);
  data.set("email", email);
  return data;
};

describe("updateGuest", () => {
  it("saves the trimmed name and email and revalidates the Event's pages", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await updateGuest(null, edit(" Ann Dahl ", " ann.berg@x.no "))).toEqual({
      ok: true,
      data: null,
    });
    expect(rpc).toHaveBeenCalledWith("guests_update", {
      p_guest_id: guestId,
      p_name: "Ann Dahl",
      p_email: "ann.berg@x.no",
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/events/${eventId}`, "layout");
  });

  it.each([
    [" ", "ann@x.no", { name: reason("invalidName") }],
    ["Ann", "ann@", { email: reason("invalidEmail") }],
    ["Ann\u2028Dahl", "ann@x.no", { name: reason("invalidCharacters") }],
  ])("refuses %j / %j with a field error and no call", async (name, email, fields) => {
    expect(await updateGuest(null, edit(name, email))).toMatchObject({
      ok: false,
      error: { code: "invalid_input", fields },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["23505", "duplicate"],
    ["42501", "forbidden"],
    ["55000", "read_only"],
    ["23514", "invalid_input"],
    ["XX000", "unavailable"],
  ])("maps database error %s to %s and logs no guest data", async (code, expected) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { code } });
    expect(await updateGuest(null, edit("Ann Berg", "ann@x.no"))).toMatchObject({
      ok: false,
      error: { code: expected },
    });
    expect(log).toHaveBeenCalledWith("updateGuest failed", { eventId, userId: "u1", code });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/Ann|ann@x\.no/);
    expect(revalidatePath).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it("shows a taken email on the email field", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { code: "23505" } });
    expect(await updateGuest(null, edit("Ann", "bo@x.no"))).toMatchObject({
      ok: false,
      error: { fields: { email: reason("alreadyListed") } },
    });
  });

  it("refuses a malformed guest id", async () => {
    const data = edit("Ann", "ann@x.no");
    data.set("guestId", "nope");
    expect(await updateGuest(null, data)).toMatchObject({
      ok: false,
      error: { code: "invalid_input" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends a signed-out caller to log in", async () => {
    getClaims.mockResolvedValue(null);
    await expect(updateGuest(null, edit("Ann", "ann@x.no"))).rejects.toThrow(
      `REDIRECT /login?next=/events/${eventId}/guests`,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("removeGuest", () => {
  it("removes the guest and revalidates", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await removeGuest({ eventId, guestId })).toEqual({ ok: true, data: null });
    expect(rpc).toHaveBeenCalledWith("guests_remove", { p_guest_id: guestId });
    expect(revalidatePath).toHaveBeenCalledWith(`/events/${eventId}`, "layout");
  });

  it.each([
    ["42501", "forbidden"],
    ["55000", "read_only"],
    ["XX000", "unavailable"],
  ])("maps database error %s to %s with ids-only logs", async (code, expected) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { code } });
    expect(await removeGuest({ eventId, guestId })).toMatchObject({
      ok: false,
      error: { code: expected },
    });
    expect(log).toHaveBeenCalledWith("removeGuest failed", { eventId, userId: "u1", code });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/Ann|ann@x\.no/);
    log.mockRestore();
  });

  it("refuses a malformed guest id", async () => {
    expect(await removeGuest({ eventId, guestId: "nope" })).toMatchObject({
      ok: false,
      error: { code: "invalid_input" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("restoreGuest", () => {
  it("adds the same name and email again", async () => {
    expect(await restoreGuest({ eventId, name: "Ann Berg", email: "ann@x.no" })).toEqual({
      ok: true,
      data: null,
    });
    expect(rpc).toHaveBeenCalledWith("guests_add", {
      p_event_id: eventId,
      p_rows: [{ name: "Ann Berg", email: "ann@x.no" }],
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/events/${eventId}`, "layout");
  });

  it("refuses when the email was added again first", async () => {
    rpc.mockResolvedValue({ data: ["ann@x.no"], error: null });
    expect(await restoreGuest({ eventId, name: "Ann Berg", email: "ann@x.no" })).toEqual({
      ok: false,
      error: { code: "duplicate", message: "guests.list.errors.restoreDuplicate" },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses an invalid email without a call", async () => {
    expect(await restoreGuest({ eventId, name: "Ann Berg", email: "ann@" })).toMatchObject({
      ok: false,
      error: { code: "invalid_input" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps a database error with ids-only logs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { code: "55000" } });
    expect(await restoreGuest({ eventId, name: "Ann Berg", email: "ann@x.no" })).toMatchObject({
      ok: false,
      error: { code: "read_only" },
    });
    expect(log).toHaveBeenCalledWith("restoreGuest failed", {
      eventId,
      userId: "u1",
      code: "55000",
    });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/Ann|ann@x\.no/);
    log.mockRestore();
  });
});
