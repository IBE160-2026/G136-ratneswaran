import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") ? [path] : [];
  });

it("never reads the user with getSession()", () => {
  const offenders = [...files("src"), ...files("app"), "proxy.ts"].filter((path) =>
    readFileSync(path, "utf8").includes("getSession"),
  );
  expect(offenders).toEqual([]);
});

it("never reads providers from raw_app_meta_data (AD-6)", () => {
  const offenders = [...files("src"), ...files("app")].filter((path) =>
    readFileSync(path, "utf8").includes("raw_app_meta_data"),
  );
  expect(offenders).toEqual([]);
});
