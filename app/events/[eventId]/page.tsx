import { getFormatter, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { StatusLabel } from "@/components/status-label";
import { getClaims } from "@/lib/supabase/server";
import { eventDateFormat, isDraft, missingForPublish } from "@/modules/events/list";
import { loadEvent } from "./load-event";
import { PublishBanner } from "./publish-dialog";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ published?: string }>;
};

export async function generateMetadata({ params }: Props) {
  if (!(await getClaims())) return { title: "Arrangly" };
  const t = await getTranslations("events");
  const event = await loadEvent((await params).eventId);
  return {
    title: `${t("home.surface")} – ${event.name ?? t("draft.untitled")} – Arrangly`,
  };
}

// Interim Event home: Epic 5's Dashboard replaces it as the landing page.
export default async function EventHomePage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const { published } = await searchParams;
  const claims = await getClaims();
  if (!claims) redirect(`/login?next=/events/${eventId}`);
  const event = await loadEvent(eventId);
  const t = await getTranslations("events");
  const format = await getFormatter();
  return (
    <div className="flex flex-col gap-2 py-12">
      <h1 className="text-large-title break-words">{event.name ?? t("draft.untitled")}</h1>
      {event.starts_at && (
        <p className="text-muted-foreground">
          {format.dateTime(new Date(event.starts_at), eventDateFormat(event))}
        </p>
      )}
      {event.cancelled_at ? (
        <>
          <StatusLabel status="cancelled" className="self-start" />
          {event.cancellation_note && (
            <p className="break-words whitespace-pre-line">{event.cancellation_note}</p>
          )}
        </>
      ) : (
        <p>{t(event.published_at ? "home.published" : "home.draft")}</p>
      )}
      {published === "1" && event.published_at && <p role="status">{t("home.publishedStatus")}</p>}
      {/* A joined member reads the Event too (3.7); only the Organizer publishes. */}
      {isDraft(event) && event.organizer_id === claims.sub && (
        <PublishBanner eventId={eventId} missing={missingForPublish(event)} />
      )}
    </div>
  );
}
