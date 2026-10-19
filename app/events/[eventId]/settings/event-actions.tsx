"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Failure, Field, inputClass } from "@/components/form";
import type { Result } from "@/lib/result";
import { cancelEvent, deleteEvent } from "@/modules/events/actions";
import { callSafely } from "@/modules/events/save";

// Text in the background colour keeps contrast on the light and the dark destructive red.
const destructiveClass =
  "bg-destructive text-background min-h-touch rounded-full px-6 font-semibold disabled:opacity-60";
const triggerClass = "border-destructive text-destructive min-h-touch rounded-full border px-6";
const outlineClass = "border-input min-h-touch rounded-full border px-6";

type Action = (previous: Result<null> | null, data: FormData) => Promise<Result<null>>;

/** A confirmation dialog around one destructive form. Base UI traps focus and closes on Escape. */
function Confirm({
  kind,
  eventId,
  action,
  canConfirm = true,
  onClose,
  children,
}: {
  kind: "cancel" | "delete" | "discard";
  eventId: string;
  action: Action;
  canConfirm?: boolean;
  onClose?: () => void;
  children?: (errors: Partial<Record<string, string>>) => React.ReactNode;
}) {
  const t = useTranslations("events.settings");
  const [state, run, pending] = useActionState(
    (previous: Result<null> | null, data: FormData) => callSafely(() => action(previous, data)),
    null,
  );
  const errors = (state && !state.ok && state.error.fields) || {};
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state && !state.ok) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state]);
  return (
    <Dialog.Root onOpenChange={(open) => !open && onClose?.()}>
      <Dialog.Trigger className={triggerClass}>{t(`${kind}.open`)}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup className="bg-popover text-popover-foreground fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg p-6 shadow-lg">
          <Dialog.Title className="text-headline">{t(`${kind}.title`)}</Dialog.Title>
          <Dialog.Description className="text-muted-foreground">
            {t(`${kind}.description`)}
          </Dialog.Description>
          <form
            ref={formRef}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              startTransition(() => run(data));
            }}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="eventId" value={eventId} />
            {children?.(errors)}
            <Failure state={state} />
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={pending || !canConfirm} className={destructiveClass}>
                {t(`${kind}.confirm`)}
              </button>
              <Dialog.Close className={outlineClass}>{t("keep")}</Dialog.Close>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const fieldProps = (name: string, errors: Partial<Record<string, string>>, hint?: string) => ({
  id: name,
  name,
  className: inputClass,
  "aria-invalid": errors[name] ? (true as const) : undefined,
  "aria-describedby":
    [errors[name] && `${name}-error`, hint].filter(Boolean).join(" ") || undefined,
});

/**
 * Event settings: cancel or delete. A published Event that is not over can be cancelled or deleted, a
 * cancelled or ended one only deleted, and a draft only discarded (FR4).
 */
export function EventActions({
  eventId,
  name,
  state,
}: {
  eventId: string;
  name: string;
  state: "draft" | "open" | "closed";
}) {
  const t = useTranslations("events.settings");
  const [typed, setTyped] = useState("");
  return (
    <section aria-labelledby="end-title" className="flex max-w-md flex-col gap-4 pb-12">
      <h2 id="end-title" className="text-headline">
        {t("endTitle")}
      </h2>
      {state === "draft" ? (
        <Confirm kind="discard" eventId={eventId} action={deleteEvent} />
      ) : (
        <div className="flex flex-wrap gap-3">
          {state === "open" && (
            <Confirm kind="cancel" eventId={eventId} action={cancelEvent}>
              {(errors) => (
                <Field name="note" label={t("cancel.note")} error={errors.note}>
                  <textarea
                    rows={3}
                    maxLength={500}
                    {...fieldProps("note", errors, "note-hint")}
                    className={`${inputClass} py-2`}
                  />
                  <p id="note-hint" className="text-muted-foreground">
                    {t("cancel.noteHint")}
                  </p>
                </Field>
              )}
            </Confirm>
          )}
          <Confirm
            kind="delete"
            eventId={eventId}
            action={deleteEvent}
            canConfirm={typed.trim() === name.trim()}
            onClose={() => setTyped("")}
          >
            {(errors) => (
              <Field name="confirmName" label={t("delete.name")} error={errors.confirmName}>
                <input
                  autoComplete="off"
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  {...fieldProps("confirmName", errors)}
                />
              </Field>
            )}
          </Confirm>
        </div>
      )}
    </section>
  );
}
