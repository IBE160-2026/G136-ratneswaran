import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

/** Holds the invite token after `GET /api/invite/[token]`, so no URL carries it (AD-4). */
export const INVITE_COOKIE = "invite_token";

type PreviewRow = Database["public"]["Functions"]["events_invite_preview"]["Returns"][number];

export type InvitePreview =
  | ({ status: "valid" } & Omit<PreviewRow, "status">)
  | { status: "used" | "expired" | "unavailable" };

/**
 * The invitation behind the cookie, through the system function `events_invite_preview` and the secret key
 * (AD-5). Unknown, used and revoked tokens, and no cookie at all, read the same: used.
 */
export async function readInvite(): Promise<{ token: string | null; preview: InvitePreview }> {
  const token = (await cookies()).get(INVITE_COOKIE)?.value ?? null;
  if (!token) return { token, preview: { status: "used" } };
  const { data, error } = await createAdminClient().rpc("events_invite_preview", {
    p_token: token,
  });
  const row = data?.[0];
  if (error || !row) return { token, preview: { status: "unavailable" } };
  if (row.status === "valid") return { token, preview: { ...row, status: "valid" } };
  return { token, preview: { status: row.status === "expired" ? "expired" : "used" } };
}

/** Same address, ignoring case: decides only what /invite shows; `events_join_role` makes the real check. */
export const sameEmail = (a: unknown, b: string) =>
  typeof a === "string" && a.toLowerCase() === b.toLowerCase();
