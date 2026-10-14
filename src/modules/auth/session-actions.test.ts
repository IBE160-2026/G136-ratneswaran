import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const auth = {
  signInWithPassword: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
};
const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc, auth }),
  getClaims: () => getClaims(),
}));
const headerValues = new Headers({ "x-forwarded-for": "203.0.113.7", origin: "http://x.test" });
vi.mock("next/headers", () => ({ headers: async () => headerValues }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const { logIn, resendVerification, forgotPassword, updatePassword, logOut } =
  await import("./actions");

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
const creds = { email: "a@example.com", password: "abcdefg1" };

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: true, error: null });
  for (const fn of Object.values(auth)) fn.mockReset().mockResolvedValue({ data: {}, error: null });
  getClaims.mockReset().mockResolvedValue({ sub: "u" });
  headerValues.set("origin", "http://x.test");
});

describe("logIn", () => {
  it("redirects to a safe next path", async () => {
    await expect(logIn(null, form({ ...creds, next: "/events" }))).rejects.toThrow(
      "REDIRECT /events",
    );
  });

  it("ignores an unsafe next path", async () => {
    await expect(logIn(null, form({ ...creds, next: "//evil.com" }))).rejects.toThrow(
      "REDIRECT /events",
    );
  });

  it.each([
    ["invalid_credentials", "auth.logIn.errors.invalidCredentials"],
    ["email_not_confirmed", "auth.logIn.errors.unverified"],
    ["something_else", "auth.logIn.errors.unavailable"],
  ])("maps %s", async (code, message) => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: { code } });
    expect(await logIn(null, form(creds))).toMatchObject({
      ok: false,
      error: { code: code === "something_else" ? "unavailable" : code, message },
    });
  });

  it("rejects malformed input without calling Auth", async () => {
    expect(await logIn(null, form({ email: "nope", password: "" }))).toMatchObject({
      ok: false,
      error: { code: "invalid_input" },
    });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe.each([
  ["resendVerification", resendVerification, auth.resend],
  ["forgotPassword", forgotPassword, auth.resetPasswordForEmail],
])("%s", (_name, action, authCall) => {
  it("returns ok for any outcome, including Auth's send limit", async () => {
    expect(await action(null, form({ email: "a@example.com" }))).toEqual({ ok: true, data: null });
    authCall.mockResolvedValue({ data: {}, error: { code: "over_email_send_rate_limit" } });
    expect(await action(null, form({ email: "a@example.com" }))).toEqual({ ok: true, data: null });
  });

  it("refuses over the limit without calling Auth", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await action(null, form({ email: "a@example.com" }))).toMatchObject({
      ok: false,
      error: { code: "rate_limited" },
    });
    expect(authCall).not.toHaveBeenCalled();
  });

  it("returns unavailable on an Auth failure", async () => {
    authCall.mockResolvedValue({ data: {}, error: { code: "unexpected_failure" } });
    expect(await action(null, form({ email: "a@example.com" }))).toMatchObject({
      ok: false,
      error: { code: "unavailable" },
    });
  });
});

describe("forgotPassword", () => {
  it("is unavailable without an origin header", async () => {
    headerValues.delete("origin");
    expect(await forgotPassword(null, form({ email: "a@example.com" }))).toMatchObject({
      ok: false,
      error: { code: "unavailable" },
    });
  });

  it("sends the link back to /auth/reset on the request origin", async () => {
    await forgotPassword(null, form({ email: "a@example.com" }));
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("a@example.com", {
      redirectTo: "http://x.test/auth/reset",
    });
  });
});

describe("updatePassword", () => {
  it("rejects a weak password without calling Auth", async () => {
    expect(await updatePassword(null, form({ password: "abc" }))).toMatchObject({
      ok: false,
      error: { code: "invalid_input", fields: { password: "auth.signUp.errors.password" } },
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it.each([
    ["weak_password", "auth.signUp.errors.password"],
    ["same_password", "auth.reset.errors.samePassword"],
  ])("maps %s to the password field", async (code, key) => {
    auth.updateUser.mockResolvedValue({ data: {}, error: { code } });
    expect(await updatePassword(null, form({ password: "abcdefg1" }))).toMatchObject({
      ok: false,
      error: { fields: { password: key } },
    });
  });

  it("returns unavailable for any other Auth code", async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: { code: "other" } });
    expect(await updatePassword(null, form({ password: "abcdefg1" }))).toMatchObject({
      ok: false,
      error: { code: "unavailable", message: "auth.reset.errors.unavailable" },
    });
  });

  it("signs out other sessions after saving", async () => {
    await expect(updatePassword(null, form({ password: "abcdefg1" }))).rejects.toThrow();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "others" });
  });

  it("redirects to /events after saving", async () => {
    await expect(updatePassword(null, form({ password: "abcdefg1" }))).rejects.toThrow(
      "REDIRECT /events",
    );
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "abcdefg1" });
  });

  it("sends a user without a session to the expired screen", async () => {
    getClaims.mockResolvedValue(null);
    await expect(updatePassword(null, form({ password: "abcdefg1" }))).rejects.toThrow(
      "REDIRECT /forgot-password?expired=1",
    );
  });
});

describe("missing form fields", () => {
  it("return auth.* keys, never Zod's English default", async () => {
    const result = await logIn(null, new FormData());
    expect(result).toMatchObject({ ok: false, error: { code: "invalid_input" } });
    for (const key of Object.values(result.ok ? {} : (result.error.fields ?? {}))) {
      expect(key).toMatch(/^auth\./);
    }
  });
});

describe("logOut", () => {
  it("ends the session and redirects to /login", async () => {
    await expect(logOut()).rejects.toThrow("REDIRECT /login");
    expect(auth.signOut).toHaveBeenCalled();
  });
});
