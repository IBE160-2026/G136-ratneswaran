"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrors, refuse, type Result } from "@/lib/result";
import { createClient, getClaims } from "@/lib/supabase/server";
import { eventPath } from "@/modules/events/list";
import { parseGuestRows, type FailedRow } from "./schemas";

export type AddGuestsResult = Result<{ added: number; failed: FailedRow[] }>;

const addInput = z.object({
  eventId: z.uuid(),
  rows: z.string().max(100_000, "guests.add.errors.tooLong"),
});

const refuseAdd = (code: string) => {
  if (code === "42501") return refuse("forbidden", "events.wizard.errors.forbidden");
  if (code === "55000") return refuse("read_only", "events.settings.errors.readOnly");
  if (code === "23514" || code === "22023") {
    return refuse("invalid_input", "events.wizard.errors.invalidInput");
  }
  return refuse("unavailable", "events.wizard.errors.unavailable");
};

/**
 * Wizard step 2 and the Guests page: parses the pasted rows, then adds the valid ones through `guests_add`
 * (FR-5, AD-2). A row that fails, or that another tab added first, is reported with its reason.
 */
export async function addGuests(
  _previous: AddGuestsResult | null,
  formData: FormData,
): Promise<AddGuestsResult> {
  const parsed = addInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return refuse("invalid_input", "events.wizard.errors.invalidInput", fieldErrors(parsed.error));
  }
  const { eventId, rows } = parsed.data;
  const claims = await getClaims();
  if (!claims) redirect(`/login?next=${eventPath(eventId)}/guests`);
  // Logs carry ids and the error code only, never a guest's name or email (AD-11).
  const fail = (code: string) => {
    console.error("addGuests failed", { eventId, userId: claims.sub, code });
    return refuseAdd(code);
  };

  const supabase = await createClient();
  const { data: contacts, error: readError } = await supabase
    .from("guest_contacts")
    .select("email")
    .eq("event_id", eventId);
  if (readError) return fail(readError.code);

  const { valid, failed } = parseGuestRows(
    rows,
    new Set(contacts.map((contact) => contact.email.toLowerCase())),
  );
  if (valid.length === 0 && failed.length === 0) {
    return refuse("invalid_input", "events.wizard.errors.invalidInput", {
      rows: "guests.add.errors.empty",
    });
  }
  let skipped: string[] = [];
  if (valid.length > 0) {
    const { data, error } = await supabase.rpc("guests_add", {
      p_event_id: eventId,
      p_rows: valid.map(({ name, email }) => ({ name, email })),
    });
    if (error) return fail(error.code);
    skipped = data;
  }

  // Another tab added these first: the unique index kept one row, so report them as duplicates.
  const lost = new Set(skipped.map((email) => email.toLowerCase()));
  const raced = valid.filter((row) => lost.has(row.email.toLowerCase()));
  if (valid.length > raced.length) revalidatePath(eventPath(eventId), "layout");
  return {
    ok: true,
    data: {
      added: valid.length - raced.length,
      failed: [
        ...failed,
        ...raced.map(({ line }) => ({ line, reason: "guests.add.reasons.duplicate" })),
      ],
    },
  };
}
