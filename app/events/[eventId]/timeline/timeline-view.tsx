import { Lock } from "lucide-react";
import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { STATUSES } from "@/lib/status";
import { eventPath } from "@/modules/events/list";
import type { Timeline } from "@/modules/tasks/timeline";
import {
  axisWeeks,
  BAR_HEIGHT,
  CHILD_BAR_HEIGHT,
  dayOffset,
  DAY_WIDTH,
  MIN_BAR_WIDTH,
  placeLane,
  ROLE_COLUMN,
  type PlacedBar,
} from "@/modules/tasks/timeline-layout";
import { TimelineScroller } from "./timeline-scroller";

const addDays = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

function Bar({ eventId, placed, child }: { eventId: string; placed: PlacedBar; child: boolean }) {
  const t = useTranslations();
  const format = useFormatter();
  const { bar } = placed;
  const day = (iso: string) =>
    format.dateTime(new Date(`${iso}T12:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });
  const dates =
    bar.start === bar.end
      ? t("timeline.date", { date: day(bar.end) })
      : t("timeline.dates", { start: day(bar.start), end: day(bar.end) });
  const word =
    bar.status === "overdue"
      ? t("status.overdue", { days: bar.overdueDays })
      : bar.status === "waiting"
        ? t("timeline.waitingExternal")
        : t(`status.${bar.status}`);
  const { icon: Icon } = STATUSES[bar.status];
  const waitsFor = bar.blocked ? bar.waitsFor : null;
  const waits = waitsFor ? t("timeline.waitsFor", { task: waitsFor }) : null;
  const base = waitsFor
    ? t("timeline.barLabelBlocked", { title: bar.title, dates, status: word, task: waitsFor })
    : t("timeline.barLabel", { title: bar.title, dates, status: word });
  const label = bar.notAccepted ? `${base}, ${t("timeline.notAccepted")}` : base;
  return (
    <Link
      href={`${eventPath(eventId)}/tasks/${bar.id}`}
      aria-label={label}
      className={cn(
        "pointer-events-auto absolute flex flex-col justify-center overflow-hidden rounded-bar border px-2 text-xs leading-4 scroll-ml-[188px] scroll-mr-16",
        "bg-muted",
        bar.status === "done" && "bg-status-done/15 border-status-done",
        bar.status === "waiting" && "bg-card border-status-waiting",
        bar.status === "overdue" && "bg-status-overdue/10 border-status-overdue",
        bar.status === "obsolete" && "text-status-obsolete",
        bar.blocked && "bg-status-blocked-row border-dashed",
        bar.notAccepted && "border-dashed",
      )}
      style={{
        left: placed.left,
        width: placed.width,
        minWidth: MIN_BAR_WIDTH,
        height: child ? CHILD_BAR_HEIGHT : BAR_HEIGHT,
      }}
    >
      <span className={cn("flex items-center gap-1 truncate font-semibold")}>
        {bar.point && (
          <span
            aria-hidden
            className={cn(
              "border-status-decision size-2 shrink-0 rotate-45 border",
              bar.point === "filled" && "bg-status-decision",
            )}
          />
        )}
        <span className={cn("truncate", bar.status === "obsolete" && "line-through")}>
          {bar.title}
        </span>
        {child && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 font-normal",
              STATUSES[bar.status].tone,
            )}
          >
            {Icon && <Icon aria-hidden strokeWidth={1.75} className="size-3.5" />}
            {word}
          </span>
        )}
      </span>
      {!child && (
        <span className="flex items-center gap-1 truncate">
          <span className={cn("flex shrink-0 items-center gap-1", STATUSES[bar.status].tone)}>
            {Icon && <Icon aria-hidden strokeWidth={1.75} className="size-3.5" />}
            {word}
          </span>
          {waits && <span className="text-muted-foreground truncate">· {waits}</span>}
          {bar.notAccepted && (
            <span className="text-muted-foreground truncate">· {t("timeline.notAccepted")}</span>
          )}
        </span>
      )}
    </Link>
  );
}

function Lane({
  eventId,
  lane,
  placement: { blocks, height },
  name,
}: {
  eventId: string;
  lane: Timeline["lanes"][number];
  placement: ReturnType<typeof placeLane>;
  name: string;
}) {
  const t = useTranslations();
  return (
    <div className="border-border flex border-b last:border-b-0" style={{ minHeight: height }}>
      <div
        className="bg-card border-border sticky left-0 z-10 flex shrink-0 flex-col gap-1 border-r p-3"
        style={{ width: ROLE_COLUMN }}
      >
        <h2 className="text-headline">{name}</h2>
        <p className="text-subhead text-muted-foreground">
          {lane.lead
            ? t("events.team.lead.current", { name: lane.lead })
            : t("events.team.lead.none")}
        </p>
        <p className="text-subhead">
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
      </div>
      <div className="relative z-[1] flex-1">
        {lane.readable ? (
          <ul aria-label={name} className="absolute inset-0 list-none">
            {blocks.map(({ parent, children, top, height: blockHeight }) => (
              <li
                key={parent.bar.id}
                className="pointer-events-none absolute inset-x-0"
                style={{ top, height: blockHeight }}
              >
                <Bar eventId={eventId} placed={parent} child={false} />
                {children.length > 0 && (
                  <ul className="list-none">
                    {children.map((c) => (
                      <li
                        key={c.bar.id}
                        className="pointer-events-none absolute inset-x-0"
                        style={{ top: c.top }}
                      >
                        <Bar eventId={eventId} placed={c} child />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p
            className="text-subhead text-muted-foreground sticky inline-flex items-center gap-1.5 p-3"
            style={{ left: ROLE_COLUMN }}
          >
            <Lock aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
            {t("dashboard.unreadable", { role: name })}
          </p>
        )}
      </div>
    </div>
  );
}

export function TimelineView({
  eventId,
  timeline,
  includeObsolete,
  today,
  eventDay,
  readOnly,
  canCreate,
}: {
  eventId: string;
  timeline: Timeline;
  includeObsolete: boolean;
  today: string;
  eventDay: string | null;
  readOnly: boolean;
  canCreate: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const base = `${eventPath(eventId)}/timeline`;
  // With no bars there is no axis; lanes still show on a two-week stretch from today.
  const axis = timeline.axis ?? { start: today, end: addDays(today, 13), today };
  const days = dayOffset(axis.start, axis.end) + 1;
  const placements = timeline.lanes.map((lane) => placeLane(lane.tasks, axis.start));
  // A bar keeps its 112px minimum even at the axis end, so the canvas grows to hold it.
  const width = Math.max(
    days * DAY_WIDTH,
    ...placements
      .flatMap((p) => p.blocks.flatMap((b) => [b.parent, ...b.children]))
      .map((x) => x.left + Math.max(x.width, MIN_BAR_WIDTH)),
  );
  const weeks = axisWeeks(axis.start, axis.end, locale);
  const todayOffset = dayOffset(axis.start, axis.today);
  const mark = (offset: number) => offset >= 0 && offset < days;
  const hasBars = timeline.axis !== null;

  return (
    <div className="flex flex-col gap-6 py-12">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <h1 className="text-large-title">{t("timeline.title")}</h1>
        {!readOnly && canCreate && (
          <Link
            href={`${eventPath(eventId)}/tasks`}
            className="text-primary min-h-touch flex items-center underline"
          >
            {t("timeline.newTask")}
          </Link>
        )}
        {timeline.obsoleteCount > 0 && (
          <Link
            href={includeObsolete ? base : `${base}?obsolete=1`}
            className="text-primary min-h-touch flex items-center underline"
          >
            {includeObsolete
              ? t("timeline.hideObsolete")
              : t("timeline.showObsolete", { count: timeline.obsoleteCount })}
          </Link>
        )}
      </div>
      {readOnly && <p className="text-muted-foreground">{t("tasks.readOnly")}</p>}
      {!hasBars && <p className="text-muted-foreground">{t("timeline.empty")}</p>}
      <TimelineScroller todayX={todayOffset * DAY_WIDTH + DAY_WIDTH / 2}>
        <div className="relative" style={{ width: ROLE_COLUMN + width }}>
          <div className="flex h-[4.5rem]">
            <div
              className="bg-card border-border sticky left-0 z-10 shrink-0 border-r border-b"
              style={{ width: ROLE_COLUMN }}
            />
            <div className="border-border relative flex-1 border-b">
              {weeks.map((w) => (
                <span
                  key={w.offset}
                  className="border-border text-muted-foreground absolute top-0 border-l pl-1 text-xs leading-6 whitespace-nowrap"
                  style={{ left: w.offset * DAY_WIDTH }}
                >
                  {w.label}
                </span>
              ))}
              {eventDay && mark(dayOffset(axis.start, eventDay)) && (
                <span
                  className="text-primary absolute top-6 text-xs leading-6 font-semibold whitespace-nowrap"
                  style={{ left: dayOffset(axis.start, eventDay) * DAY_WIDTH }}
                >
                  {t("timeline.eventDay")}
                </span>
              )}
              {mark(todayOffset) && (
                <span
                  className="bg-primary text-primary-foreground absolute top-12 -translate-x-1/2 rounded-full px-2 text-xs leading-5 font-semibold whitespace-nowrap"
                  style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                >
                  {t("timeline.today")}
                </span>
              )}
            </div>
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0"
            style={{ left: ROLE_COLUMN, width }}
          >
            {eventDay && mark(dayOffset(axis.start, eventDay)) && (
              <div
                className="bg-primary-soft absolute inset-y-0"
                style={{ left: dayOffset(axis.start, eventDay) * DAY_WIDTH, width: DAY_WIDTH }}
              />
            )}
            {mark(todayOffset) && (
              <div
                className="bg-primary absolute inset-y-0 z-[2] w-0.5"
                style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 - 1 }}
              />
            )}
          </div>
          {timeline.lanes.map((lane, i) => (
            <Lane
              key={lane.roleId}
              eventId={eventId}
              lane={lane}
              placement={placements[i]}
              name={t(`events.roles.${lane.key}.name`)}
            />
          ))}
        </div>
      </TimelineScroller>
    </div>
  );
}
