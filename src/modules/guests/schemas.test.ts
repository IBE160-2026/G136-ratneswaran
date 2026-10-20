import { describe, expect, it } from "vitest";
import { MAX_GUEST_ROWS, parseGuestRows } from "./schemas";

const reason = (key: string) => `guests.add.reasons.${key}`;

describe("parseGuestRows", () => {
  it("reads comma, tab and semicolon rows and skips blank lines", () => {
    expect(parseGuestRows("Ann Berg, ann@x.no\r\n\n  \rBo\tbo@x.no\nBerg, Cia; cia@x.no")).toEqual({
      valid: [
        { name: "Ann Berg", email: "ann@x.no", line: "Ann Berg, ann@x.no" },
        { name: "Bo", email: "bo@x.no", line: "Bo\tbo@x.no" },
        { name: "Berg, Cia", email: "cia@x.no", line: "Berg, Cia; cia@x.no" },
      ],
      failed: [],
    });
  });

  it("reads the angle form", () => {
    expect(parseGuestRows("Cia Dahl <CIA@x.no>").valid).toEqual([
      { name: "Cia Dahl", email: "CIA@x.no", line: "Cia Dahl <CIA@x.no>" },
    ]);
  });

  it.each([
    ["Dan, dan@", "invalidEmail"],
    ["Dan", "format"],
    [", dan@x.no", "invalidName"],
    [`${"x".repeat(201)}, dan@x.no`, "invalidName"],
    [`Dan, ${"x".repeat(250)}@x.no`, "invalidEmail"],
    ["Ann\tBerg\tann@x.no", "invalidCharacters"],
    ["Ann\u0000, ann@x.no", "invalidCharacters"],
    ["Ann\u2028Berg, ann@x.no", "invalidCharacters"],
    ["Ann\u0085, ann@x.no", "invalidCharacters"],
  ])("fails %j with %s and keeps the others", (line, key) => {
    expect(parseGuestRows(`${line}\nBo, bo@x.no`)).toEqual({
      valid: [{ name: "Bo", email: "bo@x.no", line: "Bo, bo@x.no" }],
      failed: [{ line, reason: reason(key) }],
    });
  });

  it("fails a second row with the same email in any case", () => {
    const { valid, failed } = parseGuestRows("Ann, ann@x.no\nAnn B, ANN@x.no");
    expect(valid.map((row) => row.email)).toEqual(["ann@x.no"]);
    expect(failed).toEqual([{ line: "Ann B, ANN@x.no", reason: reason("duplicate") }]);
  });

  it("fails an email already on the list", () => {
    expect(parseGuestRows("Ann, ANN@x.no", new Set(["ann@x.no"])).failed).toEqual([
      { line: "Ann, ANN@x.no", reason: reason("alreadyListed") },
    ]);
  });

  it("processes the first 200 rows and fails the rest with tooMany", () => {
    const text = Array.from({ length: MAX_GUEST_ROWS + 1 }, (_, i) => `G${i}, g${i}@x.no`).join(
      "\n",
    );
    const { valid, failed } = parseGuestRows(`\n${text}`);
    expect(MAX_GUEST_ROWS).toBe(200);
    expect(valid).toHaveLength(200);
    expect(failed).toEqual([{ line: "G200, g200@x.no", reason: reason("tooMany") }]);
  });
});
