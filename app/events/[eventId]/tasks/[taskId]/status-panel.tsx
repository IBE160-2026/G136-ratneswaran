"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useTranslations, useFormatter } from "next-intl";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { inputClass, secondaryClass } from "@/components/form";
import { saveFailedToast } from "@/lib/feedback";
import { STATUSES, taskStatus } from "@/lib/status";
import { callSafely } from "@/modules/events/save";
import { removeStatusNote, setTaskStatus } from "@/modules/tasks/actions";
import { taskStatuses } from "@/modules/tasks/schemas";

export type HistoryEntry = {
  id: string;
  toStatus: keyof typeof taskStatus;
  note: string | null;
  noteRemoved: boolean;
  author: string | null;
  createdAt: string;
  canRemove: boolean;
};

const segmentClass = (on: boolean) =>
  `min-h-touch border-input inline-flex items-center gap-1.5 border px-3 first:rounded-l-full last:rounded-r-full ${on ? "bg-primary text-primary-foreground" : "bg-background"}`;

/** UX-DR4: a segmented control on desktop and a full-width Select on phone, with an optional note. */
export function StatusControl({
  eventId,
  taskId,
  status,
  updatedAt,
}: {
  eventId: string;
  taskId: string;
  status: keyof typeof taskStatus;
  updatedAt: string;
}) {
  const t = useTranslations("tasks");
  const tr = useTranslations();
  const [shown, setShown] = useOptimistic(status);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  // Each write chains on the updated_at the last one returned, before the page has reloaded.
  const expected = useRef(updatedAt);
  useEffect(() => {
    expected.current = updatedAt;
  }, [updatedAt]);

  const commit = (next: keyof typeof taskStatus) =>
    start(async () => {
      setShown(next);
      const result = await callSafely(() =>
        setTaskStatus({ eventId, taskId, expected: expected.current, status: next, note }),
      );
      if (result.ok) {
        expected.current = result.data.updatedAt;
        setNote("");
      } else if (result.error.code === "concurrent") {
        toast.error(<span role="alert">{tr(result.error.message)}</span>);
      } else {
        saveFailedToast(tr(result.error.message), () => commit(next), tr("feedback.retry"));
      }
    });

  return (
    <section aria-labelledby="status-control" className="flex flex-col gap-3">
      <h2 id="status-control" className="text-headline">
        {t("detail.statusControl.legend")}
      </h2>
      <div role="group" aria-labelledby="status-control" className="hidden md:flex">
        {taskStatuses.map((value) => {
          const Icon = STATUSES[taskStatus[value]].icon;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={shown === value}
              disabled={pending}
              className={segmentClass(shown === value)}
              onClick={() => commit(value)}
            >
              {Icon && <Icon aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />}
              {t(`status.${value}`)}
            </button>
          );
        })}
      </div>
      <select
        aria-labelledby="status-control"
        value={shown}
        disabled={pending}
        className={`${inputClass} md:hidden`}
        onChange={(event) => commit(event.target.value as keyof typeof taskStatus)}
      >
        {taskStatuses.map((value) => (
          <option key={value} value={value}>
            {t(`status.${value}`)}
          </option>
        ))}
      </select>
      <label htmlFor="status-note">{t("detail.statusControl.note")}</label>
      <textarea
        id="status-note"
        rows={2}
        maxLength={500}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        className={`${inputClass} py-2`}
      />
      <div>
        <button
          type="button"
          disabled={pending || note.trim() === ""}
          className={secondaryClass}
          onClick={() => commit(shown)}
        >
          {t("detail.statusControl.saveNote")}
        </button>
      </div>
    </section>
  );
}

const destructiveClass =
  "bg-destructive text-background min-h-touch rounded-full px-6 font-semibold disabled:opacity-60";

/** *Remove* behind a confirmation dialog (UX-DR23); the row and its time stay. */
function RemoveNote({ eventId, entry }: { eventId: string; entry: HistoryEntry }) {
  const t = useTranslations("tasks.detail.history");
  const tr = useTranslations();
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const confirm = () =>
    start(async () => {
      setFailure(null);
      const result = await callSafely(() => removeStatusNote({ eventId, historyId: entry.id }));
      if (result.ok) setOpen(false);
      else setFailure(result.error.message);
    });
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <Dialog.Trigger
        aria-label={t("removeLabel", { status: tr(`tasks.status.${entry.toStatus}`) })}
        className={secondaryClass}
        onClick={() => setFailure(null)}
      >
        {t("remove")}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup className="bg-popover text-popover-foreground fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg p-6 shadow-lg">
          <Dialog.Title className="text-headline">{t("removeTitle")}</Dialog.Title>
          <Dialog.Description className="text-muted-foreground">
            {t("removeBody")}
          </Dialog.Description>
          {failure && (
            <p role="alert" className="text-destructive">
              {tr(failure)}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={destructiveClass}
              onClick={confirm}
              aria-busy={pending}
              disabled={pending}
            >
              {t("removeConfirm")}
            </button>
            <Dialog.Close className={secondaryClass}>{t("keep")}</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function StatusHistory({ eventId, entries }: { eventId: string; entries: HistoryEntry[] }) {
  const t = useTranslations("tasks");
  const format = useFormatter();
  return (
    <section aria-labelledby="status-history" className="flex flex-col gap-2">
      <h2 id="status-history" className="text-headline">
        {t("detail.history.title")}
      </h2>
      {entries.length === 0 ? (
        <p className="text-muted-foreground">{t("detail.history.empty")}</p>
      ) : (
        <ul role="list" className="divide-border flex flex-col divide-y">
          {entries.map((entry) => {
            const Icon = STATUSES[taskStatus[entry.toStatus]].icon;
            const time = format.dateTime(new Date(entry.createdAt), {
              dateStyle: "medium",
              timeStyle: "short",
            });
            return (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  {Icon && <Icon aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />}
                  {t(`status.${entry.toStatus}`)}
                </span>
                <span className="text-subhead text-muted-foreground ml-auto">
                  {entry.author ? t("detail.history.by", { name: entry.author, time }) : time}
                </span>
                {entry.note && (
                  <p className="w-full break-words whitespace-pre-line">{entry.note}</p>
                )}
                {entry.noteRemoved && (
                  <p className="text-muted-foreground w-full">{t("detail.history.removed")}</p>
                )}
                {entry.note && entry.canRemove && <RemoveNote eventId={eventId} entry={entry} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
