import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import nb from "../../messages/nb.json";
import { STATUSES } from "./status";

// DESIGN.md: atRisk and newItem are the only statuses without an icon; they still carry a word.
const ICONLESS = ["atRisk", "newItem"];

describe("status vocabulary", () => {
  it("never colours Blocked with a destructive or overdue tone", () => {
    expect(STATUSES.blocked.tone).not.toMatch(/destructive|overdue|red/);
    expect(STATUSES.blocked.icon).not.toBeNull();
  });

  it("has a word in both languages for every status", () => {
    const names = Object.keys(STATUSES).sort();
    expect(Object.keys(en.status).sort()).toEqual(names);
    expect(Object.keys(nb.status).sort()).toEqual(names);
  });

  it("has a tone, and an icon except for the two count badges", () => {
    for (const [name, { icon, tone }] of Object.entries(STATUSES)) {
      expect(tone, name).toBeTruthy();
      expect(icon === null, name).toBe(ICONLESS.includes(name));
    }
  });
});
