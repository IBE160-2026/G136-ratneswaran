import { describe, expect, it } from "vitest";
import {
  questionnaireFromForm,
  questionnaireSchema,
  scheduleFromForm,
  scheduleSchema,
  toLocalInput,
  type Questionnaire,
} from "./schemas";

const valid = {
  eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  eventType: "birthday",
  startsLocal: "2027-06-01T18:00",
  startsUnknown: false,
  timeZone: "Europe/Oslo",
  durationHours: "4",
  durationUnknown: false,
  guestCount: "80",
  guestCountUnknown: false,
  venueKnown: "no",
  rsvpWanted: "yes",
  rsvpDueDate: "2027-05-20",
  rsvpDueUnknown: false,
  guestListMethod: "invite_link",
  language: "nb",
};

const parse = (changes: Partial<typeof valid> = {}) =>
  questionnaireSchema.safeParse({ ...valid, ...changes });

const errorOf = (changes: Partial<typeof valid>) => {
  const result = parse(changes);
  return result.success ? null : result.error.issues.map((i) => [i.path[0], i.message]);
};

describe("questionnaireSchema", () => {
  it("turns full answers into function arguments", () => {
    expect(parse()).toMatchObject({
      success: true,
      data: {
        eventType: "birthday",
        startsLocal: "2027-06-01T18:00",
        durationMinutes: 240,
        guestCount: 80,
        venueKnown: false,
        rsvpWanted: true,
        rsvpDueDate: "2027-05-20",
        guestListMethod: "invite_link",
        unknownAnswers: [],
      },
    });
  });

  it("stores Not sure yet as a key with a null value", () => {
    const result = parse({ guestCountUnknown: true, guestCount: "12", venueKnown: "unknown" });
    expect(result.success && result.data).toMatchObject({
      guestCount: null,
      venueKnown: null,
      unknownAnswers: ["guest_count", "venue_known"],
    });
  });

  it("skips the due date when RSVP is not wanted", () => {
    const result = parse({ rsvpWanted: "no", rsvpDueDate: "" });
    expect(result.success && (result.data as Questionnaire)).toMatchObject({
      rsvpWanted: false,
      rsvpDueDate: null,
      unknownAnswers: [],
    });
  });

  it("rejects a due date sent although RSVP is not wanted", () => {
    expect(errorOf({ rsvpWanted: "no" })).toEqual([
      ["rsvpDueDate", "events.wizard.errors.rsvpNotWanted"],
    ]);
  });

  it("records an unknown RSVP due date only when RSVP is wanted", () => {
    const result = parse({ rsvpDueUnknown: true, rsvpDueDate: "" });
    expect(result.success && result.data.unknownAnswers).toEqual(["rsvp_due_date"]);
  });

  it("asks no due date when RSVP is not sure yet", () => {
    const result = parse({ rsvpWanted: "unknown", rsvpDueDate: "" });
    expect(result.success && result.data).toMatchObject({
      rsvpWanted: null,
      rsvpDueDate: null,
      unknownAnswers: ["rsvp_wanted"],
    });
  });

  it.each(["0", "2.5", "-1", "abc", "100001"])("rejects guest count %s", (guestCount) => {
    expect(errorOf({ guestCount })).toEqual([["guestCount", "events.wizard.errors.guestCount"]]);
  });

  it("rejects a due date after the Event's local day, but not on it", () => {
    expect(errorOf({ rsvpDueDate: "2027-06-02" })).toEqual([
      ["rsvpDueDate", "events.wizard.errors.rsvpAfterStart"],
    ]);
    expect(parse({ rsvpDueDate: "2027-06-01" }).success).toBe(true);
  });

  it("rounds a duration in hours to minutes and bounds it", () => {
    const result = parse({ durationHours: "1,5" });
    expect(result.success && result.data.durationMinutes).toBe(90);
    expect(errorOf({ durationHours: "0" })).toEqual([
      ["durationHours", "events.wizard.errors.duration"],
    ]);
    expect(errorOf({ durationHours: "400" })).toEqual([
      ["durationHours", "events.wizard.errors.duration"],
    ]);
  });

  it("rejects an unanswered question and impossible dates", () => {
    expect(errorOf({ eventType: "" })).toEqual([["eventType", "events.wizard.errors.required"]]);
    expect(errorOf({ startsLocal: "2027-02-30T18:00" })).toEqual([
      ["startsLocal", "events.wizard.errors.startsLocal"],
    ]);
    expect(errorOf({ timeZone: "Mars/Base" })).toEqual([
      ["timeZone", "events.wizard.errors.timeZone"],
    ]);
    expect(errorOf({ timeZone: "europe/oslo" })).toEqual([
      ["timeZone", "events.wizard.errors.timeZone"],
    ]);
    expect(errorOf({ eventType: "concert" })).toEqual([
      ["eventType", "events.wizard.errors.required"],
    ]);
  });
});

