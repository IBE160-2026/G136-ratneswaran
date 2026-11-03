import { Circle } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { eventPath } from "@/modules/events/list";

export type ListedTask = {
  id: string;
  title: string;
  deadline: string | null;
  status: string;
  owner_user_id: string | null;
  roleName: string;
};

/** Deadlines are calendar dates, so they format in UTC and never shift a day. */
export const useDeadline = () => {
  const format = useFormatter();
  return (deadline: string) =>
    format.dateTime(new Date(`${deadline}T12:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });
};

/** UX-DR11: status icon, title, status word and owner; the whole row opens the Task. */
export function TaskRow({ eventId, task }: { eventId: string; task: ListedTask }) {
  const t = useTranslations("tasks");
  const formatDeadline = useDeadline();
  return (
    <li>
      <Link
        href={`${eventPath(eventId)}/tasks/${task.id}`}
        className="min-h-touch hover:bg-muted flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-sm px-2 py-2"
      >
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-subhead">
          <Circle aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
          {t(`status.${task.status}`)}
        </span>
        <span className="min-w-0 break-words font-semibold">{task.title}</span>
        <span className="text-subhead text-muted-foreground ml-auto">
          {task.roleName}
          {task.owner_user_id === null && ` · ${t("row.notDelegated")}`}
          {task.deadline && ` · ${t("row.due", { date: formatDeadline(task.deadline) })}`}
        </span>
      </Link>
    </li>
  );
}
