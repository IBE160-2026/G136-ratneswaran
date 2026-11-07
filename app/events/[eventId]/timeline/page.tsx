import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient, getClaims } from "@/lib/supabase/server";
import { eventPath, isDraft, isPast } from "@/modules/events/list";
import { computeTimeline, eventToday, loadTimelineInput } from "@/modules/tasks/timeline";
import { loadEvent } from "../load-event";
import { TimelineView } from "./timeline-view";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ obsolete?: string; view?: string }>;
};

export async function generateMetadata({ params }: Props) {
  if (!(await getClaims())) return { title: "Arrangly" };
  const t = await getTranslations();
  const event = await loadEvent((await params).eventId);
  return {
    title: `${t("timeline.surface")} – ${event.name ?? t("events.draft.untitled")} – Arrangly`,
  };
}

// FR20: one swimlane per Role, computed per request (AD-13) under the viewer's own RLS.
export default async function TimelinePage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const claims = await getClaims();
  if (!claims) redirect(`/login?next=${eventPath(eventId)}/timeline`);
  const event = await loadEvent(eventId);
  const organizer = event.organizer_id === claims.sub;
  const { obsolete, view: rawView } = await searchParams;
  const includeObsolete = obsolete === "1";
  const view = rawView === "list" || rawView === "lanes" ? rawView : undefined;
  const { roles, tasks, canCreate } = await loadTimelineInput(
    await createClient(),
    eventId,
    claims.sub,
    organizer,
  );
  const today = eventToday(new Date(), event.time_zone);
  const timeline = computeTimeline(
    roles,
    tasks,
    { id: eventId, timeZone: event.time_zone, endsAt: event.ends_at },
    today,
    { includeObsolete, isOrganizer: organizer },
  );
  return (
    <TimelineView
      eventId={eventId}
      timeline={timeline}
      includeObsolete={includeObsolete}
      today={today}
      eventDay={event.starts_at ? eventToday(new Date(event.starts_at), event.time_zone) : null}
      readOnly={!isDraft(event) && isPast(event, new Date())}
      canCreate={canCreate}
      view={view}
    />
  );
}
