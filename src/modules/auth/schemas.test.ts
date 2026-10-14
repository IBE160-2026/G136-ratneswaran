import { describe, expect, it } from "vitest";
import { signUpSchema } from "./schemas";

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
