"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrors, refuse, type Result } from "@/lib/result";
import { createClient, getClaims } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
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
    // Class 23514 is a CHECK, class 22 is bad data (time zone, date range): retrying cannot fix either.
    if (error.code === "23514" || error.code.startsWith("22")) {
      return refuse("invalid_input", "events.wizard.errors.invalidInput");
    }
    return unavailable;
  }
  revalidatePath("/events");
  redirect("/events?saved=1");
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
    return refuse("unavailable", "events.team.errors.unavailable");
  }
  revalidatePath(`/events/${eventId}/team`);
  return { ok: true, data: null };
}
