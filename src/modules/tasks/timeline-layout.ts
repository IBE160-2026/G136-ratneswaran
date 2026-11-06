import type { TimelineBar } from "./timeline";

export const DAY_WIDTH = 24;
export const ROLE_COLUMN = 170;
export const MIN_BAR_WIDTH = 112;
export const BAR_HEIGHT = 40;
export const CHILD_BAR_HEIGHT = 28;
export const GAP = 8;
export const MIN_LANE_HEIGHT = 112;

const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

/** Days from `from` to `to` (ISO dates). */
export const dayOffset = (from: string, to: string) => dayNumber(to) - dayNumber(from);

/** One label per Monday in the axis; the year shows on the first label and on the first Monday of a new year. */
export function axisWeeks(start: string, end: string, locale: string) {
  const first = dayNumber(start);
  const last = dayNumber(end);
  // getUTCDay: 1 is Monday.
  const firstMonday = first + ((8 - new Date(first * 86_400_000).getUTCDay()) % 7);
  const plain = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const withYear = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const weeks: { offset: number; label: string }[] = [];
  let shownYear = -1;
  for (let day = firstMonday; day <= last; day += 7) {
    const date = new Date(day * 86_400_000);
    const year = date.getUTCFullYear();
    weeks.push({
      offset: day - first,
      label: (year === shownYear ? plain : withYear).format(date),
    });
    shownYear = year;
  }
  return weeks;
}

export type PlacedBar = { bar: TimelineBar; left: number; width: number; top: number };
export type PlacedBlock = { parent: PlacedBar; children: PlacedBar[]; top: number; height: number };

const place = (bar: TimelineBar, axisStart: string, top: number): PlacedBar => ({
  bar,
  left: dayOffset(axisStart, bar.start) * DAY_WIDTH,
  width: bar.days * DAY_WIDTH,
  top,
});
const visualRight = (p: PlacedBar) => p.left + Math.max(p.width, MIN_BAR_WIDTH);

/**
 * Greedy tracks over each top-level block (a Task and its Subtasks) by visual span, using the 112px
 * minimum width so labels never overlap. shortcut: tracks are never re-sorted; upgrade if lanes grow tall.
 */
export function placeLane(bars: TimelineBar[], axisStart: string) {
  const trackEnds: number[] = [];
  const trackHeights: number[] = [];
  const raw = bars.map((bar) => {
    const parent = place(bar, axisStart, 0);
    const children = bar.children.map((c, i) =>
      place(c, axisStart, BAR_HEIGHT + GAP + i * (CHILD_BAR_HEIGHT + GAP)),
    );
    const all = [parent, ...children];
    const left = Math.min(...all.map((p) => p.left));
    const right = Math.max(...all.map(visualRight));
    const height = BAR_HEIGHT + children.length * (CHILD_BAR_HEIGHT + GAP);
    let track = trackEnds.findIndex((end) => end + GAP <= left);
    if (track < 0) track = trackEnds.length;
    trackEnds[track] = right;
    trackHeights[track] = Math.max(trackHeights[track] ?? 0, height);
    return { parent, children, track, height };
  });
  const trackTops: number[] = [];
  let y = GAP * 2;
  trackHeights.forEach((h, i) => {
    trackTops[i] = y;
    y += h + GAP;
  });
  const blocks: PlacedBlock[] = raw.map((b) => ({
    parent: b.parent,
    children: b.children,
    top: trackTops[b.track],
    height: b.height,
  }));
  return { blocks, height: Math.max(MIN_LANE_HEIGHT, y + GAP) };
}
