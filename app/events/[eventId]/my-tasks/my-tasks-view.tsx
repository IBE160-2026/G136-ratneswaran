"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TaskRow, type ListedTask } from "../tasks/task-row";

/** The viewer's own Tasks, or with the toggle on every pending Task they may see. */
export function MyTasksView({
  eventId,
  owned,
  obsolete,
  pending,
}: {
  eventId: string;
  owned: ListedTask[];
  obsolete: ListedTask[];
  pending: ListedTask[];
}) {
  const t = useTranslations("tasks.mine");
  const [showPending, setShowPending] = useState(false);
  const rows = showPending ? pending : owned;
  return (
    <>
      <button
        type="button"
        aria-pressed={showPending}
        onClick={() => setShowPending(!showPending)}
        className={`min-h-touch min-w-touch self-start rounded-full border px-4 ${showPending ? "border-primary bg-primary-soft text-primary border-2 font-semibold" : "border-input"}`}
      >
        {t("notDelegated")}
      </button>
      <p role="status" aria-live="polite" className="text-subhead text-muted-foreground">
        {showPending ? t("showing", { count: pending.length }) : ""}
      </p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t(showPending ? "emptyPending" : "empty")}</p>
      ) : (
        <ul role="list" className="divide-border flex flex-col divide-y">
          {rows.map((task) => (
            <TaskRow key={task.id} eventId={eventId} task={task} />
          ))}
        </ul>
      )}
      {!showPending && obsolete.length > 0 && (
        <details>
          <summary className="min-h-touch flex cursor-pointer items-center">
            {t("showObsolete", { count: obsolete.length })}
          </summary>
          <ul role="list" className="divide-border flex flex-col divide-y">
            {obsolete.map((task) => (
              <TaskRow key={task.id} eventId={eventId} task={task} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
