import { Lock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { STATUSES } from "@/lib/status";
import { eventPath } from "@/modules/events/list";
import type { Timeline, TimelineBar } from "@/modules/tasks/timeline";
import { useBarText } from "./bar-text";

function Row({ eventId, bar }: { eventId: string; bar: TimelineBar }) {
  const t = useTranslations();
  const { dates, word, waits, label } = useBarText(bar);
  const { icon: Icon, tone } = STATUSES[bar.status];
  return (
    <li className="flex flex-col gap-2">
      <Link
        href={`${eventPath(eventId)}/tasks/${bar.id}`}
        aria-label={label}
        className={cn(
          "min-h-touch bg-card hover:bg-muted flex flex-col gap-1 rounded-md border p-3",
          bar.blocked && "bg-status-blocked-row border-dashed",
          bar.notAccepted && "border-dashed",
        )}
      >
        <span
          className={cn(
            "font-semibold break-words",
            bar.status === "obsolete" && "text-status-obsolete line-through",
          )}
        >
          {bar.title}
        </span>
        <span className="text-subhead text-muted-foreground">{dates}</span>
        {bar.point && (
          <span className="text-subhead text-status-decision flex items-center gap-1.5">
            <span
              aria-hidden
              className={cn(
                "border-status-decision size-2 shrink-0 rotate-45 border",
                bar.point === "filled" && "bg-status-decision",
              )}
            />
            {bar.point === "filled" ? t("timeline.decisionOpen") : t("timeline.decisionResolved")}
          </span>
        )}
        <span className="text-subhead flex flex-wrap items-center gap-x-2">
          <span className={cn("flex items-center gap-1", tone)}>
            {Icon && <Icon aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0" />}
            {word}
          </span>
          {waits && <span className="text-muted-foreground">· {waits}</span>}
          {bar.notAccepted && (
            <span className="text-muted-foreground">· {t("timeline.notAccepted")}</span>
          )}
        </span>
      </Link>
      {bar.children.length > 0 && (
        <ul className="ml-4 flex list-none flex-col gap-2">
          {bar.children.map((c) => (
            <Row key={c.id} eventId={eventId} bar={c} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** The same lanes as plain groups: no horizontal scroll, readable at 320 CSS px. */
export function TimelineList({ eventId, timeline }: { eventId: string; timeline: Timeline }) {
  const t = useTranslations();
  return (
    <div className="flex flex-col gap-6">
      {timeline.lanes.map((lane) => {
        const name = t(`events.roles.${lane.key}.name`);
        return (
          <section key={lane.roleId} className="bg-card flex flex-col gap-2 rounded-md border p-4">
            <h2 className="text-headline">{name}</h2>
            <p className="text-subhead text-muted-foreground break-words">
              {lane.lead
                ? t("events.team.lead.current", { name: lane.lead })
                : t("events.team.lead.none")}
            </p>
            <p className="text-subhead break-words">
              {lane.holders.map((m, i) => (
                <span key={`${m.name}-${i}`}>
                  {i > 0 && ", "}
                  {m.name}
                  {m.pending && (
                    <span className="text-muted-foreground">
                      {" · "}
                      {t("events.team.people.pending")}
                    </span>
                  )}
                </span>
              ))}
            </p>
            {!lane.readable ? (
              <p className="text-subhead text-muted-foreground inline-flex items-center gap-1.5">
                <Lock aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
                {t("dashboard.unreadable", { role: name })}
              </p>
            ) : lane.tasks.length === 0 ? (
              <p className="text-subhead text-muted-foreground">{t("timeline.emptyRole")}</p>
            ) : (
              <ul aria-label={name} className="flex list-none flex-col gap-2">
                {lane.tasks.map((bar) => (
                  <Row key={bar.id} eventId={eventId} bar={bar} />
                ))}
              </ul>
            )}
          </section>
        );
      })}
      {timeline.inactiveRoleTasks > 0 && (
        <p>
          <Link
            href={`${eventPath(eventId)}/team`}
            className="min-h-touch inline-flex items-center underline"
          >
            {t("dashboard.inactiveRoleTasks", { count: timeline.inactiveRoleTasks })}
          </Link>
        </p>
      )}
    </div>
  );
}
