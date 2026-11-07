import { cache } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient, getClaims } from "@/lib/supabase/server";

/** Organizer-only pages: a Role-holder gets the no-access page before any data is fetched. The database stays the boundary. */
export function organizerOnly(event: { organizer_id: string }, claims: { sub: string }) {
  if (event.organizer_id !== claims.sub) notFound();
}

/** Shared by the Event's pages. A foreign, unknown or malformed id renders this segment's not-found page. */
export const loadEvent = cache(async (eventId: string) => {
  if (!z.uuid().safeParse(eventId).success) notFound();
  const supabase = await createClient();
  // RLS hides another Organizer's Event, so a missing row and a foreign one look the same.
  const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  // A failed load gets the Retry card, not the no-access page.
  if (error) throw new Error("Could not load the event");
  if (!data) notFound();
  // A Guest can read their Event (Story 7.3) but has no team pages: only the Organizer and joined holders do.
  const claims = await getClaims();
  if (claims && data.organizer_id !== claims.sub) {
    const { count, error: heldError } = await supabase
      .from("role_members")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("user_id", claims.sub)
      .not("joined_at", "is", null);
    if (heldError) throw new Error("Could not load the event");
    if (!count) notFound();
  }
  return data;
});
