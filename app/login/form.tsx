"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import { logIn, resendVerification } from "@/modules/auth/actions";

const inputClass =
  "min-h-touch border-input bg-background w-full rounded-lg border px-3 aria-[invalid=true]:border-destructive";

export function LogInForm({ next }: { next: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(logIn, null);
  const [resent, resend, resending] = useActionState(resendVerification, null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const error = state && !state.ok ? state.error : null;
  const fields = error?.fields ?? {};

  useEffect(() => {
    if (fields.email) emailRef.current?.focus();
    else if (fields.password) passwordRef.current?.focus();
  }, [fields.email, fields.password, state]);

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {error && !error.fields && (
        <p role="alert" className="text-destructive">
          {t(error.message)}
        </p>
      )}
      {error?.code === "email_not_confirmed" && (
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            formAction={resend}
            disabled={resending}
            className="border-input min-h-touch self-start rounded-full border px-6"
          >
            {t("auth.logIn.resend")}
          </button>
          {resent?.ok && <p role="status">{t("auth.logIn.resent")}</p>}
          {resent && !resent.ok && (
            <p role="alert" className="text-destructive">
              {t(resent.error.message)}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="email">{t("auth.logIn.email")}</label>
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
        <label htmlFor="password">{t("auth.logIn.password")}</label>
        <input
          ref={passwordRef}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={fields.password ? true : undefined}
          aria-describedby={fields.password ? "password-error" : undefined}
          className={inputClass}
        />
        {fields.password && (
          <p id="password-error" className="text-destructive">
            {t(fields.password)}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground min-h-touch rounded-full px-6"
      >
        {t("auth.logIn.submit")}
      </button>
    </form>
  );
}
