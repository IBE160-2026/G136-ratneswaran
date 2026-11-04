"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { buttonClass, Failure, Field, inputClass, secondaryClass } from "@/components/form";
import type { Result } from "@/lib/result";
import { eventPath } from "@/modules/events/list";
import { callSafely } from "@/modules/events/save";
import {
  addDependency,
  addSubtask,
  promoteSubtask,
  removeDependency,
} from "@/modules/tasks/actions";
import { useSaveFeedback } from "../../setup/form";
import { useDeadline } from "../task-row";

export type LinkedTask = { id: string; title: string; status: string; deadline: string | null };

const errorToast = (message: string) => toast.error(<span role="alert">{message}</span>);

/** Inline add by title and date; the new Subtask takes the parent's Role in the database. */
function SubtaskForm({
  eventId,
  parentId,
  roleId,
}: {
  eventId: string;
  parentId: string;
  roleId: string;
}) {
  const t = useTranslations("tasks");
  // Generated here so a retry after a revalidation stays one Subtask; a new one after each success.
  const [firstId] = useState(() => crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    (previous: Result<null> | null, data: FormData) => callSafely(() => addSubtask(previous, data)),
    null,
  );
  const submit = (data: FormData) => startTransition(() => action(data));
  useSaveFeedback(state, formRef, submit);
  useEffect(() => {
    if (state?.ok) {
      const form = formRef.current;
      form?.reset();
      // Uncontrolled, so reset() would bring the old id back; set the next one after it.
      if (form)
        form.querySelector<HTMLInputElement>('input[name="id"]')!.value = crypto.randomUUID();
    }
    if (state && !state.ok && state.error.code === "concurrent") errorToast(t("errors.concurrent"));
  }, [state, t]);

  const errors = (state && !state.ok && state.error.fields) || {};
  const describe = (name: string) => ({
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
      className="flex flex-col gap-3"
    >
      <Failure state={state} />
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="id" defaultValue={firstId} />
      <input type="hidden" name="parentId" value={parentId} />
      <input type="hidden" name="roleId" value={roleId} />
      <input type="hidden" name="kind" value="date" />
      <input type="hidden" name="daysBefore" value="" />
      <Field name="title" label={t("subtasks.name")} error={errors.title}>
        <input
          id="title"
          name="title"
          autoComplete="off"
          className={inputClass}
          {...describe("title")}
        />
      </Field>
      <Field name="deadline" label={t("subtasks.deadline")} error={errors.deadline}>
        <input
          id="deadline"
          name="deadline"
          type="date"
          className={inputClass}
          {...describe("deadline")}
        />
      </Field>
      <div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {t("subtasks.add")}
        </button>
      </div>
    </form>
  );
}

function LinkedRow({ eventId, task }: { eventId: string; task: LinkedTask }) {
  const t = useTranslations("tasks");
  const formatDeadline = useDeadline();
  return (
    <Link
      href={`${eventPath(eventId)}/tasks/${task.id}`}
      className="min-h-touch hover:bg-muted flex flex-wrap items-baseline gap-x-3 rounded-sm px-2 py-2"
    >
      <span className="min-w-0 break-words font-semibold">{task.title}</span>
      <span className="text-subhead text-muted-foreground ml-auto">
        {t(`status.${task.status}`)}
        {task.deadline && ` · ${t("row.due", { date: formatDeadline(task.deadline) })}`}
      </span>
    </Link>
  );
}

export function SubtasksCard({
  eventId,
  parent,
  subtasks,
  canAdd,
}: {
  eventId: string;
  parent: { id: string; roleId: string };
  subtasks: LinkedTask[];
  canAdd: boolean;
}) {
  const t = useTranslations("tasks");
  return (
    <section
      aria-labelledby="subtasks"
      className="bg-card flex flex-col gap-3 rounded-md border p-4"
    >
      <h2 id="subtasks" className="text-headline">
        {t("subtasks.title")}
      </h2>
      {subtasks.length === 0 ? (
        <p className="text-muted-foreground">{t("subtasks.empty")}</p>
      ) : (
        <ul role="list" className="divide-border flex flex-col divide-y">
          {subtasks.map((task) => (
            <li key={task.id}>
              <LinkedRow eventId={eventId} task={task} />
            </li>
          ))}
        </ul>
      )}
      {canAdd && <SubtaskForm eventId={eventId} parentId={parent.id} roleId={parent.roleId} />}
    </section>
  );
}

/** A Subtask's link to its parent, with Promote to Task for the Organizer and the Role lead. */
export function PartOf({
  eventId,
  parent,
  taskId,
  expected,
  canPromote,
}: {
  eventId: string;
  parent: { id: string; title: string };
  taskId: string;
  expected: string;
  canPromote: boolean;
}) {
  const t = useTranslations("tasks");
  const tr = useTranslations();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href={`${eventPath(eventId)}/tasks/${parent.id}`}
        className="text-primary min-h-touch inline-flex items-center"
      >
        {t("subtasks.partOf", { parent: parent.title })}
      </Link>
      {canPromote && (
        <button
          type="button"
          disabled={pending}
          className={secondaryClass}
          onClick={() =>
            start(async () => {
              const result = await callSafely(() => promoteSubtask({ eventId, taskId, expected }));
              if (result.ok) toast(t("subtasks.promotedToast"));
              else errorToast(tr(result.error.message));
            })
          }
        >
          {t("subtasks.promote")}
        </button>
      )}
    </div>
  );
}

