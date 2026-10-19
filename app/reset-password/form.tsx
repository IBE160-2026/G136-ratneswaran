"use client";

import { Check, Circle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import { updatePassword } from "@/modules/auth/actions";
import { passwordRules, type PasswordRule } from "@/modules/auth/schemas";
import { buttonClass } from "@/components/form";

export function ResetForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(updatePassword, null);
  const [password, setPassword] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);
  const error = state && !state.ok ? state.error : null;
  const fieldError = error?.fields?.password;

  useEffect(() => {
    if (fieldError) passwordRef.current?.focus();
  }, [fieldError, state]);

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {error && !error.fields && (
        <p role="alert" className="text-destructive">
          {t(error.message)}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="password">{t("auth.reset.password")}</label>
        <input
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "password-rules password-error" : "password-rules"}
          className="min-h-touch border-input bg-background aria-[invalid=true]:border-destructive w-full rounded-lg border px-3"
        />
        {fieldError && (
          <p id="password-error" className="text-destructive">
            {t(fieldError)}
          </p>
        )}
        <ul
          id="password-rules"
          aria-label={t("auth.signUp.rulesLabel")}
          className="text-muted-foreground"
        >
          {(Object.keys(passwordRules) as PasswordRule[]).map((rule) => {
            const met = passwordRules[rule](password);
            const Icon = met ? Check : Circle;
            return (
              <li key={rule} className="flex items-center gap-2">
                <Icon aria-hidden strokeWidth={1.75} className="size-4" />
                {t(`auth.signUp.rules.${rule}`)}
                <span className="sr-only">
                  {met ? t("auth.signUp.ruleMet") : t("auth.signUp.ruleUnmet")}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {t("auth.reset.submit")}
      </button>
    </form>
  );
}
