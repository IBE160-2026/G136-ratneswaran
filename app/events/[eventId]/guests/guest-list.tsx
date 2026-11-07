import { createClient } from "@/lib/supabase/server";
import { GuestRows } from "./guest-rows";

/**
 * Shared by wizard step 2 and the Guests page. Oldest first; RLS shows only the Organizer's guests.
 * The server loads the rows; GuestRows edits and removes them, and on the Guests page shares their links.
 */
export async function GuestList({
  eventId,
  readOnly = false,
  links = false,
}: {
  eventId: string;
  readOnly?: boolean;
  links?: boolean;
}) {
  const supabase = await createClient();
  const [guests, contacts] = await Promise.all([
    supabase
      .from("guests")
      .select("id, name, user_id, first_opened_at")
      .eq("event_id", eventId)
      // created_at is clock_timestamp, so a batch keeps its typed order; id breaks any tie.
      .order("created_at")
      .order("id"),
    supabase.from("guest_contacts").select("guest_id, email").eq("event_id", eventId),
  ]);
  if (guests.error || contacts.error) throw new Error("Could not load guests");
  const email = new Map(contacts.data.map((contact) => [contact.guest_id, contact.email]));
  return (
    <GuestRows
      eventId={eventId}
      readOnly={readOnly}
      links={links}
      guests={guests.data.map(({ id, name, user_id, first_opened_at }) => ({
        id,
        name,
        email: email.get(id) ?? "",
        // No user yet: never copied. Then copied until the guest first opens it.
        link: !user_id ? "notInvited" : !first_opened_at ? "linkCopied" : "opened",
      }))}
    />
  );
}
