import { z } from "zod";

const LEGACY_NAMES = [
  "ANON_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
});

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  AI_LIVE: z.enum(["true", "false"]).optional(),
});

type Source = Record<string, string | undefined>;

function failOnLegacy(source: Source) {
  const found = LEGACY_NAMES.filter((name) => source[name] !== undefined);
  if (found.length > 0) {
    throw new Error(
      `Legacy environment variable(s) not allowed: ${found.join(", ")}. Use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY.`,
    );
  }
}

function parse<T extends z.ZodType>(schema: T, source: Source): z.infer<T> {
  failOnLegacy(source);
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment variable(s): ${names}`);
  }
  return result.data;
}

export const parseClientEnv = (source: Source) => parse(clientSchema, source);

export const parseServerEnv = (source: Source) => parse(serverSchema, source);

// Next.js inlines only literal `process.env.NEXT_PUBLIC_*` reads, so the client
// section cannot be handed `process.env` as a whole.
export const clientEnv = () =>
  parseClientEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  });

/** Server section: never import from a client component (AD-5, lint-enforced). */
export const getServerEnv = () => ({ ...clientEnv(), ...parseServerEnv(process.env) });
