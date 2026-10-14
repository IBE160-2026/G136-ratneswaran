import { describe, expect, it, vi } from "vitest";

let authGetClaims: () => Promise<unknown>;
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getClaims: () => authGetClaims() } }),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
vi.mock("@/lib/env", () => ({
  clientEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "key",
  }),
}));

const { getClaims } = await import("./server");

describe("getClaims", () => {
  it("returns the claims of a signed-in user", async () => {
    authGetClaims = async () => ({ data: { claims: { sub: "u" } } });
    expect(await getClaims()).toEqual({ sub: "u" });
  });

  it("returns null when there is no session", async () => {
    authGetClaims = async () => ({ data: null });
    expect(await getClaims()).toBeNull();
  });

  it("returns null instead of throwing when Auth is down", async () => {
    authGetClaims = async () => {
      throw new Error("network");
    };
    expect(await getClaims()).toBeNull();
  });
});
