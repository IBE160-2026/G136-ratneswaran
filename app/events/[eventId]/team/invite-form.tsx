"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { buttonClass, Failure, Field, inputClass, secondaryClass } from "@/components/form";
import { fieldErrors, type Result } from "@/lib/result";
import { inviteToRole, type InviteStatus } from "@/modules/events/actions";
import { callSafely } from "@/modules/events/save";
import { inviteSchema } from "@/modules/events/schemas";

type Draft = { name: string; email: string; roleId: string };
type Outcome = Result<{ status: InviteStatus; token: string | null }>;

/**
 * Name, email and Role, then a confirm step that shows the address, then the result. `replaces` makes it
 * *Correct email* for a pending row; the Role is then fixed.
 */
export function InviteForm({
  eventId,
  roles,
  initial,
  replaces,
  onClose,
}: {
  eventId: string;
  roles: { id: string; name: string }[];
  initial?: Draft;
  replaces?: string;
  onClose?: () => void;
}) {
  const t = useTranslations();
  const id = useId();
  const blank = { name: "", email: "", roleId: roles[0]?.id ?? "" };
  const [draft, setDraft] = useState<Draft>(initial ?? blank);
  const [step, setStep] = useState<"edit" | "confirm" | "result">("edit");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pending, startTransition] = useTransition();
  const fields = outcome && !outcome.ok ? outcome.error.fields : undefined;

  const input = { eventId, ...draft, replaces };
  const check = (form: FormData) => {
    const next = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      roleId: String(form.get("roleId") ?? draft.roleId),
    };
    setDraft(next);
    const parsed = inviteSchema.safeParse({ ...input, ...next });
    if (parsed.success) {
      setOutcome(null);
      setStep("confirm");
    } else {
      setOutcome({
        ok: false,
        error: {
          code: "invalid_input",
          message: "events.team.invite.errors.invalidInput",
          fields: fieldErrors(parsed.error),
        },
      });
    }
  };
  const send = () =>
    startTransition(async () => {
      const result = await callSafely(() => inviteToRole(input));
      setOutcome(result);
      if (result.ok) setStep("result");
      else if (result.error.fields) setStep("edit");
    });
  const reset = () => {
    setDraft(blank);
    setOutcome(null);
    setStep("edit");
    onClose?.();
  };

  if (step === "result" && outcome?.ok) {
    const { status, token } = outcome.data;
    const name = draft.name.trim();
    return token ? (
      <InviteLink token={token} name={name} onDone={reset} />
    ) : (
      <div className="flex flex-col items-start gap-3">
        <p role="status">{t(`events.team.invite.status.${status}`, { name })}</p>
        <button type="button" className={secondaryClass} onClick={reset} autoFocus>
          {t("events.team.invite.done")}
        </button>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-headline break-all">
          {t("events.team.invite.confirm", { email: draft.email.trim() })}
        </p>
        <p className="text-subhead text-muted-foreground">{t("events.team.invite.confirmHint")}</p>
        <Failure state={outcome} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            onClick={send}
            aria-busy={pending}
            disabled={pending}
            autoFocus
          >
            {t("events.team.invite.send")}
          </button>
          <button
            type="button"
            className={secondaryClass}
            onClick={() => setStep("edit")}
            disabled={pending}
          >
            {t("events.team.invite.back")}
          </button>
        </div>
      </div>
    );
  }

  const fieldProps = (name: keyof Draft) => ({
    id: `${id}-${name}`,
    name,
    "aria-invalid": Boolean(fields?.[name]),
    "aria-describedby": fields?.[name] ? `${id}-${name}-error` : undefined,
  });
  return (
    <form action={check} noValidate className="flex flex-col gap-3">
      <Field name={`${id}-name`} label={t("events.team.invite.name")} error={fields?.name}>
        <input
          {...fieldProps("name")}
          defaultValue={draft.name}
          autoComplete="off"
          maxLength={100}
          className={inputClass}
        />
      </Field>
      <Field name={`${id}-email`} label={t("events.team.invite.email")} error={fields?.email}>
        <input
          {...fieldProps("email")}
          type="email"
          defaultValue={draft.email}
          maxLength={254}
          autoFocus={Boolean(replaces)}
          autoComplete="off"
          className={inputClass}
        />
      </Field>
      {!replaces && (
        <Field name={`${id}-roleId`} label={t("events.team.invite.role")} error={fields?.roleId}>
          <select {...fieldProps("roleId")} defaultValue={draft.roleId} className={inputClass}>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Failure state={outcome} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={buttonClass}>
          {t("events.team.invite.continue")}
        </button>
        {onClose && (
          <button type="button" className={secondaryClass} onClick={reset}>
            {t("events.team.invite.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}

/** The link, shown once: it lives only in this component's state and is never stored or re-shown. */
export function InviteLink({
  token,
  name,
  onDone,
}: {
  token: string;
  name: string;
  onDone: () => void;
}) {
  const t = useTranslations("events.team.invite");
  const id = useId();
  const [copied, setCopied] = useState<"copied" | "copyFailed" | null>(null);
  const link = `${window.location.origin}/api/invite/${token}`;
  // A refused or missing clipboard leaves the link selectable in the field.
  const copy = () =>
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(link))
      .then(
        () => setCopied("copied"),
        () => setCopied("copyFailed"),
      );
  return (
    <div className="bg-primary-soft flex flex-col items-start gap-3 rounded-md p-4">
      <p className="text-headline break-words">{t("sendTo", { name })}</p>
      <label htmlFor={id}>{t("linkLabel")}</label>
      <input
        id={id}
        readOnly
        value={link}
        className={inputClass}
        onFocus={(e) => e.target.select()}
      />
      <p className="text-subhead text-muted-foreground">{t("shownOnce")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass} onClick={copy} autoFocus>
          {t("copy")}
        </button>
        <button type="button" className={secondaryClass} onClick={onDone}>
          {t("done")}
        </button>
        <span role="status">{copied && t(copied)}</span>
      </div>
    </div>
  );
}
