"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// UX-DR25: after a client navigation focus moves to the page h1. Skipped on first load so the
// skip link stays the first focusable element.
export function RouteFocus() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const h1 = document.querySelector<HTMLElement>("main h1");
    h1?.setAttribute("tabindex", "-1");
    h1?.focus();
  }, [pathname]);
  return null;
}
