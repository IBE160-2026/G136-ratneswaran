"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { secondaryClass } from "@/components/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { saveFailedToast } from "@/lib/feedback";
import { callSafely } from "@/modules/events/save";
import { delegateTask } from "@/modules/tasks/actions";

export type Candidate = { userId: string; name: string | null; pending: boolean };

/** UX: a `Command` list of the people the caller may pick; a pick delegates at once. */
export function DelegatePanel({
  eventId,
  taskId,
  updatedAt,
  candidates,
}: {
  eventId: string;
  taskId: string;
  updatedAt: string;
  candidates: Candidate[];
}) {
  const t = useTranslations("tasks.detail.delegate");
  const tr = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  // Each write chains on the updated_at the last one returned, before the page has reloaded.
  const expected = useRef(updatedAt);
  useEffect(() => {
    expected.current = updatedAt;
  }, [updatedAt]);
  const busy = useRef(false);

  const pick = (userId: string) => {
    if (busy.current) return;
    busy.current = true;
    start(async () => {
      const result = await callSafely(() =>
        delegateTask({ eventId, taskId, expected: expected.current, newOwner: userId }),
      );
      busy.current = false;
      if (result.ok) {
        expected.current = result.data.updatedAt;
        setOpen(false);
        toast(t("done"));
      } else if (result.error.code === "concurrent") {
        toast.error(<span role="alert">{tr(result.error.message)}</span>);
        router.refresh();
      } else {
        saveFailedToast(tr(result.error.message), () => pick(userId), tr("feedback.retry"));
      }
    });
  };

  return (
    <section aria-labelledby="delegate-title" className="flex flex-col gap-3">
      <h2 id="delegate-title" className="text-headline">
        {t("title")}
      </h2>
      {open ? (
        <Command className="border-input border">
          <CommandInput placeholder={t("search")} aria-label={t("search")} />
          <CommandList>
            <CommandEmpty>{t("empty")}</CommandEmpty>
            <CommandGroup>
              {candidates.map((person) => {
                const name = person.name ?? t("you");
                return (
                  <CommandItem
                    key={person.userId}
                    value={`${name} ${person.userId}`}
                    disabled={pending}
                    className="min-h-touch"
                    onSelect={() => pick(person.userId)}
                  >
                    {name}
                    {person.pending && (
                      <span className="text-muted-foreground">{t("pending")}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      ) : null}
      <div>
        <button
          type="button"
          aria-expanded={open}
          className={secondaryClass}
          onClick={() => setOpen(!open)}
        >
          {open ? t("close") : t("open")}
        </button>
      </div>
    </section>
  );
}
