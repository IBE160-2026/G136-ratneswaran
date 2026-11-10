const SLICES = ["coming", "notComing", "notAnswered"] as const;
type Slice = (typeof SLICES)[number];

// Never colour alone: one solid slice, one striped, one dotted. The table beside it repeats the swatches.
const FILL: Record<Slice, string> = {
  coming: "var(--status-done)",
  notComing: "url(#rsvp-stripes)",
  notAnswered: "url(#rsvp-dots)",
};

function Patterns() {
  return (
    <defs>
      <pattern id="rsvp-stripes" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="var(--card)" />
        <path d="M-1 7 7 -1" stroke="currentColor" strokeWidth="1.5" />
      </pattern>
      <pattern id="rsvp-dots" width="6" height="6" patternUnits="userSpaceOnUse">
        <rect width="6" height="6" fill="var(--card)" />
        <circle cx="3" cy="3" r="1" fill="currentColor" />
      </pattern>
    </defs>
  );
}

/** The swatch of a slice, for the table row that names it. Uses the patterns of the pie on the same page. */
export function RsvpSwatch({ slice }: { slice: Slice }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" className="mr-2 inline size-3 align-baseline">
      <rect width="12" height="12" fill={FILL[slice]} stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** The RSVP summary as a pie (UX-DR8). Each slice is a stroke as wide as the circle, so no arc maths. */
export function RsvpPie({ label, ...counts }: { label: string } & Record<Slice, number>) {
  const total = SLICES.reduce((sum, slice) => sum + counts[slice], 0);
  const share = (slice: Slice) => (counts[slice] / total) * 100;
  return (
    <svg role="img" aria-label={label} viewBox="0 0 100 100" className="size-28 shrink-0">
      <Patterns />
      <g transform="rotate(-90 50 50)">
        {SLICES.map(
          (slice, index) =>
            counts[slice] > 0 && (
              <circle
                key={slice}
                cx="50"
                cy="50"
                r="24"
                fill="none"
                stroke={FILL[slice]}
                strokeWidth="48"
                pathLength="100"
                strokeDasharray={`${share(slice)} 100`}
                // Starts where the slices before it end.
                strokeDashoffset={-SLICES.slice(0, index).reduce((sum, s) => sum + share(s), 0)}
              />
            ),
        )}
      </g>
      <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
