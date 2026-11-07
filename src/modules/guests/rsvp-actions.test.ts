import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const getClaims = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }), getClaims }));

const { submitRsvp } = await import("./rsvp-actions");

const eventId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const answers = { attending: true, plusOne: true, plusOneName: " Per ", otherNeeds: "<b>x</b>" };
const input = { eventId, answers, expectedUpdatedAt: null };

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ sub: "guest" });
  rpc.mockResolvedValue({ data: "2026-11-07T10:00:00.123456+00:00", error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("submitRsvp", () => {
  it("sends only the Event and the parsed answers, and returns updated_at unparsed", async () => {
    expect(await submitRsvp({ ...input, expectedUpdatedAt: "2026-11-07T09:00:00+00:00" })).toEqual({
      ok: true,
      data: { updatedAt: "2026-11-07T10:00:00.123456+00:00" },
    });
    expect(rpc).toHaveBeenCalledWith("guests_submit_rsvp", {
      p_event_id: eventId,
      p_answers: {
        attending: true,
        plus_one: true,
        plus_one_name: "Per",
        other_needs: "<b>x</b>",
      },
      p_expected_updated_at: "2026-11-07T09:00:00+00:00",
    });
  });

  it("parses before anything else: no session check, no call", async () => {
    const result = await submitRsvp({
      ...input,
      answers: { ...answers, otherNeeds: "a".repeat(501) },
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "invalid_input", fields: { otherNeeds: "rsvp.errors.tooLong" } },
    });
    expect(getClaims).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("asks for the link again without a session", async () => {
    getClaims.mockResolvedValue(null);
    expect(await submitRsvp(input)).toMatchObject({ ok: false, error: { code: "no_session" } });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "forbidden", "rsvp.errors.forbidden"],
    ["55000", "read_only", "rsvp.errors.readOnly"],
    ["40001", "concurrent_edit", "rsvp.errors.concurrentEdit"],
    ["22023", "invalid_input", "rsvp.errors.invalid"],
    ["23514", "invalid_input", "rsvp.errors.invalid"],
    ["XX000", "unavailable", "rsvp.errors.unavailable"],
  ])("maps %s to %s", async (code, mapped, message) => {
    rpc.mockResolvedValue({ data: null, error: { code } });
    expect(await submitRsvp(input)).toMatchObject({ ok: false, error: { code: mapped, message } });
  });

  it("logs the Event, user and code, never the answers", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000", message: "<b>x</b>" } });
    await submitRsvp(input);
    expect(console.error).toHaveBeenCalledWith("submitRsvp failed", {
      eventId,
      userId: "guest",
      code: "XX000",
    });
  });
});
