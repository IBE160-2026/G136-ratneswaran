import { getLocale, getTranslations } from "next-intl/server";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getClaims } from "@/lib/supabase/server";
import { timeZoneNames, toLocalInput } from "@/modules/events/schemas";
import { QuestionnaireForm } from "./form";

type Props = { params: Promise<{ eventId: string }> };

const loadEvent = cache(async (eventId: string) => {
  if (!z.uuid().safeParse(eventId).success) notFound();
  const supabase = await createClient();
  // RLS hides another Organizer's Event, so a missing row and a foreign one look the same.
  const { data } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  if (!data) notFound();
  return data;
});

export async function generateMetadata({ params }: Props) {
  // A signed-out visitor gets the login redirect from the page, not a 404 from here.
  if (!(await getClaims())) return { title: "Arrangly" };
  const t = await getTranslations("events.wizard");
  const event = await loadEvent((await params).eventId);
  return { title: `${t("surface")} – ${event.name ?? t("draftName")} – Arrangly` };
}

export default async function SetupPage({ params }: Props) {
  const { eventId } = await params;
  if (!(await getClaims())) redirect(`/login?next=/events/${eventId}/setup`);
  const event = await loadEvent(eventId);
  const locale = await getLocale();
  const timeZone = event.time_zone;
  const unknown = new Set(event.unknown_answers);
  const yesNo = (value: boolean | null, key: string) =>
    unknown.has(key) ? "unknown" : value === null ? "" : value ? "yes" : "no";

  return (
    <QuestionnaireForm
      initial={{
        eventId,
        eventType: unknown.has("event_type") ? "unknown" : (event.event_type ?? ""),
        startsLocal: event.starts_at && timeZone ? toLocalInput(event.starts_at, timeZone) : "",
        startsUnknown: unknown.has("starts_at"),
        timeZone: timeZone ?? "",
        durationHours: event.duration_minutes
          ? String(Math.round((event.duration_minutes / 60) * 100) / 100)
          : "",
        durationUnknown: unknown.has("duration"),
        guestCount: event.guest_count ? String(event.guest_count) : "",
        guestCountUnknown: unknown.has("guest_count"),
        venueKnown: yesNo(event.venue_known, "venue_known"),
        rsvpWanted: yesNo(event.rsvp_wanted, "rsvp_wanted"),
        rsvpDueDate: event.rsvp_due_date ?? "",
        rsvpDueUnknown: unknown.has("rsvp_due_date"),
        guestListMethod: unknown.has("guest_list_method")
          ? "unknown"
          : (event.guest_list_method ?? ""),
        language: event.language ?? locale,
      }}
      timeZones={timeZoneNames()}
    />
  );
}
