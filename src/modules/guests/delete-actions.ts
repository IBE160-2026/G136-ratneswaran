"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { refuse, type Result } from "@/lib/result";
import { createClient, getClaims } from "@/lib/supabase/server";
import { DELETED_COOKIE } from "./deleted";

const E = "rsvp.delete.errors";
const schema = z.object({ eventId: z.uuid() });

/**
 * *Delete my data* through `guests_delete_guest_data` under the Guest's own session (AD-2, AD-11). The
 * guest id comes from the session and the Event, never from input. `deleted` is false when there was
 * nothing left to delete. Logs carry the Event id, user id and error code.
 */
export async function deleteMyData(input: unknown): Promise<Result<{ deleted: boolean }>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return refuse("invalid_input", `${E}.unavailable`);
  const { eventId } = parsed.data;
  const cookieStore = await cookies();
  const claims = await getClaims();
  if (!claims) {
    // Without a session only the marker proves that this browser deleted the data.
    if (cookieStore.get(DELETED_COOKIE)?.value === eventId) {
      return { ok: true, data: { deleted: false } };
    }
    return refuse("no_session", "rsvp.errors.noSession");
  }

  const supabase = await createClient();
  const fail = (code: string | undefined) => {
    console.error("deleteMyData failed", { eventId, userId: claims.sub, code });
    return refuse("unavailable", `${E}.unavailable`);
  };
  const guest = await supabase
    .from("guests")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", claims.sub)
    .maybeSingle();
  if (guest.error) return fail(guest.error.code);
  if (!guest.data) return { ok: true, data: { deleted: false } };

  const { data, error } = await supabase.rpc("guests_delete_guest_data", {
    p_guest_id: guest.data.id,
  });
  if (error) return fail(error.code);
  if (data === "nothing") return { ok: true, data: { deleted: false } };

  // Setting a cookie re-renders the page, which shows the deleted text while this marker lasts.
  cookieStore.set(DELETED_COOKIE, eventId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV !== "development",
    path: "/rsvp",
    maxAge: 600,
  });
  // The user is gone, so the session is too: drop its cookies. A kept user stays signed in.
  if (data === "deleted_with_user") await supabase.auth.signOut({ scope: "local" });
  return { ok: true, data: { deleted: true } };
}
