"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { buttonClass } from "@/components/form";
import { saveFailedToast } from "@/lib/feedback";
import { callSafely } from "@/modules/events/save";
import { acceptTask } from "@/modules/tasks/actions";

/** The owner of a delegated, unaccepted Task accepts it here; the call chains on `updated_at`. */
export function AcceptBanner({
  eventId,
  taskId,
  updatedAt,
}: {
  eventId: string;
  taskId: string;
  updatedAt: string;
}) {
  const t = useTranslations("tasks.detail.accept");
  const tr = useTranslations();
  const router = useRouter();
  const [pending, start] = useTransition();
  const busy = useRef(false);

  const accept = () => {
    if (busy.current) return;
    busy.current = true;
    start(async () => {
      const result = await callSafely(() => acceptTask({ eventId, taskId, expected: updatedAt }));
      busy.current = false;
      if (result.ok) toast(t("done"));
      else if (result.error.code === "concurrent") {
        toast.error(<span role="alert">{tr(result.error.message)}</span>);
        router.refresh();
      } else saveFailedToast(tr(result.error.message), accept, tr("feedback.retry"));
    });
  };

  return (
    <section
      aria-labelledby="accept-title"
      className="bg-card flex flex-col gap-3 rounded-md border p-4"
    >
      <h2 id="accept-title" className="text-headline">
        {t("title")}
      </h2>
      <p className="text-muted-foreground">{t("body")}</p>
      <div>
        <button type="button" disabled={pending} className={buttonClass} onClick={accept}>
          {t("button")}
        </button>
      </div>
    </section>
  );
}
