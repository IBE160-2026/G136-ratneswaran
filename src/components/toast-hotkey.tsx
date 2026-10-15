"use client";

import { useEffect } from "react";

// F6 moves focus into Sonner's toast list (Alt+T is Sonner's own hotkey). With no toast, F6 is left alone.
export function ToastHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F6") return;
      const list = document.querySelector<HTMLElement>("[data-sonner-toaster]");
      if (!list) return;
      e.preventDefault();
      list.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
