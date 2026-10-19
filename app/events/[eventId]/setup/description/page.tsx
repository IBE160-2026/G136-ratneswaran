import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClaims } from "@/lib/supabase/server";
import { eventPath, isDraft, isPast } from "@/modules/events/list";
import { loadEvent } from "../../load-event";
import { DescriptionForm } from "./form";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props) {
  if (!(await getClaims())) return { title: "Arrangly" };
  const t = await getTranslations("events");
  const event = await loadEvent((await params).eventId);
  return {
    title: `${t("description.surface")} – ${event.name ?? t("wizard.draftName")} – Arrangly`,
  };
}

export default async function DescriptionPage({ params }: Props) {
  const { eventId } = await params;
  if (!(await getClaims())) redirect(`/login?next=${eventPath(eventId)}/setup/description`);
  const event = await loadEvent(eventId);
  // Published past and cancelled Events are read-only; the database refuses their changes too.
  if (!isDraft(event) && isPast(event, new Date())) redirect(eventPath(eventId));
  return (
    <DescriptionForm
      eventId={eventId}
      name={event.name ?? ""}
      description={event.description ?? ""}
    />
  );
}
