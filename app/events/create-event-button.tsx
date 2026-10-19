"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { buttonClass, Failure } from "@/components/form";
import { createEvent } from "@/modules/events/actions";

// Temporary entry point: Story 2.4 replaces it with the Create new event card.
export function CreateEventButton() {
  const t = useTranslations("events");
  const [state, action, pending] = useActionState(createEvent, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Failure state={state} />
      <button type="submit" disabled={pending} className={`${buttonClass} self-start`}>
        {t("createNew")}
      </button>
    </form>
  );
}
