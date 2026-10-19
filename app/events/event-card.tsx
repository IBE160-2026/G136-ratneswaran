import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { StatusLabel } from "@/components/status-label";
import { eventDateFormat, isDraft, type EventCard as Card } from "@/modules/events/list";

// UX-DR6: one link whose name is the visible text. The empty slot keeps the count circle's place (Epics 4–5).
export function EventCard({ card }: { card: Card }) {
  const t = useTranslations("events");
  const format = useFormatter();
  const date = card.starts_at && format.dateTime(new Date(card.starts_at), eventDateFormat(card));
  return (
    <Link
      href={card.href}
      className="bg-card flex h-full min-h-24 items-start gap-3 rounded-md border-[1.5px] p-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="text-headline font-semibold break-words">
          {card.name ?? t("draft.untitled")}
        </div>
        <div className="text-subhead text-muted-foreground">
          {date ? `${date} · ${t("organizer")}` : t("organizer")}
        </div>
        {isDraft(card) && (
          <div className="text-subhead text-primary">{t("draft.continueSetup")}</div>
        )}
        {card.cancelled_at !== null && (
          <div>
            <StatusLabel status="cancelled" />
          </div>
        )}
      </div>
      <span aria-hidden className="size-10 shrink-0" />
    </Link>
  );
}
