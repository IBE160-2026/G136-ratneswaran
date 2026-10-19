"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useTranslations } from "next-intl";
import { startTransition, useActionState } from "react";
import { buttonClass, Failure } from "@/components/form";
import type { Result } from "@/lib/result";
import { publishEvent } from "@/modules/events/actions";
import type { PublishField } from "@/modules/events/list";
import { callSafely } from "@/modules/events/save";

const outlineClass = "border-input min-h-touch rounded-full border px-6";

/** Rendered inside the popup, which unmounts on close, so each opening starts without an old result. */
function PublishForm({ eventId, missing }: { eventId: string; missing: PublishField[] }) {
  const t = useTranslations("events.publish");
  const [state, run, pending] = useActionState(
    (previous: Result<null> | null, data: FormData) =>
      callSafely(() => publishEvent(previous, data)),
    null,
  );
  const fields = state && !state.ok ? Object.keys(state.error.fields ?? {}) : [];
  const shown = (missing.length ? missing : fields) as PublishField[];
  return (
    <>
      <Dialog.Title className="text-headline">{t("title")}</Dialog.Title>
      <Dialog.Description className="text-muted-foreground">
        {t(shown.length ? "incompleteDescription" : "description")}
      </Dialog.Description>
      {shown.length > 0 && (
        <ul className="list-disc pl-6">
          {shown.map((field) => (
            <li key={field}>{t(`missing.${field}`)}</li>
          ))}
        </ul>
      )}
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          startTransition(() => run(data));
        }}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="eventId" value={eventId} />
        <Failure state={state} />
        <div className="flex flex-wrap gap-3">
          {shown.length === 0 && (
            <button type="submit" disabled={pending} className={buttonClass}>
              {t("confirm")}
            </button>
          )}
          <Dialog.Close className={outlineClass}>{t("notYet")}</Dialog.Close>
        </div>
      </form>
    </>
  );
}

/**
 * Event home: the unpublished banner and its confirmation dialog. Base UI traps focus and closes on Escape.
 * An incomplete draft gets the list of what is missing and no confirm; a stale tab gets it from the action.
 */
export function PublishBanner({ eventId, missing }: { eventId: string; missing: PublishField[] }) {
  const t = useTranslations("events.publish");
  return (
    <div className="bg-primary-soft flex flex-wrap items-center gap-3 rounded-lg p-4">
      <p className="flex-1">{t("banner")}</p>
      <Dialog.Root>
        <Dialog.Trigger className={buttonClass}>{t("open")}</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />
          <Dialog.Popup className="bg-popover text-popover-foreground fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg p-6 shadow-lg">
            <PublishForm eventId={eventId} missing={missing} />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
