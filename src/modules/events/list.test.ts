import { describe, expect, it } from "vitest";
import { eventDateFormat, groupEvents, isPast, type ListedEvent } from "./list";

const now = new Date("2026-10-19T12:00:00Z");
const event = (id: string, fields: Partial<ListedEvent> = {}): ListedEvent => ({
  id,
  name: id,
  starts_at: null,
  ends_at: null,
  time_zone: "Europe/Oslo",
  published_at: null,
  cancelled_at: null,
  ...fields,
});
const published = "2026-09-01T00:00:00Z";

describe("groupEvents", () => {
  it("returns two empty groups for no Events", () => {
    expect(groupEvents([], now)).toEqual({ upcoming: [], past: [] });
  });

  it("sorts upcoming by date with undated last, and past newest first with cancelled in past", () => {
    const { upcoming, past } = groupEvents(
      [
        event("undated-draft"),
        event("next-month", { starts_at: "2026-11-19T18:00:00Z", published_at: published }),
        event("next-week", { starts_at: "2026-10-26T18:00:00Z", published_at: published }),
        event("last-year", {
          starts_at: "2025-10-19T18:00:00Z",
          ends_at: "2025-10-19T22:00:00Z",
          published_at: published,
        }),
        event("cancelled-future", {
          starts_at: "2026-12-01T18:00:00Z",
          published_at: published,
          cancelled_at: published,
        }),
        event("undated-cancelled", { cancelled_at: published }),
        event("last-month", { starts_at: "2026-09-19T18:00:00Z", published_at: published }),
      ],
      now,
    );
    expect(upcoming.map((card) => card.id)).toEqual(["next-week", "next-month", "undated-draft"]);
    expect(past.map((card) => card.id)).toEqual([
      "cancelled-future",
      "last-month",
      "last-year",
      "undated-cancelled",
    ]);
  });

  it("keeps an Event in progress upcoming", () => {
    const running = event("running", {
      starts_at: "2026-10-19T10:00:00Z",
      ends_at: "2026-10-19T14:00:00Z",
    });
    expect(isPast(running, now)).toBe(false);
    expect(groupEvents([running], now).upcoming).toHaveLength(1);
  });

  it("gives an Event with no end 24 hours from its start", () => {
    const started = (hoursAgo: number) =>
      event("open-ended", {
        starts_at: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(),
      });
    expect(isPast(started(23), now)).toBe(false);
    expect(isPast(started(25), now)).toBe(true);
  });

  it("opens every uncancelled draft at setup, also a past one, and every other card at the home", () => {
    const { upcoming, past } = groupEvents(
      [
        event("draft", { starts_at: "2026-11-01T18:00:00Z" }),
        event("live", { starts_at: "2026-11-01T18:00:00Z", published_at: published }),
        event("past-draft", { starts_at: "2026-10-01T18:00:00Z" }),
        event("cancelled-draft", { starts_at: "2026-09-01T18:00:00Z", cancelled_at: published }),
      ],
      now,
    );
    expect(upcoming.map((card) => card.href)).toEqual(["/events/draft/setup", "/events/live"]);
    expect(past.map((card) => card.href)).toEqual([
      "/events/past-draft/setup",
      "/events/cancelled-draft",
    ]);
  });
});

describe("eventDateFormat", () => {
  it("shows the date where the Event happens, not in UTC", () => {
    // 23:30 UTC on Monday is already Tuesday in Oslo.
    const date = new Date("2026-10-19T23:30:00Z");
    const format = (timeZone: string | null) =>
      new Intl.DateTimeFormat("en", eventDateFormat({ time_zone: timeZone })).format(date);
    expect(format("Europe/Oslo")).toBe("Tue, Oct 20, 2026");
    expect(format(null)).toBe("Mon, Oct 19, 2026");
  });
});
