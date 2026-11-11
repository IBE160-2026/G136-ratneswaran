import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn();
const signOut = vi.fn();
const getClaims = vi.fn();
const jar = { get: vi.fn(), set: vi.fn() };
const query = { select: () => query, eq, maybeSingle };
eq.mockReturnValue(query);
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc, from: () => query, auth: { signOut } }),
  getClaims,
}));

const { deleteMyData } = await import("./delete-actions");

const eventId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const guestId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

beforeEach(() => {
  vi.clearAllMocks();
  eq.mockReturnValue(query);
  getClaims.mockResolvedValue({ sub: "guest" });
  maybeSingle.mockResolvedValue({ data: { id: guestId }, error: null });
  rpc.mockResolvedValue({ data: "deleted", error: null });
  jar.get.mockReturnValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("deleteMyData", () => {
  it("parses before anything else", async () => {
    expect(await deleteMyData({ eventId: "x", guestId })).toMatchObject({
      ok: false,
      error: { code: "invalid_input" },
    });
    expect(getClaims).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("finds the guest from the session and the Event, never from input", async () => {
    expect(await deleteMyData({ eventId, guestId: "someone-else" })).toEqual({
      ok: true,
      data: { deleted: true },
    });
    expect(eq.mock.calls).toEqual([
      ["event_id", eventId],
      ["user_id", "guest"],
    ]);
    expect(rpc).toHaveBeenCalledWith("guests_delete_guest_data", { p_guest_id: guestId });
    expect(jar.set).toHaveBeenCalledWith(
      "guest_deleted",
      eventId,
      expect.objectContaining({ httpOnly: true, path: "/rsvp" }),
    );
    // A kept user stays signed in.
    expect(signOut).not.toHaveBeenCalled();
  });

  it("drops the session cookies when the auth user was deleted", async () => {
    rpc.mockResolvedValue({ data: "deleted_with_user", error: null });
    expect(await deleteMyData({ eventId })).toEqual({ ok: true, data: { deleted: true } });
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("still reports the committed delete when dropping the session throws", async () => {
    rpc.mockResolvedValue({ data: "deleted_with_user", error: null });
    signOut.mockRejectedValueOnce(new Error("network"));
    expect(await deleteMyData({ eventId })).toEqual({ ok: true, data: { deleted: true } });
  });

  it.each([
    [
      "the function had nothing to delete",
      () => rpc.mockResolvedValue({ data: "nothing", error: null }),
    ],
    ["the guest row is gone", () => maybeSingle.mockResolvedValue({ data: null, error: null })],
  ])("reports already deleted when %s", async (_, arrange) => {
    arrange();
    expect(await deleteMyData({ eventId })).toEqual({ ok: true, data: { deleted: false } });
    expect(jar.set).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("without a session, reports already deleted only with this Event's marker", async () => {
    getClaims.mockResolvedValue(null);
    expect(await deleteMyData({ eventId })).toMatchObject({
      ok: false,
      error: { code: "no_session", message: "rsvp.delete.errors.noSession" },
    });
    jar.get.mockReturnValue({ value: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" });
    expect(await deleteMyData({ eventId })).toMatchObject({ ok: false });
    jar.get.mockReturnValue({ value: eventId });
    expect(await deleteMyData({ eventId })).toEqual({ ok: true, data: { deleted: false } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    [
      "the function",
      () => rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "Ann" } }),
    ],
    ["the lookup", () => maybeSingle.mockResolvedValue({ data: null, error: { code: "XX000" } })],
  ])("refuses as unavailable when %s fails, logging only ids and the code", async (_, arrange) => {
    arrange();
    expect(await deleteMyData({ eventId })).toMatchObject({
      ok: false,
      error: { code: "unavailable", message: "rsvp.delete.errors.unavailable" },
    });
    expect(console.error).toHaveBeenCalledWith("deleteMyData failed", {
      eventId,
      userId: "guest",
      code: "XX000",
    });
    expect(jar.set).not.toHaveBeenCalled();
  });
});