describe("scheduleSchema", () => {
  const schedule = {
    eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    startsLocal: "2027-06-01T18:00",
    endsLocal: "2027-06-01T23:30",
    timeZone: "Europe/Oslo",
    rsvpDueDate: "2027-05-20",
    language: "nb",
  };
  const errors = (changes: Partial<typeof schedule>) => {
    const result = scheduleSchema.safeParse({ ...schedule, ...changes });
    return result.success ? null : result.error.issues.map((i) => [i.path[0], i.message]);
  };

  it("turns the settings into function arguments", () => {
    expect(scheduleSchema.safeParse(schedule)).toMatchObject({ success: true, data: schedule });
  });

  it("stores an empty reply-by date as null", () => {
    const result = scheduleSchema.safeParse({ ...schedule, rsvpDueDate: "" });
    expect(result.success && result.data.rsvpDueDate).toBeNull();
  });

  it("requires start, end, time zone and language", () => {
    expect(errors({ startsLocal: "", endsLocal: "", language: "" })).toEqual([
      ["startsLocal", "events.settings.errors.required"],
      ["endsLocal", "events.settings.errors.required"],
      ["language", "events.settings.errors.required"],
    ]);
    expect(errors({ timeZone: "" })).toEqual([["timeZone", "events.wizard.errors.timeZone"]]);
  });

  it("rejects impossible dates and times", () => {
    expect(errors({ endsLocal: "2027-02-30T18:00" })).toEqual([
      ["endsLocal", "events.wizard.errors.startsLocal"],
    ]);
    expect(errors({ rsvpDueDate: "2027-13-01" })).toEqual([
      ["rsvpDueDate", "events.wizard.errors.rsvpDueDate"],
    ]);
  });

  it("rejects an end at or before the start", () => {
    for (const endsLocal of ["2027-06-01T18:00", "2027-06-01T17:59"]) {
      expect(errors({ endsLocal })).toEqual([
        ["endsLocal", "events.settings.errors.endBeforeStart"],
      ]);
    }
  });

  it("accepts 14 days and rejects anything longer", () => {
    expect(errors({ endsLocal: "2027-06-15T18:00" })).toBeNull();
    expect(errors({ endsLocal: "2027-06-15T18:01" })).toEqual([
      ["endsLocal", "events.settings.errors.tooLong"],
    ]);
  });

  it("rejects a reply-by date after the start's day, but not on it", () => {
    expect(errors({ rsvpDueDate: "2027-06-02" })).toEqual([
      ["rsvpDueDate", "events.wizard.errors.rsvpAfterStart"],
    ]);
    expect(errors({ rsvpDueDate: "2027-06-01" })).toBeNull();
  });

  it("reads the form and trims text", () => {
    const data = new FormData();
    data.set("startsLocal", " 2027-06-01T18:00 ");
    expect(scheduleFromForm(data)).toMatchObject({
      startsLocal: "2027-06-01T18:00",
      rsvpDueDate: "",
    });
  });
});

describe("questionnaireFromForm", () => {
  it("reads checkboxes by presence and trims text", () => {
    const data = new FormData();
    data.set("guestCount", " 5 ");
    data.set("guestCountUnknown", "on");
    expect(questionnaireFromForm(data)).toMatchObject({
      guestCount: "5",
      guestCountUnknown: true,
      startsUnknown: false,
    });
  });
});

describe("toLocalInput", () => {
  it("shows the stored instant in the Event's own time zone", () => {
    expect(toLocalInput("2027-06-01T16:00:00Z", "Europe/Oslo")).toBe("2027-06-01T18:00");
    expect(toLocalInput("2027-01-01T23:30:00Z", "Europe/Oslo")).toBe("2027-01-02T00:30");
  });
});
