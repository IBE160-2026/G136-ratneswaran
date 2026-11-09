"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

// The setting does not change while the page is open.
const subscribe = () => () => {};

/** Its children, or the cookies text where the browser blocks cookies (a session could never be kept). */
export function CookieNotice({ children }: { children: React.ReactNode }) {
  const t = useTranslations("rsvp");
  const allowed = useSyncExternalStore(
    subscribe,
    () => navigator.cookieEnabled,
    () => true,
  );
  return allowed ? children : t("cookiesBlocked");
}
