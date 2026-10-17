import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import nb from "../../messages/nb.json";
import { resolveLocale } from "./locale";

const keys = (obj: object, prefix = ""): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

describe("resolveLocale", () => {
  it.each([
    ["nb-NO,en;q=0.8", "nb"],
    ["nn", "nb"],
    ["no", "nb"],
    ["en-GB", "en"],
    ["de,nb;q=0.5", "en"],
    ["", "en"],
    [null, "en"],
  ])("%s -> %s", (header, expected) => {
    expect(resolveLocale(header)).toBe(expected);
  });
});

describe("resolveLocale with a saved language", () => {
  it.each([
    ["en-GB", "nb", "nb"],
    ["nb-NO", "en", "en"],
    ["nb-NO", "auto", "nb"],
    ["en-GB", undefined, "en"],
    ["nb-NO", "fr", "nb"],
  ])("%s + %s -> %s", (header, saved, expected) => {
    expect(resolveLocale(header, saved)).toBe(expected);
  });
});

describe("message files", () => {
  it("have identical keys", () => {
    expect(keys(nb).sort()).toEqual(keys(en).sort());
  });
});
