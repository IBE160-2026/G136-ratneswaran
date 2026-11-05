"use client";

import { ArrowLeft, CircleAlert, Link2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { buttonClass, secondaryClass } from "@/components/form";
import { undoToast } from "@/lib/feedback";
import { STATUSES } from "@/lib/status";
import { callSafely } from "@/modules/events/save";
import { eventPath } from "@/modules/events/list";
import { dismissTask, restoreTask } from "@/modules/tasks/actions";
import { TaskForm } from "../task-form";
import { DelegatePanel, type Candidate } from "./delegate-panel";
import { StatusControl, StatusHistory, type HistoryEntry } from "./status-panel";
import { DependsOnCard, PartOf, SubtasksCard, WaitsFor, type LinkedTask } from "./task-links";
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
  role_id: string;
  parent_task_id: string | null;
  updated_at: string;
};

export type TaskLinks = {
  parent: { id: string; title: string } | null;
  subtasks: LinkedTask[];
  dependsOn: LinkedTask[];
  candidates: { id: string; title: string }[];
  blockedBy: { title: string; more: number } | null;
  blocksCount: number;
  canLink: boolean;
  canPromote: boolean;
};

const errorToast = (message: string) => toast.error(<span role="alert">{message}</span>);

export function TaskDetail({
  eventId,
  task,
  roleName,
  canEdit,
  canSetStatus,
  overdueDays,
  history,
  canDelegate,
  candidates,
  ownerName,
  heldBefore,
  links,
  hasStart,
}: {
  eventId: string;
  task: Task;
  roleName: string;
  canEdit: boolean;
  canSetStatus: boolean;
  overdueDays: number | null;
  history: HistoryEntry[];
  canDelegate: boolean;
  candidates: Candidate[];
  ownerName: string | null;
  heldBefore: string | null;
  links: TaskLinks;
  hasStart: boolean;
}) {
  const t = useTranslations("tasks");
  const ts = useTranslations("status");
  // Action failures carry a full message key, so they need the root translator.
  const tr = useTranslations();
  const formatDeadline = useDeadline();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const dismissed = task.lifecycle === "dismissed";
  const ids = { eventId, taskId: task.id };

  const restore = (expected: string, announce: boolean) =>
    start(async () => {
      const result = await callSafely(() => restoreTask({ ...ids, expected }));
      if (!result.ok) errorToast(tr(result.error.message));
      else if (announce) toast(t("detail.restoredToast"));
    });

  const dismiss = () =>
    start(async () => {
      const result = await callSafely(() => dismissTask({ ...ids, expected: task.updated_at }));
      if (!result.ok) {
        errorToast(tr(result.error.message));
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
      {overdueDays !== null && (
        <p className={`${STATUSES.overdue.tone} inline-flex items-center gap-2 font-semibold`}>
          <CircleAlert aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
          {ts("overdue", { days: overdueDays })}
        </p>
      )}
      {links.blockedBy && <WaitsFor {...links.blockedBy} />}
      {links.blocksCount > 0 && (
        <p className="text-muted-foreground inline-flex items-center gap-2">
          <Link2 aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
          {t("row.blocks", { count: links.blocksCount })}
        </p>
      )}
      {links.parent && (
        <PartOf
          eventId={eventId}
          parent={links.parent}
          taskId={task.id}
          expected={task.updated_at}
          canPromote={links.canPromote && !dismissed}
        />
      )}

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
            <dd>
              {task.owner_user_id === null ? t("row.notDelegated") : ownerName}
              {heldBefore && (
                <span className="text-muted-foreground block">
                  {t("detail.delegate.heldBefore", { name: heldBefore })}
                </span>
              )}
            </dd>
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
          {canDelegate && (
            <DelegatePanel
              eventId={eventId}
              taskId={task.id}
              updatedAt={task.updated_at}
              candidates={candidates}
            />
          )}
          {canSetStatus && (
            <StatusControl
              eventId={eventId}
              taskId={task.id}
              status={task.status as HistoryEntry["toStatus"]}
              updatedAt={task.updated_at}
            />
          )}
          <StatusHistory eventId={eventId} entries={history} />
          {task.parent_task_id === null && (
            <SubtasksCard
              eventId={eventId}
              parent={{ id: task.id, roleId: task.role_id }}
              subtasks={links.subtasks}
              canAdd={links.canLink}
            />
          )}
          <DependsOnCard
            eventId={eventId}
            taskId={task.id}
            dependsOn={links.dependsOn}
            candidates={links.candidates}
            canLink={links.canLink}
          />
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
