import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClaims } from "@/lib/supabase/server";
import { isDraft, isPast } from "@/modules/events/list";
import { DEFAULT_TIME_ZONE, timeZoneNames, toLocalInput } from "@/modules/events/schemas";
import { loadEvent } from "../load-event";
import { EventActions } from "./event-actions";
import { SettingsForm } from "./form";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props) {
  if (!(await getClaims())) return { title: "Arrangly" };
  const t = await getTranslations("events");
  const event = await loadEvent((await params).eventId);
  return { title: `${t("settings.surface")} – ${event.name ?? t("draft.untitled")} – Arrangly` };
}

// Event settings: the schedule, the Guest-facing language, and cancel or delete.
export default async function SettingsPage({ params }: Props) {
  const { eventId } = await params;
  if (!(await getClaims())) redirect(`/login?next=/events/${eventId}/settings`);
  const event = await loadEvent(eventId);
  // Shown in the Event's own time zone, so the values match what the Organizer typed.
  const timeZone = event.time_zone ?? DEFAULT_TIME_ZONE;
  // A stored zone the runtime no longer lists (an ICU rename) is still offered, so saving never moves the Event.
  const zones = timeZoneNames();
  const local = (iso: string | null) => (iso ? toLocalInput(iso, timeZone) : "");
  // Published past and cancelled Events are read-only; the database refuses their changes too.
  const readOnly = !isDraft(event) && isPast(event, new Date());
  return (
    <>
      <SettingsForm
        initial={{
          eventId,
          startsLocal: local(event.starts_at),
          endsLocal: local(event.ends_at),
          timeZone,
          rsvpDueDate: event.rsvp_due_date ?? "",
          language: event.language ?? (await getLocale()),
        }}
        rsvpWanted={event.rsvp_wanted === true}
        readOnly={readOnly}
        timeZones={zones.includes(timeZone) ? zones : [timeZone, ...zones]}
      />
      <EventActions
        eventId={eventId}
        name={event.name ?? ""}
        state={isDraft(event) ? "draft" : readOnly ? "closed" : "open"}
      />
    </>
  );
}
