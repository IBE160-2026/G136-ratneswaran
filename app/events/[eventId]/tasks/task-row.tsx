import { Link2, ListChecks, Lock } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { STATUSES, taskStatus } from "@/lib/status";
import { eventPath } from "@/modules/events/list";

export type ListedTask = {
  id: string;
  title: string;
  deadline: string | null;
  status: string;
  owner_user_id: string | null;
  ownerName: string | null;
  // null: the Task is not open (dismissed, proposed, obsolete or done), so no signal.
  accepted: boolean | null;
  staleDays: number | null;
  roleName: string;
  waitsFor: string | null;
  waitsForMore: number;
  blocks: number;
  overdueDays: number | null;
  subtasks: number;
  externalNote?: string | null;
  // The open Problem's note; null when none is open.
  problemNote: string | null;
};

/** Deadlines are calendar dates, so they format in UTC and never shift a day. */
export const useDeadline = () => {
  const format = useFormatter();
  return (deadline: string) =>
    format.dateTime(new Date(`${deadline}T12:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });
};

/** Whole days since an ISO timestamp. */
export const daysSince = (iso: string) => Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);

export const excerpt = (note: string) => (note.length > 80 ? `${note.slice(0, 80)}…` : note);

/** The flag, the words and a note excerpt (plain text) for an open Problem. */
export function ProblemFlag({ note, full = false }: { note: string; full?: boolean }) {
  const ts = useTranslations("status");
  return (
    <span className={`${STATUSES.problem.tone} inline-flex items-start gap-1.5`}>
      <STATUSES.problem.icon aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 break-words">
        {ts("problem")}
        <span className="text-muted-foreground whitespace-pre-line">
          {" · "}
          {full ? note : excerpt(note)}
        </span>
      </span>
    </span>
  );
}

/** Delegated-to line and the separate accepted signal, shared by the row and the detail page. */
export function AcceptedSignal({
  accepted,
  staleDays,
}: {
  accepted: boolean;
  staleDays: number | null;
}) {
  const t = useTranslations("tasks");
  const ts = useTranslations("status");
  const entry = STATUSES[accepted ? "accepted" : "notAccepted"];
  return (
    <span className={`${entry.tone} inline-flex items-center gap-1.5`}>
      <entry.icon aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
      {staleDays !== null
        ? t("row.staleDays", { days: staleDays })
        : ts(accepted ? "accepted" : "notAccepted")}
    </span>
  );
}

/** UX-DR11: status icon, title, status word and owner; the whole row opens the Task. */
export function TaskRow({ eventId, task }: { eventId: string; task: ListedTask }) {
  const t = useTranslations("tasks");
  const ts = useTranslations("status");
  const formatDeadline = useDeadline();
  const entry = STATUSES[taskStatus[task.status as keyof typeof taskStatus]];
  const StatusIcon = entry.icon;
  return (
    <li>
      <Link
        href={`${eventPath(eventId)}/tasks/${task.id}`}
        className={`min-h-touch hover:bg-muted flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-sm px-2 py-2 ${task.waitsFor ? "bg-status-blocked-row text-muted-foreground" : ""}`}
      >
        <span className={`${entry.tone} inline-flex items-center gap-1.5 text-subhead`}>
          <StatusIcon aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
          {t(`status.${task.status}`)}
          {task.status === "waiting_external" && task.externalNote && (
            <span className="text-muted-foreground break-words">
              {" · "}
              {excerpt(task.externalNote)}
            </span>
          )}
        </span>
        <span className="min-w-0 break-words font-semibold">{task.title}</span>
        <span className="text-subhead text-muted-foreground ml-auto">
          {task.roleName}
          {` · ${task.owner_user_id === null ? t("row.notDelegated") : t("row.delegatedTo", { name: task.ownerName ?? t("row.someone") })}`}
          {task.deadline && ` · ${t("row.due", { date: formatDeadline(task.deadline) })}`}
        </span>
        {(task.problemNote !== null ||
          task.accepted !== null ||
          task.waitsFor ||
          task.blocks > 0 ||
          task.subtasks > 0 ||
          task.overdueDays !== null) && (
          <span className="text-subhead text-muted-foreground flex w-full flex-wrap gap-x-4">
            {task.problemNote !== null && <ProblemFlag note={task.problemNote} />}
            {task.accepted !== null && (
              <AcceptedSignal accepted={task.accepted} staleDays={task.staleDays} />
            )}
            {task.overdueDays !== null && (
              <span className={`${STATUSES.overdue.tone} inline-flex items-center gap-1.5`}>
                <STATUSES.overdue.icon aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
                {ts("overdue", { days: task.overdueDays })}
              </span>
            )}
            {task.waitsFor && (
              <span className="inline-flex items-center gap-1.5">
                <Lock aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
                {task.waitsForMore > 0
                  ? t("row.waitsForMore", { title: task.waitsFor, count: task.waitsForMore })
                  : t("row.waitsFor", { title: task.waitsFor })}
              </span>
            )}
            {task.blocks > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Link2 aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
                {t("row.blocks", { count: task.blocks })}
              </span>
            )}
            {task.subtasks > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <ListChecks aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
                {t("row.subtasks", { count: task.subtasks })}
              </span>
            )}
          </span>
        )}
      </Link>
    </li>
  );
}
