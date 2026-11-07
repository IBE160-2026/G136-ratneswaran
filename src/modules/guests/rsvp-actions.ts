"use server";

import { refuse, type Result } from "@/lib/result";
import { createClient, getClaims } from "@/lib/supabase/server";
import { rsvpInputSchema } from "./rsvp-schemas";

const E = "rsvp.errors";

const refuseRsvp = (code: string) => {
  if (code === "42501") return refuse("forbidden", `${E}.forbidden`);
  if (code === "55000") return refuse("read_only", `${E}.readOnly`);
  if (code === "40001") return refuse("concurrent_edit", `${E}.concurrentEdit`);
  if (code === "22023" || code === "23514") return refuse("invalid_input", `${E}.invalid`);
  return refuse("unavailable", `${E}.unavailable`);
};

/**
 * A Guest's answer through `guests_submit_rsvp` under their own session (AD-2, AD-17); the function finds
 * the Guest from the session and the Event. Logs carry the Event id, user id and error code, never the
 * answers (AD-11). Returns the row's `updated_at` for the next change. No revalidation: the Guests tab is dynamic, and a
 * refresh here would remount the Guest's own flow.
 */
export async function submitRsvp(input: unknown): Promise<Result<{ updatedAt: string }>> {
  const parsed = rsvpInputSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[String(issue.path[1] ?? issue.path[0])] ??= issue.message;
    }
    return refuse("invalid_input", `${E}.invalid`, fields);
  }
  const { eventId, answers, expectedUpdatedAt } = parsed.data;
  const claims = await getClaims();
  if (!claims) return refuse("no_session", `${E}.noSession`);

  const { data, error } = await (
    await createClient()
  ).rpc("guests_submit_rsvp", {
    p_event_id: eventId,
    p_answers: {
      attending: answers.attending,
      plus_one: answers.plusOne,
      plus_one_name: answers.plusOneName,
      other_needs: answers.otherNeeds,
    },
    p_expected_updated_at: expectedUpdatedAt ?? undefined,
  });
  if (error) {
    console.error("submitRsvp failed", { eventId, userId: claims.sub, code: error.code });
    return refuseRsvp(error.code);
  }
  return { ok: true, data: { updatedAt: data } };
}
