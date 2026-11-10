import { describe, expect, it } from "vitest";
import { summarizeRsvps } from "./summary";

describe("summarizeRsvps", () => {
  it("is all zeros without guests", () => {
    expect(summarizeRsvps([])).toEqual({
      invited: 0,
      coming: 0,
      notComing: 0,
      notAnswered: 0,
      headcount: 0,
    });
  });

  it("counts plus-ones of coming guests when everyone has answered", () => {
    expect(
      summarizeRsvps([
        { attending: true, plusOne: true },
        { attending: true, plusOne: false },
        { attending: false, plusOne: false },
      ]),
    ).toEqual({ invited: 3, coming: 2, notComing: 1, notAnswered: 0, headcount: 3 });
  });

  it("never counts a plus-one on a No, and counts the unanswered", () => {
    expect(
      summarizeRsvps([
        { attending: false, plusOne: true },
        { attending: true, plusOne: false },
        { attending: null, plusOne: false },
      ]),
    ).toEqual({ invited: 3, coming: 1, notComing: 1, notAnswered: 1, headcount: 1 });
  });
});
