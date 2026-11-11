"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { secondaryClass } from "@/components/form";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { callSafely } from "@/modules/events/save";
import { deleteMyData } from "@/modules/guests/delete-actions";

const destructiveClass =
  "bg-destructive text-background min-h-touch rounded-full px-6 font-semibold disabled:opacity-60";

/** The end of *Delete my data*: one sentence, focused, and nothing more to do. */
export function Deleted({ already = false }: { already?: boolean }) {
  const t = useTranslations("rsvp.delete");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="flex max-w-md flex-col gap-4 py-12">
      <h1 ref={heading} tabIndex={-1} className="text-large-title break-words">
        {t(already ? "already" : "done")}
      </h1>
    </div>
  );
}

/** *Delete my data* behind a confirmation that names the Event and what is removed (FR-18). */
export function DeleteMyData({
  eventId,
  eventName,
  onGone,
}: {
  eventId: string;
  eventName: string;
  /** `deleted` is false when the data was already gone. */
  onGone: (deleted: boolean) => void;
}) {
  const t = useTranslations("rsvp");
  const key = useTranslations();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<{ code: string; message: string } | null>(null);

  async function confirm() {
    setFailed(null);
    setPending(true);
    const result = await callSafely(() => deleteMyData({ eventId }));
    setPending(false);
    if (!result.ok) return setFailed(result.error);
    setOpen(false);
    onGone(result.data.deleted);
  }

  return (
    <>
      <button
        type="button"
        className={`${secondaryClass} self-start`}
        onClick={() => setOpen(true)}
      >
        {t("delete.button")}
      </button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          // A reopened dialog starts clean, not with the last failure and its Retry.
          if (!next) setFailed(null);
        }}
      >
        <DialogContent showCloseButton={false} className="text-base sm:max-w-md">
          <DialogTitle className="text-headline break-words">
            {t("delete.title", { event: eventName })}
          </DialogTitle>
          <DialogDescription className="text-base break-words">
            {t("delete.body", { event: eventName })}
          </DialogDescription>
          {failed && (
            <p role="alert" className="text-destructive">
              {/* A dropped connection comes back with the wizard's text; say what failed here. */}
              {failed.code === "unavailable" ? t("delete.errors.unavailable") : key(failed.message)}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={destructiveClass}
              onClick={() => void confirm()}
              aria-busy={pending}
              disabled={pending}
            >
              {pending ? t("delete.deleting") : failed ? t("retry") : t("delete.confirm")}
            </button>
            <DialogClose className={secondaryClass}>{t("delete.cancel")}</DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
