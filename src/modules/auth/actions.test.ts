import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const signUpCall = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc, auth: { signUp: signUpCall } }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
}));

const { signUp } = await import("./actions");

const form = (email: string, password: string) => {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
};

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: true, error: null });
  signUpCall.mockReset().mockResolvedValue({ data: {}, error: null });
});

describe("signUp action", () => {
  it("creates an account for valid input", async () => {
    expect(await signUp(null, form("a@example.com", "abcdefg1"))).toEqual({ ok: true, data: null });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("gives an existing email the same result as a new one", async () => {
    signUpCall.mockResolvedValue({ data: { user: { identities: [] } }, error: null });
    expect(await signUp(null, form("a@example.com", "abcdefg1"))).toEqual({ ok: true, data: null });
  });

  it("treats Auth's resend-window refusal as success so an unconfirmed email is not revealed", async () => {
    signUpCall.mockResolvedValue({
      data: {},
      error: { code: "over_email_send_rate_limit", status: 429 },
    });
    expect(await signUp(null, form("a@example.com", "abcdefg1"))).toEqual({ ok: true, data: null });
  });

  it("returns field errors for a malformed email and a weak password", async () => {
    const result = await signUp(null, form("nope", "abc"));
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "invalid_input",
        fields: { email: "auth.signUp.errors.email", password: "auth.signUp.errors.password" },
      },
    });
    expect(signUpCall).not.toHaveBeenCalled();
  });

  it.each([
    [
      "ip",
      [
        { data: false, error: null },
        { data: true, error: null },
      ],
    ],
    [
      "email",
      [
        { data: true, error: null },
        { data: false, error: null },
      ],
    ],
  ])("refuses when the %s limit is hit, without calling Auth", async (_name, answers) => {
    rpc.mockResolvedValueOnce(answers[0]).mockResolvedValueOnce(answers[1]);
    const result = await signUp(null, form("a@example.com", "abcdefg1"));
    expect(result).toMatchObject({ ok: false, error: { code: "rate_limited" } });
    expect(signUpCall).not.toHaveBeenCalled();
  });

  it("keys the limiter on the first forwarded IP and the normalised email, hashed", async () => {
    await signUp(null, form("A@Example.com", "abcdefg1"));
    const sha = (value: string) => createHash("sha256").update(value).digest("hex");
    expect(rpc).toHaveBeenNthCalledWith(1, "abuse_hit", {
      p_bucket: "signup_ip",
      p_key_hash: sha("203.0.113.7"),
      p_max: 5,
      p_window_seconds: 60,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "abuse_hit", {
      p_bucket: "signup_email",
      p_key_hash: sha("a@example.com"),
      p_max: 3,
      p_window_seconds: 3600,
    });
  });

  it("does not spend the email budget when the IP is refused", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    await signUp(null, form("a@example.com", "abcdefg1"));
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("maps Auth's weak_password to the password field", async () => {
    signUpCall.mockResolvedValue({ data: {}, error: { code: "weak_password", status: 422 } });
    expect(await signUp(null, form("a@example.com", "abcdefg1"))).toMatchObject({
      ok: false,
      error: { fields: { password: "auth.signUp.errors.password" } },
    });
  });

  it("returns unavailable when the limiter itself fails", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "down" } });
    expect(await signUp(null, form("a@example.com", "abcdefg1"))).toMatchObject({
      ok: false,
      error: { code: "unavailable" },
    });
  });

  it("returns unavailable instead of throwing on an Auth failure", async () => {
    signUpCall.mockResolvedValue({ data: {}, error: { code: "unexpected_failure", status: 500 } });
    expect(await signUp(null, form("a@example.com", "abcdefg1"))).toMatchObject({
      ok: false,
      error: { code: "unavailable" },
    });
  });
});
