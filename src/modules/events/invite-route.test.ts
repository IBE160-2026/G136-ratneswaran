import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const limit = vi.fn();
vi.mock("@/lib/limit", () => ({ limit }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const { GET } = await import("../../../app/api/invite/[token]/route");

const TOKEN = "A".repeat(43);
const call = (token: string) =>
  GET(new NextRequest(`http://x.test/api/invite/${token}`), {
    params: Promise.resolve({ token }),
  });

beforeEach(() => {
  limit.mockReset().mockResolvedValue(null);
});

describe("GET /api/invite/[token]", () => {
  it("swaps the token for an httpOnly cookie and redirects to a token-free URL", async () => {
    const response = await call(TOKEN);
    expect(limit).toHaveBeenCalledWith("invite", { token: TOKEN }, "invite.errors");
    expect(response.headers.get("location")).toBe("http://x.test/invite");
    expect(response.headers.get("set-cookie")).toMatch(
      new RegExp(`invite_token=${TOKEN}.*HttpOnly`, "i"),
    );
  });

  it("sets no cookie when rate limited", async () => {
    limit.mockResolvedValue({ ok: false, error: { code: "rate_limited" } });
    const response = await call(TOKEN);
    expect(response.headers.get("location")).toBe("http://x.test/invite?error=rateLimited");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("gives a malformed token no cookie", async () => {
    const response = await call("short");
    expect(response.headers.get("location")).toBe("http://x.test/invite");
    expect(response.headers.get("set-cookie")).not.toMatch(/invite_token=short/);
  });
});
