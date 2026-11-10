import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The Events where the viewer is a joined holder of the active Guests Role, who may open the Guests
 * tab read-only (Story 7.7). For the sidebar and the page gate; the database stays the boundary.
 */
export const heldGuestsEventIds = cache(async (userId: string) => {
  const { data, error } = await (
    await createClient()
  )
    .from("role_members")
    .select("event_id, roles!inner(key, active)")
    .eq("user_id", userId)
    .not("joined_at", "is", null)
    .eq("roles.key", "guests")
    .eq("roles.active", true);
  if (error) throw new Error("Could not load the Guests Role");
  return data.map((member) => member.event_id);
});
