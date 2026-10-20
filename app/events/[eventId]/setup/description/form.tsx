"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { startTransition, useActionState, useRef } from "react";
import { buttonClass, Failure, Field, inputClass } from "@/components/form";
import { saveDescription } from "@/modules/events/actions";
import { callSafely, setupPath } from "@/modules/events/save";
import { useSaveFeedback } from "../form";

/** Wizard step 3. Until steps 4–5 exist, Next opens the Event home, where the Organizer publishes. */
export function DescriptionForm({
  eventId,
  name,
  description,
}: {
  eventId: string;
  name: string;
  description: string;
}) {
  const t = useTranslations("events");
  const [state, action, pending] = useActionState(
    (previous: Parameters<typeof saveDescription>[0], data: FormData) =>
      callSafely(() => saveDescription(previous, data)),
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const errors = (state && !state.ok && state.error.fields) || {};
  const submit = (data: FormData) => startTransition(() => action(data));
  useSaveFeedback(state, formRef, submit);

  const describe = (field: string, hint?: string) => ({
    id: field,
    name: field,
    "aria-invalid": errors[field] ? (true as const) : undefined,
    "aria-describedby":
      [errors[field] && `${field}-error`, hint].filter(Boolean).join(" ") || undefined,
  });

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
      <p className="text-muted-foreground">{t("wizard.caption", { step: 3, total: 6 })}</p>
      <h1 className="text-large-title">{t("description.title")}</h1>
      <Failure state={state} />
      <input type="hidden" name="eventId" value={eventId} />

      <Field name="name" label={t("description.name")} error={errors.name}>
        <input
          defaultValue={name}
          maxLength={200}
          autoComplete="off"
          className={inputClass}
          {...describe("name")}
        />
      </Field>

      <Field name="description" label={t("description.description")} error={errors.description}>
        <textarea
          rows={6}
          maxLength={2000}
          defaultValue={description}
          className={`${inputClass} py-2`}
          {...describe("description", "description-hint")}
        />
        <p id="description-hint" className="text-muted-foreground">
          {t("description.descriptionHint")}
        </p>
      </Field>

      <div className="flex gap-3">
        <Link
          href={`${setupPath(eventId)}/guests`}
          className="min-h-touch border-input inline-flex items-center rounded-full border px-6"
        >
          {t("wizard.back")}
        </Link>
        <button type="submit" disabled={pending} className={buttonClass}>
          {t("wizard.next")}
        </button>
      </div>
    </form>
  );
}
