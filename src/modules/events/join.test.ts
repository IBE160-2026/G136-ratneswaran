import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
};
const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }), getClaims }));
const adminRpc = vi.fn();
const updateUserById = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: adminRpc, auth: { admin: { updateUserById } } }),
}));
const limit = vi.fn();
vi.mock("@/lib/limit", () => ({ limit }));
const jar = new Map<string, string>();
const deleteCookie = vi.fn((name: string) => jar.delete(name));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    delete: deleteCookie,
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const { joinEvent, sendJoinCode, setPasswordAndJoin, verifyJoinCode } = await import("./join");

const EVENT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const preview = (fields: Record<string, unknown> = {}) => ({
  data: [
    {
      status: "valid",
      event_id: EVENT,
      event_name: "Party",
      role_key: "venue",
      name: "Cleo",
      email: "cleo@example.com",
      has_account: false,
      ...fields,
    },
  ],
  error: null,
});
const joined = { data: [{ status: "joined", event_id: EVENT }], error: null };
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const calls = (name: string) => adminRpc.mock.calls.filter(([fn]) => fn === name);

beforeEach(() => {
  vi.clearAllMocks();
  jar.clear();
  jar.set("invite_token", "tok");
  limit.mockResolvedValue(null);
  getClaims.mockResolvedValue({ sub: "u1", email: "Cleo@Example.com" });
  adminRpc.mockImplementation(async (fn: string) =>
    fn === "events_invite_preview" ? preview() : joined,
  );
  for (const fn of Object.values(auth)) fn.mockResolvedValue({ error: null });
  updateUserById.mockResolvedValue({ error: null });
});

describe("sendJoinCode", () => {
  it("limits by token, then sends a code to the previewed address without creating a user", async () => {
    expect(await sendJoinCode()).toEqual({ ok: true, data: null });
    expect(limit).toHaveBeenCalledWith("invite", { token: "tok" }, "invite.errors");
    expect(auth.signInWithOtp).toHaveBeenCalledExactlyOnceWith({
      email: "cleo@example.com",
      options: { shouldCreateUser: false },
    });
  });

  it("sends nothing, and reads no invitation, when limited", async () => {
    limit.mockResolvedValue({ ok: false, error: { code: "rate_limited" } });
    expect(await sendJoinCode()).toMatchObject({ error: { code: "rate_limited" } });
    expect(adminRpc).not.toHaveBeenCalled();
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("refuses a used link and clears its cookie", async () => {
    adminRpc.mockResolvedValue({ data: [{ status: "used" }], error: null });
    expect(await sendJoinCode()).toMatchObject({ error: { message: "invite.used" } });
    expect(deleteCookie).toHaveBeenCalledWith("invite_token");
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("reads no cookie as used", async () => {
    jar.clear();
    expect(await sendJoinCode()).toMatchObject({ error: { message: "invite.used" } });
    expect(limit).not.toHaveBeenCalled();
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("gives the expiry text for an ended Event", async () => {
    adminRpc.mockResolvedValue({ data: [{ status: "expired" }], error: null });
    expect(await sendJoinCode()).toMatchObject({ error: { message: "invite.expired" } });
  });
});

describe("verifyJoinCode", () => {
  it("verifies against the previewed address, never one from the client", async () => {
    await expect(
      verifyJoinCode(null, form({ code: "123456", email: "evil@example.com" })),
    ).rejects.toThrow("REDIRECT /invite");
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: "cleo@example.com",
      token: "123456",
      type: "email",
    });
  });

  it("limits code attempts per link before checking a code", async () => {
    limit.mockResolvedValue({ ok: false, error: { code: "rate_limited" } });
    expect(await verifyJoinCode(null, form({ code: "123456" }))).toMatchObject({
      error: { code: "rate_limited" },
    });
    expect(limit).toHaveBeenCalledWith("join_code", { token: "tok" }, "invite.errors");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("maps a wrong or expired code to the code field", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { code: "otp_expired", status: 403 } });
    expect(await verifyJoinCode(null, form({ code: "000000" }))).toMatchObject({
      error: { fields: { code: "invite.errors.code" } },
    });
  });

  it("refuses a malformed code without calling Auth", async () => {
    expect(await verifyJoinCode(null, form({ code: "12ab" }))).toMatchObject({
      error: { fields: { code: "invite.errors.code" } },
    });
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });
});

describe("setPasswordAndJoin", () => {
  it("saves the password, then joins as the session user and lands on the Event", async () => {
    await expect(setPasswordAndJoin(null, form({ password: "abcdefg1" }))).rejects.toThrow(
      `REDIRECT /events/${EVENT}`,
    );
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "abcdefg1" });
    expect(updateUserById).toHaveBeenCalledWith("u1", {
      app_metadata: { password_pending: false },
    });
    expect(calls("events_join_role")).toEqual([
      ["events_join_role", { p_token: "tok", p_user_id: "u1" }],
    ]);
    expect(auth.updateUser.mock.invocationCallOrder[0]).toBeLessThan(
      adminRpc.mock.invocationCallOrder.at(-1)!,
    );
    expect(deleteCookie).toHaveBeenCalledWith("invite_token");
  });

  it("does not join when the password is not saved", async () => {
    auth.updateUser.mockResolvedValue({ error: { code: "weak_password" } });
    expect(await setPasswordAndJoin(null, form({ password: "abcdefg1" }))).toMatchObject({
      error: { fields: { password: "auth.signUp.errors.password" } },
    });
    auth.updateUser.mockResolvedValue({ error: { code: "x" } });
    expect(await setPasswordAndJoin(null, form({ password: "abcdefg1" }))).toMatchObject({
      error: { code: "unavailable" },
    });
    auth.updateUser.mockResolvedValue({ error: null });
    updateUserById.mockResolvedValue({ error: { code: "x" } });
    expect(await setPasswordAndJoin(null, form({ password: "abcdefg1" }))).toMatchObject({
      error: { code: "unavailable" },
    });
    expect(calls("events_join_role")).toEqual([]);
  });

  it("refuses a password that breaks the rules", async () => {
    expect(await setPasswordAndJoin(null, form({ password: "short" }))).toMatchObject({
      error: { fields: { password: "auth.signUp.errors.password" } },
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("sets no password for a session of another address", async () => {
    getClaims.mockResolvedValue({ sub: "u2", email: "other@example.com" });
    expect(await setPasswordAndJoin(null, form({ password: "abcdefg1" }))).toMatchObject({
      error: { code: "mismatch", message: "invite.mismatch" },
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("sets no password for an account that already has one", async () => {
    adminRpc.mockImplementation(async (fn: string) =>
      fn === "events_invite_preview" ? preview({ has_account: true }) : joined,
    );
    await expect(setPasswordAndJoin(null, form({ password: "abcdefg1" }))).rejects.toThrow(
      "REDIRECT",
    );
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});

describe("joinEvent", () => {
  it("sends a visitor without a session to log in", async () => {
    getClaims.mockResolvedValue(null);
    await expect(joinEvent()).rejects.toThrow("REDIRECT /login?next=/invite");
  });

  it.each([
    ["mismatch", "invite.mismatch"],
    ["used", "invite.used"],
    ["invalid", "invite.used"],
    ["expired", "invite.expired"],
  ])("maps %s", async (status, message) => {
    adminRpc.mockResolvedValue({ data: [{ status, event_id: null }], error: null });
    expect(await joinEvent()).toMatchObject({ ok: false, error: { message } });
  });

  it("logs ids only when the join fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    adminRpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    expect(await joinEvent()).toMatchObject({ error: { code: "unavailable" } });
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/@|tok/);
    log.mockRestore();
  });
});
