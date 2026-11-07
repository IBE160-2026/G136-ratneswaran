import { describe, expect, it } from "vitest";
import { axisWeeks, MIN_LANE_HEIGHT, MIN_BAR_WIDTH, placeLane } from "./timeline-layout";
import type { TimelineBar } from "./timeline";

const bar = (id: string, start: string, days: number, children: TimelineBar[] = []) =>
  ({ id, start, days, children }) as TimelineBar;

describe("axisWeeks", () => {
  it("labels each Monday, with the year on the first and across a year boundary (en)", () => {
    const w = axisWeeks("2026-12-14", "2027-01-18", "en");
    expect(w.map((x) => x.offset)).toEqual([0, 7, 14, 21, 28, 35]);
    expect(w.map((x) => x.label)).toEqual([
      "Dec 14, 2026",
      "Dec 21",
      "Dec 28",
      "Jan 4, 2027",
      "Jan 11",
      "Jan 18",
    ]);
  });

  it("localises month names (nb) and starts at the first Monday after a mid-week start", () => {
    const w = axisWeeks("2026-12-16", "2027-01-05", "nb");
    expect(w.map((x) => x.offset)).toEqual([5, 12, 19]);
    expect(w[0].label).toContain("des");
    expect(w[0].label).toContain("2026");
    expect(w[2].label).toContain("jan");
    expect(w[2].label).toContain("2027");
  });
});

describe("placeLane", () => {
  it("puts overlapping bars on separate tracks, using the 112px minimum width", () => {
    // Day 0 one-day bar is 24px wide but occupies 112px; day 3 starts at 72px, so it must move down.
    const { blocks } = placeLane(
      [bar("a", "2026-12-01", 1), bar("b", "2026-12-04", 1)],
      "2026-12-01",
    );
    expect(blocks[1].top).toBeGreaterThan(blocks[0].top);
    const c = placeLane([bar("a", "2026-12-01", 1), bar("c", "2026-12-10", 1)], "2026-12-01");
    expect(c.blocks[1].top).toBe(c.blocks[0].top);
    expect(c.blocks[1].parent.left).toBeGreaterThanOrEqual(MIN_BAR_WIDTH);
  });

  it("makes a block with Subtasks taller and keeps a minimum lane height", () => {
    const one = placeLane([bar("a", "2026-12-01", 3)], "2026-12-01");
    const kids = placeLane(
      [bar("a", "2026-12-01", 3, [bar("s", "2026-12-01", 2), bar("t", "2026-12-02", 2)])],
      "2026-12-01",
    );
    expect(one.height).toBe(MIN_LANE_HEIGHT);
    expect(kids.blocks[0].height).toBeGreaterThan(one.blocks[0].height);
    expect(kids.height).toBeGreaterThan(MIN_LANE_HEIGHT);
    expect(kids.blocks[0].children[1].top).toBeGreaterThan(kids.blocks[0].children[0].top);
  });
});
