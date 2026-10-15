"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import { createClient, getClaims } from "@/lib/supabase/server";
import {
  emailSchema,
  languageSchema,
  logInSchema,
  nameSchema,
  newEmailSchema,
  passwordSchema,
  providerSchema,
  safeNext,
  signUpSchema,
  themeSchema,
  type Result,
} from "./schemas";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const refuse = (code: string, message: string, fields?: Record<string, string>) =>
  ({ ok: false, error: { code, message, fields } }) as const;

const fieldErrors = (error: ZodError) => {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[String(issue.path[0])] ??= issue.message;
  return fields;
};

/** IP bucket first so a refused request never spends the email's budget (AD-4). Null means allowed. */
// The counter table only knows the signup buckets (check constraint, no new migration), so every flow shares them.
async function limit(email: string, errors: string) {
  const supabase = await createClient();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const hit = (bucket: string, key: string, max: number, windowSeconds: number) =>
    supabase.rpc("abuse_hit", {
      p_bucket: bucket,
      p_key_hash: sha256(key),
      p_max: max,
      p_window_seconds: windowSeconds,
    });
  for (const [bucket, key, max, window] of [
    ["signup_ip", ip, 5, 60],
    ["signup_email", email.trim().toLowerCase(), 3, 3600],
  ] as const) {
    const answer = await hit(bucket, key, max, window);
    if (answer.error) return refuse("unavailable", `${errors}.unavailable`);
    if (!answer.data) return refuse("rate_limited", `${errors}.rateLimited`);
  }
  return null;
}

/** Same `{ ok: true }` whether or not the email already has an account (AD-4). */
export async function signUp(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    return refuse("invalid_input", "auth.signUp.errors.invalidInput", fieldErrors(parsed.error));
  }
  const { email, password } = parsed.data;

  const refused = await limit(email, "auth.signUp.errors");
  if (refused) return refused;

  const supabase = await createClient();
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

/** Ends in `redirect()` on success; `email_not_confirmed` only follows a correct password. */
export async function logIn(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = logInSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    return refuse("invalid_input", "auth.logIn.errors.invalidInput", fieldErrors(parsed.error));
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "invalid_credentials") {
      return refuse("invalid_credentials", "auth.logIn.errors.invalidCredentials");
    }
    if (error.code === "email_not_confirmed") {
      return refuse("email_not_confirmed", "auth.logIn.errors.unverified");
    }
    return refuse("unavailable", "auth.logIn.errors.unavailable");
  }
  redirect(safeNext(formData.get("next")));
}

/** Identical `{ ok: true }` for any well-formed email (AD-4). */
export async function resendVerification(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") ?? "" });
  if (!parsed.success) {
    return refuse("invalid_input", "auth.logIn.errors.invalidInput", fieldErrors(parsed.error));
  }
  const { email } = parsed.data;
  const refused = await limit(email, "auth.logIn.errors");
  if (refused) return refused;

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error && error.code !== "over_email_send_rate_limit") {
    return refuse("unavailable", "auth.logIn.errors.unavailable");
  }
  return { ok: true, data: null };
}

