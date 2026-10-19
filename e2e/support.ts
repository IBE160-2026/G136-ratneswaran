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

/** Fills wizard step 1 with valid answers for the given event type. */
export async function answerStep1(page: Page, eventType = "birthday") {
  await page.getByLabel("What kind of event is it?").selectOption(eventType);
  await page.getByLabel("Date and time").fill("2027-06-01T18:00");
  await page.getByLabel("Time zone").selectOption("Europe/Oslo");
  await page.getByLabel("How long will it last (hours)?").fill("4");
  await page.getByLabel("How many guests?").fill("80");
  await page.getByRole("radiogroup", { name: "Do you have a venue?" }).getByLabel("Yes").check();
  await page
    .getByRole("radiogroup", { name: "Do you want guests to reply (RSVP)?" })
    .getByLabel("No", { exact: true })
    .check();
  await page
    .getByRole("radiogroup", { name: "How will you build the guest list?" })
    .getByLabel("Add them by hand")
    .check();
}

/** Signs up, confirms and logs in a new user on All events. */
export async function signedIn(page: Page, request: APIRequestContext) {
  const email = await confirmed(page, request);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("abcdefg1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Create new event" })).toBeVisible();
  return email;
}

/**
 * An Event with all pool Roles switched off, dated `starts` from now, that the app cannot make yet
 * (publish is 2.8). Emails come from `unique()`, so no value holds a quote.
 */
export function seed(email: string, starts: string, published = true) {
  const id = psql(`insert into public.events
      (organizer_id, name, starts_at, ends_at, time_zone, language, published_at)
    select id, 'Seeded', now() + interval '${starts}', now() + interval '${starts}' + interval '4 hours',
      'Europe/Oslo', 'en', ${published ? "now()" : "null"}
    from auth.users where email = '${email}' returning id`).split("\n")[0];
  psql(`insert into public.roles (event_id, key)
    select '${id}', k from unnest(enum_range(null::public.role_key)) as k`);
  return id;
}
