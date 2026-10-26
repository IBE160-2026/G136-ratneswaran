"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { limit } from "@/lib/limit";
import { refuse, type Result } from "@/lib/result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getClaims } from "@/lib/supabase/server";
import { passwordSchema } from "@/modules/auth/schemas";
import { INVITE_COOKIE, type InvitePreview, readInvite, sameEmail } from "./invite";
import { eventPath } from "./list";
import { joinCodeSchema } from "./schemas";

const E = "invite.errors";
const unavailable = refuse("unavailable", `${E}.unavailable`);
const rateLimited = refuse("rate_limited", `${E}.rateLimited`);

const forget = async () => (await cookies()).delete(INVITE_COOKIE);

/** A link that can no longer be used takes its cookie with it. */
async function ended(status: string) {
  await forget();
  return status === "expired" ? refuse("expired", "invite.expired") : refuse("used", "invite.used");
}

/** The pending invitation behind the cookie; the email always comes from here, never from the client. */
async function pendingInvite(): Promise<
  { token: string; invite: Extract<InvitePreview, { status: "valid" }> } | { refused: Result<null> }
> {
  const { token, preview } = await readInvite();
  if (preview.status === "valid" && token) return { token, invite: preview };
  return { refused: preview.status === "unavailable" ? unavailable : await ended(preview.status) };
}

/**
 * The one join path: `events_join_role` with the secret key and the session's user id (AD-5). It checks
 * that the user is the invited one with a confirmed email; on joined the member lands on the Event.
 */
async function join(token: string, userId: string): Promise<Result<null>> {
  const { data, error } = await createAdminClient().rpc("events_join_role", {
    p_token: token,
    p_user_id: userId,
  });
  const row = data?.[0];
  if (error || !row) {
    console.error("events_join_role failed", { userId, code: error?.code ?? "no_row" });
    return unavailable;
  }
  if (row.status === "joined") {
    await forget();
    redirect(eventPath(row.event_id));
  }
  if (row.status === "mismatch") return refuse("mismatch", "invite.mismatch");
  return ended(row.status);
}

/** Step 1 for a new invitee: an email one-time code to the invited address, no account created. */
export async function sendJoinCode(): Promise<Result<null>> {
  const token = (await cookies()).get(INVITE_COOKIE)?.value;
  if (!token) return ended("used");
  const refused = await limit("invite", { token }, E);
  if (refused) return refused;
  const pending = await pendingInvite();
  if ("refused" in pending) return pending.refused;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: pending.invite.email,
    options: { shouldCreateUser: false },
  });
  if (error) return error.status === 429 ? rateLimited : unavailable;
  return { ok: true, data: null };
}

/** Step 2: the code opens a session for the invited address; /invite then asks for a password. */
export async function verifyJoinCode(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = joinCodeSchema.safeParse(formData.get("code") ?? "");
  if (!parsed.success) {
    return refuse("invalid_input", `${E}.invalidInput`, { code: parsed.error.issues[0].message });
  }
  const token = (await cookies()).get(INVITE_COOKIE)?.value;
  if (!token) return ended("used");
  // Its own budget per IP and per link, so a forwarded link cannot have its code guessed from many IPs.
  const refused = await limit("join_code", { token }, E);
  if (refused) return refused;
  const pending = await pendingInvite();
  if ("refused" in pending) return pending.refused;
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: pending.invite.email,
    token: parsed.data,
    type: "email",
  });
  if (error) {
    if (error.status === 429) return rateLimited;
    if (error.code === "otp_expired") {
      return refuse("invalid_input", `${E}.invalidInput`, { code: `${E}.code` });
    }
    return unavailable;
  }
  redirect("/invite");
}

/**
 * Step 3: the password, then the join. Only inside the invitee's own session from step 2: an invitee
 * without a password or a provider identity can only have a session from their inbox (Design Notes).
 */
export async function setPasswordAndJoin(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = passwordSchema.safeParse(formData.get("password") ?? "");
  if (!parsed.success) {
    return refuse("invalid_input", `${E}.invalidInput`, {
      password: parsed.error.issues[0].message,
    });
  }
  const pending = await pendingInvite();
  if ("refused" in pending) return pending.refused;
  const claims = await getClaims();
  if (!claims) redirect("/invite");
  if (!sameEmail(claims.email, pending.invite.email)) return refuse("mismatch", "invite.mismatch");
  // Already has one (a retry after a failed join): join without touching it.
  if (!pending.invite.has_account) {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    // same_password: a retry after the marker below failed to clear.
    if (error && error.code !== "same_password") {
      if (error.code === "weak_password") {
        return refuse("invalid_input", `${E}.invalidInput`, {
          password: "auth.signUp.errors.password",
        });
      }
      return unavailable;
    }
    const { error: markError } = await createAdminClient().auth.admin.updateUserById(claims.sub, {
      app_metadata: { password_pending: false },
    });
    if (markError) {
      console.error("password_pending not cleared", { userId: claims.sub, code: markError.code });
      return unavailable;
    }
  }
  return join(pending.token, claims.sub);
}

/** *Join* for someone already signed in as the invited account. */
export async function joinEvent(): Promise<Result<null>> {
  const token = (await cookies()).get(INVITE_COOKIE)?.value;
  if (!token) return ended("used");
  const claims = await getClaims();
  if (!claims) redirect("/login?next=/invite");
  return join(token, claims.sub);
}

/** *Log out* when the invite was sent to another address; the cookie stays for the right account. */
export async function leaveAndRetry(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/invite");
}

/** /invite showed a used or expired link: drop its cookie (a Server Component cannot). */
export async function forgetInvite(): Promise<void> {
  await forget();
}
