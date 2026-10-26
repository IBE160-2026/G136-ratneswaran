import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Secret-key client, bypassing RLS. Server only, and only for the AD-5 uses: invitee creation (3.6),
 * invite exchange (3.7) and notification delivery (Target 3). Lint keeps it out of client components.
 */
export function createAdminClient() {
  const env = getServerEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
