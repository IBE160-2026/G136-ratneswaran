import { createClient } from "@/lib/supabase/server";
import { GuestRows } from "./guest-rows";

/**
 * Shared by wizard step 2 and the Guests page. Oldest first; RLS shows the guests to the Organizer and
 * to a holder of the active Guests Role. The server loads the rows; GuestRows filters them, and for the
 * Organizer edits, removes and shares their links. `emails` is false for the holder, who must not ask
 * for guest_contacts.
 * shortcut: loads every guest in one query, up to the API's 1000-row limit; page on the server when lists outgrow that.
 */
export async function GuestList({
  eventId,
  readOnly = false,
  links = false,
  emails = true,
  tiles = false,
}: {
  eventId: string;
  readOnly?: boolean;
  links?: boolean;
  emails?: boolean;
  tiles?: boolean;
}) {
  const supabase = await createClient();
  const [guests, contacts] = await Promise.all([
    supabase
      .from("guests")
      .select(
        "id, name, user_id, first_opened_at, rsvps(attending, plus_one, plus_one_name, other_needs)",
      )
      .eq("event_id", eventId)
      // created_at is clock_timestamp, so a batch keeps its typed order; id breaks any tie.
      .order("created_at")
      .order("id"),
    emails
      ? supabase.from("guest_contacts").select("guest_id, email").eq("event_id", eventId)
      : { data: [], error: null },
  ]);
  if (guests.error || contacts.error) throw new Error("Could not load guests");
  const email = new Map(contacts.data.map((contact) => [contact.guest_id, contact.email]));
  return (
    <GuestRows
      eventId={eventId}
      readOnly={readOnly}
      links={links}
      tiles={tiles}
      guests={guests.data.map(({ id, name, user_id, first_opened_at, rsvps }) => {
        // At most one row: rsvps.guest_id is unique.
        const rsvp = rsvps[0];
        return {
          id,
          name,
          email: email.get(id) ?? "",
          // An answer wins; else no user yet: never copied; then copied until the guest first opens it.
          link: rsvp
            ? rsvp.attending
              ? "coming"
              : "notComing"
            : !user_id
              ? "notInvited"
              : !first_opened_at
                ? "linkCopied"
                : "opened",
          plusOne: rsvp?.plus_one ? rsvp.plus_one_name || true : undefined,
          otherNeeds: rsvp?.other_needs || undefined,
        };
      })}
    />
  );
}
