import { createClient } from "@/lib/supabase/server";
import { GuestRows } from "./guest-rows";

/**
 * Shared by wizard step 2 and the Guests page. Oldest first; RLS shows only the Organizer's guests.
 * The server loads the rows; GuestRows edits and removes them.
 */
export async function GuestList({
  eventId,
  readOnly = false,
}: {
  eventId: string;
  readOnly?: boolean;
}) {
  const supabase = await createClient();
  const [guests, contacts] = await Promise.all([
    supabase
      .from("guests")
      .select("id, name")
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
      guests={guests.data.map((guest) => ({ ...guest, email: email.get(guest.id) ?? "" }))}
    />
  );
}
