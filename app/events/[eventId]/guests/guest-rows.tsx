"use client";

import { useTranslations } from "next-intl";
import { startTransition, useActionState, useEffect, useOptimistic, useRef, useState } from "react";
import { toast } from "sonner";
import { buttonClass, Failure, Field, inputClass } from "@/components/form";
import { StatusLabel } from "@/components/status-label";
import { undoToast } from "@/lib/feedback";
import type { Result } from "@/lib/result";
import { callSafely } from "@/modules/events/save";
import { removeGuest, restoreGuest, updateGuest } from "@/modules/guests/actions";
import { useSaveFeedback } from "../setup/form";

export type Guest = { id: string; name: string; email: string };

const secondaryClass = "min-h-touch border-input rounded-full border px-4";

// Sonner has no role option, so the message itself carries role="alert".
const errorToast = (message: string) => toast.error(<span role="alert">{message}</span>);

/** The rows of the shared guest list, with inline edit and remove with Undo (UX-DR23: no dialog). */
export function GuestRows({
  eventId,
  guests,
  readOnly,
}: {
  eventId: string;
  guests: Guest[];
  readOnly: boolean;
}) {
  const t = useTranslations();
  // A removed row hides until the action ends; the revalidated list then has it gone, or back on failure.
  const [shown, hide] = useOptimistic(guests, (list, id: string) =>
    list.filter((guest) => guest.id !== id),
  );
  const [editing, setEditing] = useState<string | null>(null);
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const returnFocus = useRef<string | null>(null);

  useEffect(() => {
    if (editing || !returnFocus.current) return;
    editButtons.current.get(returnFocus.current)?.focus();
    returnFocus.current = null;
  }, [editing]);

  const restore = (guest: Guest) =>
    startTransition(async () => {
      const result = await callSafely(() => restoreGuest({ eventId, ...guest }));
      if (!result.ok) {
        errorToast(
          result.error.code === "duplicate"
            ? t(result.error.message)
            : t("guests.list.errors.restoreFailed", { name: guest.name }),
        );
      }
    });

  const remove = (guest: Guest, index: number) => {
    const next = shown[index + 1] ?? shown[index - 1];
    const button = next && editButtons.current.get(next.id);
    // Focus leaves the row before it hides; the h1 needs tabindex to take it.
    const target = button || document.querySelector<HTMLElement>("main h1");
    if (!button) target?.setAttribute("tabindex", "-1");
    target?.focus();
    startTransition(async () => {
      hide(guest.id);
      const result = await callSafely(() => removeGuest({ eventId, guestId: guest.id }));
      if (result.ok) {
        undoToast(
          t("guests.list.removed", { name: guest.name }),
          () => restore(guest),
          t("feedback.undo"),
        );
      } else {
        errorToast(
          result.error.code === "unavailable"
            ? t("guests.list.errors.removeFailed", { name: guest.name })
            : t(result.error.message),
        );
      }
    });
  };

  if (shown.length === 0) {
    return (
      <p className="text-muted-foreground">
        {t(readOnly ? "guests.list.emptyReadOnly" : "guests.list.empty")}
      </p>
    );
  }
  return (
    <section aria-labelledby="guest-count" className="flex flex-col gap-2">
      <h2 id="guest-count" className="text-headline">
        {t("guests.list.count", { count: shown.length })}
      </h2>
      <ul role="list" className="divide-border flex flex-col divide-y">
        {shown.map((guest, index) => (
          <li key={guest.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-2 py-2">
            {editing === guest.id ? (
              <EditGuest
                eventId={eventId}
                guest={guest}
                onDone={() => {
                  returnFocus.current = guest.id;
                  setEditing(null);
                }}
              />
            ) : (
              <>
                <span className="min-w-0 break-words">{guest.name}</span>
                <span className="text-muted-foreground min-w-0 break-all">{guest.email}</span>
                <StatusLabel status="notInvited" className="ml-auto" />
                {!readOnly && (
                  <span className="flex gap-2">
                    <button
                      type="button"
                      ref={(button) => {
                        if (button) editButtons.current.set(guest.id, button);
                        else editButtons.current.delete(guest.id);
                      }}
                      aria-label={t("guests.list.editLabel", { name: guest.name })}
                      className={secondaryClass}
                      onClick={() => setEditing(guest.id)}
                    >
                      {t("guests.list.edit")}
                    </button>
                    <button
                      type="button"
                      aria-label={t("guests.list.removeLabel", { name: guest.name })}
                      className={secondaryClass}
                      onClick={() => remove(guest, index)}
                    >
                      {t("guests.list.remove")}
                    </button>
                  </span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function EditGuest({
  eventId,
  guest,
  onDone,
}: {
  eventId: string;
  guest: Guest;
  onDone: () => void;
}) {
  const t = useTranslations("guests.list");
  const [state, action, pending] = useActionState(
    (previous: Result<null> | null, data: FormData) =>
      callSafely(() => updateGuest(previous, data)),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const submit = (data: FormData) => startTransition(() => action(data));
  useSaveFeedback(state, formRef, submit);

  useEffect(() => nameRef.current?.focus(), []);
  useEffect(() => {
    if (state?.ok) onDone();
    // onDone is a fresh closure each render; only a new result matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const errors = (state && !state.ok && state.error.fields) || {};
  const id = (field: string) => `guest-${field}-${guest.id}`;
  const describe = (field: string) => ({
    "aria-invalid": errors[field] ? (true as const) : undefined,
    "aria-describedby": errors[field] ? `${id(field)}-error` : undefined,
  });
  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
      className="flex w-full flex-col gap-3"
    >
      <Failure state={state} />
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="guestId" value={guest.id} />
      <Field name={id("name")} label={t("name")} error={errors.name}>
        <input
          ref={nameRef}
          id={id("name")}
          name="name"
          defaultValue={guest.name}
          autoComplete="off"
          className={inputClass}
          {...describe("name")}
        />
      </Field>
      <Field name={id("email")} label={t("email")} error={errors.email}>
        <input
          id={id("email")}
          name="email"
          type="email"
          defaultValue={guest.email}
          autoComplete="off"
          spellCheck={false}
          className={inputClass}
          {...describe("email")}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={buttonClass}>
          {t("save")}
        </button>
        <button type="button" className={secondaryClass} onClick={onDone}>
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
