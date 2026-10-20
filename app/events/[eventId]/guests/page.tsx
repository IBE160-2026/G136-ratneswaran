import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClaims } from "@/lib/supabase/server";
import { eventPath, isDraft, isPast } from "@/modules/events/list";
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

// Guests: in 2.9 the Organizer adds guests by hand; Epic 7 adds invitations and RSVP.
export default async function GuestsPage({ params }: Props) {
  const { eventId } = await params;
  if (!(await getClaims())) redirect(`/login?next=${eventPath(eventId)}/guests`);
  const event = await loadEvent(eventId);
  const t = await getTranslations("guests");
  // Published past and cancelled Events are read-only; guests_add refuses them too.
  const readOnly = !isDraft(event) && isPast(event, new Date());
  return (
    <div className="flex max-w-2xl flex-col gap-6 py-12">
      <h1 className="text-large-title">{t("title")}</h1>
      {readOnly ? (
        <p className="text-muted-foreground">{t("readOnly")}</p>
      ) : (
        <AddGuestsForm eventId={eventId} />
      )}
      <GuestList eventId={eventId} readOnly={readOnly} />
    </div>
  );
}
