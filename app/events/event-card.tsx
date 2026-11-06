import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { StatusLabel } from "@/components/status-label";
import { STATUSES } from "@/lib/status";
import { cardState, type CardCounts } from "@/modules/events/card-state";
import { eventDateFormat, eventPath, isDraft, type EventCard as Card } from "@/modules/events/list";

// UX-DR6: one link; the count circle is Open, the badge New, then the urgent or at-risk line.
export function EventCard({
  card,
  roleLabels,
  counts,
}: {
  card: Card;
  roleLabels?: string[];
  counts: CardCounts;
}) {
  const t = useTranslations("events");
  const format = useFormatter();
  const who = roleLabels?.join(", ") ?? t("organizer");
  const date = card.starts_at && format.dateTime(new Date(card.starts_at), eventDateFormat(card));
  // Draft, past and cancelled cards show no counts.
  const live = card.published_at !== null && !card.past;
  const { urgent, atRisk } = cardState(counts);
  const urgentText =
    urgent &&
    t(`card.${urgent}`, { count: urgent === "overdue" ? counts.overdue : counts.needYou });
  const name = [
    card.name ?? t("draft.untitled"),
    date,
    who,
    t("card.open", { count: counts.open }),
    urgentText || (atRisk && t("card.atRisk", { count: counts.atRisk })),
    counts.new > 0 && t("card.new", { count: counts.new }),
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <Link
      href={roleLabels ? eventPath(card.id) : card.href}
      aria-label={live ? name : undefined}
      className="bg-card flex h-full min-h-24 items-start gap-3 rounded-md border-[1.5px] p-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="text-headline font-semibold break-words">
          {card.name ?? t("draft.untitled")}
        </div>
        <div className="text-subhead text-muted-foreground">{date ? `${date} · ${who}` : who}</div>
        {isDraft(card) && !roleLabels && (
          <div className="text-subhead text-primary">{t("draft.continueSetup")}</div>
        )}
        {card.cancelled_at !== null && (
          <div>
            <StatusLabel status="cancelled" />
          </div>
        )}
        {live && urgentText && (
          <div className={`text-subhead inline-flex items-center gap-1.5 ${STATUSES.overdue.tone}`}>
            <CircleAlert aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
            <span>{urgentText}</span>
          </div>
        )}
        {live && atRisk && !urgentText && (
          <div>
            <StatusLabel status="atRisk" values={{ count: counts.atRisk }} />
          </div>
        )}
        {live && counts.new > 0 && (
          <div>
            <span className={`text-subhead rounded-full ${STATUSES.newItem.tone}`}>
              {t("card.newBadge", { count: counts.new })}
            </span>
          </div>
        )}
      </div>
      {live ? (
        <span
          aria-hidden
          className="bg-muted text-headline flex size-10 shrink-0 items-center justify-center rounded-full font-semibold"
        >
          {counts.open}
        </span>
      ) : (
        <span aria-hidden className="size-10 shrink-0" />
      )}
    </Link>
  );
}
