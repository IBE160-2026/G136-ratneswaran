"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrors, refuse, type Result } from "@/lib/result";
import { createClient, getClaims } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { eventPath, isDraft, missingForPublish } from "./list";
import { defaultRoles } from "./roles";
import { setupPath } from "./save";
import {
  questionnaireFromForm,
  questionnaireSchema,
  scheduleFromForm,
  scheduleSchema,
} from "./schemas";

const unavailable = refuse("unavailable", "events.wizard.errors.unavailable");

/** Creates a draft Event through `events_create` and opens wizard step 1. */
export async function createEvent(): Promise<Result<null>> {
  if (!(await getClaims())) redirect("/login?next=/events");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("events_create");
  if (error || !data) return unavailable;
  redirect(setupPath(data));
}

/** Wizard step 1: validates, then saves every answer through `events_save_questionnaire` (AD-2, AD-17). */
export async function saveQuestionnaire(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = questionnaireSchema.safeParse(questionnaireFromForm(formData));
  if (!parsed.success) {
    return refuse("invalid_input", "events.wizard.errors.invalidInput", fieldErrors(parsed.error));
  }
  const answers = parsed.data;
  if (!(await getClaims())) redirect(`/login?next=${setupPath(answers.eventId)}`);
  // The generated types make every argument non-null, but "Not sure yet" is stored as null.
  const args = {
    p_event_id: answers.eventId,
    p_event_type: answers.eventType,
    p_starts_local: answers.startsLocal,
    p_time_zone: answers.timeZone,
    p_duration_minutes: answers.durationMinutes,
    p_guest_count: answers.guestCount,
    p_venue_known: answers.venueKnown,
    p_rsvp_wanted: answers.rsvpWanted,
    p_rsvp_due_date: answers.rsvpDueDate,
    p_guest_list_method: answers.guestListMethod,
    p_language: answers.language,
    p_unknown_answers: answers.unknownAnswers,
    // Applied in the same call to the Roles the Organizer has not switched (FR-2).
    p_default_roles: defaultRoles(answers.eventType),
  } as unknown as Database["public"]["Functions"]["events_save_questionnaire"]["Args"];
  const supabase = await createClient();
  const { error } = await supabase.rpc("events_save_questionnaire", args);
  if (error) {
    if (error.code === "42501") return refuse("forbidden", "events.wizard.errors.forbidden");
    if (error.code === "55000") return refuse("read_only", "events.settings.errors.readOnly");
    // Class 23514 is a CHECK, class 22 is bad data (time zone, date range): retrying cannot fix either.
    if (error.code === "23514" || error.code.startsWith("22")) {
      return refuse("invalid_input", "events.wizard.errors.invalidInput");
    }
    return unavailable;
  }
  revalidatePath("/events");
  redirect(`${eventPath(answers.eventId)}/setup/guests`);
}

const blankAsNull = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .default("")
    .transform((value) => value || null);

const descriptionInput = z.object({
  eventId: z.uuid(),
  name: blankAsNull(200, "events.description.errors.nameTooLong"),
  description: blankAsNull(2000, "events.description.errors.descriptionTooLong"),
});

/** Wizard step 3: saves name and description in one direct update on the granted columns (AD-19). */
export async function saveDescription(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = descriptionInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return refuse("invalid_input", "events.wizard.errors.invalidInput", fieldErrors(parsed.error));
  }
  const { eventId, name, description } = parsed.data;
  if (!(await getClaims())) redirect(`/login?next=${eventPath(eventId)}/setup/description`);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update({ name, description })
    .eq("id", eventId)
    .select("id");
  // Clearing the name of a published Event fails events_publishable.
  if (error?.code === "23514") {
    return refuse("invalid_input", "events.wizard.errors.invalidInput", {
      name: "events.description.errors.nameRequired",
    });
  }
  if (error) return refuseEventChange(error.code);
  // RLS hides another Organizer's Event, so the update matches no row.
  if (data.length === 0) return refuse("forbidden", "events.wizard.errors.forbidden");
  revalidatePath("/events", "layout");
  redirect(eventPath(eventId));
}

/** Event settings: validates, then saves the schedule and language through `events_update_schedule` (AD-2). */
export async function updateSchedule(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = scheduleSchema.safeParse(scheduleFromForm(formData));
  if (!parsed.success) {
    return refuse("invalid_input", "events.wizard.errors.invalidInput", fieldErrors(parsed.error));
  }
  const schedule = parsed.data;
  if (!(await getClaims())) redirect(`/login?next=/events/${schedule.eventId}/settings`);
  // The generated types make every argument non-null, but an empty reply-by date is stored as null.
  const args = {
    p_event_id: schedule.eventId,
    p_starts_local: schedule.startsLocal,
    p_ends_local: schedule.endsLocal,
    p_time_zone: schedule.timeZone,
    p_rsvp_due_date: schedule.rsvpDueDate,
    p_language: schedule.language,
  } as Database["public"]["Functions"]["events_update_schedule"]["Args"];
  const supabase = await createClient();
  const { error } = await supabase.rpc("events_update_schedule", args);
  if (error) {
    if (error.code === "42501") return refuse("forbidden", "events.wizard.errors.forbidden");
    if (error.code === "55000") return refuse("read_only", "events.settings.errors.readOnly");
    // A CHECK (23514) or bad data (class 22) that Zod could not see, such as a DST edge: retrying cannot fix it.
    if (error.code === "23514" || error.code.startsWith("22")) {
      return refuse("invalid_input", "events.wizard.errors.invalidInput");
    }
    return unavailable;
  }
  // Dates show on All events and the Event's pages.
  revalidatePath("/events", "layout");
  return { ok: true, data: null };
}

