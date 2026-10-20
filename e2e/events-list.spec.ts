import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { confirmed, psql, unique } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.57.${octet()}.${octet()}` });
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

type Seed = { name: string; starts?: string; published?: boolean; cancelled?: boolean };

/**
 * Inserts an Event the app cannot make yet (publish is Story 2.8, cancel 2.7). `starts` is a SQL
 * interval from now. Names are literals from this file and emails come from `unique()`, so neither holds a quote.
 */
function seed(email: string, { name, starts, published = false, cancelled = false }: Seed) {
  const at = starts ? `now() + interval '${starts}'` : "null::timestamptz";
  return psql(`insert into public.events
      (organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at)
    select id, '${name}', ${at}, ${at} + interval '4 hours', 'Europe/Oslo', 'en',
      ${published ? "now()" : "null"}, ${cancelled ? "now()" : "null"}
    from auth.users where email = '${email}' returning id`).split("\n")[0];
}

const card = (page: Page, name: string) =>
  page.getByRole("link", { name: new RegExp(`^${name} `) });

test("cards sort by date, Create is last, and past and cancelled Events sit under Past events", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  seed(email, { name: "Spring party", starts: "30 days", published: true });
  seed(email, { name: "Book club", starts: "7 days", published: true });
  seed(email, { name: "Plan C" });
  seed(email, { name: "Plan B" });
  seed(email, { name: "Old reunion", starts: "-365 days", published: true });
  seed(email, { name: "Called off", starts: "60 days", published: true, cancelled: true });
  seed(email, { name: "Missed it", starts: "-2 days" });
  await page.goto("/events");

  const upcoming = page.locator("main ul").first().getByRole("listitem");
  await expect(upcoming).toHaveText([
    /^Book club/,
    /^Spring party/,
    /^Plan B/,
    /^Plan C/,
    /Create new event/,
  ]);
  await expect(card(page, "Book club")).toHaveAccessibleName(/^Book club \S.* · Organizer$/);
  await expect(card(page, "Plan B")).toHaveAccessibleName(
    "Plan B Organizer Draft · continue setup",
  );
  await expect(card(page, "Plan B")).toHaveAttribute("href", /\/events\/[0-9a-f-]+\/setup$/);
  await expect(page.getByText("Let's plan something.")).toBeHidden();

  await page.getByText("Past events (3)").click();
  const past = page.locator("details").getByRole("listitem");
  await expect(past).toHaveText([/^Called off.*Cancelled$/, /^Missed it/, /^Old reunion/]);
  await expect(card(page, "Old reunion")).not.toHaveAccessibleName(/Draft/);
  // A past draft stays editable, so a mistyped date can be fixed.
  await expect(card(page, "Missed it")).toHaveAccessibleName(/Draft · continue setup$/);
  await expect(card(page, "Missed it")).toHaveAttribute("href", /\/setup$/);
});

test("with no Events the Create card is the only card", async ({ page, request }) => {
  await signedIn(page, request);
  await expect(page.getByText("Let's plan something.")).toBeVisible();
  await expect(page.locator("main").getByRole("listitem")).toHaveCount(1);
  await expect(page.locator("details")).toHaveCount(0);
});

test("a published card opens the Event home, and the event group reaches the questionnaire", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const id = seed(email, { name: "Book club", starts: "7 days", published: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/events");
  await card(page, "Book club").click();

  await expect(page).toHaveURL(new RegExp(`/events/${id}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Book club" })).toBeVisible();
  await expect(page.getByText("Published", { exact: true })).toBeVisible();
  await expect(page).toHaveTitle("Overview – Book club – Arrangly");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Questionnaire" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${id}/setup$`));
});

test("past published and cancelled Events are read-only, a past draft is not", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const over = seed(email, { name: "Old reunion", starts: "-365 days", published: true });
  const off = seed(email, {
    name: "Called off",
    starts: "60 days",
    published: true,
    cancelled: true,
  });
  const draft = seed(email, { name: "Missed it", starts: "-2 days" });
  const dropped = seed(email, { name: "Dropped draft", starts: "30 days", cancelled: true });

  await page.goto(`/events/${over}/setup`);
  await expect(page).toHaveURL(new RegExp(`/events/${over}$`));
  await page.goto(`/events/${off}/setup`);
  await expect(page).toHaveURL(new RegExp(`/events/${off}$`));
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(page.getByText("Published", { exact: true })).toHaveCount(0);

  await page.goto(`/events/${dropped}/setup`);
  await expect(page).toHaveURL(new RegExp(`/events/${dropped}$`));
  for (const id of [over, off]) {
    await page.goto(`/events/${id}/setup/description`);
    await expect(page).toHaveURL(new RegExp(`/events/${id}$`));
  }

  await page.goto(`/events/${draft}/setup`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Tell us about your event" }),
  ).toBeVisible();
});

test("another user's or an unknown Event shows no access and no data", async ({
  page,
  request,
}) => {
  const other = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${other}')`);
  const id = seed(other, { name: "Secret plans", starts: "7 days" });
  await signedIn(page, request);
  for (const path of [`/events/${id}`, `/events/${id}/setup`, "/events/not-an-id"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "You don't have access to this part of the event." }),
    ).toBeVisible();
    await expect(page.getByText("Secret plans")).toHaveCount(0);
  }
});

test("on a phone the menu closes on navigation and focus moves to the h1", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const id = seed(email, { name: "Book club", starts: "7 days", published: true });
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto(`/events/${id}`);
  await expect(page.getByRole("heading", { level: 1, name: "Book club" })).toBeVisible();
  await page.getByRole("button", { name: "Menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Questionnaire" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("heading", { level: 1, name: "Tell us about your event" }),
  ).toBeFocused();
});
