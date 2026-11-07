import { useFormatter, useTranslations } from "next-intl";
import type { TimelineBar } from "@/modules/tasks/timeline";

/** The words of one Task, shared by the swimlane and List views so both give the same link name. */
export function useBarText(bar: TimelineBar) {
  const t = useTranslations();
  const format = useFormatter();
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
  const waitsFor = bar.blocked ? bar.waitsFor : null;
  const waits = waitsFor ? t("timeline.waitsFor", { task: waitsFor }) : null;
  const base = waitsFor
    ? t("timeline.barLabelBlocked", { title: bar.title, dates, status: word, task: waitsFor })
    : t("timeline.barLabel", { title: bar.title, dates, status: word });
  const label = bar.notAccepted ? `${base}, ${t("timeline.notAccepted")}` : base;
  return { dates, word, waits, label };
}
