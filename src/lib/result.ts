import type { ZodError } from "zod";

export type Result<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: string; message: string; fields?: Partial<Record<string, string>> };
    };

export const refuse = (code: string, message: string, fields?: Record<string, string>) =>
  ({ ok: false, error: { code, message, fields } }) as const;

export const fieldErrors = (error: ZodError) => {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[String(issue.path[0])] ??= issue.message;
  return fields;
};
