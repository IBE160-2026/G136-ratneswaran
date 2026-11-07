import { describe, expect, it } from "vitest";
import { rsvpAnswersSchema, totalSteps } from "./rsvp-schemas";

const yes = { attending: true, plusOne: true, plusOneName: "  Per  ", otherNeeds: "a\r\nb " };

describe("rsvpAnswersSchema", () => {
  it("trims and keeps line breaks as LF", () => {
    expect(rsvpAnswersSchema.parse(yes)).toEqual({
      attending: true,
      plusOne: true,
      plusOneName: "Per",
      otherNeeds: "a\nb",
    });
  });

  it("clears the plus-one and the texts after a No, and the name without a plus-one", () => {
    expect(rsvpAnswersSchema.parse({ ...yes, attending: false })).toEqual({
      attending: false,
      plusOne: false,
      plusOneName: "",
      otherNeeds: "",
    });
    expect(rsvpAnswersSchema.parse({ ...yes, plusOne: false }).plusOneName).toBe("");
  });

  it("ignores stale invalid hidden text after a No", () => {
    const stale = { ...yes, attending: false, plusOneName: "a".repeat(81), otherNeeds: "x\u0007" };
    expect(rsvpAnswersSchema.safeParse(stale).data).toEqual({
      attending: false,
      plusOne: false,
      plusOneName: "",
      otherNeeds: "",
    });
  });

  it("keeps <script> verbatim", () => {
    expect(rsvpAnswersSchema.parse({ ...yes, otherNeeds: "<script>x</script>" }).otherNeeds).toBe(
      "<script>x</script>",
    );
  });

  it("counts code points, not UTF-16 units", () => {
    expect(rsvpAnswersSchema.safeParse({ ...yes, plusOneName: "😀".repeat(80) }).success).toBe(
      true,
    );
    expect(rsvpAnswersSchema.safeParse({ ...yes, plusOneName: "😀".repeat(81) }).success).toBe(
      false,
    );
    expect(rsvpAnswersSchema.safeParse({ ...yes, otherNeeds: "a".repeat(500) }).success).toBe(true);
    const long = rsvpAnswersSchema.safeParse({ ...yes, otherNeeds: "a".repeat(501) });
    expect(long.error?.issues[0].message).toBe("rsvp.errors.tooLong");
  });

  it("rejects control characters, allowing LF only in the needs", () => {
    expect(rsvpAnswersSchema.safeParse({ ...yes, otherNeeds: "a\u0007" }).success).toBe(false);
    expect(rsvpAnswersSchema.safeParse({ ...yes, otherNeeds: "a b" }).success).toBe(false);
    expect(rsvpAnswersSchema.safeParse({ ...yes, plusOneName: "a\nb" }).success).toBe(false);
    expect(rsvpAnswersSchema.safeParse({ ...yes, otherNeeds: "a\nb" }).success).toBe(true);
  });
});

describe("totalSteps", () => {
  it("is 3 until a No, then 1", () => {
    expect([totalSteps(null), totalSteps(true), totalSteps(false)]).toEqual([3, 3, 1]);
  });
});
