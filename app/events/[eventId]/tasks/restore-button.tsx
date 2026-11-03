"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { secondaryClass } from "@/components/form";
import { callSafely } from "@/modules/events/save";
import { restoreTask } from "@/modules/tasks/actions";

/** A dismissed Task's timeless Restore: it stays under *Show dismissed* until pressed. */
export function RestoreButton({
  eventId,
  taskId,
  expected,
  title,
}: {
  eventId: string;
  taskId: string;
  expected: string;
  title: string;
}) {
  const t = useTranslations("tasks");
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`${t("detail.restore")}: ${title}`}
      className={secondaryClass}
      onClick={() =>
        start(async () => {
          const result = await callSafely(() => restoreTask({ eventId, taskId, expected }));
          if (result.ok) toast(t("detail.restoredToast"));
          else toast.error(<span role="alert">{t(result.error.message)}</span>);
        })
      }
    >
      {t("detail.restore")}
    </button>
  );
}
