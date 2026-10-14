import { afterEach, describe, expect, it, vi } from "vitest";
import { getServerEnv, parseClientEnv, parseServerEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk",
  SUPABASE_SECRET_KEY: "sk",
};

describe("env", () => {
  it("accepts a valid environment", () => {
    expect(parseClientEnv(valid).NEXT_PUBLIC_SUPABASE_URL).toBe(valid.NEXT_PUBLIC_SUPABASE_URL);
    expect(parseServerEnv(valid).SUPABASE_SECRET_KEY).toBe("sk");
  });

  it("names a missing variable", () => {
    expect(() => parseClientEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: undefined })).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL",
    );
    expect(() => parseServerEnv({ ...valid, SUPABASE_SECRET_KEY: undefined })).toThrow(
      "SUPABASE_SECRET_KEY",
    );
  });

  it.each(["ANON_KEY", "SERVICE_ROLE_KEY"])("rejects legacy name %s", (name) => {
    expect(() => parseServerEnv({ ...valid, [name]: "x" })).toThrow(name);
  });

  describe("getServerEnv", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("merges the client and server sections from process.env", () => {
      for (const [k, v] of Object.entries(valid)) vi.stubEnv(k, v);
      expect(getServerEnv()).toMatchObject(valid);
    });

    it("fails at startup on a legacy name in process.env", () => {
      for (const [k, v] of Object.entries(valid)) vi.stubEnv(k, v);
      vi.stubEnv("SERVICE_ROLE_KEY", "x");
      expect(() => getServerEnv()).toThrow("SERVICE_ROLE_KEY");
    });
  });
});
