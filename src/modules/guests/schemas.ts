import { z } from "zod";

// The documented bound per submission (FR-5); guests_add refuses more. Rows past it fail with tooMany.
export const MAX_GUEST_ROWS = 200;

const reason = (key: string) => `guests.add.reasons.${key}`;

// Control characters and the Unicode line separators: they could split a future email header.
const controls = /^[^\u0000-\u001F\u007F-\u009F\u2028\u2029]*$/;

// One guest; shared by adding and editing (FR-5).
export const guestSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(controls, reason("invalidCharacters"))
    .min(1, reason("invalidName"))
    .max(200, reason("invalidName")),
  email: z
    .string()
    .trim()
    .regex(controls, reason("invalidCharacters"))
    .max(254, reason("invalidEmail"))
    .pipe(z.email(reason("invalidEmail"))),
});

export type GuestRow = z.infer<typeof guestSchema>;
export type FailedRow = { line: string; reason: string };

/** `Name <email>`, or a name and an email split at the last tab, comma or semicolon. */
function split(line: string) {
  const angle = /^(.*)<([^<>]*)>\s*$/.exec(line);
  // Mail clients write `"Berg, Ann" <ann@x.no>`: drop one pair of quotes around the name.
  if (angle) return { name: angle[1].trim().replace(/^"(.*)"$/, "$1"), email: angle[2] };
  const at = Math.max(line.lastIndexOf("\t"), line.lastIndexOf(","), line.lastIndexOf(";"));
  return at < 0 ? null : { name: line.slice(0, at), email: line.slice(at + 1) };
}

/**
 * One guest per line. Duplicates are compared by lower-cased email, within the input and against
 * `existing` (lower-cased emails already on the Event). A failed row keeps its line so it can be fixed.
 */
export function parseGuestRows(text: string, existing: ReadonlySet<string> = new Set()) {
  const valid: (GuestRow & { line: string })[] = [];
  const failed: FailedRow[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim() !== "");
  lines.forEach((line, index) => {
    if (index >= MAX_GUEST_ROWS) return failed.push({ line, reason: reason("tooMany") });
    const parts = split(line);
    if (!parts) return failed.push({ line, reason: reason("format") });
    const parsed = guestSchema.safeParse(parts);
    if (!parsed.success) return failed.push({ line, reason: parsed.error.issues[0].message });
    const key = parsed.data.email.toLowerCase();
    if (existing.has(key)) return failed.push({ line, reason: reason("alreadyListed") });
    if (seen.has(key)) return failed.push({ line, reason: reason("duplicate") });
    seen.add(key);
    valid.push({ ...parsed.data, line });
  });
  return { valid, failed };
}
