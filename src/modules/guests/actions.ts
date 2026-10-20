"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrors, refuse, type Result } from "@/lib/result";
import { createClient, getClaims } from "@/lib/supabase/server";
import { eventPath } from "@/modules/events/list";
import { guestSchema, parseGuestRows, type FailedRow } from "./schemas";

export type AddGuestsResult = Result<{ added: number; failed: FailedRow[] }>;

const addInput = z.object({
  eventId: z.uuid(),
  rows: z.string().max(100_000, "guests.add.errors.tooLong"),
});

const refuseGuest = (code: string) => {
  // Only an edit can hit the unique email index; guests_add skips those rows instead.
  if (code === "23505") {
    return refuse("duplicate", "events.wizard.errors.invalidInput", {
      email: "guests.add.reasons.alreadyListed",
    });
  }
  if (code === "42501") return refuse("forbidden", "events.wizard.errors.forbidden");
  if (code === "55000") return refuse("read_only", "events.settings.errors.readOnly");
  if (code === "23514" || code === "22023") {
    return refuse("invalid_input", "events.wizard.errors.invalidInput");
  }
  return refuse("unavailable", "events.wizard.errors.unavailable");
};

/**
 * Sends a signed-out caller to log in; otherwise returns the failure mapper. Logs carry ids and the
 * error code only, never a guest's name or email (AD-11).
 */
async function caller(action: string, eventId: string) {
  const claims = await getClaims();
  if (!claims) redirect(`/login?next=${eventPath(eventId)}/guests`);
  return (code: string) => {
    console.error(`${action} failed`, { eventId, userId: claims.sub, code });
    return refuseGuest(code);
  };
}

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
  const fail = await caller("addGuests", eventId);

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

const ids = z.object({ eventId: z.uuid(), guestId: z.uuid() });

/** Inline edit of one guest's name and email through `guests_update`, under the rules of adding. */
export async function updateGuest(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = ids.extend(guestSchema.shape).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return refuse("invalid_input", "events.wizard.errors.invalidInput", fieldErrors(parsed.error));
  }
  const { eventId, guestId, name, email } = parsed.data;
  const fail = await caller("updateGuest", eventId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("guests_update", {
    p_guest_id: guestId,
    p_name: name,
    p_email: email,
  });
  if (error) return fail(error.code);
  revalidatePath(eventPath(eventId), "layout");
  return { ok: true, data: null };
}

/** Hard delete through `guests_remove`; the list offers Undo, which calls `restoreGuest`. */
export async function removeGuest(input: {
  eventId: string;
  guestId: string;
}): Promise<Result<null>> {
  const parsed = ids.safeParse(input);
  if (!parsed.success) return refuse("invalid_input", "events.wizard.errors.invalidInput");
  const { eventId, guestId } = parsed.data;
  const fail = await caller("removeGuest", eventId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("guests_remove", { p_guest_id: guestId });
  if (error) return fail(error.code);
  revalidatePath(eventPath(eventId), "layout");
  return { ok: true, data: null };
}

/** Undo of a remove: adds the same name and email again, at the end of the list. */
export async function restoreGuest(input: {
  eventId: string;
  name: string;
  email: string;
}): Promise<Result<null>> {
  const parsed = guestSchema.extend({ eventId: z.uuid() }).safeParse(input);
  if (!parsed.success) return refuse("invalid_input", "events.wizard.errors.invalidInput");
  const { eventId, name, email } = parsed.data;
  const fail = await caller("restoreGuest", eventId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("guests_add", {
    p_event_id: eventId,
    p_rows: [{ name, email }],
  });
  if (error) return fail(error.code);
  // The email was added again before Undo: nothing is duplicated.
  if (data.length > 0) return refuse("duplicate", "guests.list.errors.restoreDuplicate");
  revalidatePath(eventPath(eventId), "layout");
  return { ok: true, data: null };
}
