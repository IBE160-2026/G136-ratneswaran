"use client";

import { useTranslations } from "next-intl";

export function LoadError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("feedback");
  return (
    <div role="alert" className="bg-card flex flex-col items-start gap-3 rounded-lg border p-4">
      <p>{t("loadFailed")}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-touch min-w-touch bg-primary text-primary-foreground rounded-full px-4"
      >
        {t("retry")}
      </button>
    </div>
  );
}
