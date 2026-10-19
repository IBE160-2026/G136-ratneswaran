"use client";

import { useTranslations } from "next-intl";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { buttonClass, Failure, Field, inputClass } from "@/components/form";
import { updateSchedule } from "@/modules/events/actions";
import { callSafely } from "@/modules/events/save";
import { eventLanguages } from "@/modules/events/schemas";

type Initial = {
  eventId: string;
  startsLocal: string;
  endsLocal: string;
  timeZone: string;
  rsvpDueDate: string;
  language: string;
};

export function SettingsForm({
  initial,
  rsvpWanted,
  readOnly,
  timeZones,
}: {
  initial: Initial;
  rsvpWanted: boolean;
  readOnly: boolean;
  timeZones: string[];
}) {
  const t = useTranslations("events");
  const [state, action, pending] = useActionState(
    (previous: Parameters<typeof updateSchedule>[0], data: FormData) =>
      callSafely(() => updateSchedule(previous, data)),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const errors = (state && !state.ok && state.error.fields) || {};
  // An edit after a save clears the status text, so the next save is announced again.
  const [editedAfter, setEditedAfter] = useState<typeof state>(null);
  const saved = state?.ok && editedAfter !== state;

  useEffect(() => {
    if (state && !state.ok) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state]);

  const describe = (name: string, hint?: string) => ({
    id: name,
    name,
    className: inputClass,
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby":
      [errors[name] && `${name}-error`, hint].filter(Boolean).join(" ") || undefined,
  });

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
      onChange={() => setEditedAfter(state)}
      className="flex max-w-md flex-col gap-6 py-12"
    >
      <h1 className="text-large-title">{t("settings.title")}</h1>
      {readOnly && (
        <p id="settings-read-only" className="text-muted-foreground">
          {t("settings.readOnly")}
        </p>
      )}
      <Failure state={state} />
      {/* Always mounted, so screen readers announce the text when it appears. */}
      <p role="status">{saved ? t("settings.saved") : ""}</p>
      <input type="hidden" name="eventId" value={initial.eventId} />

      <fieldset
        disabled={readOnly}
        aria-describedby={readOnly ? "settings-read-only" : undefined}
        className="flex flex-col gap-6"
      >
        <Field name="startsLocal" label={t("settings.startsLocal")} error={errors.startsLocal}>
          <input
            type="datetime-local"
            defaultValue={initial.startsLocal}
            {...describe("startsLocal")}
          />
        </Field>

        <Field name="endsLocal" label={t("settings.endsLocal")} error={errors.endsLocal}>
          <input
            type="datetime-local"
            defaultValue={initial.endsLocal}
            {...describe("endsLocal")}
          />
        </Field>

        <Field name="timeZone" label={t("wizard.timeZone.label")} error={errors.timeZone}>
          <select defaultValue={initial.timeZone} {...describe("timeZone")}>
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </Field>

        {rsvpWanted && (
          <Field
            name="rsvpDueDate"
            label={t("wizard.rsvpDueDate.label")}
            error={errors.rsvpDueDate}
          >
            <input type="date" defaultValue={initial.rsvpDueDate} {...describe("rsvpDueDate")} />
          </Field>
        )}

        <Field name="language" label={t("wizard.language.label")} error={errors.language}>
          <select defaultValue={initial.language} {...describe("language", "language-hint")}>
            {eventLanguages.map((language) => (
              <option key={language} value={language}>
                {t(`wizard.language.${language}`)}
              </option>
            ))}
          </select>
          <p id="language-hint" className="text-muted-foreground">
            {t("wizard.language.hint")}
          </p>
        </Field>

        <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
          {t("settings.save")}
        </button>
      </fieldset>
    </form>
  );
}
