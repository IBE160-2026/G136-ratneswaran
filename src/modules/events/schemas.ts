import { z } from "zod";

export const eventTypes = ["birthday", "wedding", "party", "seminar", "other"] as const;
export const guestListMethods = ["invite_link", "manual"] as const;
export const eventLanguages = ["nb", "en"] as const;

// Mirrors the CHECK constraints in 20261019120000_events_questionnaire.sql; the database is the boundary (AD-19).
const MAX_GUEST_COUNT = 100000;
const MAX_DURATION_MINUTES = 20160;

const E = "events.wizard.errors";

const raw = z.object({
  eventId: z.uuid(),
  eventType: z.string(),
  startsLocal: z.string(),
  startsUnknown: z.boolean(),
  timeZone: z.string(),
  durationHours: z.string(),
  durationUnknown: z.boolean(),
  guestCount: z.string(),
  guestCountUnknown: z.boolean(),
  venueKnown: z.string(),
  rsvpWanted: z.string(),
  rsvpDueDate: z.string(),
  rsvpDueUnknown: z.boolean(),
  guestListMethod: z.string(),
  language: z.string(),
});

/** The names the form offers. Intl omits UTC, and the database accepts only exact names, so Zod checks the same list. */
export const timeZoneNames = () => ["UTC", ...Intl.supportedValuesOf("timeZone")];

/** Offered when the Event has no time zone yet. */
export const DEFAULT_TIME_ZONE = "Europe/Oslo";

