import { expect, test, type Browser, type Page } from "@playwright/test";
import { psql, reseedFlagship } from "./support";

// The flagship 40th birthday of supabase/seed.sql. Core states only: Problems, Decision Tasks and
// Proposed Task cards arrive with Stories 4.8, 4.10-4.14 and Epic 6, and extend this spec then.
const EVENT = "f1a90000-0000-4000-8000-0000000000e1";
const ORGANIZER = "demo.organizer@example.com";
const VENUE_HOLDER = "demo.venue@example.com";
const FOOD_HOLDER = "demo.food@example.com";
const GUESTS_HOLDER = "demo.guests@example.com";
const MARKER = "Seed-needs: parking near the door";

const OTHER_ROLE_TITLES = [
  "Choose caterer",
  "Send menu to caterer",
  "Wait for cake quote",
  "Taste the menu",
  "Book the band",
  "Draft the speeches",
  "Print the programme",
];
const PROPOSED = "Proposed photo booth idea";

test.describe.configure({ mode: "serial" });

// Twice: the seed must be re-runnable.
test.beforeAll(() => {
  reseedFlagship();
  reseedFlagship();
});

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.67.${octet()}.${octet()}` });
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
});

async function logIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("abcdefg1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Create new event" })).toBeVisible();
}

const region = (page: Page, name: RegExp) => page.getByRole("region", { name });
const noPlaceholders = (page: Page) =>
  expect(page.getByText(/Needs your decision|Problem reported/)).toHaveCount(0);
const roleRow = (page: Page, name: string) =>
  page.getByRole("heading", { level: 3, name, exact: true }).locator("xpath=ancestor::li[1]");

test("the Organizer reads the Event's status from the Dashboard and opens a Task from the Timeline", async ({
  page,
}) => {
  await logIn(page, ORGANIZER);
  await page.goto(`/events/${EVENT}`);

  await expect(page.getByRole("heading", { level: 2, name: /^Needs you/ })).toContainText("3");
  const needs = region(page, /^Needs you/).getByRole("link");
  await expect(needs).toHaveCount(3);
  await expect(needs.nth(0)).toContainText("Send menu to caterer");
  await expect(needs.nth(0)).toContainText("Overdue 6 days");
  await expect(needs.nth(1)).toContainText("Print the programme");
  await expect(needs.nth(1)).toContainText("Overdue 2 days");
  await expect(needs.nth(2)).toContainText("Agree catering access");

  await expect(page.getByRole("heading", { level: 2, name: /^At risk/ })).toContainText(
    "2 at risk",
  );
  const risk = region(page, /^At risk/).getByRole("link");
  await expect(risk).toHaveCount(2);
  await expect(risk.nth(0)).toContainText("Wait for cake quote");
  await expect(risk.nth(0)).toContainText("Waiting on external");
  await expect(risk.nth(1)).toContainText("Set up stage");
  await expect(risk.nth(1)).toContainText("Waits for: Order tables");

  await expect(roleRow(page, "Venue")).toContainText("1 done");
  await expect(roleRow(page, "Venue")).toContainText("4 open");
  await expect(roleRow(page, "Venue")).toContainText("0 overdue");
  await expect(roleRow(page, "Food & Beverage")).toContainText("1 done");
  await expect(roleRow(page, "Food & Beverage")).toContainText("3 open");
  await expect(roleRow(page, "Food & Beverage")).toContainText("1 overdue");
  await expect(roleRow(page, "Entertainment")).toContainText("Ida Invited");
  await expect(roleRow(page, "Entertainment")).toContainText("Invited · not joined yet");
  await expect(roleRow(page, "Program")).toContainText("2 open");
  await expect(roleRow(page, "Program")).toContainText("1 overdue");
  await expect(roleRow(page, "Guests")).toContainText("Gwen Guests");
  await expect(roleRow(page, "Guests")).toContainText("0 open");
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(5);

  await expect(page.getByText(PROPOSED)).toHaveCount(0);
  await noPlaceholders(page);

  await page.goto(`/events/${EVENT}/timeline`);
  const timeline = page.getByRole("region", { name: "Timeline" });
  for (const role of ["Venue", "Food & Beverage", "Entertainment", "Program", "Guests"]) {
    await expect(timeline.getByRole("list", { name: role, exact: true })).toBeVisible();
  }
  await expect(timeline.getByRole("list", { name: "Travel & Logistics", exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText(PROPOSED)).toHaveCount(0);
  await noPlaceholders(page);

  await timeline.getByRole("link", { name: /^Book the band/ }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${EVENT}/tasks/`));
});

