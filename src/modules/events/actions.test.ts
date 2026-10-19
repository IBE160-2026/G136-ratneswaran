import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }), getClaims }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const { createEvent, saveQuestionnaire } = await import("./actions");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const answers = {
  eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  eventType: "birthday",
  startsLocal: "2027-06-01T18:00",
  timeZone: "Europe/Oslo",
  durationHours: "4",
  guestCount: "80",
  venueKnown: "unknown",
  rsvpWanted: "no",
  guestListMethod: "manual",
  language: "nb",
};

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ sub: "u1" });
  rpc.mockResolvedValue({ data: null, error: null });
});

describe("saveQuestionnaire", () => {
  it("calls the function with null for Not sure yet and returns to All events", async () => {
    await expect(saveQuestionnaire(null, form(answers))).rejects.toThrow(
      "REDIRECT /events?saved=1",
    );
    expect(rpc).toHaveBeenCalledWith(
      "events_save_questionnaire",
      expect.objectContaining({
        p_event_id: answers.eventId,
        p_duration_minutes: 240,
        p_guest_count: 80,
        p_venue_known: null,
        p_rsvp_wanted: false,
        p_rsvp_due_date: null,
        p_unknown_answers: ["venue_known"],
      }),
    );
  });

  it("rejects invalid input inline without calling the database", async () => {
    const result = await saveQuestionnaire(null, form({ ...answers, guestCount: "0" }));
    expect(result).toMatchObject({
      ok: false,
      error: { code: "invalid_input", fields: { guestCount: "events.wizard.errors.guestCount" } },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "forbidden"],
    ["23514", "invalid_input"],
    ["22023", "invalid_input"],
    ["22008", "invalid_input"],
    ["XX000", "unavailable"],
  ])("maps database error %s to %s", async (code, expected) => {
    rpc.mockResolvedValue({ data: null, error: { code } });
    expect(await saveQuestionnaire(null, form(answers))).toMatchObject({
      ok: false,
      error: { code: expected },
    });
  });

  it("sends a signed-out caller to log in", async () => {
    getClaims.mockResolvedValue(null);
    await expect(saveQuestionnaire(null, form(answers))).rejects.toThrow("REDIRECT /login");
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("createEvent", () => {
  it("opens step 1 of the new draft", async () => {
    rpc.mockResolvedValue({ data: "new-id", error: null });
    await expect(createEvent()).rejects.toThrow("REDIRECT /events/new-id/setup");
  });

  it("reports a failed create", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    expect(await createEvent()).toMatchObject({
      ok: false,
      error: { code: "unavailable" },
    });
  });
});
