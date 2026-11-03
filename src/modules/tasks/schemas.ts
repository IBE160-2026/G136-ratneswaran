import { z } from "zod";

const error = (key: string) => `tasks.errors.${key}`;

// The deadline is a date, or N days before the Event's start (0 to 365). Both arrive as form text.
const fields = {
  title: z.string().trim().min(1, error("title")).max(120, error("title")),
  description: z.string().trim().max(2000, error("description")),
  kind: z.enum(["date", "days"]),
  deadline: z.string().trim(),
  daysBefore: z.string().trim(),
};

function checkDeadline(
  value: { kind: "date" | "days"; deadline: string; daysBefore: string },
  ctx: z.RefinementCtx,
) {
  if (value.kind === "date") {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value.deadline) ||
      new Date(`${value.deadline}T00:00:00Z`).toISOString().slice(0, 10) !== value.deadline
    ) {
      ctx.addIssue({ code: "custom", path: ["deadline"], message: error("deadline") });
    }
    return;
  }
  const days = Number(value.daysBefore);
  if (value.daysBefore === "" || !Number.isInteger(days) || days < 0 || days > 365) {
    ctx.addIssue({ code: "custom", path: ["daysBefore"], message: error("daysBefore") });
  }
}

export const createSchema = z
  .object({ eventId: z.uuid(), id: z.uuid(), roleId: z.uuid(), ...fields })
  .superRefine(checkDeadline);

/** A Subtask is added inline with a title and a date; the Role comes from the parent. */
export const subtaskSchema = z
  .object({
    eventId: z.uuid(),
    id: z.uuid(),
    parentId: z.uuid(),
    roleId: z.uuid(),
    title: fields.title,
    kind: z.literal("date"),
    deadline: fields.deadline,
    daysBefore: fields.daysBefore,
  })
  .superRefine(checkDeadline);

export const editSchema = z
  .object({ eventId: z.uuid(), taskId: z.uuid(), expected: z.string().min(1), ...fields })
  .superRefine(checkDeadline);

export const lifecycleSchema = z.object({
  eventId: z.uuid(),
  taskId: z.uuid(),
  expected: z.string().min(1),
});

export const dependencySchema = z.object({
  eventId: z.uuid(),
  taskId: z.uuid(),
  dependsOnId: z.uuid(),
});

/** The arguments `tasks_create` and `tasks_set_deadline` take for the chosen kind. */
export const deadlineArgs = (value: { kind: string; deadline: string; daysBefore: string }) =>
  value.kind === "days"
    ? { p_days_before: Number(value.daysBefore) }
    : { p_deadline: value.deadline };