export function DependsOnCard({
  eventId,
  taskId,
  dependsOn,
  candidates,
  canLink,
}: {
  eventId: string;
  taskId: string;
  dependsOn: LinkedTask[];
  candidates: { id: string; title: string }[];
  canLink: boolean;
}) {
  const t = useTranslations("tasks");
  const tr = useTranslations();
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState("");
  const change = (run: typeof addDependency, dependsOnId: string, done?: () => void) =>
    start(async () => {
      const result = await callSafely(() => run({ eventId, taskId, dependsOnId }));
      if (result.ok) done?.();
      else errorToast(tr(result.error.message));
    });
  return (
    <section
      aria-labelledby="depends-on"
      className="bg-card flex flex-col gap-3 rounded-md border p-4"
    >
      <h2 id="depends-on" className="text-headline">
        {t("dependsOn.title")}
      </h2>
      {dependsOn.length === 0 ? (
        <p className="text-muted-foreground">{t("dependsOn.empty")}</p>
      ) : (
        <ul role="list" className="divide-border flex flex-col divide-y">
          {dependsOn.map((task) => (
            <li key={task.id} className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <LinkedRow eventId={eventId} task={task} />
              </div>
              {canLink && (
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`${t("dependsOn.remove")}: ${task.title}`}
                  className={secondaryClass}
                  onClick={() => change(removeDependency, task.id)}
                >
                  {t("dependsOn.remove")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canLink && candidates.length > 0 && (
        <div className="flex flex-col gap-2">
          <label htmlFor="dependency-picker">{t("dependsOn.pick")}</label>
          <select
            id="dependency-picker"
            className={inputClass}
            value={chosen}
            onChange={(event) => setChosen(event.target.value)}
          >
            <option value="">{t("dependsOn.choose")}</option>
            {candidates.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
          <div>
            <button
              type="button"
              disabled={pending || chosen === ""}
              className={buttonClass}
              onClick={() => change(addDependency, chosen, () => setChosen(""))}
            >
              {t("dependsOn.add")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Blocked is a grey tint with a lock and a word, never red and never colour alone (UX-DR4). */
export function WaitsFor({ title, more }: { title: string; more: number }) {
  const t = useTranslations("tasks");
  return (
    <p className="bg-status-blocked-row text-muted-foreground inline-flex items-center gap-2 rounded-md px-3 py-2">
      <Lock aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
      {more > 0 ? t("row.waitsForMore", { title, count: more }) : t("row.waitsFor", { title })}
    </p>
  );
}
