import { Constants, type Database } from "@/types/database";
import type { eventTypes } from "./schemas";

export type RoleKey = Database["public"]["Enums"]["role_key"];
type EventType = (typeof eventTypes)[number];

/** The Branch Pool in display order, straight from the database enum. */
export const roleKeys = Constants.public.Enums.role_key;

const BASE: readonly RoleKey[] = ["venue", "guests", "food_beverage"];

// FR-2: the one place that decides which Roles an event type activates. Other, "Not sure yet" and no
// type get the base three.
const DEFAULTS: Record<EventType, readonly RoleKey[]> = {
  birthday: [...BASE, "entertainment", "program"],
  wedding: roleKeys,
  party: [...BASE, "entertainment"],
  seminar: [...BASE, "program", "travel_logistics"],
  other: BASE,
};

export const defaultRoles = (eventType: string | null): RoleKey[] => [
  ...(DEFAULTS[eventType as EventType] ?? BASE),
];

/** The message key of a Role's description; at a seminar, Program manages the speakers and talks. */
export const roleDescriptionKey = (key: RoleKey, eventType: string | null) =>
  key === "program" && eventType === "seminar"
    ? "roles.program.seminarDescription"
    : `roles.${key}.description`;

/** A Role the Organizer switched, when it differs from the type's default: what the type would choose. */
export function suggestion(
  role: { key: RoleKey; active: boolean; toggled_at: string | null },
  eventType: string | null,
): "on" | "off" | null {
  if (!role.toggled_at) return null;
  const wanted = defaultRoles(eventType).includes(role.key);
  if (wanted === role.active) return null;
  return wanted ? "on" : "off";
}
