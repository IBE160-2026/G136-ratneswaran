import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { answerStep1, confirmed, psql, unique } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.58.${octet()}.${octet()}` });
});

async function signedIn(page: Page, request: APIRequestContext) {
  const email = await confirmed(page, request);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("abcdefg1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Create new event" })).toBeVisible();
  return email;
}

/** Answers step 1 for `eventType` on the open setup page and saves it. */
async function saveType(page: Page, eventType: string) {
  await answerStep1(page, eventType);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/\/events\?saved=1$/);
}

/**
 * An Event with all pool Roles switched off, dated `starts` from now, that the app cannot make yet
 * (publish is 2.8). Emails come from `unique()`, so no value holds a quote.
 */
function seed(email: string, starts: string, published = true) {
  const id = psql(`insert into public.events
      (organizer_id, name, starts_at, ends_at, time_zone, language, published_at)
    select id, 'Seeded', now() + interval '${starts}', now() + interval '${starts}' + interval '4 hours',
      'Europe/Oslo', 'en', ${published ? "now()" : "null"}
    from auth.users where email = '${email}' returning id`).split("\n")[0];
  psql(`insert into public.roles (event_id, key)
    select '${id}', k from unnest(enum_range(null::public.role_key)) as k`);
  return id;
}

const roleSwitch = (page: Page, name: string) => page.getByRole("switch", { name, exact: true });

test("the event type activates its Roles, and a Role the Organizer switched keeps its state", async ({
  page,
  request,
}) => {
  await signedIn(page, request);
  await page.getByRole("button", { name: "Create new event" }).click();
  await expect(page).toHaveURL(/\/setup$/);
  const team = page.url().replace(/\/setup$/, "/team");
  await saveType(page, "birthday");

  await page.goto(team);
  await expect(page).toHaveTitle(/^Team & Roles – /);
  for (const name of ["Venue", "Guests", "Food & Beverage", "Entertainment", "Program"]) {
    await expect(roleSwitch(page, name)).toBeChecked();
  }
  await expect(roleSwitch(page, "Travel & Logistics")).not.toBeChecked();

  // By keyboard: the switch keeps focus while it saves.
  await roleSwitch(page, "Program").focus();
  await page.keyboard.press("Space");
  await expect(roleSwitch(page, "Program")).not.toBeChecked();
  await expect(roleSwitch(page, "Program")).toBeFocused();
  await expect(roleSwitch(page, "Program")).toHaveAccessibleDescription(
    "Speeches and the run of show Suggested: on",
  );
  await page.reload();
  await expect(roleSwitch(page, "Program")).not.toBeChecked();
  await expect(page.locator("main").getByRole("listitem")).toHaveText([
    /^Venue/,
    /^Guests/,
    /^Food & Beverage/,
    /^Entertainment/,
    /^Travel & Logistics/,
    /^Program/,
  ]);

  await page.goto(team.replace(/\/team$/, "/setup"));
  await saveType(page, "seminar");
  await page.goto(team);
  await expect(roleSwitch(page, "Entertainment")).not.toBeChecked();
  await expect(roleSwitch(page, "Travel & Logistics")).toBeChecked();
  await expect(roleSwitch(page, "Program")).not.toBeChecked();
  await expect(roleSwitch(page, "Program")).toHaveAccessibleDescription(
    "Speakers and talks Suggested: on",
  );
});

test("Team & Roles is in the event group", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/events/${id}`);
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Team & Roles" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/events/${id}/team$`));
  await expect(page.getByRole("heading", { level: 1, name: "Team & Roles" })).toBeVisible();
  await expect(page.getByRole("switch")).toHaveCount(6);
  for (const toggle of await page.getByRole("switch").all()) await expect(toggle).toBeEnabled();
});

test("a published past Event's Roles are read-only, a past draft's are not", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const over = seed(email, "-30 days");
  const draft = seed(email, "-30 days", false);
  await page.goto(`/events/${over}/team`);
  await expect(page.getByText("This event is over or cancelled")).toBeVisible();
  await expect(page.getByRole("switch")).toHaveCount(6);
  for (const toggle of await page.getByRole("switch").all()) await expect(toggle).toBeDisabled();

  await page.goto(`/events/${draft}/team`);
  await expect(page.getByRole("switch")).toHaveCount(6);
  for (const toggle of await page.getByRole("switch").all()) await expect(toggle).toBeEnabled();
});

test("a failed switch falls back and says so", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  await page.goto(`/events/${id}/team`);
  await expect(roleSwitch(page, "Venue")).not.toBeChecked();
  await page.context().setOffline(true);
  await roleSwitch(page, "Venue").click();
  await expect(page.getByRole("alert").filter({ hasText: "Couldn't save" })).toBeVisible();
  await expect(roleSwitch(page, "Venue")).not.toBeChecked();
  await page.context().setOffline(false);
});

test("another user's Team & Roles shows no access", async ({ page, request }) => {
  const other = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${other}')`);
  const id = seed(other, "7 days");
  await signedIn(page, request);
  await page.goto(`/events/${id}/team`);
  await expect(
    page.getByRole("heading", { name: "You don't have access to this part of the event." }),
  ).toBeVisible();
  await expect(page.getByRole("switch")).toHaveCount(0);
});
