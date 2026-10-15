import { createElement } from "react";
import { toast } from "sonner";

// Client-safe helpers. Text and labels arrive already translated; the caller owns any input.
export function undoToast(message: string, onUndo: () => void, undoLabel: string) {
  return toast(message, { duration: 10000, action: { label: undoLabel, onClick: () => onUndo() } });
}

// Sonner has no role option, so the message itself carries role="alert".
export function saveFailedToast(message: string, onRetry: () => void, retryLabel: string) {
  return toast.error(createElement("span", { role: "alert" }, message), {
    duration: Infinity,
    action: { label: retryLabel, onClick: () => onRetry() },
  });
}
