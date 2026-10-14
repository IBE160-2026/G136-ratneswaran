import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ overrideConfigFile: "eslint.config.mjs" });

async function ad5Errors(code: string) {
  const [result] = await eslint.lintText(code, { filePath: "src/components/sample.tsx" });
  return result.messages.filter((m) => m.ruleId === "arrangly/no-server-env-in-client");
}

const client = (body: string) => `"use client";\n${body}\n`;

describe("AD-5 lint guard", () => {
  it.each([
    [
      "server section import",
      'import { getServerEnv } from "@/lib/env";\nexport const a = getServerEnv;',
    ],
    ["namespace import", 'import * as env from "./env.ts";\nexport const a = env;'],
    ["re-export", 'export { getServerEnv } from "@/lib/env";'],
    ["dynamic import", 'export const a = () => import("@/lib/env");'],
    ["member access", "export const a = process.env.SUPABASE_SECRET_KEY;"],
    [
      "destructuring",
      "const { SUPABASE_SECRET_KEY } = process.env;\nexport const a = SUPABASE_SECRET_KEY;",
    ],
    ["string key", 'export const a = process.env["SUPABASE_SECRET_KEY"];'],
  ])("fails a client component: %s", async (_name, body) => {
    expect((await ad5Errors(client(body))).length).toBeGreaterThan(0);
  });

  it("allows the client section in a client component", async () => {
    expect(
      await ad5Errors(
        client('import { clientEnv } from "@/lib/env";\nexport const a = clientEnv;'),
      ),
    ).toEqual([]);
  });

  it("allows the server section outside client components", async () => {
    expect(
      await ad5Errors('import { getServerEnv } from "@/lib/env";\nexport const a = getServerEnv;'),
    ).toEqual([]);
  });
});
