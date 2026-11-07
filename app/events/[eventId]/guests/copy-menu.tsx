"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { buttonClass, inputClass, secondaryClass } from "@/components/form";
import { callSafely } from "@/modules/events/save";
import { copyGuestLink, copyGuestLinks } from "@/modules/guests/link-actions";
import type { Guest } from "./guest-rows";

/** Same cap as the Guests tab's 500-guest budget. */
const MAX_COPY_ALL = 500;
const BATCH = 5;

const destructiveClass =
  "bg-destructive text-background min-h-touch rounded-full px-6 font-semibold disabled:opacity-60";
const itemClass =
  "min-h-touch flex cursor-default items-center px-4 outline-none data-highlighted:bg-accent";

type Outcome = { message: string; fallback?: string } | null;

/** Writes to the clipboard; a refused or missing clipboard leaves the text to select by hand. */
const toClipboard = (text: string, copied: string): Promise<Outcome> =>
  Promise.resolve()
    .then(() => navigator.clipboard.writeText(text))
    .then(
      () => ({ message: copied }),
      () => ({ message: "guests.link.copyFailed", fallback: text }),
    );

/** The text the clipboard refused, selectable in a read-only field (as the Team invite link). */
function Fallback({ label, text }: { label: string; text: string }) {
  const id = useId();
  const multiline = text.includes("\n");
  const props = {
    id,
    readOnly: true,
    value: text,
    className: inputClass,
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => e.target.select(),
  };
  return (
    <div className="flex w-full flex-col gap-1">
      <label htmlFor={id}>{label}</label>
      {multiline ? <textarea rows={6} {...props} /> : <input {...props} />}
    </div>
  );
}

/** *Copy link*, *Copy invitation text* and *New link* (behind a confirmation) for one guest. */
export function CopyMenu({ eventId, guest }: { eventId: string; guest: Guest }) {
  const t = useTranslations();
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const values = { name: guest.name };

  const copy = (what: "link" | "text", renew = false) =>
    startTransition(async () => {
      setOutcome(null);
      setFailure(null);
      const result = await callSafely(() => copyGuestLink({ eventId, guestId: guest.id, renew }));
      if (!result.ok) {
        if (renew) setFailure(result.error.message);
        else setOutcome({ message: result.error.message });
        return;
      }
      if (renew) setConfirming(false);
      setOutcome(
        await toClipboard(
          what === "link" ? result.data.link : result.data.text,
          renew
            ? "guests.link.renewed"
            : what === "link"
              ? "guests.link.copied"
              : "guests.link.textCopied",
        ),
      );
    });

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          className={secondaryClass}
          aria-label={t("guests.link.menuLabel", values)}
          disabled={pending}
        >
          {t("guests.link.menu")}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={4} align="end" className="z-50">
            <Menu.Popup className="bg-popover text-popover-foreground flex flex-col rounded-md py-1 shadow-lg">
              <Menu.Item className={itemClass} onClick={() => copy("link")}>
                {t("guests.link.copyLink")}
              </Menu.Item>
              <Menu.Item className={itemClass} onClick={() => copy("text")}>
                {t("guests.link.copyText")}
              </Menu.Item>
              <Menu.Item
                className={itemClass}
                onClick={() => {
                  setFailure(null);
                  setConfirming(true);
                }}
              >
                {t("guests.link.renew")}
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <span role="status" className="w-full empty:hidden">
        {outcome && t(outcome.message, values)}
      </span>
      {outcome?.fallback && (
        <Fallback label={t("guests.link.fallbackLabel")} text={outcome.fallback} />
      )}
      <Dialog.Root open={confirming} onOpenChange={(next) => !pending && setConfirming(next)}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />
          <Dialog.Popup className="bg-popover text-popover-foreground fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg p-6 shadow-lg">
            <Dialog.Title className="text-headline">
              {t("guests.link.renewTitle", values)}
            </Dialog.Title>
            <Dialog.Description className="text-muted-foreground">
              {t("guests.link.renewDescription", values)}
            </Dialog.Description>
            {failure && (
              <p role="alert" className="text-destructive">
                {t(failure)}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className={destructiveClass}
                onClick={() => copy("link", true)}
                aria-busy={pending}
                disabled={pending}
              >
                {t("guests.link.renewConfirm")}
              </button>
              <Dialog.Close className={secondaryClass}>{t("guests.link.renewKeep")}</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

/**
 * *Copy all links*: one `name<TAB>email<TAB>link` line per guest, fetched in batches of 5 (one action each). Safe to repeat:
 * every copy returns the same active link, so a retry after a failure runs the whole list again.
 */
export function CopyAllLinks({ eventId, guests }: { eventId: string; guests: Guest[] }) {
  const t = useTranslations();
  const [progress, setProgress] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, startTransition] = useTransition();

  const copyAll = () =>
    startTransition(async () => {
      setOutcome(null);
      if (guests.length > MAX_COPY_ALL) {
        setOutcome({ message: "guests.link.allTooMany" });
        return;
      }
      const lines: string[] = [];
      for (let start = 0; start < guests.length; start += BATCH) {
        setProgress(t("guests.link.allProgress", { done: start, total: guests.length }));
        const batch = guests.slice(start, start + BATCH);
        const result = await callSafely(() =>
          copyGuestLinks({ eventId, guestIds: batch.map((guest) => guest.id) }),
        );
        if (!result.ok) {
          setProgress(null);
          setOutcome({ message: "guests.link.allFailed" });
          return;
        }
        result.data.forEach(({ link }, i) => {
          lines.push(`${batch[i].name}\t${batch[i].email}\t${link}`);
        });
      }
      setProgress(null);
      setOutcome(await toClipboard(lines.join("\n"), "guests.link.allCopied"));
    });

  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" className={buttonClass} onClick={copyAll} disabled={pending}>
        {t("guests.link.all")}
      </button>
      <p role="status" className="empty:hidden">
        {progress ?? (outcome && t(outcome.message, { count: guests.length, max: MAX_COPY_ALL }))}
      </p>
      {outcome?.fallback && (
        <Fallback label={t("guests.link.allFallbackLabel")} text={outcome.fallback} />
      )}
    </div>
  );
}
