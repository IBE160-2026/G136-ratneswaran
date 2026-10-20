import { refuse, type Result } from "@/lib/result";

/** Where a draft opens: step 1. A later story may open the first incomplete step instead. */
export const setupPath = (eventId: string) => `/events/${eventId}/setup`;

/**
 * Runs a Server Action from the client. A network failure rejects the call, which would reach the error
 * boundary and drop the form, so it becomes the same refusal the action returns for a failed save.
 */
export async function callSafely<T>(run: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await run();
  } catch (error) {
    // redirect() and notFound() travel as errors with a NEXT_ digest and must reach Next.
    const digest = (error as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_")) throw error;
    return refuse("unavailable", "events.wizard.errors.unavailable");
  }
}
