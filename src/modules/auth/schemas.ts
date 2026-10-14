import { z } from "zod";

export type Result<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: string; message: string; fields?: Partial<Record<string, string>> };
    };

/** Password policy (FR1): mirrored in `supabase/config.toml` as minimum_password_length and letters_digits (ASCII letters only, as Auth checks). */
export const passwordRules = {
  length: (value: string) => value.length >= 8,
  letter: (value: string) => /[A-Za-z]/.test(value),
  digit: (value: string) => /\d/.test(value),
} as const;

export type PasswordRule = keyof typeof passwordRules;

export const signUpSchema = z.object({
  email: z.email({ error: "auth.signUp.errors.email" }).max(254, "auth.signUp.errors.email"),
  password: z
    .string()
    .refine((value) => new TextEncoder().encode(value).length <= 72, "auth.signUp.errors.password")
    .refine(
      (value) => Object.values(passwordRules).every((rule) => rule(value)),
      "auth.signUp.errors.password",
    ),
});
