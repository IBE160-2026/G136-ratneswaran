import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getClaims } from "@/lib/supabase/server";
import { eventPath, isDraft, isPast } from "@/modules/events/list";
import { setupPath } from "@/modules/events/save";
import { AddGuestsForm } from "../../guests/add-guests-form";
import { GuestList } from "../../guests/guest-list";
import { loadEvent } from "../../load-event";

type Props = { params: Promise<{ eventId: string }> };

const linkClass = "min-h-touch border-input inline-flex items-center rounded-full border px-6";

export async function generateMetadata({ params }: Props) {
  if (!(await getClaims())) return { title: "Arrangly" };
  const t = await getTranslations();
  const event = await loadEvent((await params).eventId);
  return {
    title: `${t("guests.surface")} – ${event.name ?? t("events.wizard.draftName")} – Arrangly`,
  };
}

/** Wizard step 2. Adding guests saves on its own, so Next only moves on. */
export default async function GuestsStepPage({ params }: Props) {
  const { eventId } = await params;
  if (!(await getClaims())) redirect(`/login?next=${setupPath(eventId)}/guests`);
  const event = await loadEvent(eventId);
  // Published past and cancelled Events are read-only; the database refuses their changes too.
  if (!isDraft(event) && isPast(event, new Date())) redirect(eventPath(eventId));
  const t = await getTranslations();
  return (
    <div className="flex max-w-2xl flex-col gap-6 py-12">
      <p className="text-muted-foreground">{t("events.wizard.caption", { step: 2, total: 6 })}</p>
      <h1 className="text-large-title">{t("guests.stepTitle")}</h1>
      <AddGuestsForm eventId={eventId} />
      <GuestList eventId={eventId} />
      <div className="flex gap-3">
        <Link href={setupPath(eventId)} className={linkClass}>
          {t("events.wizard.back")}
        </Link>
        <Link href={`${setupPath(eventId)}/description`} className={linkClass}>
          {t("events.wizard.next")}
        </Link>
      </div>
    </div>
  );
}
