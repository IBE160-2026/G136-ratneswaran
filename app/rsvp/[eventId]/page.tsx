import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createClient, getClaims } from "@/lib/supabase/server";
import { firstName } from "@/modules/guests/link";
import { RsvpFlow } from "./rsvp-flow";

export async function generateMetadata() {
  const t = await getTranslations("rsvp");
  return { title: `${t("surface")} – Arrangly` };
}

/**
 * A Guest's RSVP (FR-6). Read under the Guest's own session, so RLS decides what exists: a stranger, a
 * Role-holder and an Organizer all find no guest row here and get the same 404.
 */
export default async function RsvpPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const t = await getTranslations("rsvp");
  const claims = await getClaims();
  if (!claims) {
    return (
      <div className="flex max-w-md flex-col gap-4 py-12">
        <h1 className="text-large-title">{t("surface")}</h1>
        <p role="alert">{t("noSession")}</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [guest, event] = await Promise.all([
    supabase
      .from("guests")
      .select("id, name")
      .eq("event_id", eventId)
      .eq("user_id", claims.sub)
      .maybeSingle(),
    supabase
      .from("events")
      .select("name, starts_at, ends_at, time_zone, rsvp_due_date, cancelled_at, cancellation_note")
      .eq("id", eventId)
      .maybeSingle(),
  ]);
  if (guest.error || event.error) throw new Error("Could not load the RSVP");
  if (!guest.data || !event.data) notFound();
  const rsvp = await supabase
    .from("rsvps")
    .select("attending, plus_one, plus_one_name, other_needs, updated_at")
    .eq("guest_id", guest.data.id)
    .maybeSingle();
  if (rsvp.error) throw new Error("Could not load the RSVP");

  const locale = await getLocale();
  const format = (value: string, timeZone: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone }).format(new Date(value));
  const { name, starts_at, ends_at, time_zone, rsvp_due_date, cancelled_at, cancellation_note } =
    event.data;
  const zone = time_zone ?? "UTC";
  const answer = rsvp.data;
  return (
    <RsvpFlow
      // A new answer remounts the flow, which is how *See changes* shows the server's state.
      key={answer?.updated_at ?? "new"}
      eventId={eventId}
      firstName={firstName(guest.data.name)}
      eventName={name ?? ""}
      // The date as it falls where the Event happens.
      date={starts_at ? format(starts_at, zone) : null}
      // A local date: shown as it was typed, not shifted by a time zone.
      replyBy={rsvp_due_date ? format(`${rsvp_due_date}T00:00:00Z`, "UTC") : null}
      closed={
        cancelled_at ? "cancelled" : ends_at && new Date(ends_at) < new Date() ? "ended" : null
      }
      note={cancelled_at ? cancellation_note : null}
      saved={
        answer && {
          attending: answer.attending,
          plusOne: answer.plus_one,
          plusOneName: answer.plus_one_name,
          otherNeeds: answer.other_needs,
          updatedAt: answer.updated_at,
        }
      }
    />
  );
}