const roleSwitch = z.object({ eventId: z.uuid(), roleId: z.uuid(), active: z.boolean() });

/** Team & Roles: switches one Role through `events_set_role_active` (AD-2, AD-19). */
export async function setRoleActive(input: z.input<typeof roleSwitch>): Promise<Result<null>> {
  const parsed = roleSwitch.safeParse(input);
  if (!parsed.success) return refuse("invalid_input", "events.team.errors.invalidInput");
  const { eventId, roleId, active } = parsed.data;
  if (!(await getClaims())) redirect(`/login?next=/events/${eventId}/team`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("events_set_role_active", {
    p_role_id: roleId,
    p_active: active,
  });
  if (error) {
    if (error.code === "42501") return refuse("forbidden", "events.team.errors.forbidden");
    if (error.code === "55000") return refuse("read_only", "events.settings.errors.readOnly");
    return refuse("unavailable", "events.team.errors.unavailable");
  }
  revalidatePath(`/events/${eventId}/team`);
  return { ok: true, data: null };
}

/** Shared by cancel and delete: a stale tab meets the database's read-only rule (55000). */
const refuseEventChange = (code: string) => {
  if (code === "42501") return refuse("forbidden", "events.wizard.errors.forbidden");
  if (code === "55000") return refuse("read_only", "events.settings.errors.readOnly");
  if (code === "23514") return refuse("invalid_input", "events.wizard.errors.invalidInput");
  return unavailable;
};

const cancelInput = z.object({
  eventId: z.uuid(),
  note: z.string().trim().max(500, "events.settings.cancel.noteTooLong").default(""),
});

/** Event settings: cancels a published Event through `events_cancel` and opens its home (FR4, AD-2). */
export async function cancelEvent(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = cancelInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return refuse("invalid_input", "events.wizard.errors.invalidInput", fieldErrors(parsed.error));
  }
  const { eventId, note } = parsed.data;
  if (!(await getClaims())) redirect(`/login?next=/events/${eventId}/settings`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("events_cancel", { p_event_id: eventId, p_note: note });
  if (error) return refuseEventChange(error.code);
  revalidatePath("/events", "layout");
  redirect(eventPath(eventId));
}

const deleteInput = z.object({ eventId: z.uuid(), confirmName: z.string().trim().default("") });

/**
 * Event settings: deletes an Event, or discards a draft, through `events_delete` (FR4, AD-2). Anything but
 * a draft needs its name typed as a confirmation step, not a security rule; whether it is a draft comes
 * from the database row, not the client.
 */
export async function deleteEvent(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = deleteInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return refuse("invalid_input", "events.wizard.errors.invalidInput");
  const { eventId, confirmName } = parsed.data;
  if (!(await getClaims())) redirect(`/login?next=/events/${eventId}/settings`);
  const supabase = await createClient();
  // RLS hides another Organizer's Event, so a missing row is refused like the function would.
  const { data: event, error: loadError } = await supabase
    .from("events")
    .select("name, published_at, cancelled_at")
    .eq("id", eventId)
    .maybeSingle();
  if (loadError) return unavailable;
  if (!event) return refuse("forbidden", "events.wizard.errors.forbidden");
  const draft = isDraft(event);
  if (!draft && confirmName !== (event.name ?? "").trim()) {
    return refuse("invalid_input", "events.wizard.errors.invalidInput", {
      confirmName: "events.settings.delete.nameMismatch",
    });
  }
  const { error } = await supabase.rpc("events_delete", { p_event_id: eventId });
  if (error) return refuseEventChange(error.code);
  revalidatePath("/events", "layout");
  redirect(`/events?deleted=${draft ? "draft" : "event"}`);
}

const publishInput = z.object({ eventId: z.uuid() });

/**
 * Event home: publishes to the team through `events_publish` (FR4, AD-2). The database CHECK decides
 * completeness; on a refusal the row is re-read to name what is missing. Core sends no invitation.
 */
export async function publishEvent(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = publishInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return refuse("invalid_input", "events.wizard.errors.invalidInput");
  const { eventId } = parsed.data;
  if (!(await getClaims())) redirect(`/login?next=${eventPath(eventId)}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("events_publish", { p_event_id: eventId });
  if (error?.code === "23514") {
    const { data: event } = await supabase
      .from("events")
      .select("name, starts_at, ends_at, time_zone, language")
      .eq("id", eventId)
      .maybeSingle();
    const missing = event ? missingForPublish(event) : [];
    // An end before the start fails the same CHECK with nothing empty: the plain message covers it.
    const fields = missing.length
      ? Object.fromEntries(missing.map((field) => [field, `events.publish.missing.${field}`]))
      : undefined;
    return refuse("incomplete", "events.publish.errors.incomplete", fields);
  }
  if (error) return refuseEventChange(error.code);
  revalidatePath("/events", "layout");
  redirect(`${eventPath(eventId)}?published=1`);
}
