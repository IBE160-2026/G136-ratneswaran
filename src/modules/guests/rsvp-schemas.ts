import { z } from "zod";
import { controls } from "./schemas";

export const NAME_MAX = 80;
export const NEEDS_MAX = 500;

const reason = (key: string) => `rsvp.errors.${key}`;

/** Trimmed, line breaks as LF, then bounded in code points; `lines` allows LF (a textarea) and no other control. */
const text = (max: number, lines: boolean) =>
  z
    .string()
    .transform((value) => value.replace(/\r\n/g, "\n").trim())
    .refine((value) => [...value].length <= max, reason("tooLong"))
    .refine((value) => controls.test(lines ? value.replaceAll("\n", "") : value), {
      message: reason("invalidCharacters"),
    });

/** The answers of one Guest. A No carries no plus-one and no text, as the database CHECK demands. */
export const rsvpAnswersSchema = z.preprocess(
  // Hidden fields of a No are blanked first, so stale text the Guest cannot see never fails validation.
  (input) =>
    input && typeof input === "object" && (input as { attending?: unknown }).attending === false
      ? { ...input, plusOne: false, plusOneName: "", otherNeeds: "" }
      : input,
  z
    .object({
      attending: z.boolean(),
      plusOne: z.boolean(),
      plusOneName: text(NAME_MAX, false),
      otherNeeds: text(NEEDS_MAX, true),
    })
    .transform((answers) => ({
      ...answers,
      plusOneName: answers.plusOne ? answers.plusOneName : "",
    })),
);

export type RsvpAnswers = z.output<typeof rsvpAnswersSchema>;

/** `expectedUpdatedAt` is the server's string, kept unparsed so no precision is lost. */
export const rsvpInputSchema = z.object({
  eventId: z.uuid(),
  answers: rsvpAnswersSchema,
  expectedUpdatedAt: z.string().max(40).nullable(),
});

/** "Question N of M": a No ends at step 1, so M is 1 then and 3 otherwise (attending, plus-one, needs). */
export const totalSteps = (attending: boolean | null) => (attending === false ? 1 : 3);
