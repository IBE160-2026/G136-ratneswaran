"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { buttonClass, Failure, Field, FieldError, inputClass } from "@/components/form";
import { toast } from "sonner";
import { saveFailedToast } from "@/lib/feedback";
import type { Result } from "@/lib/result";
import { saveQuestionnaire } from "@/modules/events/actions";
import { callSafely } from "@/modules/events/save";
import {
  DEFAULT_TIME_ZONE,
  eventLanguages,
  eventTypes,
  guestListMethods,
} from "@/modules/events/schemas";

type Initial = {
  eventId: string;
  eventType: string;
  startsLocal: string;
  startsUnknown: boolean;
  timeZone: string;
  durationHours: string;
  durationUnknown: boolean;
  guestCount: string;
  guestCountUnknown: boolean;
  venueKnown: string;
  rsvpWanted: string;
  rsvpDueDate: string;
  rsvpDueUnknown: boolean;
  guestListMethod: string;
  language: string;
};

const checkClass = "flex min-h-touch items-center gap-2";

function Unknown({ name, checked }: { name: string; checked: boolean }) {
  const t = useTranslations("events.wizard");
  return (
    <label className={checkClass}>
      <input type="checkbox" name={name} defaultChecked={checked} />
      {t("unknown")}
    </label>
  );
}

function Choice({
  name,
  legend,
  options,
  value,
  onChange,
  error,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string }[];
  value: string;
  onChange?: (value: string) => void;
  error?: string;
}) {
  const t = useTranslations("events.wizard");
  return (
    <fieldset
      role="radiogroup"
      tabIndex={-1}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? `${name}-error` : undefined}
      className="flex flex-col"
    >
      <legend className="mb-1">{legend}</legend>
      {[...options, { value: "unknown", label: t("unknown") }].map((option) => (
        <label key={option.value} className={checkClass}>
          <input
            type="radio"
            name={name}
            value={option.value}
            defaultChecked={value === option.value}
            onChange={() => onChange?.(option.value)}
          />
          {option.label}
        </label>
      ))}
      <FieldError id={`${name}-error`} message={error} />
    </fieldset>
  );
}

/**
 * Shared by the wizard steps: focuses the first invalid field, and on a failed save keeps the input and
 * offers Retry, which also runs once when the browser comes back online.
 */
