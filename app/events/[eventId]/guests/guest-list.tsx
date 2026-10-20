import { getTranslations } from "next-intl/server";
import { StatusLabel } from "@/components/status-label";
import { createClient } from "@/lib/supabase/server";

/** Shared by wizard step 2 and the Guests page. Oldest first; RLS shows only the Organizer's guests. */
export async function GuestList({ eventId }: { eventId: string }) {
  const t = await getTranslations("guests.list");
  const supabase = await createClient();
  const [guests, contacts] = await Promise.all([
    supabase
      .from("guests")
      .select("id, name")
      .eq("event_id", eventId)
      // One batch shares created_at, so the name keeps the order stable.
      .order("created_at")
      .order("name"),
    supabase.from("guest_contacts").select("guest_id, email").eq("event_id", eventId),
  ]);
  if (guests.error || contacts.error) throw new Error("Could not load guests");
  const email = new Map(contacts.data.map((contact) => [contact.guest_id, contact.email]));

  if (guests.data.length === 0) return <p className="text-muted-foreground">{t("empty")}</p>;
  return (
    <section aria-labelledby="guest-count" className="flex flex-col gap-2">
      <h2 id="guest-count" className="text-headline">
        {t("count", { count: guests.data.length })}
      </h2>
      <ul role="list" className="divide-border flex flex-col divide-y">
        {guests.data.map((guest) => (
          <li key={guest.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
            <span className="min-w-0 break-words">{guest.name}</span>
            <span className="text-muted-foreground min-w-0 break-all">{email.get(guest.id)}</span>
            <StatusLabel status="notInvited" className="ml-auto" />
          </li>
        ))}
      </ul>
    </section>
  );
}
