"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import { forgotPassword } from "@/modules/auth/actions";

export function ForgotForm({ expired }: { expired: boolean }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(forgotPassword, null);
  const [email, setEmail] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const error = state && !state.ok ? state.error : null;
  const fieldError = error?.fields?.email;

  useEffect(() => {
    if (fieldError) emailRef.current?.focus();
  }, [fieldError, state]);

  if (state?.ok) {
    return (
      <p role="status" className="text-headline">
        {t("auth.forgot.success")}
      </p>
    );
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {expired && (
        <p role="alert" className="text-destructive">
          {t("auth.forgot.expired")}
        </p>
      )}
      {error && !error.fields && (
        <p role="alert" className="text-destructive">
          {t(error.message)}
        </p>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="email">{t("auth.forgot.email")}</label>
        <input
          ref={emailRef}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "email-error" : undefined}
          className="min-h-touch border-input bg-background aria-[invalid=true]:border-destructive w-full rounded-lg border px-3"
        />
        {fieldError && (
          <p id="email-error" className="text-destructive">
            {t(fieldError)}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground min-h-touch rounded-full px-6"
      >
        {t("auth.forgot.submit")}
      </button>
    </form>
  );
}
