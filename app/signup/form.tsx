"use client";

import { Check, Circle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import { signUp } from "@/modules/auth/actions";
import { passwordRules, type PasswordRule } from "@/modules/auth/schemas";

const inputClass =
  "min-h-touch border-input bg-background w-full rounded-lg border px-3 aria-[invalid=true]:border-destructive";

export function SignUpForm() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(signUp, null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const fields = state && !state.ok ? (state.error.fields ?? {}) : {};

  useEffect(() => {
    const errors = state && !state.ok ? state.error.fields : undefined;
    if (errors?.email) emailRef.current?.focus();
    else if (errors?.password) passwordRef.current?.focus();
  }, [state]);

  if (state?.ok) {
    return (
      <p role="status" className="text-headline">
        {t("auth.signUp.success")}
      </p>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state && !state.ok && !state.error.fields && (
        <p role="alert" className="text-destructive">
          {t(state.error.message)}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="email">{t("auth.signUp.email")}</label>
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={fields.email ? true : undefined}
          aria-describedby={fields.email ? "email-error" : undefined}
          className={inputClass}
        />
        {fields.email && (
          <p id="email-error" className="text-destructive">
            {t(fields.email)}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password">{t("auth.signUp.password")}</label>
        <input
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={fields.password ? true : undefined}
          aria-describedby={fields.password ? "password-rules password-error" : "password-rules"}
          className={inputClass}
        />
        {fields.password && (
          <p id="password-error" className="text-destructive">
            {t(fields.password)}
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
      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground min-h-touch rounded-full px-6"
      >
        {t("auth.signUp.submit")}
      </button>
    </form>
  );
}
