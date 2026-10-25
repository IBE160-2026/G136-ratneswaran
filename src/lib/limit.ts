import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { refuse } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/**
 * IP bucket first so a refused request never spends the email's or token's budget (AD-4). Null means allowed.
 * Each flow counts in its own `<flow>_ip` and `<flow>_email` (or `<flow>_token`) buckets, so one flow never
 * spends another's budget (AD-21). Server-only: no `"use server"`, so it never becomes an action.
 */
export async function limit(
  flow: "signup" | "resend" | "forgot" | "invite",
  subject: { email: string } | { token: string },
  errors: string,
) {
  const supabase = await createClient();
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const [name, key] =
    "email" in subject
      ? (["email", subject.email.trim().toLowerCase()] as const)
      : (["token", subject.token] as const);
  for (const [bucket, value, max, window] of [
    [`${flow}_ip`, ip, 5, 60],
    [`${flow}_${name}`, key, 3, 3600],
  ] as const) {
    const answer = await supabase.rpc("abuse_hit", {
      p_bucket: bucket,
      p_key_hash: sha256(value),
      p_max: max,
      p_window_seconds: window,
    });
    if (answer.error) return refuse("unavailable", `${errors}.unavailable`);
    if (!answer.data) return refuse("rate_limited", `${errors}.rateLimited`);
  }
  return null;
}
