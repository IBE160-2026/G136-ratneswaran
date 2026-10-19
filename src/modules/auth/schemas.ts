import { z } from "zod";

/** Password policy (FR1): mirrored in `supabase/config.toml` as minimum_password_length and letters_digits (ASCII letters only, as Auth checks). */
export const passwordRules = {
  length: (value: string) => value.length >= 8,
  letter: (value: string) => /[A-Za-z]/.test(value),
  digit: (value: string) => /\d/.test(value),
} as const;

export type PasswordRule = keyof typeof passwordRules;

export const passwordSchema = z
  .string()
  .refine((value) => new TextEncoder().encode(value).length <= 72, "auth.signUp.errors.password")
  .refine(
    (value) => Object.values(passwordRules).every((rule) => rule(value)),
    "auth.signUp.errors.password",
  );

export const signUpSchema = z.object({
  email: z.email({ error: "auth.signUp.errors.email" }).max(254, "auth.signUp.errors.email"),
  password: passwordSchema,
});

export const emailSchema = z.object({
  email: z.email({ error: "auth.forgot.errors.email" }).max(254, "auth.forgot.errors.email"),
});

export const logInSchema = z.object({
  email: z.email({ error: "auth.logIn.errors.email" }).max(254, "auth.logIn.errors.email"),
  password: z.string().min(1, "auth.logIn.errors.password").max(1000, "auth.logIn.errors.password"),
});

export const providerSchema = z.enum(["google", "github"]);

export const nameSchema = z.object({
  name: z.string().trim().min(1, "profile.name.errors.name").max(80, "profile.name.errors.name"),
});

export const newEmailSchema = z.object({
  email: z.email({ error: "profile.email.errors.email" }).max(254, "profile.email.errors.email"),
});

export const languageSchema = z.enum(["auto", "nb", "en"]);

export const themeSchema = z.enum(["system", "light", "dark"]);

/** A return path is accepted only when it is a same-origin relative path (FR1). */
export function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/events";
  // Browsers strip tab and newline, so "/\t/evil.com" would become "//evil.com".
  if (/[\u0000-\u001f\u007f]/.test(value)) return "/events";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/events";
  return value;
}
