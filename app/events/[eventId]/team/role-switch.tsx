"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setRoleActive } from "@/modules/events/actions";
import { callSafely } from "@/modules/events/save";

/** One Role as a native switch. The new state shows at once and falls back if the save fails. */
export function RoleSwitch({
  eventId,
  roleId,
  active,
  disabled,
  name,
  description,
  hint,
}: {
  eventId: string;
  roleId: string;
  active: boolean;
  disabled: boolean;
  name: string;
  description: string;
  hint: string | null;
}) {
  const t = useTranslations();
  const id = useId();
  const [checked, setChecked] = useOptimistic(active);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toggle = (next: boolean) => {
    // The switch stays enabled while saving so keyboard focus stays on it; a second press waits.
    if (pending) return;
    startTransition(async () => {
      setFailure(null);
      setChecked(next);
      const result = await callSafely(() => setRoleActive({ eventId, roleId, active: next }));
      if (!result.ok) setFailure(result.error.message);
    });
  };
  return (
    <div className="bg-card flex flex-col gap-1 rounded-md border p-4">
      <label className="min-h-touch flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-busy={pending}
          onChange={(e) => toggle(e.target.checked)}
          aria-describedby={`${id}-description${hint ? ` ${id}-hint` : ""}`}
          className="accent-primary size-6 shrink-0"
        />
        <span className="text-headline font-semibold">{name}</span>
      </label>
      <p id={`${id}-description`} className="text-subhead text-muted-foreground">
        {description}
      </p>
      {hint && (
        <p id={`${id}-hint`} className="text-subhead text-primary">
          {hint}
        </p>
      )}
      {failure && (
        <p role="alert" className="text-destructive">
          {t(failure)}
        </p>
      )}
    </div>
  );
}
