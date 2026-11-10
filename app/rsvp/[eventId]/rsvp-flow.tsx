"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClass, Field, inputClass, secondaryClass } from "@/components/form";
import { callSafely } from "@/modules/events/save";
import { submitRsvp } from "@/modules/guests/rsvp-actions";
import { rsvpAnswersSchema, totalSteps } from "@/modules/guests/rsvp-schemas";
import { Deleted, DeleteMyData } from "./delete-my-data";

type Saved = {
  attending: boolean;
  plusOne: boolean;
  plusOneName: string;
  otherNeeds: string;
  updatedAt: string;
};

type Props = {
  eventId: string;
  firstName: string;
  eventName: string;
  date: string | null;
  replyBy: string | null;
  closed: "cancelled" | "ended" | null;
  note: string | null;
  saved: Saved | null;
};

type Failed = { code: string; message: string };

const optionClass = "min-h-touch flex items-center gap-3";

/** One question per screen: attending, plus-one, other needs. A No is complete at the first. */
export function RsvpFlow({
  eventId,
  firstName,
  eventName,
  date,
  replyBy,
  closed,
  note,
  saved,
}: Props) {
  const t = useTranslations("rsvp");
  // Messages from the action and the schema are full keys.
  const key = useTranslations();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(1);
  const [attending, setAttending] = useState<boolean | null>(saved?.attending ?? null);
  const [plusOne, setPlusOne] = useState(saved?.plusOne ?? false);
  const [plusOneName, setPlusOneName] = useState(saved?.plusOneName ?? "");
  const [otherNeeds, setOtherNeeds] = useState(saved?.otherNeeds ?? "");
  const [updatedAt, setUpdatedAt] = useState<string | null>(saved?.updatedAt ?? null);
  const [answered, setAnswered] = useState(saved !== null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<Failed | null>(null);
  const [pending, setPending] = useState(false);
  const [gone, setGone] = useState<"done" | "already" | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // Focus moves to the question or the confirmation on every change of screen, not on first load.
  useEffect(() => {
    if (first.current) first.current = false;
    else heading.current?.focus();
  }, [step, editing, answered]);

  const shell = (children: React.ReactNode) => (
    <div className="flex max-w-md flex-col gap-4 py-12">{children}</div>
  );

  if (gone) return <Deleted already={gone === "already"} />;

  if (closed || (answered && !editing)) {
    return shell(
      <>
        <h1 ref={heading} tabIndex={-1} className="text-large-title break-words">
          {closed ? t(closed) : t(attending ? "confirmYes" : "confirmNo", { name: firstName })}
        </h1>
        {closed === "cancelled" && note && (
          <p className="break-words whitespace-pre-line">{note}</p>
        )}
        <p className="break-words">
          {date ? t("eventLine", { event: eventName, date }) : eventName}
        </p>
        {answered && (
          <section
            aria-labelledby="rsvp-summary"
            className="bg-card flex flex-col items-start gap-1 rounded-lg border p-4"
          >
            <h2 id="rsvp-summary" className="text-headline">
              {t("summary.title")}
            </h2>
            <p>{t(attending ? "attending.yes" : "attending.no")}</p>
            {plusOne && (
              <p className="break-words">
                {plusOneName
                  ? t("summary.plusOne", { name: plusOneName })
                  : t("summary.plusOneNoName")}
              </p>
            )}
            {otherNeeds && (
              <p className="break-words whitespace-pre-line">
                {t("summary.needs", { needs: otherNeeds })}
              </p>
            )}
            {!closed && (
              <button
                type="button"
                className={`${secondaryClass} mt-3`}
                onClick={() => {
                  setStep(1);
                  setEditing(true);
                }}
              >
                {t("change")}
              </button>
            )}
          </section>
        )}
        <DeleteMyData
          eventId={eventId}
          eventName={eventName}
          onGone={(deleted) => setGone(deleted ? "done" : "already")}
        />
      </>,
    );
  }

  const total = totalSteps(attending);
  const answers = { attending: attending ?? false, plusOne, plusOneName, otherNeeds };

  /** Parses the answers; on failure shows the inline errors, on the step that owns the first one. */
  function parse() {
    const parsed = rsvpAnswersSchema.safeParse(answers);
    if (parsed.success) return parsed.data;
    const found = Object.fromEntries(
      parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
    );
    setErrors(found);
    setStep(found.plusOneName ? 2 : found.otherNeeds ? 3 : step);
    return null;
  }

  async function send() {
    const parsed = parse();
    if (!parsed) return;
    setErrors({});
    setFailed(null);
    setPending(true);
    const result = await callSafely(() =>
      submitRsvp({ eventId, answers: parsed, expectedUpdatedAt: updatedAt }),
    );
    setPending(false);
    if (!result.ok) {
      setFailed(result.error);
      // The server knows better: the Event may have ended, or the session or Guest gone.
      if (["read_only", "no_session", "forbidden"].includes(result.error.code)) router.refresh();
      return;
    }
    setPlusOne(parsed.plusOne);
    setPlusOneName(parsed.plusOneName);
    setOtherNeeds(parsed.otherNeeds);
    setUpdatedAt(result.data.updatedAt);
    setAnswered(true);
    setEditing(false);
  }

  function next() {
    if (step === 1 && attending === null) return setErrors({ attending: "rsvp.chooseOne" });
    setErrors({});
    // A No is complete here; so is the last question.
    if (attending === false || step === 3) return void send();
    if (step === 2 && !parse()) return;
    setStep(step + 1);
  }

  const err = (field: string) => ({
    "aria-invalid": errors[field] ? (true as const) : undefined,
    "aria-describedby": errors[field] ? `rsvp-${field}-error` : undefined,
  });
  const question = (key: string) => (
    <legend>
      <h1 ref={heading} tabIndex={-1} className="text-large-title break-words">
        {t(key)}
      </h1>
    </legend>
  );
  const last = attending === false || step === 3;

  return shell(
    <>
      {step === 1 && (
        <header className="flex flex-col gap-1">
          <p className="text-headline">{t("greeting", { name: firstName })}</p>
          <p className="break-words">
            {date ? t("eventLine", { event: eventName, date }) : eventName}
          </p>
          {replyBy && <p className="text-muted-foreground">{t("replyBy", { date: replyBy })}</p>}
        </header>
      )}
      <p className="text-muted-foreground">{t("progress", { step, total })}</p>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          next();
        }}
        className="flex flex-col gap-4"
      >
        {step === 1 && (
          <fieldset className="flex flex-col gap-2">
            {question("attending.question")}
            <label className={optionClass}>
              <input
                type="radio"
                name="attending"
                checked={attending === true}
                onChange={() => setAttending(true)}
                {...err("attending")}
              />
              {t("attending.yes")}
            </label>
            <label className={optionClass}>
              <input
                type="radio"
                name="attending"
                checked={attending === false}
                onChange={() => setAttending(false)}
                {...err("attending")}
              />
              {t("attending.no")}
            </label>
            {errors.attending && (
              <p id="rsvp-attending-error" className="text-destructive">
                {key(errors.attending)}
              </p>
            )}
          </fieldset>
        )}
        {step === 2 && (
          <fieldset className="flex flex-col gap-2">
            {question("plusOne.question")}
            <label className={optionClass}>
              <input
                type="radio"
                name="plusOne"
                checked={plusOne}
                onChange={() => setPlusOne(true)}
              />
              {t("plusOne.yes")}
            </label>
            <label className={optionClass}>
              <input
                type="radio"
                name="plusOne"
                checked={!plusOne}
                onChange={() => setPlusOne(false)}
              />
              {t("plusOne.no")}
            </label>
            {plusOne && (
              <Field
                name="rsvp-plusOneName"
                label={t("plusOne.nameLabel")}
                error={errors.plusOneName}
              >
                <input
                  id="rsvp-plusOneName"
                  value={plusOneName}
                  onChange={(event) => setPlusOneName(event.target.value)}
                  autoComplete="off"
                  className={inputClass}
                  {...err("plusOneName")}
                />
              </Field>
            )}
          </fieldset>
        )}
        {step === 3 && (
          <fieldset className="flex flex-col gap-2">
            {question("needs.question")}
            <Field name="rsvp-otherNeeds" label={t("needs.label")} error={errors.otherNeeds}>
              <textarea
                id="rsvp-otherNeeds"
                rows={4}
                value={otherNeeds}
                onChange={(event) => setOtherNeeds(event.target.value)}
                className={`${inputClass} py-2`}
                {...err("otherNeeds")}
                aria-describedby={[errors.otherNeeds && "rsvp-otherNeeds-error", "rsvp-needs-hint"]
                  .filter(Boolean)
                  .join(" ")}
              />
            </Field>
            <p id="rsvp-needs-hint" className="text-muted-foreground">
              {t("needs.hint")}
            </p>
          </fieldset>
        )}
        {failed && (
          <p role="alert" className="text-destructive">
            {failed.code === "concurrent_edit" ? (
              <>
                {t("errors.concurrentEditLead")}{" "}
                <button type="button" className="underline" onClick={() => router.refresh()}>
                  {t("seeChanges")}
                </button>
              </>
            ) : (
              key(failed.message)
            )}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {step > 1 && (
            <button
              type="button"
              className={secondaryClass}
              onClick={() => {
                setErrors({});
                setFailed(null);
                setStep(step - 1);
              }}
            >
              {t("back")}
            </button>
          )}
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? t("sending") : last ? t("send") : t("next")}
          </button>
          {failed?.code === "unavailable" && (
            <button
              type="button"
              disabled={pending}
              className={secondaryClass}
              onClick={() => void send()}
            >
              {t("retry")}
            </button>
          )}
        </div>
      </form>
    </>,
  );
}
