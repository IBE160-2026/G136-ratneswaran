import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
}));

const { limit } = await import("./limit");
const sha = (value: string) => createHash("sha256").update(value).digest("hex");

beforeEach(() => {
  rpc.mockReset().mockResolvedValue({ data: true, error: null });
});

describe("limit for the invite flow", () => {
  it("counts invite_ip then invite_token, with hashed keys", async () => {
    expect(await limit("invite", { token: "Tok-Abc_123" }, "invite.errors")).toBeNull();
    expect(rpc).toHaveBeenNthCalledWith(1, "abuse_hit", {
      p_bucket: "invite_ip",
      p_key_hash: sha("203.0.113.7"),
      p_max: 5,
      p_window_seconds: 60,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "abuse_hit", {
      p_bucket: "invite_token",
      p_key_hash: sha("Tok-Abc_123"),
      p_max: 3,
      p_window_seconds: 3600,
    });
  });

  it("skips the token bucket when the IP is refused", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await limit("invite", { token: "t" }, "invite.errors")).toMatchObject({
      ok: false,
      error: { code: "rate_limited", message: "invite.errors.rateLimited" },
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
