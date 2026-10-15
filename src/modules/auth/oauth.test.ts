import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = { signInWithOAuth: vi.fn(), exchangeCodeForSession: vi.fn() };
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth }),
  getClaims: vi.fn(),
}));
const headerValues = new Headers({ origin: "http://x.test" });
vi.mock("next/headers", () => ({
  headers: async () => headerValues,
  cookies: async () => ({ delete: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const { signInWithProvider } = await import("./actions");
const { GET } = await import("../../../app/auth/callback/route");

const form = (provider: string) => {
  const data = new FormData();
  data.set("provider", provider);
  return data;
};

beforeEach(() => {
  auth.signInWithOAuth
    .mockReset()
    .mockResolvedValue({ data: { url: "http://p.test/a" }, error: null });
  auth.exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  headerValues.set("origin", "http://x.test");
});

describe("signInWithProvider", () => {
  it.each(["google", "github"])("redirects to the %s authorize URL", async (provider) => {
    await expect(signInWithProvider(null, form(provider))).rejects.toThrow(
      "REDIRECT http://p.test/a",
    );
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider,
      options: { redirectTo: "http://x.test/auth/callback", skipBrowserRedirect: true },
    });
  });

  it("rejects an unknown provider without calling Auth", async () => {
    expect(await signInWithProvider(null, form("facebook"))).toMatchObject({
      ok: false,
      error: { code: "invalid_input" },
    });
    expect(auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("is unavailable without an Origin header", async () => {
    headerValues.delete("origin");
    expect(await signInWithProvider(null, form("github"))).toMatchObject({
      error: { code: "unavailable" },
    });
    expect(auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("is unavailable when Auth fails", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: {}, error: { code: "x" } });
    expect(await signInWithProvider(null, form("github"))).toMatchObject({
      error: { code: "unavailable" },
    });
  });
});

describe("/auth/callback", () => {
  const call = async (query: string) => {
    const response = await GET(new NextRequest(`http://x.test/auth/callback?${query}`));
    const location = new URL(response.headers.get("location")!);
    return location.pathname + location.search;
  };

  it("opens All events after a good exchange", async () => {
    expect(await call("code=abc")).toBe("/events");
  });

  it.each([
    ["error=access_denied", "/login?oauth=cancelled"],
    [
      "error=server_error&error_description=Unverified+email+with+github",
      "/login?oauth=unverified",
    ],
    ["error=server_error", "/login?oauth=failed"],
    ["", "/login?oauth=failed"],
  ])("maps %s", async (query, expected) => {
    expect(await call(query)).toBe(expected);
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("fails a bad exchange", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: { code: "bad" } });
    expect(await call("code=bad")).toBe("/login?oauth=failed");
  });
});
