import { describe, expect, it } from "vitest";
import { passwordSchema, safeNext, signUpSchema } from "./schemas";

describe("signUpSchema", () => {
  it("accepts a valid email and a strong password", () => {
    expect(signUpSchema.safeParse({ email: "a@example.com", password: "abcdefg1" }).success).toBe(
      true,
    );
  });

  it.each(["short1", "abcdefgh", "12345678"])("rejects the weak password %s", (password) => {
    const result = signUpSchema.safeParse({ email: "a@example.com", password });
    expect(result.success).toBe(false);
  });

  it.each(["åååååååå1", `${"å".repeat(40)}1`])(
    "rejects %s, which Auth would refuse",
    (password) => {
      expect(signUpSchema.safeParse({ email: "a@example.com", password }).success).toBe(false);
    },
  );

  it("rejects a malformed email with its message key", () => {
    const result = signUpSchema.safeParse({ email: "not-an-email", password: "abcdefg1" });
    expect(result.error?.issues[0].message).toBe("auth.signUp.errors.email");
  });
});

describe("safeNext", () => {
  it.each([
    "//evil.com",
    "https://x",
    "/\\x",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\u007f/x",
    "evil",
    "",
    null,
    undefined,
  ])("treats %s as absent", (value) => expect(safeNext(value)).toBe("/events"));
  it("keeps a relative path", () => expect(safeNext("/events/1?a=b")).toBe("/events/1?a=b"));
});

describe("passwordSchema", () => {
  it("accepts a strong password and rejects weak or over-72-byte ones", () => {
    expect(passwordSchema.safeParse("abcdefg1").success).toBe(true);
    expect(passwordSchema.safeParse("abc").success).toBe(false);
    expect(passwordSchema.safeParse(`${"å".repeat(40)}1`).success).toBe(false);
  });
});