export function useSaveFeedback(
  state: Result<null> | null,
  formRef: React.RefObject<HTMLFormElement | null>,
  submit: (data: FormData) => void,
) {
  const tf = useTranslations("feedback");
  useEffect(() => {
    if (!state || state.ok) return;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    if (state.error.code === "unavailable") {
      // Retry sends what is in the form now, so edits made after the failure are not lost.
      const retry = () => submit(new FormData(formRef.current!));
      const toastId = saveFailedToast(tf("saveFailed"), retry, tf("retry"));
      const onOnline = () => {
        toast.dismiss(toastId);
        retry();
      };
      window.addEventListener("online", onOnline, { once: true });
      return () => {
        window.removeEventListener("online", onOnline);
        toast.dismiss(toastId);
      };
    }
    // submit only wraps the stable dispatch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}

export function QuestionnaireForm({
  initial,
  timeZones,
}: {
  initial: Initial;
  timeZones: string[];
}) {
  const t = useTranslations("events.wizard");
  const [state, action, pending] = useActionState(
    (previous: Parameters<typeof saveQuestionnaire>[0], data: FormData) =>
      callSafely(() => saveQuestionnaire(previous, data)),
    null,
  );
  const [rsvpWanted, setRsvpWanted] = useState(initial.rsvpWanted);
  const formRef = useRef<HTMLFormElement>(null);
  const zoneRef = useRef<HTMLSelectElement>(null);
  const errors = (state && !state.ok && state.error.fields) || {};
  const submit = (data: FormData) => startTransition(() => action(data));

  // The saved time zone wins; otherwise the browser's, when the list has it.
  useEffect(() => {
    if (initial.timeZone || !zoneRef.current) return;
    const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timeZones.includes(browser)) zoneRef.current.value = browser;
  }, [initial.timeZone, timeZones]);

  useSaveFeedback(state, formRef, submit);

  const describe = (name: string) => ({
    "aria-invalid": errors[name] ? (true as const) : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  const yesNo = [
    { value: "yes", label: t("yes") },
    { value: "no", label: t("no") },
  ];

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
      className="flex max-w-md flex-col gap-6 py-12"
    >
      <p className="text-muted-foreground">{t("caption", { step: 1, total: 6 })}</p>
      <h1 className="text-large-title">{t("title")}</h1>
      <Failure state={state} />
      <input type="hidden" name="eventId" value={initial.eventId} />

      <Field name="eventType" label={t("eventType.label")} error={errors.eventType}>
        <select
          id="eventType"
          name="eventType"
          defaultValue={initial.eventType}
          className={inputClass}
          {...describe("eventType")}
        >
          <option value="">{t("eventType.choose")}</option>
          {eventTypes.map((type) => (
            <option key={type} value={type}>
              {t(`eventType.${type}`)}
            </option>
          ))}
          <option value="unknown">{t("unknown")}</option>
        </select>
      </Field>

      <Field name="startsLocal" label={t("startsLocal.label")} error={errors.startsLocal}>
        <input
          id="startsLocal"
          name="startsLocal"
          type="datetime-local"
          defaultValue={initial.startsLocal}
          className={inputClass}
          {...describe("startsLocal")}
        />
        <Unknown name="startsUnknown" checked={initial.startsUnknown} />
      </Field>

      <Field name="timeZone" label={t("timeZone.label")} error={errors.timeZone}>
        <select
          id="timeZone"
          name="timeZone"
          ref={zoneRef}
          defaultValue={initial.timeZone || DEFAULT_TIME_ZONE}
          className={inputClass}
          {...describe("timeZone")}
        >
          {timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </Field>

      <Field name="durationHours" label={t("durationHours.label")} error={errors.durationHours}>
        <input
          id="durationHours"
          name="durationHours"
          inputMode="decimal"
          defaultValue={initial.durationHours}
          className={inputClass}
          {...describe("durationHours")}
        />
        <Unknown name="durationUnknown" checked={initial.durationUnknown} />
      </Field>

      <Field name="guestCount" label={t("guestCount.label")} error={errors.guestCount}>
        <input
          id="guestCount"
          name="guestCount"
          inputMode="numeric"
          defaultValue={initial.guestCount}
          className={inputClass}
          {...describe("guestCount")}
        />
        <Unknown name="guestCountUnknown" checked={initial.guestCountUnknown} />
      </Field>

      <Choice
        name="venueKnown"
        legend={t("venueKnown.label")}
        options={yesNo}
        value={initial.venueKnown}
        error={errors.venueKnown}
      />

      <Choice
        name="rsvpWanted"
        legend={t("rsvpWanted.label")}
        options={yesNo}
        value={initial.rsvpWanted}
        onChange={setRsvpWanted}
        error={errors.rsvpWanted}
      />

      {rsvpWanted === "yes" && (
        <Field name="rsvpDueDate" label={t("rsvpDueDate.label")} error={errors.rsvpDueDate}>
          <input
            id="rsvpDueDate"
            name="rsvpDueDate"
            type="date"
            defaultValue={initial.rsvpDueDate}
            className={inputClass}
            {...describe("rsvpDueDate")}
          />
          <Unknown name="rsvpDueUnknown" checked={initial.rsvpDueUnknown} />
        </Field>
      )}

      <Choice
        name="guestListMethod"
        legend={t("guestListMethod.label")}
        options={guestListMethods.map((method) => ({
          value: method,
          label: t(`guestListMethod.${method}`),
        }))}
        value={initial.guestListMethod}
        error={errors.guestListMethod}
      />

      <Field name="language" label={t("language.label")} error={errors.language}>
        <select
          id="language"
          name="language"
          defaultValue={initial.language}
          className={inputClass}
          {...describe("language")}
        >
          {eventLanguages.map((language) => (
            <option key={language} value={language}>
              {t(`language.${language}`)}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground">{t("language.hint")}</p>
      </Field>

      <div className="flex gap-3">
        <Link
          href="/events"
          className="min-h-touch border-input inline-flex items-center rounded-full border px-6"
        >
          {t("back")}
        </Link>
        <button type="submit" disabled={pending} className={buttonClass}>
          {t("next")}
        </button>
      </div>
    </form>
  );
}
