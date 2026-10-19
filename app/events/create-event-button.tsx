"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Failure } from "@/components/form";
import { createEvent } from "@/modules/events/actions";

// The Create new event card: always last, the same size as an Event card (DESIGN.md).
export function CreateEventButton() {
  const t = useTranslations("events");
  const [state, action, pending] = useActionState(createEvent, null);
  return (
    <form action={action} className="flex h-full flex-col gap-3">
      <Failure state={state} />
      <button
        type="submit"
        disabled={pending}
        className="bg-primary-soft text-primary border-primary flex min-h-24 flex-1 items-center justify-center gap-2 rounded-md border-[2.5px] p-4 font-semibold disabled:opacity-60"
      >
        <Plus aria-hidden strokeWidth={1.75} className="size-5" />
        {t("createNew")}
      </button>
    </form>
  );
}
