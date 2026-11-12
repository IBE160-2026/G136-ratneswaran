"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { buttonClass, inputClass, secondaryClass } from "@/components/form";
import { callSafely } from "@/modules/events/save";
import { reportProblem, resolveProblem } from "@/modules/tasks/actions";
import { ProblemFlag } from "../task-row";

/** The open Problem with its full note for everyone who reads the Task, and the button for who may act. */
export function ProblemPanel({
  eventId,
  taskId,
  note,
  raisedBy,
  canAct,
}: {
  eventId: string;
  taskId: string;
  note: string | null;
  raisedBy: string | null;
  canAct: boolean;
}) {
  const t = useTranslations("tasks.detail.problem");
  const tr = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const resolving = note !== null;

  const submit = () =>
    start(async () => {
      setFailure(null);
      const input = { eventId, taskId, note: text };
      const result = await callSafely(() =>
        resolving ? resolveProblem(input) : reportProblem(input),
      );
      if (!result.ok) {
        setFailure(result.error.message);
        return;
      }
      setOpen(false);
      setText("");
      toast(t(resolving ? "resolved" : "reported"));
      router.refresh();
    });

  if (!resolving && !canAct) return null;
  return (
    <section aria-labelledby="problem-title" className="flex flex-col gap-2">
      <h2 id="problem-title" className="text-headline">
        {t("title")}
      </h2>
      {note !== null && <ProblemFlag note={note} full />}
      {raisedBy !== null && note !== null && (
        <p className="text-subhead text-muted-foreground">{raisedBy}</p>
      )}
      {canAct && (
        <Dialog.Root
          open={open}
          onOpenChange={(next) => {
            if (pending) return;
            setOpen(next);
            setFailure(null);
          }}
        >
          <div>
            <Dialog.Trigger className={resolving ? secondaryClass : buttonClass}>
              {t(resolving ? "resolve" : "report")}
            </Dialog.Trigger>
          </div>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />
            <Dialog.Popup className="bg-popover text-popover-foreground fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg p-6 shadow-lg">
              <Dialog.Title className="text-headline">
                {t(resolving ? "resolveTitle" : "reportTitle")}
              </Dialog.Title>
              <Dialog.Description className="text-muted-foreground">
                {t(resolving ? "resolveBody" : "reportBody")}
              </Dialog.Description>
              <label htmlFor="problem-note">
                {t(resolving ? "resolveNoteLabel" : "noteLabel")}
              </label>
              <textarea
                id="problem-note"
                rows={4}
                maxLength={500}
                value={text}
                aria-invalid={failure !== null}
                aria-describedby="problem-count"
                onChange={(event) => setText(event.target.value)}
                className={`${inputClass} py-2`}
              />
              <p id="problem-count" className="text-subhead text-muted-foreground">
                {t("counter", { count: text.length })}
              </p>
              {failure && (
                <p role="alert" className="text-destructive">
                  {tr(failure)}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={buttonClass}
                  disabled={pending || (!resolving && text.trim() === "")}
                  aria-busy={pending}
                  onClick={submit}
                >
                  {t(resolving ? "submitResolve" : "submitReport")}
                </button>
                <Dialog.Close className={secondaryClass}>{t("cancel")}</Dialog.Close>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </section>
  );
}