test("the Venue holder sees own Tasks first and no other Role's Task title anywhere", async ({
  page,
}) => {
  await logIn(page, VENUE_HOLDER);
  await page.goto(`/events/${EVENT}`);

  const needs = region(page, /^Needs you/).getByRole("link");
  await expect(needs).toHaveCount(1);
  await expect(needs.first()).toContainText("Agree catering access");
  await expect(needs.first()).toContainText("Not yet accepted");
  await expect(
    region(page, /^At risk/)
      .getByRole("link")
      .first(),
  ).toContainText("Set up stage");
  for (const role of ["Food & Beverage", "Entertainment", "Program", "Guests"]) {
    await expect(roleRow(page, role)).toContainText(`Tasks in ${role} are visible to its team.`);
  }

  await page.goto(`/events/${EVENT}/timeline`);
  const timeline = page.getByRole("region", { name: "Timeline" });
  await expect(timeline.getByRole("list", { name: "Venue", exact: true })).toBeVisible();
  await expect(timeline.getByRole("link", { name: /^Reserve chairs/ })).toBeVisible();
  await expect(timeline.getByText(/^Tasks in .* are visible to its team\.$/)).toHaveCount(4);
  await expect(timeline.getByRole("list", { name: "Program", exact: true })).toHaveCount(0);

  const pages = [
    `/events/${EVENT}`,
    `/events/${EVENT}/timeline`,
    `/events/${EVENT}/timeline?view=list`,
    `/events/${EVENT}/my-tasks`,
  ];
  for (const path of pages) {
    await page.goto(path);
    for (const title of [...OTHER_ROLE_TITLES, PROPOSED]) {
      await expect(page.getByText(title)).toHaveCount(0);
    }
    await noPlaceholders(page);
  }
});

// Story 7.10: the 80 seeded guests. Read-only tests come first; the last test deletes a guest, so it runs last.
const SUMMARY = {
  Invited: "80",
  Coming: "32",
  "Not coming": "8",
  "Not answered": "40",
  Headcount: "44",
};
const guestRow = (page: Page, name: string) => page.getByRole("listitem").filter({ hasText: name });

async function readSummary(page: Page) {
  await page.goto(`/events/${EVENT}`);
  const table = page.getByRole("table", { name: "RSVP summary" });
  for (const [label, count] of Object.entries(SUMMARY)) {
    await expect(
      table.getByRole("row", { name: new RegExp(`^${label}`) }).getByRole("cell"),
    ).toHaveText(count);
  }
}

for (const [who, email] of [
  ["the Organizer", ORGANIZER],
  ["the Guests Role holder", GUESTS_HOLDER],
] as const) {
  test(`${who} reads the seeded RSVP state and the summary`, async ({ page }) => {
    await logIn(page, email);
    await readSummary(page);

    await page.goto(`/events/${EVENT}/guests`);
    await expect(page.getByRole("heading", { level: 2, name: "80 guests" })).toBeVisible();
    await expect(guestRow(page, "Seed Guest 41")).toContainText("Coming");
    await expect(guestRow(page, "Seed Guest 41")).toContainText(`Other needs: ${MARKER}`);
    await expect(guestRow(page, "Seed Guest 61")).toContainText("Plus-one: Seed Plus-one 61");
    await expect(guestRow(page, "Seed Guest 67")).toContainText("Brings a plus-one");
    await expect(guestRow(page, "Seed Guest 73")).toContainText("Not coming");
    await expect(guestRow(page, "Seed Guest 31")).toContainText("Opened");
    await expect(guestRow(page, "Seed Guest 16")).toContainText("Link copied · not opened");
    await expect(guestRow(page, "Seed Guest 01")).toContainText("Not invited yet");

    // Only the Organizer sees an email.
    const emails = page.getByText(/seed\.guest\.\d+@example\.com/);
    if (email === ORGANIZER) {
      await expect(emails.first()).toBeVisible();
    } else {
      await expect(emails).toHaveCount(0);
      expect(await page.content()).not.toMatch(/seed\.guest\.\d+@example\.com/);
    }
  });
}

test("the Venue holder has no Guests tab, sees only the expected count, and never the other needs", async ({
  page,
}) => {
  await logIn(page, VENUE_HOLDER);
  await page.goto(`/events/${EVENT}`);
  await expect(
    page.getByRole("navigation", { name: "Main" }).first().getByRole("link", { name: "Guests" }),
  ).toHaveCount(0);
  await expect(page.getByText("80 guests expected")).toBeVisible();
  await expect(page.getByRole("table", { name: "RSVP summary" })).toHaveCount(0);
  await page.goto(`/events/${EVENT}/guests`);
  await expect(
    page.getByRole("heading", { name: "You don't have access to this part of the event." }),
  ).toBeVisible();
});

const taskIds = () =>
  psql(`select id from public.tasks where event_id = '${EVENT}'`).trim().split("\n");

