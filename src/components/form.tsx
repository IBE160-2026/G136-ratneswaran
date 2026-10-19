"use client";

import { useTranslations } from "next-intl";

export const inputClass =
  "min-h-touch border-input bg-background w-full rounded-lg border px-3 aria-[invalid=true]:border-destructive";
export const buttonClass = "bg-primary text-primary-foreground min-h-touch rounded-full px-6";

/** Alert for a failure with no field to blame. */
export function Failure({
  state,
}: {
  state: { ok: boolean; error?: { fields?: object; message: string } } | null;
}) {
  const t = useTranslations();
  if (!state || state.ok || !state.error || state.error.fields) return null;
  return (
    <p role="alert" className="text-destructive">
      {t(state.error.message)}
    </p>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  const t = useTranslations();
  return message ? (
    <p id={id} className="text-destructive">
      {t(message)}
    </p>
  ) : null;
}

/** A labelled control with its inline error, which the control names in `aria-describedby`. */
export function Field({
  name,
  label,
  error,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name}>{label}</label>
      {children}
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}
