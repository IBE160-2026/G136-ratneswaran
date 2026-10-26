"use client";

import { Check, Circle } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { buttonClass, Failure, FieldError, inputClass, secondaryClass } from "@/components/form";
import { passwordRules, type PasswordRule } from "@/modules/auth/schemas";
import {
  forgetInvite,
  joinEvent,
  leaveAndRetry,
  sendJoinCode,
  setPasswordAndJoin,
  verifyJoinCode,
} from "@/modules/events/join";

/** Used or expired: the text, a way to log in, and the cookie dropped. */
export function Ended({ message }: { message: string }) {
  const t = useTranslations();
  // Dropping the cookie refreshes the route, which then reads as used; keep the first text.
  const [shown] = useState(message);
  useEffect(() => {
    void forgetInvite();
  }, []);
  return (
    <>
      <p role="alert">{t(shown)}</p>
      <Link href="/login" className="text-primary min-h-touch inline-flex items-center">
        {t("invite.usedLogIn")}
      </Link>
    </>
  );
}

export function Mismatch() {
  const t = useTranslations("invite");
  return (
    <form action={leaveAndRetry} className="flex flex-col gap-4">
      <p role="alert">{t("mismatch")}</p>
      <button type="submit" className={secondaryClass + " self-start"}>
        {t("logOut")}
      </button>
    </form>
  );
}

/** Joins the signed-in invited account; a double submit lands on the Event too. */
export function JoinButton() {
  const t = useTranslations("invite");
  const [state, action, pending] = useActionState(joinEvent, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <p>{t("joinIntro")}</p>
      <Failure state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {t("join")}
      </button>
    </form>
  );
}

/** A new invitee: send a code to the invited address, then enter it. */
export function NewInvitee({ email }: { email: string }) {
  const t = useTranslations("invite");
  const [sent, send, sending] = useActionState(sendJoinCode, null);
  const [state, verify, verifying] = useActionState(verifyJoinCode, null);
  const codeError = state && !state.ok ? state.error.fields?.code : undefined;
  return (
    <div className="flex flex-col gap-4">
      {!sent?.ok && <p>{t("codeIntro")}</p>}
      <Failure state={sent} />
      {sent?.ok && (
        <form action={verify} noValidate className="flex flex-col gap-4">
          <p role="status">{t("codeSent", { email })}</p>
          <Failure state={state} />
          <div className="flex flex-col gap-1">
            <label htmlFor="code">{t("code")}</label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              aria-invalid={codeError ? true : undefined}
              aria-describedby={codeError ? "code-error" : undefined}
              className={inputClass}
            />
            <FieldError id="code-error" message={codeError} />
          </div>
          <button type="submit" disabled={verifying} className={buttonClass}>
            {t("verify")}
          </button>
        </form>
      )}
      <form action={send}>
        <button
          type="submit"
          disabled={sending}
          className={sent?.ok ? secondaryClass : buttonClass + " w-full"}
        >
          {t(sent?.ok ? "resend" : "sendCode")}
        </button>
      </form>
    </div>
  );
}

/** After the code: the password, then the join. */
export function PasswordStep() {
  const t = useTranslations();
  const [state, action, pending] = useActionState(setPasswordAndJoin, null);
  const [password, setPassword] = useState("");
  const fieldError = state && !state.ok ? state.error.fields?.password : undefined;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <p>{t("invite.passwordIntro")}</p>
      <Failure state={state} />
      <div className="flex flex-col gap-1">
        <label htmlFor="password">{t("invite.password")}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "password-rules password-error" : "password-rules"}
          className={inputClass}
        />
        <FieldError id="password-error" message={fieldError} />
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
        {t("invite.submit")}
      </button>
    </form>
  );
}
