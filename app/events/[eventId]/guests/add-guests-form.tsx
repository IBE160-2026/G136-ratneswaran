"use client";

import { useTranslations } from "next-intl";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { buttonClass, Failure, FieldError, inputClass } from "@/components/form";
import { addGuests, type AddGuestsResult } from "@/modules/guests/actions";
import { MAX_GUEST_ROWS } from "@/modules/guests/schemas";
import { callSafely } from "@/modules/events/save";
import { useSaveFeedback } from "../setup/form";

/** Paste or type rows; shared by wizard step 2 and the Guests page. */
export function AddGuestsForm({ eventId }: { eventId: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(
    (previous: AddGuestsResult | null, data: FormData) =>
      callSafely(() => addGuests(previous, data)),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const rowsRef = useRef<HTMLTextAreaElement>(null);
  const submit = (data: FormData) => startTransition(() => action(data));
  useSaveFeedback(state, formRef, submit);

  const failed = state?.ok ? state.data.failed : [];
  const fieldError = (state && !state.ok && state.error.fields?.rows) || undefined;

  // The textarea keeps only the lines that still need fixing.
  useEffect(() => {
    if (!state?.ok || !rowsRef.current) return;
    rowsRef.current.value = state.data.failed.map((row) => row.line).join("\n");
    if (state.data.failed.length > 0) rowsRef.current.focus();
  }, [state]);

  const invalid = failed.length > 0 || fieldError !== undefined;
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
      <div className="flex flex-col gap-1">
        <label htmlFor="rows">{t("guests.add.label")}</label>
        <textarea
          ref={rowsRef}
          id="rows"
          name="rows"
          rows={6}
          autoComplete="off"
          spellCheck={false}
          className={`${inputClass} py-2`}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={
            ["rows-hint", fieldError && "rows-error", failed.length > 0 && "rows-failed"]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        <p id="rows-hint" className="text-muted-foreground">
          {t("guests.add.hint", { max: MAX_GUEST_ROWS })}
        </p>
        <FieldError id="rows-error" message={fieldError} />
      </div>
      {/* Always rendered, so screen readers announce the count when it fills in. */}
      <p role="status">{state?.ok && t("guests.add.added", { count: state.data.added })}</p>
      {failed.length > 0 && (
        <div id="rows-failed" className="text-destructive flex flex-col gap-1">
          <p>{t("guests.add.failedTitle", { count: failed.length })}</p>
          <ul role="list" className="flex flex-col gap-1">
            {failed.map((row, index) => (
              <li key={index} className="break-all">
                {t("guests.add.failedRow", { line: row.line, reason: t(row.reason) })}
              </li>
            ))}
          </ul>
        </div>
      )}
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {t("guests.add.submit")}
      </button>
    </form>
  );
}