for (const [who, email] of [
  ["Venue", VENUE_HOLDER],
  ["Food", FOOD_HOLDER],
] as const) {
  test(`the marker other-needs text appears on no page of the ${who} holder`, async ({ page }) => {
    // Twenty-one pages, each rendered on demand by the dev server.
    test.setTimeout(180_000);
    const ids = taskIds();
    expect(ids).toHaveLength(13);
    const paths = [
      "",
      "/tasks",
      "/my-tasks",
      "/timeline",
      "/timeline?view=list",
      "/team",
      "/settings",
      "/guests",
      ...ids.map((id) => `/tasks/${id}`),
    ];
    await logIn(page, email);
    for (const path of paths) {
      await page.goto(`/events/${EVENT}${path}`);
      expect(await page.content(), path).not.toContain(MARKER);
      expect(await page.locator("body").innerText(), path).not.toContain(MARKER);
      expect(await page.content(), path).not.toMatch(/seed\.guest\.\d+@example/);
    }
  });
}

/** A seeded guest's personal link, built from the seeded token the way *Copy link* does. */
const linkOf = (n: number) => {
  const suffix = String(n).padStart(4, "0");
  const token = psql(
    `select public.invite_tokens_guest_link('${EVENT}', 'f1a90000-0000-4000-8000-00000002${suffix}', false)`,
  ).trim();
  return `http://localhost:3000/api/invite/${token}`;
};

const phoneBrowser = async (browser: Browser) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return (
    await browser.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: { "x-forwarded-for": `198.68.${octet()}.${octet()}` },
      viewport: { width: 375, height: 812 },
    })
  ).newPage();
};

test("a link replaced by New link shows the expired page, naming the Organizer and not the Event", async ({
  page,
  browser,
}) => {
  const oldLink = linkOf(25);
  await logIn(page, ORGANIZER);
  await page.goto(`/events/${EVENT}/guests`);
  await page.getByRole("button", { name: "Share Seed Guest 25's link" }).click();
  await page.getByRole("menuitem", { name: "New link" }).click();
  await page.getByRole("button", { name: "Make new link" }).click();
  await expect(page.getByText("New link for Seed Guest 25 copied.")).toBeVisible();

  const stranger = await phoneBrowser(browser);
  await stranger.goto(oldLink);
  await expect(
    stranger.getByText("This link is no longer active. Ask Olga Organizer for a new one."),
  ).toBeVisible();
  await expect(stranger.getByText("Demo 40th Birthday")).toHaveCount(0);
  await expect(stranger.getByRole("button", { name: "Continue" })).toHaveCount(0);
});

// Scoped to the seeded guests: other specs sign users up in parallel, so a global count would race.
const passwordUsers = () =>
  psql(
    "select count(*) from auth.users where email like 'seed.guest.%' and encrypted_password <> ''",
  ).trim();

test("a seeded Guest answers, changes the answer and deletes their data at 375px, with no account created", async ({
  page,
  browser,
}) => {
  const before = passwordUsers();
  const guest = await phoneBrowser(browser);
  await guest.goto(linkOf(20));
  await guest.getByRole("button", { name: "Continue" }).click();
  await expect(guest.getByRole("heading", { name: "Will you be there?" })).toBeFocused();

  await guest.getByLabel("Yes, I'll be there").check();
  await guest.getByRole("button", { name: "Next", exact: true }).click();
  await guest.getByLabel("Yes, I'm bringing someone").check();
  await guest.getByRole("button", { name: "Next", exact: true }).click();
  await guest.getByLabel("Other needs").fill("Seed-flow: a ramp, please");
  await guest.getByRole("button", { name: "Send my answer" }).click();
  await expect(
    guest.getByRole("heading", {
      name: "You're on the list, Seed! We'll send the details closer to the day.",
    }),
  ).toBeVisible();

  await guest.goto(`/rsvp/${EVENT}`);
  await expect(guest.getByText("Seed-flow: a ramp, please")).toBeVisible();
  await guest.getByRole("button", { name: "Change my answer" }).click();
  await guest.getByLabel("No, I can't make it").check();
  await guest.getByRole("button", { name: "Send my answer" }).click();
  await expect(
    guest.getByRole("heading", { name: "Thanks for letting us know, Seed." }),
  ).toBeVisible();
  expect(await guest.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  await guest.getByRole("button", { name: "Delete my data" }).click();
  await guest
    .getByRole("dialog", { name: "Delete your data for Demo 40th Birthday?" })
    .getByRole("button", { name: "Delete my data" })
    .click();
  await expect(guest.getByRole("heading", { name: "Your data has been deleted." })).toBeFocused();
  expect(passwordUsers()).toBe(before);

  await logIn(page, ORGANIZER);
  await page.goto(`/events/${EVENT}/guests`);
  await expect(page.getByRole("heading", { level: 2, name: "79 guests" })).toBeVisible();
  await expect(page.getByText("Seed Guest 20", { exact: true })).toHaveCount(0);
});