/** Identical `{ ok: true }` whether or not the account exists (AD-4). */
export async function forgotPassword(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") ?? "" });
  if (!parsed.success) {
    return refuse("invalid_input", "auth.forgot.errors.invalidInput", fieldErrors(parsed.error));
  }
  const { email } = parsed.data;
  const refused = await limit(email, "auth.forgot.errors");
  if (refused) return refused;

  const origin = (await headers()).get("origin");
  if (!origin) return refuse("unavailable", "auth.forgot.errors.unavailable");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset`,
  });
  if (error && error.code !== "over_email_send_rate_limit") {
    return refuse("unavailable", "auth.forgot.errors.unavailable");
  }
  return { ok: true, data: null };
}

/** Ends in `redirect()` to the provider; `/auth/callback` finishes the sign-in (AD-6). */
export async function signInWithProvider(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = providerSchema.safeParse(formData.get("provider"));
  if (!parsed.success) return refuse("invalid_input", "auth.oauth.errors.invalidInput");
  const origin = (await headers()).get("origin");
  if (!origin) return refuse("unavailable", "auth.oauth.errors.unavailable");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: parsed.data,
    options: { redirectTo: `${origin}/auth/callback`, skipBrowserRedirect: true },
  });
  if (error || !data.url) return refuse("unavailable", "auth.oauth.errors.unavailable");
  // A link attempt that was abandoned must not turn this sign-in into a return to /profile.
  (await cookies()).delete("oauth_next");
  redirect(data.url);
}

/** Needs the session `/auth/reset` set; ends in `redirect()` on success. */
export async function updatePassword(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = passwordSchema.safeParse(formData.get("password") ?? "");
  if (!parsed.success) {
    return refuse("invalid_input", "auth.reset.errors.invalidInput", {
      password: parsed.error.issues[0].message,
    });
  }
  if (!(await getClaims())) redirect("/forgot-password?expired=1");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    if (error.code === "weak_password") {
      return refuse("invalid_input", "auth.reset.errors.invalidInput", {
        password: "auth.signUp.errors.password",
      });
    }
    if (error.code === "same_password") {
      return refuse("invalid_input", "auth.reset.errors.invalidInput", {
        password: "auth.reset.errors.samePassword",
      });
    }
    return refuse("unavailable", "auth.reset.errors.unavailable");
  }
  await supabase.auth.signOut({ scope: "others" });
  redirect("/events");
}

export async function logOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const unavailable = refuse("unavailable", "profile.errors.unavailable");

/** Writes one user_metadata key; the token only carries it after a refresh, so refresh before revalidating. */
async function saveMetadata(
  key: "name" | "language" | "theme",
  value: string,
): Promise<Result<null>> {
  if (!(await getClaims())) return unavailable;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { [key]: value } });
  if (error) return unavailable;
  const refreshed = await supabase.auth.refreshSession();
  if (refreshed.error) return unavailable;
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

export async function updateName(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = nameSchema.safeParse({ name: formData.get("name") ?? "" });
  if (!parsed.success) {
    return refuse("invalid_input", "profile.name.errors.invalidInput", fieldErrors(parsed.error));
  }
  return saveMetadata("name", parsed.data.name);
}

export async function updateLanguage(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = languageSchema.safeParse(formData.get("language"));
  if (!parsed.success) return refuse("invalid_input", "profile.errors.invalidInput");
  return saveMetadata("language", parsed.data);
}

export async function updateAppearance(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = themeSchema.safeParse(formData.get("theme"));
  if (!parsed.success) return refuse("invalid_input", "profile.errors.invalidInput");
  return saveMetadata("theme", parsed.data);
}

/** Auth mails the new address; the same `{ ok: true }` for a taken or unchanged address (AD-4). */
export async function updateEmail(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = newEmailSchema.safeParse({ email: formData.get("email") ?? "" });
  if (!parsed.success) {
    return refuse("invalid_input", "profile.email.errors.invalidInput", fieldErrors(parsed.error));
  }
  const claims = await getClaims();
  if (!claims) return unavailable;
  if (parsed.data.email.toLowerCase() === String(claims.email ?? "").toLowerCase()) {
    return { ok: true, data: null };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
  if (error && error.code !== "email_exists") return unavailable;
  return { ok: true, data: null };
}

/** Changes the password, or adds one to a provider-created account; other sessions stay signed in. */
export async function setPassword(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = passwordSchema.safeParse(formData.get("password") ?? "");
  if (!parsed.success) {
    return refuse("invalid_input", "profile.password.errors.invalidInput", {
      password: parsed.error.issues[0].message,
    });
  }
  if (!(await getClaims())) return unavailable;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    if (error.code === "weak_password") {
      return refuse("invalid_input", "profile.password.errors.invalidInput", {
        password: "auth.signUp.errors.password",
      });
    }
    if (error.code === "same_password") {
      return refuse("invalid_input", "profile.password.errors.invalidInput", {
        password: "auth.reset.errors.samePassword",
      });
    }
    return unavailable;
  }
  return { ok: true, data: null };
}

/** Ends in `redirect()` to the provider; `/auth/callback` returns to `/profile` via `oauth_next` (AD-6). */
export async function connectProvider(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = providerSchema.safeParse(formData.get("provider"));
  if (!parsed.success) return refuse("invalid_input", "profile.errors.invalidInput");
  const origin = (await headers()).get("origin");
  if (!origin || !(await getClaims())) return unavailable;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.linkIdentity({
    provider: parsed.data,
    options: { redirectTo: `${origin}/auth/callback`, skipBrowserRedirect: true },
  });
  if (error || !data.url) return unavailable;
  (await cookies()).set("oauth_next", "/profile", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  redirect(data.url);
}
