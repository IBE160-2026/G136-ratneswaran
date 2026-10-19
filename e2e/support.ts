import { execFileSync } from "node:child_process";
import { expect, type APIRequestContext, type Page } from "@playwright/test";

const MAILPIT = "http://127.0.0.1:54324/api/v1";

export const unique = () =>
  `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

export async function mailLink(request: APIRequestContext, email: string, count = 1) {
  let id = "";
  await expect
    .poll(async () => {
      const res = await request.get(`${MAILPIT}/search`, { params: { query: `to:${email}` } });
      const body = await res.json();
      id = body.messages?.[0]?.ID ?? "";
      return body.messages_count;
    })
    .toBe(count);
  const message = await (await request.get(`${MAILPIT}/message/${id}`)).json();
  return /https?:\/\/[^\s"<>]+/.exec(message.Text.replace(/&amp;/g, "&"))![0];
}

export async function signUp(page: Page, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your inbox to verify your email.")).toBeVisible();
}

export async function confirmed(page: Page, request: APIRequestContext, password = "abcdefg1") {
  const email = unique();
  await signUp(page, email, password);
  await page.goto(await mailLink(request, email));
  return email;
}

/** Runs SQL as postgres on the local database; callers only interpolate generated values. */
export function psql(sql: string) {
  return execFileSync(
    "docker",
    ["exec", "supabase_db_Arrangly", "psql", "-U", "postgres", "-At", "-F", "|", "-c", sql],
    { encoding: "utf8" },
  );
}
