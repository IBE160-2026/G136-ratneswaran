"use client";

import { Check, Circle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  connectProvider,
  setPassword,
  updateAppearance,
  updateEmail,
  updateLanguage,
  updateName,
} from "@/modules/auth/actions";
import { buttonClass, Failure, FieldError, inputClass } from "@/components/form";
import { passwordRules, type PasswordRule } from "@/modules/auth/schemas";

export function NameForm({ name }: { name: string }) {
  const t = useTranslations("profile.name");
  const [value, setValue] = useState(name);
  const [state, action, pending] = useActionState(updateName, null);
  const ref = useRef<HTMLInputElement>(null);
  const fieldError = state && !state.ok ? state.error.fields?.name : undefined;
  useEffect(() => {
    if (fieldError) ref.current?.focus();
  }, [fieldError, state]);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <Failure state={state} />
      <div className="flex flex-col gap-1">
        <label htmlFor="name-input">{t("label")}</label>
        <input
          ref={ref}
          id="name-input"
          name="name"
          autoComplete="name"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "name-error" : undefined}
          className={inputClass}
        />
        <FieldError id="name-error" message={fieldError} />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {t("submit")}
      </button>
      {state?.ok && <p role="status">{t("saved")}</p>}
    </form>
  );
}

export function EmailForm({ current }: { current: string }) {
  const t = useTranslations("profile.email");
  const [value, setValue] = useState("");
  const [state, action, pending] = useActionState(
    async (previous: Parameters<typeof updateEmail>[0], data: FormData) => {
      const result = await updateEmail(previous, data);
      if (result.ok) setValue("");
      return result;
    },
    null,
  );
  const ref = useRef<HTMLInputElement>(null);
  const fieldError = state && !state.ok ? state.error.fields?.email : undefined;
  useEffect(() => {
    if (fieldError) ref.current?.focus();
  }, [fieldError, state]);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <Failure state={state} />
      <p>{t("current", { email: current })}</p>
      <div className="flex flex-col gap-1">
        <label htmlFor="email-input">{t("label")}</label>
        <input
          ref={ref}
          id="email-input"
          name="email"
          type="email"
          autoComplete="email"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? "email-error" : undefined}
          className={inputClass}
        />
        <FieldError id="email-error" message={fieldError} />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {t("submit")}
      </button>
      {state?.ok && <p role="status">{t("sent")}</p>}
    </form>
  );
}

export function PasswordForm() {
  const t = useTranslations();
  const [password, setValue] = useState("");
  const [state, action, pending] = useActionState(
    async (previous: Parameters<typeof setPassword>[0], data: FormData) => {
      const result = await setPassword(previous, data);
      if (result.ok) setValue("");
      return result;
    },
    null,
  );
  const ref = useRef<HTMLInputElement>(null);
  const fieldError = state && !state.ok ? state.error.fields?.password : undefined;
  useEffect(() => {
    if (fieldError) ref.current?.focus();
  }, [fieldError, state]);
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <Failure state={state} />
      <div className="flex flex-col gap-1">
        <label htmlFor="password-input">{t("profile.password.label")}</label>
        <input
          ref={ref}
          id="password-input"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setValue(event.target.value)}
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
        {t("profile.password.set")}
      </button>
      {state?.ok && <p role="status">{t("profile.password.saved")}</p>}
    </form>
  );
}

export function ConnectButton({ provider }: { provider: "google" | "github" }) {
  const t = useTranslations("profile.accounts");
  const [state, action, pending] = useActionState(connectProvider, null);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <Failure state={state} />
      <button
        type="submit"
        name="provider"
        value={provider}
        disabled={pending}
        className="border-input min-h-touch rounded-full border px-6"
      >
        {t(`connect.${provider}`)}
      </button>
    </form>
  );
}

/** Native radios that save as soon as one is picked; the page re-renders with the new `lang` or `data-theme`. */
function RadioForm({
  action,
  name,
  legend,
  value,
  options,
}: {
  action: typeof updateLanguage;
  name: string;
  legend: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const [state, submit] = useActionState(action, null);
  return (
    <form action={submit}>
      <Failure state={state} />
      <fieldset onChange={(event) => event.currentTarget.form?.requestSubmit()}>
        <legend className="sr-only">{legend}</legend>
        {options.map((option) => (
          <label key={option.value} className="min-h-touch flex items-center gap-3">
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === value}
              className="size-5"
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    </form>
  );
}

export function LanguageForm({ value }: { value: string }) {
  const t = useTranslations("profile.language");
  return (
    <RadioForm
      action={updateLanguage}
      name="language"
      legend={t("title")}
      value={value}
      options={[
        { value: "auto", label: t("auto") },
        { value: "nb", label: "Norsk bokmål" },
        { value: "en", label: "English" },
      ]}
    />
  );
}

export function AppearanceForm({ value }: { value: string }) {
  const t = useTranslations("profile.appearance");
  return (
    <RadioForm
      action={updateAppearance}
      name="theme"
      legend={t("title")}
      value={value}
      options={[
        { value: "light", label: t("light") },
        { value: "dark", label: t("dark") },
        { value: "system", label: t("system") },
      ]}
    />
  );
}
