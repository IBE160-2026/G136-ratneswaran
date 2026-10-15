import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  updateUser: vi.fn(),
  refreshSession: vi.fn(),
  linkIdentity: vi.fn(),
  exchangeCodeForSession: vi.fn(),
};
const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }), getClaims }));
const headerValues = new Headers({ origin: "http://x.test" });
const cookieSet = vi.fn();
vi.mock("next/headers", () => ({
  headers: async () => headerValues,
  cookies: async () => ({ set: cookieSet }),
}));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const actions = await import("./actions");
const { GET } = await import("../../../app/auth/callback/route");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ email: "me@x.test" });
  auth.updateUser.mockResolvedValue({ error: null });
  auth.refreshSession.mockResolvedValue({ error: null });
  auth.linkIdentity.mockResolvedValue({ data: { url: "http://p.test/a" }, error: null });
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
});

describe.each([
  ["updateName", "name", "  Ada L  ", { name: "Ada L" }],
  ["updateLanguage", "language", "nb", { language: "nb" }],
  ["updateAppearance", "theme", "dark", { theme: "dark" }],
] as const)("%s", (action, field, value, data) => {
  it("saves the value, refreshes the token and revalidates", async () => {
    expect(await actions[action](null, form({ [field]: value }))).toEqual({ ok: true, data: null });
    expect(auth.updateUser).toHaveBeenCalledWith({ data });
    expect(auth.refreshSession).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("rejects invalid input without calling Auth", async () => {
    const result = await actions[action](null, form({ [field]: "x".repeat(81) }));
    expect(result).toMatchObject({ ok: false, error: { code: "invalid_input" } });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("is unavailable when Auth fails", async () => {
    auth.updateUser.mockResolvedValue({ error: { code: "x" } });
    expect(await actions[action](null, form({ [field]: value }))).toMatchObject({
      error: { code: "unavailable" },
    });
  });

  it("is unavailable without a session", async () => {
    getClaims.mockResolvedValue(null);
    expect(await actions[action](null, form({ [field]: value }))).toMatchObject({
      error: { code: "unavailable" },
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });
});

it("refuses an empty name with a field error", async () => {
  expect(await actions.updateName(null, form({ name: "   " }))).toMatchObject({
    error: { fields: { name: "profile.name.errors.name" } },
  });
});

describe("updateEmail", () => {
  it("asks Auth to confirm the new address", async () => {
    expect(await actions.updateEmail(null, form({ email: "new@x.test" }))).toMatchObject({
      ok: true,
    });
    expect(auth.updateUser).toHaveBeenCalledWith({ email: "new@x.test" });
  });

  it("answers the same for the current or a taken address", async () => {
    expect(await actions.updateEmail(null, form({ email: "ME@x.test" }))).toMatchObject({
      ok: true,
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
    auth.updateUser.mockResolvedValue({ error: { code: "email_exists" } });
    expect(await actions.updateEmail(null, form({ email: "taken@x.test" }))).toMatchObject({
      ok: true,
    });
  });

  it("rejects a bad address, an Auth failure and no session", async () => {
    expect(await actions.updateEmail(null, form({ email: "nope" }))).toMatchObject({
      error: { code: "invalid_input", fields: { email: "profile.email.errors.email" } },
    });
    auth.updateUser.mockResolvedValue({ error: { code: "x" } });
    expect(await actions.updateEmail(null, form({ email: "new@x.test" }))).toMatchObject({
      error: { code: "unavailable" },
    });
    getClaims.mockResolvedValue(null);
    expect(await actions.updateEmail(null, form({ email: "new@x.test" }))).toMatchObject({
      error: { code: "unavailable" },
    });
  });
});

describe("setPassword", () => {
  it("saves a strong password", async () => {
    expect(await actions.setPassword(null, form({ password: "abcdefg1" }))).toMatchObject({
      ok: true,
    });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "abcdefg1" });
  });

  it("rejects a weak password before Auth", async () => {
    expect(await actions.setPassword(null, form({ password: "short" }))).toMatchObject({
      error: { fields: { password: "auth.signUp.errors.password" } },
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it.each([
    ["weak_password", "auth.signUp.errors.password"],
    ["same_password", "auth.reset.errors.samePassword"],
  ])("maps %s", async (code, message) => {
    auth.updateUser.mockResolvedValue({ error: { code } });
    expect(await actions.setPassword(null, form({ password: "abcdefg1" }))).toMatchObject({
      error: { fields: { password: message } },
    });
  });

  it("is unavailable on another Auth error or without a session", async () => {
    auth.updateUser.mockResolvedValue({ error: { code: "x" } });
    expect(await actions.setPassword(null, form({ password: "abcdefg1" }))).toMatchObject({
      error: { code: "unavailable" },
    });
    getClaims.mockResolvedValue(null);
    expect(await actions.setPassword(null, form({ password: "abcdefg1" }))).toMatchObject({
      error: { code: "unavailable" },
    });
  });
});

describe("connectProvider", () => {
  it("links, sets oauth_next and redirects to the provider", async () => {
    await expect(actions.connectProvider(null, form({ provider: "github" }))).rejects.toThrow(
      "REDIRECT http://p.test/a",
    );
    expect(auth.linkIdentity).toHaveBeenCalledWith({
      provider: "github",
      options: { redirectTo: "http://x.test/auth/callback", skipBrowserRedirect: true },
    });
    expect(cookieSet).toHaveBeenCalledWith(
      "oauth_next",
      "/profile",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 }),
    );
  });

  it("rejects an unknown provider, a missing Origin, no session and an Auth error", async () => {
    expect(await actions.connectProvider(null, form({ provider: "x" }))).toMatchObject({
      error: { code: "invalid_input" },
    });
    headerValues.delete("origin");
    expect(await actions.connectProvider(null, form({ provider: "github" }))).toMatchObject({
      error: { code: "unavailable" },
    });
    headerValues.set("origin", "http://x.test");
    getClaims.mockResolvedValue(null);
    expect(await actions.connectProvider(null, form({ provider: "github" }))).toMatchObject({
      error: { code: "unavailable" },
    });
    getClaims.mockResolvedValue({});
    auth.linkIdentity.mockResolvedValue({ data: {}, error: { code: "x" } });
    expect(await actions.connectProvider(null, form({ provider: "github" }))).toMatchObject({
      error: { code: "unavailable" },
    });
    expect(auth.linkIdentity).toHaveBeenCalledTimes(1);
  });
});

describe("/auth/callback with oauth_next", () => {
  let cleared = false;
  const call = async (query: string, next?: string) => {
    const request = new NextRequest(`http://x.test/auth/callback?${query}`, {
      headers: next ? { cookie: `oauth_next=${next}` } : {},
    });
    const response = await GET(request);
    const location = new URL(response.headers.get("location")!);
    cleared = /oauth_next=;/.test(response.headers.get("set-cookie") ?? "");
    return location.pathname + location.search;
  };

  it("returns to /profile after a good exchange", async () => {
    expect(await call("code=abc", "/profile")).toBe("/profile");
    expect(cleared).toBe(true);
  });

  it("never follows an unsafe oauth_next", async () => {
    expect(await call("code=abc", "//evil.test")).toBe("/events");
  });

  it.each([
    ["error=access_denied", "/profile?link=cancelled"],
    ["error=server_error", "/profile?link=failed"],
    ["error=server_error&error_description=Unverified+email", "/profile?link=failed"],
    ["", "/profile?link=failed"],
  ])("maps %s", async (query, expected) => {
    expect(await call(query, "/profile")).toBe(expected);
  });

  it("fails a bad exchange back to /profile", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: { code: "bad" } });
    expect(await call("code=bad", "/profile")).toBe("/profile?link=failed");
  });
});
