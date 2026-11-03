"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { buttonClass, secondaryClass } from "@/components/form";
import { undoToast } from "@/lib/feedback";
import { callSafely } from "@/modules/events/save";
import { eventPath } from "@/modules/events/list";
import { dismissTask, restoreTask } from "@/modules/tasks/actions";
import { TaskForm } from "../task-form";
import { useDeadline } from "../task-row";

type Task = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  days_before: number | null;
  status: string;
  lifecycle: string;
  owner_user_id: string | null;
  updated_at: string;
};

const errorToast = (message: string) => toast.error(<span role="alert">{message}</span>);

export function TaskDetail({
  eventId,
  task,
  roleName,
  canEdit,
  hasStart,
}: {
  eventId: string;
  task: Task;
  roleName: string;
  canEdit: boolean;
  hasStart: boolean;
}) {
  const t = useTranslations("tasks");
  const formatDeadline = useDeadline();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const dismissed = task.lifecycle === "dismissed";
  const ids = { eventId, taskId: task.id };

  const restore = (expected: string, announce: boolean) =>
    start(async () => {
      const result = await callSafely(() => restoreTask({ ...ids, expected }));
      if (!result.ok) errorToast(t(result.error.message));
      else if (announce) toast(t("detail.restoredToast"));
    });

  const dismiss = () =>
    start(async () => {
      const result = await callSafely(() => dismissTask({ ...ids, expected: task.updated_at }));
      if (!result.ok) {
        errorToast(t(result.error.message));
        return;
      }
      // Undo restores with the updated_at the dismissal produced.
      undoToast(
        t("detail.dismissedToast"),
        () => restore(result.data.updatedAt, false),
        t("detail.undo"),
      );
    });

  return (
    <div className="flex max-w-2xl flex-col gap-6 py-12 pb-28 md:pb-12">
      <Link
        href={`${eventPath(eventId)}/tasks`}
        className="min-h-touch text-primary inline-flex items-center gap-2"
      >
        <ArrowLeft aria-hidden strokeWidth={1.75} className="size-4" />
        {t("detail.back")}
      </Link>
      <h1 className="text-large-title break-words">{task.title}</h1>
      {dismissed && <p className="text-muted-foreground">{t("detail.dismissedNote")}</p>}

      {editing ? (
        <TaskForm
          eventId={eventId}
          hasStart={hasStart}
          initial={{
            title: task.title,
            description: task.description ?? "",
            kind: task.days_before === null ? "date" : "days",
            deadline: task.deadline ?? "",
            daysBefore: task.days_before === null ? "" : String(task.days_before),
          }}
          mode={{
            edit: { taskId: task.id, expected: task.updated_at, onDone: () => setEditing(false) },
          }}
        />
      ) : (
        <>
          <dl className="bg-card grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 rounded-md border p-4">
            <dt className="text-muted-foreground">{t("detail.role")}</dt>
            <dd>{roleName}</dd>
            <dt className="text-muted-foreground">{t("detail.deadline")}</dt>
            <dd>
              {task.deadline &&
                (task.days_before === null
                  ? formatDeadline(task.deadline)
                  : t("detail.daysBefore", {
                      date: formatDeadline(task.deadline),
                      days: task.days_before,
                    }))}
            </dd>
            <dt className="text-muted-foreground">{t("detail.owner")}</dt>
            <dd>{task.owner_user_id === null ? t("row.notDelegated") : ""}</dd>
            <dt className="text-muted-foreground">{t("detail.status")}</dt>
            <dd>{t(`status.${task.status}`)}</dd>
          </dl>
          <section aria-labelledby="task-description" className="flex flex-col gap-1">
            <h2 id="task-description" className="text-headline">
              {t("detail.description")}
            </h2>
            <p
              className={
                task.description ? "break-words whitespace-pre-line" : "text-muted-foreground"
              }
            >
              {task.description ?? t("detail.noDescription")}
            </p>
          </section>
        </>
      )}

      {canEdit && !editing && (
        <div
          role="group"
          aria-label={t("detail.actions")}
          className="bg-background border-border fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:static md:border-0 md:p-0"
        >
          {dismissed ? (
            <button
              type="button"
              disabled={pending}
              className={buttonClass}
              onClick={() => restore(task.updated_at, true)}
            >
              {t("detail.restore")}
            </button>
          ) : (
            <>
              <button type="button" className={buttonClass} onClick={() => setEditing(true)}>
                {t("detail.edit")}
              </button>
              <button type="button" disabled={pending} className={secondaryClass} onClick={dismiss}>
                {t("detail.dismiss")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
