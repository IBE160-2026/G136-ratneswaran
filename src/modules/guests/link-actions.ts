"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { limit } from "@/lib/limit";
import { refuse, type Result } from "@/lib/result";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getClaims } from "@/lib/supabase/server";
import { INVITE_COOKIE } from "@/modules/events/invite";
import { eventPath } from "@/modules/events/list";
import { invitationText } from "./link";

const E = "guests.link.errors";
const copyInput = z.object({
  eventId: z.uuid(),
  guestId: z.uuid(),
  renew: z.boolean().default(false),
});
const copyAllInput = z.object({ eventId: z.uuid(), guestIds: z.array(z.uuid()).min(1).max(5) });

const refuseCopy = (code: string) => {
  if (code === "42501") return refuse("forbidden", "events.wizard.errors.forbidden");
  if (code === "55000") return refuse("read_only", "events.settings.errors.readOnly");
  return refuse("unavailable", `${E}.unavailable`);
};

type Copied = { link: string; text: string };

/** Signed-in caller and the request's origin, shared by both copy actions. */
async function copyContext(eventId: string) {
  const claims = await getClaims();
  if (!claims) redirect(`/login?next=${eventPath(eventId)}/guests`);
  const origin = (await headers()).get("origin");
  return { userId: claims.sub, origin, supabase: await createClient() };
}

/**
 * One guest through `guests_copy_link` under the Organizer's session (AD-2). On P0002 the guest has no auth
 * user yet: the secret key creates a confirmed, passwordless one (invitee creation, AD-5) and the call runs
 * once more; a concurrent copy that created it first (`email_exists`) is fine. `first` says the row's label
 * changed. The token is never stored or logged; logs carry ids and codes only.
 */
async function copyOne(
  { userId, origin, supabase }: Awaited<ReturnType<typeof copyContext>>,
  eventId: string,
  guestId: string,
  renew: boolean,
): Promise<{ result: Result<Copied>; first: boolean }> {
  const fail = (step: string, code: string) => {
    console.error("copyGuestLink failed", { eventId, guestId, userId, step, code });
    return { result: refuseCopy(code), first: false };
  };
  if (!origin) return fail("origin", "no_origin");

  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select("name, user_id, events(name, starts_at, time_zone, language)")
    .eq("id", guestId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (guestError) return fail("guest", guestError.code);
  // The function only knows the guest; this checks it belongs to the Event in the URL.
  if (!guest?.events) return { result: refuseCopy("42501"), first: false };

  const copy = () => supabase.rpc("guests_copy_link", { p_guest_id: guestId, p_renew: renew });
  let { data: token, error } = await copy();
  if (error?.code === "P0002") {
    const { data: contact, error: contactError } = await supabase
      .from("guest_contacts")
      .select("email")
      .eq("guest_id", guestId)
      .single();
    if (contactError) return fail("contact", contactError.code);
    // Confirmed and marked password_pending, as inviteToRole does: Auth's random password is no password.
    const { error: createError } = await createAdminClient().auth.admin.createUser({
      email: contact.email,
      email_confirm: true,
      app_metadata: { password_pending: true },
    });
    if (createError && createError.code !== "email_exists") {
      return fail("createUser", createError.code ?? "unknown");
    }
    ({ data: token, error } = await copy());
  }
  if (error) return fail("copy", error.code);
  if (!token) return fail("copy", "no_token");

  const link = `${origin}/api/invite/${token}`;
  return {
    result: {
      ok: true,
      data: { link, text: invitationText({ ...guest.events, guestName: guest.name, link }) },
    },
    first: !guest.user_id,
  };
}

// Only a first copy changes a row's label, so a repeat copy re-renders nothing.
const revalidateGuests = (eventId: string) => revalidatePath(`${eventPath(eventId)}/guests`);

/** *Copy link*, *Copy invitation text* and *New link* (`renew`) for one guest. */
export async function copyGuestLink(input: z.input<typeof copyInput>): Promise<Result<Copied>> {
  const parsed = copyInput.safeParse(input);
  if (!parsed.success) return refuse("invalid_input", "events.wizard.errors.invalidInput");
  const { eventId, guestId, renew } = parsed.data;
  const { result, first } = await copyOne(await copyContext(eventId), eventId, guestId, renew);
  if (first) revalidateGuests(eventId);
  return result;
}

/**
 * One batch of *Copy all links*: Server Actions from one client run one after another, so the batch runs
 * in parallel here, in the order given, and revalidates at most once. The first failure answers for all.
 */
export async function copyGuestLinks(
  input: z.input<typeof copyAllInput>,
): Promise<Result<Copied[]>> {
  const parsed = copyAllInput.safeParse(input);
  if (!parsed.success) return refuse("invalid_input", "events.wizard.errors.invalidInput");
  const { eventId, guestIds } = parsed.data;
  const context = await copyContext(eventId);
  const copied = await Promise.all(guestIds.map((id) => copyOne(context, eventId, id, false)));
  if (copied.some(({ first }) => first)) revalidateGuests(eventId);
  for (const { result } of copied) if (!result.ok) return result;
  return { ok: true, data: copied.flatMap(({ result }) => (result.ok ? [result.data] : [])) };
}

/**
 * *Continue* on /invite, a POST (AD-4): a guest-only user gets a session for the token's user; anyone else
 * gets `sign_in` with their email, to log in with. There is no admin "create session": the admin magic-link
 * hash is verified here at once, so it never leaves the server and no email is sent. Every other state
 * goes back to /invite, which shows it.
 */
export async function openGuestLink(): Promise<Result<{ email: string }>> {
  const token = (await cookies()).get(INVITE_COOKIE)?.value;
  if (!token) redirect("/invite");
  const refused = await limit("guest_open", { token }, "invite.errors");
  if (refused) return refused;
  const unavailable = (step: string, code: string, userId?: string) => {
    console.error("openGuestLink failed", { userId, step, code });
    return refuse("unavailable", "invite.errors.unavailable");
  };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("guests_open_link", { p_token: token });
  const row = data?.[0];
  if (error || !row) return unavailable("open", error?.code ?? "no_row");
  if (row.status === "sign_in") return { ok: true, data: { email: row.email } };
  if (row.status !== "session") redirect("/invite");

  const claims = await getClaims();
  if (claims && claims.sub !== row.user_id) return refuse("mismatch", "guestLink.otherAccount");
  if (!claims) {
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: row.email,
    });
    if (linkError) return unavailable("generateLink", linkError.code ?? "unknown", row.user_id);
    const supabase = await createClient();
    const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: link.properties.hashed_token,
    });
    if (verifyError || verified.user?.id !== row.user_id) {
      await supabase.auth.signOut();
      return unavailable("verifyOtp", verifyError?.code ?? "user_mismatch", row.user_id);
    }
  }
  redirect("/invite");
}
