"use client";

import { useTranslations } from "next-intl";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { buttonClass, Failure, Field, inputClass, secondaryClass } from "@/components/form";
import type { Result } from "@/lib/result";
import { callSafely } from "@/modules/events/save";
import { createTask, updateTask } from "@/modules/tasks/actions";
import { useSaveFeedback } from "../setup/form";

export type TaskValues = {
  title: string;
  description: string;
  kind: "date" | "days";
  deadline: string;
  daysBefore: string;
};

type Props = {
  eventId: string;
  hasStart: boolean;
  initial: TaskValues;
  /** Create: the new Task's id and the Roles to choose from. Edit: the Task and the updated_at it was opened with. */
  mode:
    | { create: { roles: { id: string; name: string }[] } }
    | { edit: { taskId: string; expected: string; onDone: () => void } };
};

/** One form for creating and editing a Task; the Role is fixed once the Task exists (FR-9). */
export function TaskForm({ eventId, hasStart, initial, mode }: Props) {
  const t = useTranslations("tasks");
  const create = "create" in mode ? mode.create : null;
  // Generated here so a revalidation between submit and retry keeps the id, and a retry stays one Task.
  const [newId] = useState(() => crypto.randomUUID());
  const edit = "edit" in mode ? mode.edit : null;
  const [state, action, pending] = useActionState(
    (previous: Result<null> | null, data: FormData) =>
      callSafely(() => (create ? createTask(previous, data) : updateTask(previous, data))),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState(hasStart ? initial.kind : "date");
  const submit = (data: FormData) => startTransition(() => action(data));
  useSaveFeedback(state, formRef, submit);

  useEffect(() => {
    if (state?.ok) edit?.onDone();
    // The concurrent-edit toast is shared with the other Task actions; the form keeps its input.
    if (state && !state.ok && state.error.code === "concurrent") {
      toast.error(<span role="alert">{t("errors.concurrent")}</span>);
    }
    // edit is a fresh object each render; only a new result matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

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
      className="flex flex-col gap-4"
    >
      <Failure state={state} />
      <input type="hidden" name="eventId" value={eventId} />
      {create && <input type="hidden" name="id" value={newId} />}
      {edit && <input type="hidden" name="taskId" value={edit.taskId} />}
      {edit && <input type="hidden" name="expected" value={edit.expected} />}
      {create && (
        <Field name="roleId" label={t("create.role")} error={errors.roleId}>
          <select id="roleId" name="roleId" className={inputClass} {...describe("roleId")}>
            {create.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field name="title" label={t("create.name")} error={errors.title}>
        <input
          id="title"
          name="title"
          defaultValue={initial.title}
          autoComplete="off"
          className={inputClass}
          {...describe("title")}
        />
      </Field>
      <Field name="description" label={t("create.description")} error={errors.description}>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial.description}
          className={`${inputClass} py-2`}
          {...describe("description")}
        />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend>{t("create.deadline")}</legend>
        <label className="min-h-touch flex items-center gap-2">
          <input
            type="radio"
            name="kind"
            value="date"
            checked={kind === "date"}
            onChange={() => setKind("date")}
          />
          {t("create.kindDate")}
        </label>
        <label className="min-h-touch flex items-center gap-2">
          <input
            type="radio"
            name="kind"
            value="days"
            checked={kind === "days"}
            disabled={!hasStart}
            onChange={() => setKind("days")}
          />
          {t("create.kindDays")}
        </label>
        {!hasStart && <p className="text-muted-foreground">{t("create.noStart")}</p>}
        {/* Both stay in the form so a submit always carries them; the unused one is ignored. */}
        <div hidden={kind !== "date"}>
          <Field name="deadline" label={t("create.date")} error={errors.deadline}>
            <input
              id="deadline"
              name="deadline"
              type="date"
              defaultValue={initial.deadline}
              className={inputClass}
              {...describe("deadline")}
            />
          </Field>
        </div>
        <div hidden={kind !== "days"}>
          <Field name="daysBefore" label={t("create.days")} error={errors.daysBefore}>
            <input
              id="daysBefore"
              name="daysBefore"
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              defaultValue={initial.daysBefore}
              className={inputClass}
              {...describe("daysBefore")}
            />
          </Field>
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={buttonClass}>
          {create ? t("create.submit") : t("detail.save")}
        </button>
        {edit && (
          <button type="button" className={secondaryClass} onClick={edit.onDone}>
            {t("detail.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
