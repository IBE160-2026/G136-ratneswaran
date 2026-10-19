import { cache } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Shared by the Event's pages. A foreign, unknown or malformed id renders this segment's not-found page. */
export const loadEvent = cache(async (eventId: string) => {
  if (!z.uuid().safeParse(eventId).success) notFound();
  const supabase = await createClient();
  // RLS hides another Organizer's Event, so a missing row and a foreign one look the same.
  const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  // A failed load gets the Retry card, not the no-access page.
  if (error) throw new Error("Could not load the event");
  if (!data) notFound();
  return data;
});
