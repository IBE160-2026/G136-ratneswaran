import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const guestRow = vi.fn();
const contactRow = vi.fn();
const from = (table: string) => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: guestRow,
    single: contactRow,
  };
  return table === "guests" || table === "guest_contacts" ? chain : null;
};
const auth = { verifyOtp: vi.fn(), signOut: vi.fn() };
const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc, from, auth }),
  getClaims,
}));
const adminRpc = vi.fn();
const createUser = vi.fn();
const generateLink = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: adminRpc, auth: { admin: { createUser, generateLink } } }),
}));
const limit = vi.fn();
vi.mock("@/lib/limit", () => ({ limit }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const jar = new Map<string, string>();
const headerMap = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
  }),
  headers: async () => ({ get: (name: string) => headerMap.get(name) ?? null }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const { copyGuestLink, openGuestLink } = await import("./link-actions");
const { invitationText, readGuestLink } = await import("./link");

const eventId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const guestId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const TOKEN = "A".repeat(43);
const event = {
  name: "Summer party",
  starts_at: "2027-06-01T16:00:00Z",
  time_zone: "Europe/Oslo",
  language: "en",
};

beforeEach(() => {
  vi.clearAllMocks();
  jar.clear();
  jar.set("invite_token", TOKEN);
  headerMap.set("origin", "https://arrangly.test");
  getClaims.mockResolvedValue({ sub: "organizer" });
  limit.mockResolvedValue(null);
  guestRow.mockResolvedValue({ data: { name: "Ann Berg", events: event }, error: null });
  contactRow.mockResolvedValue({ data: { email: "ann@example.com" }, error: null });
  rpc.mockResolvedValue({ data: TOKEN, error: null });
  createUser.mockResolvedValue({ error: null });
});

describe("copyGuestLink", () => {
  it("returns the link and the invitation text in the Event's language", async () => {
    const link = `https://arrangly.test/api/invite/${TOKEN}`;
    expect(await copyGuestLink({ eventId, guestId })).toEqual({
      ok: true,
      data: {
        link,
        text: `Hi Ann! You're invited to Summer party on June 1, 2027. Open your personal invitation here: ${link}`,
      },
    });
    expect(rpc).toHaveBeenCalledWith("guests_copy_link", { p_guest_id: guestId, p_renew: false });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("creates a passwordless user on P0002 and calls again", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "P0002" } });
    expect(await copyGuestLink({ eventId, guestId, renew: true })).toMatchObject({ ok: true });
    expect(createUser).toHaveBeenCalledWith({
      email: "ann@example.com",
      email_confirm: true,
      app_metadata: { password_pending: true },
    });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenLastCalledWith("guests_copy_link", {
      p_guest_id: guestId,
      p_renew: true,
    });
  });

  it("retries when a concurrent copy created the user first", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "P0002" } });
    createUser.mockResolvedValue({ error: { code: "email_exists" } });
    expect(await copyGuestLink({ eventId, guestId })).toMatchObject({ ok: true });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("stops when the user cannot be created", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "P0002" } });
    createUser.mockResolvedValue({ error: { code: "unexpected_failure" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await copyGuestLink({ eventId, guestId })).toMatchObject({
      error: { message: "guests.link.errors.unavailable" },
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["42501", "events.wizard.errors.forbidden"],
    ["55000", "events.settings.errors.readOnly"],
    ["XX000", "guests.link.errors.unavailable"],
  ])("maps %s", async (code, message) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { code } });
    expect(await copyGuestLink({ eventId, guestId })).toMatchObject({ error: { message } });
    // Ids and codes only, never the guest's name or email.
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/Ann|ann@/);
  });

  it("refuses a guest of another Event", async () => {
    guestRow.mockResolvedValue({ data: null, error: null });
    expect(await copyGuestLink({ eventId, guestId })).toMatchObject({
      error: { code: "forbidden" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses bad ids before any call", async () => {
    expect(await copyGuestLink({ eventId, guestId: "x" })).toMatchObject({
      error: { code: "invalid_input" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("invitationText", () => {
  it("writes Norwegian for a Norwegian Event and has a variant without a date", () => {
    const link = "https://x/api/invite/t";
    expect(invitationText({ ...event, language: "nb", guestName: "Ann Berg", link })).toBe(
      `Hei Ann! Du er invitert til Summer party 1. juni 2027. Åpne den personlige invitasjonen din her: ${link}`,
    );
    expect(invitationText({ ...event, starts_at: null, guestName: "Ann", link })).toBe(
      `Hi Ann! You're invited to Summer party. Open your personal invitation here: ${link}`,
    );
  });
});

describe("readGuestLink", () => {
  it.each([
    ["no cookie", null],
    ["a malformed token", "short"],
  ])("reads %s as invalid without a call", async (_case, token) => {
    jar.clear();
    if (token) jar.set("invite_token", token);
    expect((await readGuestLink()).preview).toEqual({ status: "invalid" });
    expect(adminRpc).not.toHaveBeenCalled();
  });

  it("passes the preview's status on, and reads a failure as unavailable", async () => {
    adminRpc.mockResolvedValueOnce({
      data: [{ status: "revoked", organizer_name: "Ada" }],
      error: null,
    });
    expect((await readGuestLink()).preview).toMatchObject({
      status: "revoked",
      organizer_name: "Ada",
    });
    adminRpc.mockResolvedValueOnce({ data: null, error: { code: "XX000" } });
    expect((await readGuestLink()).preview).toEqual({ status: "unavailable" });
  });
});

describe("openGuestLink", () => {
  const open = (status: string) =>
    adminRpc.mockResolvedValue({
      data: [
        {
          status,
          user_id: status === "session" || status === "sign_in" ? userId : null,
          email: "ann@example.com",
        },
      ],
      error: null,
    });

  beforeEach(() => {
    getClaims.mockResolvedValue(null);
    generateLink.mockResolvedValue({ data: { properties: { hashed_token: "h" } }, error: null });
    auth.verifyOtp.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  });

  it("gives a guest-only user a session from the admin hash, then shows /invite", async () => {
    open("session");
    await expect(openGuestLink()).rejects.toThrow("REDIRECT /invite");
    expect(limit).toHaveBeenCalledWith("guest_open", { token: TOKEN }, "invite.errors");
    expect(generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "ann@example.com" });
    expect(auth.verifyOtp).toHaveBeenCalledWith({ type: "magiclink", token_hash: "h" });
  });

  it("signs out a session that belongs to someone else", async () => {
    open("session");
    auth.verifyOtp.mockResolvedValue({ data: { user: { id: "other" } }, error: null });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await openGuestLink()).toMatchObject({ error: { code: "unavailable" } });
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("asks anyone else to log in with their email", async () => {
    open("sign_in");
    expect(await openGuestLink()).toEqual({ ok: true, data: { email: "ann@example.com" } });
    expect(generateLink).not.toHaveBeenCalled();
  });

  it("refuses while logged in with another account", async () => {
    open("session");
    getClaims.mockResolvedValue({ sub: "other" });
    expect(await openGuestLink()).toMatchObject({ error: { message: "guestLink.otherAccount" } });
    expect(generateLink).not.toHaveBeenCalled();
  });

  it.each(["revoked", "cancelled", "ended", "invalid", "other_kind"])(
    "sends %s back to /invite without a session",
    async (status) => {
      open(status);
      await expect(openGuestLink()).rejects.toThrow("REDIRECT /invite");
      expect(generateLink).not.toHaveBeenCalled();
    },
  );

  it("stops at the limiter", async () => {
    limit.mockResolvedValue({
      ok: false,
      error: { code: "rate_limited", message: "invite.errors.rateLimited" },
    });
    expect(await openGuestLink()).toMatchObject({ error: { code: "rate_limited" } });
    expect(adminRpc).not.toHaveBeenCalled();
  });
});
