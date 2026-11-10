import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { getClaims } from "@/lib/supabase/server";
import { eventPath, isDraft, isPast } from "@/modules/events/list";
import { heldGuestsEventIds } from "@/modules/guests/access";
import { loadEvent } from "../load-event";
import { AddGuestsForm } from "./add-guests-form";
import { GuestList } from "./guest-list";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props) {
  if (!(await getClaims())) return { title: "Arrangly" };
  const t = await getTranslations();
  const event = await loadEvent((await params).eventId);
  return {
    title: `${t("guests.surface")} – ${event.name ?? t("events.draft.untitled")} – Arrangly`,
  };
}

// Guests: the Organizer adds and invites; a holder of the active Guests Role reads the list (Story 7.7).
export default async function GuestsPage({ params }: Props) {
  const { eventId } = await params;
  const claims = await getClaims();
  if (!claims) redirect(`/login?next=${eventPath(eventId)}/guests`);
  const event = await loadEvent(eventId);
  const organizer = event.organizer_id === claims.sub;
  // Everyone else gets the no-access page before any guest is fetched.
  if (!organizer && !(await heldGuestsEventIds(claims.sub)).includes(eventId)) notFound();
  const t = await getTranslations("guests");
  // Published past and cancelled Events are read-only; guests_add refuses them too.
  const readOnly = !isDraft(event) && isPast(event, new Date());
  return (
    <div className="flex max-w-2xl flex-col gap-6 py-12">
      <h1 className="text-large-title">{t("title")}</h1>
      {organizer &&
        (readOnly ? (
          <p className="text-muted-foreground">{t("readOnly")}</p>
        ) : (
          <AddGuestsForm eventId={eventId} />
        ))}
      <GuestList
        eventId={eventId}
        readOnly={readOnly || !organizer}
        links={organizer}
        emails={organizer}
        tiles
      />
    </div>
  );
}
