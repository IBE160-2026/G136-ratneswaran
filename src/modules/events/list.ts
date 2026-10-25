import { setupPath } from "@/modules/events/save";
import type { Database } from "@/types/database";

type Row = Database["public"]["Tables"]["events"]["Row"];
export type ListedEvent = Pick<
  Row,
  "id" | "name" | "starts_at" | "ends_at" | "time_zone" | "published_at" | "cancelled_at"
>;
export type EventCard = ListedEvent & { href: string; past: boolean };

export const eventPath = (eventId: string) => `/events/${eventId}`;

/** next-intl dateTime options: the date as it falls where the Event happens. */
export const eventDateFormat = (event: Pick<ListedEvent, "time_zone">) =>
  ({
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: event.time_zone ?? "UTC",
  }) as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Past = cancelled, or over. With no end ("Not sure yet" duration) an Event runs 24 hours from its start. */
export const isPast = (event: ListedEvent, now: Date) => {
  if (event.cancelled_at !== null) return true;
  const end = event.ends_at ?? event.starts_at;
  if (!end) return false;
  return new Date(end).getTime() + (event.ends_at ? 0 : DAY_MS) < now.getTime();
};

/** A draft stays editable even once its date has passed, so a mistyped date can be fixed. */
export const isDraft = (event: Pick<ListedEvent, "published_at" | "cancelled_at">) =>
  event.published_at === null && event.cancelled_at === null;

// Undated Events sort last in either direction.
const byDate = (direction: 1 | -1) => (a: ListedEvent, b: ListedEvent) => {
  if (!a.starts_at || !b.starts_at) return Number(!a.starts_at) - Number(!b.starts_at);
  return direction * (new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
};

/** What the draft card needs to know about the wizard: step 1's answers, any guest, and the name. */
export type DraftProgress = Pick<Row, "event_type" | "unknown_answers"> & {
  guests: { count: number }[];
};

/**
 * The first incomplete wizard step (UX-DR7): step 1 until the questionnaire is saved, step 2 until a guest
 * or a name exists, step 3 until the name is set, then the Event home, where the Organizer publishes.
 */
export const draftPath = (event: Pick<Row, "id" | "name"> & DraftProgress) => {
  if (event.event_type === null && event.unknown_answers.length === 0) return setupPath(event.id);
  if (event.name !== null) return eventPath(event.id);
  return (event.guests[0]?.count ?? 0) > 0
    ? `${setupPath(event.id)}/description`
    : `${setupPath(event.id)}/guests`;
};

/** Upcoming by date with undated last, past newest first. Drafts open their next step, others the home. */
export function groupEvents(rows: (ListedEvent & DraftProgress)[], now: Date) {
  const cards = rows.map((event): EventCard => {
    const href = isDraft(event) ? draftPath(event) : eventPath(event.id);
    return { ...event, past: isPast(event, now), href };
  });
  return {
    upcoming: cards.filter((card) => !card.past).sort(byDate(1)),
    past: cards.filter((card) => card.past).sort(byDate(-1)),
  };
}

const requiredForPublish = ["name", "starts_at", "ends_at", "time_zone", "language"] as const;
export type PublishField = (typeof requiredForPublish)[number];

/** Words the events_publishable CHECK, which alone decides: the required fields that are still empty. */
export const missingForPublish = (event: Pick<Row, PublishField>): PublishField[] =>
  requiredForPublish.filter((field) => event[field] === null);
