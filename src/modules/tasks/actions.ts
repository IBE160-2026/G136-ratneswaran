"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrors, refuse, type Result } from "@/lib/result";
import { createClient, getClaims } from "@/lib/supabase/server";
import { eventPath } from "@/modules/events/list";
import { createSchema, deadlineArgs, editSchema, lifecycleSchema } from "./schemas";

const refuseTask = (code: string) => {
  if (code === "42501") return refuse("forbidden", "tasks.errors.forbidden");
  if (code === "55000") return refuse("read_only", "tasks.errors.readOnly");
  if (code === "40001") return refuse("concurrent", "tasks.errors.concurrent");
  if (code === "23514" || code === "22023") {
    return refuse("invalid_input", "tasks.errors.invalidInput");
  }
  return refuse("unavailable", "tasks.errors.unavailable");
};

/**
 * Sends a signed-out caller to log in; otherwise returns the failure mapper. Logs carry ids and the
 * error code only, never a Task's title or description (AD-11).
 */
async function caller(action: string, eventId: string) {
  const claims = await getClaims();
  if (!claims) redirect(`/login?next=${eventPath(eventId)}/tasks`);
  return (code: string) => {
    console.error(`${action} failed`, { eventId, userId: claims.sub, code });
    return refuseTask(code);
  };
}

const touched = (eventId: string) => revalidatePath(eventPath(eventId), "layout");

/** Creates a Task through `tasks_create` and opens it. The id comes from the form, so a double submit is one Task. */
export async function createTask(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return refuse("invalid_input", "tasks.errors.invalidInput", fieldErrors(parsed.error));
  }
  const { eventId, id, roleId, title, description } = parsed.data;
  const fail = await caller("createTask", eventId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("tasks_create", {
    p_id: id,
    p_role_id: roleId,
    p_title: title,
    p_description: description || undefined,
    ...deadlineArgs(parsed.data),
  });
  if (error) return fail(error.code);
  touched(eventId);
  redirect(`${eventPath(eventId)}/tasks/${id}`);
}

/**
 * Sets the deadline first through `tasks_set_deadline`, guarded by the `updated_at` the form was opened with, then
 * the title and description (direct UPDATE) guarded by the `updated_at` it returned. An unchanged value moves nothing.
 */
export async function updateTask(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = editSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return refuse("invalid_input", "tasks.errors.invalidInput", fieldErrors(parsed.error));
  }
  const { eventId, taskId, expected, title, description } = parsed.data;
  const fail = await caller("updateTask", eventId);
  const supabase = await createClient();
  const { data: fresh, error: deadlineError } = await supabase.rpc("tasks_set_deadline", {
    p_task_id: taskId,
    p_expected: expected,
    ...deadlineArgs(parsed.data),
  });
  if (deadlineError) return fail(deadlineError.code);
  const { data, error } = await supabase
    .from("tasks")
    .update({ title, description: description || null })
    .eq("id", taskId)
    .eq("updated_at", fresh)
    .select("updated_at");
  if (error) return fail(error.code);
  // No row means a newer edit won, or the caller may not edit; the toast is the safe answer for both.
  if (data.length === 0) return fail("40001");
  touched(eventId);
  return { ok: true, data: null };
}

async function setLifecycle(
  name: "tasks_dismiss" | "tasks_restore",
  input: { eventId: string; taskId: string; expected: string },
): Promise<Result<{ updatedAt: string }>> {
  const parsed = lifecycleSchema.safeParse(input);
  if (!parsed.success) return refuse("invalid_input", "tasks.errors.invalidInput");
  const { eventId, taskId, expected } = parsed.data;
  const fail = await caller(name, eventId);
  const supabase = await createClient();
  const { error } = await supabase.rpc(name, { p_task_id: taskId, p_expected: expected });
  if (error) return fail(error.code);
  // The next Undo or Restore needs the moved updated_at, as the raw string.
  const { data, error: readError } = await supabase
    .from("tasks")
    .select("updated_at")
    .eq("id", taskId)
    .single();
  if (readError) return fail(readError.code);
  touched(eventId);
  return { ok: true, data: { updatedAt: data.updated_at } };
}

type LifecycleInput = { eventId: string; taskId: string; expected: string };

export async function dismissTask(input: LifecycleInput) {
  return setLifecycle("tasks_dismiss", input);
}

export async function restoreTask(input: LifecycleInput) {
  return setLifecycle("tasks_restore", input);
}
