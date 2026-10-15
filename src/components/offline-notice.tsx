"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export function OfflineNotice() {
  const t = useTranslations("feedback");
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div role="alert" className="px-gutter bg-muted py-2">
      {t("offline")}
    </div>
  );
}
