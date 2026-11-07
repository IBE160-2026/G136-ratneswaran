import { expect, test, type Page } from "@playwright/test";
import { reseedFlagship } from "./support";

// The flagship 40th birthday of supabase/seed.sql. Core states only: Problems, Decision Tasks and
// Proposed Task cards arrive with Stories 4.8, 4.10-4.14 and Epic 6, and extend this spec then.
const EVENT = "f1a90000-0000-4000-8000-0000000000e1";
const ORGANIZER = "demo.organizer@example.com";
const VENUE_HOLDER = "demo.venue@example.com";

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
  await expect(page.getByRole("heading", { level: 3 })).toHaveCount(4);

  await expect(page.getByText(PROPOSED)).toHaveCount(0);
  await noPlaceholders(page);

  await page.goto(`/events/${EVENT}/timeline`);
  const timeline = page.getByRole("region", { name: "Timeline" });
  for (const role of ["Venue", "Food & Beverage", "Entertainment", "Program"]) {
    await expect(timeline.getByRole("list", { name: role, exact: true })).toBeVisible();
  }
  for (const off of ["Guests", "Travel & Logistics"]) {
    await expect(timeline.getByRole("list", { name: off, exact: true })).toHaveCount(0);
  }
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
  for (const role of ["Food & Beverage", "Entertainment", "Program"]) {
    await expect(roleRow(page, role)).toContainText(`Tasks in ${role} are visible to its team.`);
  }

  await page.goto(`/events/${EVENT}/timeline`);
  const timeline = page.getByRole("region", { name: "Timeline" });
  await expect(timeline.getByRole("list", { name: "Venue", exact: true })).toBeVisible();
  await expect(timeline.getByRole("link", { name: /^Reserve chairs/ })).toBeVisible();
  await expect(timeline.getByText(/^Tasks in .* are visible to its team\.$/)).toHaveCount(3);
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
