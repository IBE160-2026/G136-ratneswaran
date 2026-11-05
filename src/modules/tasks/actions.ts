"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fieldErrors, refuse, type Result } from "@/lib/result";
import { createClient, getClaims } from "@/lib/supabase/server";
import { eventPath } from "@/modules/events/list";
import {
  createSchema,
  deadlineArgs,
  delegateSchema,
  dependencySchema,
  editSchema,
  lifecycleSchema,
  removeNoteSchema,
  statusSchema,
  subtaskSchema,
} from "./schemas";

const refuseTask = (code: string, invalid = "tasks.errors.invalidInput") => {
  if (code === "42501") return refuse("forbidden", "tasks.errors.forbidden");
  if (code === "55000") return refuse("read_only", "tasks.errors.readOnly");
  if (code === "40001") return refuse("concurrent", "tasks.errors.concurrent");
  if (code === "55006") return refuse("has_links", "tasks.errors.hasLinks");
  if (code === "55007") return refuse("accept_first", "tasks.errors.acceptFirst");
  if (code === "23514" || code === "22023") return refuse("invalid_input", invalid);
  return refuse("unavailable", "tasks.errors.unavailable");
};

/**
 * Sends a signed-out caller to log in; otherwise returns the failure mapper. Logs carry ids and the
 * error code only, never a Task's title or description (AD-11).
 */
async function caller(action: string, eventId: string) {
  const claims = await getClaims();
  if (!claims) redirect(`/login?next=${eventPath(eventId)}/tasks`);
  return (code: string, invalid?: string) => {
    console.error(`${action} failed`, { eventId, userId: claims.sub, code });
    return refuseTask(code, invalid);
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
  if (error) {
    return fail(error.code, name === "tasks_restore" ? "tasks.errors.parentDismissed" : undefined);
  }
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

/** Adds a Subtask through `tasks_create` with the parent; the id comes from the form, so a double submit is one Subtask. */
export async function addSubtask(
  _previous: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = subtaskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return refuse("invalid_input", "tasks.errors.invalidInput", fieldErrors(parsed.error));
  }
  const { eventId, id, parentId, roleId, title } = parsed.data;
  const fail = await caller("addSubtask", eventId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("tasks_create", {
    p_id: id,
    p_role_id: roleId,
    p_title: title,
    p_parent_id: parentId,
    ...deadlineArgs(parsed.data),
  });
  if (error) return fail(error.code, "tasks.errors.subtaskInvalid");
  touched(eventId);
  return { ok: true, data: null };
}

export async function promoteSubtask(input: LifecycleInput): Promise<Result<null>> {
  const parsed = lifecycleSchema.safeParse(input);
  if (!parsed.success) return refuse("invalid_input", "tasks.errors.invalidInput");
  const { eventId, taskId, expected } = parsed.data;
  const fail = await caller("promoteSubtask", eventId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("tasks_promote_subtask", {
    p_task_id: taskId,
    p_expected: expected,
  });
  if (error) return fail(error.code);
  touched(eventId);
  return { ok: true, data: null };
}

async function changeDependency(
  name: "tasks_add_dependency" | "tasks_remove_dependency",
  input: { eventId: string; taskId: string; dependsOnId: string },
): Promise<Result<null>> {
  const parsed = dependencySchema.safeParse(input);
  if (!parsed.success) return refuse("invalid_input", "tasks.errors.invalidInput");
  const { eventId, taskId, dependsOnId } = parsed.data;
  const fail = await caller(name, eventId);
  const supabase = await createClient();
  const { error } = await supabase.rpc(name, { p_task_id: taskId, p_depends_on_id: dependsOnId });
  if (error) return fail(error.code, "tasks.errors.dependencyInvalid");
  touched(eventId);
  return { ok: true, data: null };
}

type DependencyInput = { eventId: string; taskId: string; dependsOnId: string };

export async function addDependency(input: DependencyInput) {
  return changeDependency("tasks_add_dependency", input);
}

export async function removeDependency(input: DependencyInput) {
  return changeDependency("tasks_remove_dependency", input);
}

/** Sets the status through `tasks_set_status` and hands back the moved `updated_at` for the next write to chain on. */
export async function setTaskStatus(input: {
  eventId: string;
  taskId: string;
  expected: string;
  status: string;
  note: string;
}): Promise<Result<{ updatedAt: string }>> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return refuse("invalid_input", "tasks.errors.invalidInput");
  const { eventId, taskId, expected, status, note } = parsed.data;
  const fail = await caller("setTaskStatus", eventId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("tasks_set_status", {
    p_task_id: taskId,
    p_expected: expected,
    p_status: status,
    p_note: note || undefined,
  });
  if (error) return fail(error.code);
  touched(eventId);
  return { ok: true, data: { updatedAt: data } };
}

export async function removeStatusNote(input: {
  eventId: string;
  historyId: string;
}): Promise<Result<null>> {
  const parsed = removeNoteSchema.safeParse(input);
  if (!parsed.success) return refuse("invalid_input", "tasks.errors.invalidInput");
  const { eventId, historyId } = parsed.data;
  const fail = await caller("removeStatusNote", eventId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("tasks_remove_status_note", { p_history_id: historyId });
  if (error) return fail(error.code);
  touched(eventId);
  return { ok: true, data: null };
}

/** Hands the Task to a person through `tasks_delegate` and returns the moved `updated_at`, as the raw string. */
export async function delegateTask(input: {
  eventId: string;
  taskId: string;
  expected: string;
  newOwner: string;
}): Promise<Result<{ updatedAt: string }>> {
  const parsed = delegateSchema.safeParse(input);
  if (!parsed.success) return refuse("invalid_input", "tasks.errors.invalidInput");
  const { eventId, taskId, expected, newOwner } = parsed.data;
  const fail = await caller("delegateTask", eventId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("tasks_delegate", {
    p_task_id: taskId,
    p_new_owner: newOwner,
    p_expected: expected,
  });
  if (error) return fail(error.code);
  touched(eventId);
  return { ok: true, data: { updatedAt: data } };
}
