import { describe, expect, it } from "vitest";
import { callSafely, setupPath } from "./save";

describe("callSafely", () => {
  it("passes a result through", async () => {
    expect(await callSafely(async () => ({ ok: true as const, data: null }))).toEqual({
      ok: true,
      data: null,
    });
  });

  it("turns a network failure into the unavailable refusal", async () => {
    const result = await callSafely(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "unavailable", message: "events.wizard.errors.unavailable" },
    });
  });

  it("rethrows a redirect", async () => {
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;push;/x" });
    await expect(
      callSafely(async () => {
        throw redirect;
      }),
    ).rejects.toBe(redirect);
  });
});

describe("setupPath", () => {
  it("opens the Event's setup page", () => {
    expect(setupPath("abc")).toBe("/events/abc/setup");
  });
});
