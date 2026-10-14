"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { signUpSchema, type Result } from "./schemas";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const refuse = (code: string, message: string, fields?: Record<string, string>) =>
  ({ ok: false, error: { code, message, fields } }) as const;

/** Same `{ ok: true }` whether or not the email already has an account (AD-4). */
export async function signUp(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0]);
      fields[field] ??= issue.message.startsWith("auth.")
        ? issue.message
        : `auth.signUp.errors.${field}`;
    }
    return refuse("invalid_input", "auth.signUp.errors.invalidInput", fields);
  }
  const { email, password } = parsed.data;

  const supabase = await createClient();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const hit = (bucket: string, key: string, max: number, windowSeconds: number) =>
    supabase.rpc("abuse_hit", {
      p_bucket: bucket,
      p_key_hash: sha256(key),
      p_max: max,
      p_window_seconds: windowSeconds,
    });
  // The IP bucket is checked first so a refused request never spends the email's budget.
  const ipOk = await hit("signup_ip", ip, 5, 60);
  if (ipOk.error) return refuse("unavailable", "auth.signUp.errors.unavailable");
  if (!ipOk.data) return refuse("rate_limited", "auth.signUp.errors.rateLimited");
  const emailOk = await hit("signup_email", email.trim().toLowerCase(), 3, 3600);
  if (emailOk.error) return refuse("unavailable", "auth.signUp.errors.unavailable");
  if (!emailOk.data) return refuse("rate_limited", "auth.signUp.errors.rateLimited");

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    if (error.code === "weak_password") {
      return refuse("invalid_input", "auth.signUp.errors.invalidInput", {
        password: "auth.signUp.errors.password",
      });
    }
    // Auth refuses a second confirmation mail within its resend window only for an unconfirmed
    // account that already exists; answering with an error would reveal that (AD-4).
    if (error.code === "over_email_send_rate_limit") return { ok: true, data: null };
    if (error.status === 429) return refuse("rate_limited", "auth.signUp.errors.rateLimited");
    return refuse("unavailable", "auth.signUp.errors.unavailable");
  }
  return { ok: true, data: null };
}