const isLocalDateTime = (value: string) =>
  /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}:00Z`)) &&
  new Date(`${value}:00Z`).toISOString().slice(0, 16) === value;

const isDate = (value: string) =>
  /^\d{4}-\d\d-\d\d$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

const yesNo = (value: string) => (value === "yes" ? true : value === "no" ? false : null);

/** Wizard step 1: raw form strings in, the arguments of `events_save_questionnaire` out. */
export const questionnaireSchema = raw.transform((input, ctx) => {
  const unknownAnswers: string[] = [];
  let failed = false;
  const bad = (field: string, message = `${E}.required`) => {
    failed = true;
    ctx.addIssue({ code: "custom", message, path: [field] });
  };

  let eventType: (typeof eventTypes)[number] | null = null;
  if (input.eventType === "unknown") unknownAnswers.push("event_type");
  else if ((eventTypes as readonly string[]).includes(input.eventType))
    eventType = input.eventType as (typeof eventTypes)[number];
  else bad("eventType");

  if (!timeZoneNames().includes(input.timeZone)) bad("timeZone", `${E}.timeZone`);

  let startsLocal: string | null = null;
  if (input.startsUnknown) unknownAnswers.push("starts_at");
  else if (input.startsLocal === "") bad("startsLocal");
  else if (!isLocalDateTime(input.startsLocal)) bad("startsLocal", `${E}.startsLocal`);
  else startsLocal = input.startsLocal;

  let durationMinutes: number | null = null;
  if (input.durationUnknown) unknownAnswers.push("duration");
  else if (input.durationHours === "") bad("durationHours");
  else {
    const minutes = /^\d+([.,]\d+)?$/.test(input.durationHours)
      ? Math.round(Number(input.durationHours.replace(",", ".")) * 60)
      : 0;
    if (minutes < 1 || minutes > MAX_DURATION_MINUTES) bad("durationHours", `${E}.duration`);
    else durationMinutes = minutes;
  }

  let guestCount: number | null = null;
  if (input.guestCountUnknown) unknownAnswers.push("guest_count");
  else if (input.guestCount === "") bad("guestCount");
  else if (!/^\d+$/.test(input.guestCount) || Number(input.guestCount) < 1)
    bad("guestCount", `${E}.guestCount`);
  else if (Number(input.guestCount) > MAX_GUEST_COUNT) bad("guestCount", `${E}.guestCount`);
  else guestCount = Number(input.guestCount);

  let venueKnown: boolean | null = null;
  if (input.venueKnown === "unknown") unknownAnswers.push("venue_known");
  else if (yesNo(input.venueKnown) === null) bad("venueKnown");
  else venueKnown = yesNo(input.venueKnown);

  let rsvpWanted: boolean | null = null;
  let rsvpDueDate: string | null = null;
  if (input.rsvpWanted === "unknown") unknownAnswers.push("rsvp_wanted");
  else if (yesNo(input.rsvpWanted) === null) bad("rsvpWanted");
  else rsvpWanted = yesNo(input.rsvpWanted);

  if (rsvpWanted) {
    // Branching: the due date is asked only when RSVP is wanted.
    if (input.rsvpDueUnknown) unknownAnswers.push("rsvp_due_date");
    else if (input.rsvpDueDate === "") bad("rsvpDueDate");
    else if (!isDate(input.rsvpDueDate)) bad("rsvpDueDate", `${E}.rsvpDueDate`);
    else if (startsLocal && input.rsvpDueDate > startsLocal.slice(0, 10))
      bad("rsvpDueDate", `${E}.rsvpAfterStart`);
    else rsvpDueDate = input.rsvpDueDate;
  } else if (input.rsvpDueDate !== "" || input.rsvpDueUnknown) {
    bad("rsvpDueDate", `${E}.rsvpNotWanted`);
  }

  let guestListMethod: (typeof guestListMethods)[number] | null = null;
  if (input.guestListMethod === "unknown") unknownAnswers.push("guest_list_method");
  else if ((guestListMethods as readonly string[]).includes(input.guestListMethod))
    guestListMethod = input.guestListMethod as (typeof guestListMethods)[number];
  else bad("guestListMethod");

  if (!(eventLanguages as readonly string[]).includes(input.language)) bad("language");

  if (failed) return z.NEVER;
  return {
    eventId: input.eventId,
    eventType,
    startsLocal,
    timeZone: input.timeZone,
    durationMinutes,
    guestCount,
    venueKnown,
    rsvpWanted,
    rsvpDueDate,
    guestListMethod,
    language: input.language as (typeof eventLanguages)[number],
    unknownAnswers,
  };
});

export type Questionnaire = z.output<typeof questionnaireSchema>;

const S = "events.settings.errors";

/** Event settings: raw form strings in, the arguments of `events_update_schedule` out. */
export const scheduleSchema = z
  .object({
    eventId: z.uuid(),
    startsLocal: z.string(),
    endsLocal: z.string(),
    timeZone: z.string(),
    rsvpDueDate: z.string(),
    language: z.string(),
  })
  .transform((input, ctx) => {
    let failed = false;
    const bad = (field: string, message: string) => {
      failed = true;
      ctx.addIssue({ code: "custom", message, path: [field] });
    };
    const localTime = (field: "startsLocal" | "endsLocal") => {
      if (input[field] === "") bad(field, `${S}.required`);
      else if (!isLocalDateTime(input[field])) bad(field, `${E}.startsLocal`);
      else return input[field];
      return null;
    };

    const startsLocal = localTime("startsLocal");
    const endsLocal = localTime("endsLocal");
    if (startsLocal && endsLocal) {
      // Wall-clock difference: across a DST change it can be an hour off, and the database CHECK decides then.
      const minutes = (Date.parse(`${endsLocal}:00Z`) - Date.parse(`${startsLocal}:00Z`)) / 60000;
      if (minutes <= 0) bad("endsLocal", `${S}.endBeforeStart`);
      else if (minutes > MAX_DURATION_MINUTES) bad("endsLocal", `${S}.tooLong`);
    }

    if (!timeZoneNames().includes(input.timeZone)) bad("timeZone", `${E}.timeZone`);

    let rsvpDueDate: string | null = null;
    if (input.rsvpDueDate !== "") {
      if (!isDate(input.rsvpDueDate)) bad("rsvpDueDate", `${E}.rsvpDueDate`);
      else if (startsLocal && input.rsvpDueDate > startsLocal.slice(0, 10))
        bad("rsvpDueDate", `${E}.rsvpAfterStart`);
      else rsvpDueDate = input.rsvpDueDate;
    }

    if (!(eventLanguages as readonly string[]).includes(input.language))
      bad("language", `${S}.required`);

    if (failed) return z.NEVER;
    return {
      eventId: input.eventId,
      startsLocal: startsLocal!,
      endsLocal: endsLocal!,
      timeZone: input.timeZone,
      rsvpDueDate,
      language: input.language as (typeof eventLanguages)[number],
    };
  });

const text = (data: FormData, key: string) => {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export function questionnaireFromForm(data: FormData) {
  return {
    eventId: text(data, "eventId"),
    eventType: text(data, "eventType"),
    startsLocal: text(data, "startsLocal"),
    startsUnknown: data.has("startsUnknown"),
    timeZone: text(data, "timeZone"),
    durationHours: text(data, "durationHours"),
    durationUnknown: data.has("durationUnknown"),
    guestCount: text(data, "guestCount"),
    guestCountUnknown: data.has("guestCountUnknown"),
    venueKnown: text(data, "venueKnown"),
    rsvpWanted: text(data, "rsvpWanted"),
    rsvpDueDate: text(data, "rsvpDueDate"),
    rsvpDueUnknown: data.has("rsvpDueUnknown"),
    guestListMethod: text(data, "guestListMethod"),
    language: text(data, "language"),
  };
}

export function scheduleFromForm(data: FormData) {
  return {
    eventId: text(data, "eventId"),
    startsLocal: text(data, "startsLocal"),
    endsLocal: text(data, "endsLocal"),
    timeZone: text(data, "timeZone"),
    rsvpDueDate: text(data, "rsvpDueDate"),
    language: text(data, "language"),
  };
}

/** A stored instant as the `datetime-local` value it had in its own time zone, e.g. "2027-06-01T18:00". */
export function toLocalInput(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(iso))
    .replace(" ", "T");
}

const I = "events.team.invite.errors";

/** Team & Roles: invite a person to a Role. `replaces` is the pending row *Correct email* swaps out. */
export const inviteSchema = z.object({
  eventId: z.uuid(),
  roleId: z.uuid(`${I}.roleRequired`),
  name: z.string().trim().min(1, `${I}.nameRequired`).max(100, `${I}.nameTooLong`),
  email: z
    .string()
    .trim()
    .max(254, `${I}.emailInvalid`)
    .pipe(z.email(`${I}.emailInvalid`)),
  replaces: z.uuid().optional(),
});

/** The 43-character base64url token `invite_tokens_create` issues (3.5). */
export const inviteTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

/** The Auth email one-time code (`otp_length` in supabase/config.toml). */
export const joinCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "invite.errors.code");
