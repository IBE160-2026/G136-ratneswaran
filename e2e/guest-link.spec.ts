import { expect, test, type Browser, type Page } from "@playwright/test";
import { psql, seed, signedIn } from "./support";

// Limiter buckets are per IP and shared by every test, so give each browser its own.
const ip = () => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return { "x-forwarded-for": `198.61.${octet()}.${octet()}` };
};

test.beforeEach(async ({ page }) => {
  await page.context().setExtraHTTPHeaders(ip());
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
});

/** A second browser for the guest, with its own cookies, at phone width. */
const guestBrowser = async (browser: Browser) =>
  (
    await browser.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: ip(),
      viewport: { width: 375, height: 812 },
    })
  ).newPage();

/** An Event of a new Organizer with two guests, on its Guests page. */
async function guestsPage(page: Page, request: Parameters<typeof signedIn>[1]) {
  const organizer = await signedIn(page, request);
  const id = seed(organizer, "7 days");
  const stamp = Date.now();
  psql(`with g as (insert into public.guests (event_id, name) values
      ('${id}', 'Ann Berg'), ('${id}', 'Bo Lie') returning id, name)
    insert into public.guest_contacts (guest_id, event_id, email)
    select id, '${id}', lower(split_part(name, ' ', 1)) || '-${stamp}@example.com' from g`);
  await page.goto(`/events/${id}/guests`);
  return id;
}

const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

async function copyLink(page: Page, name: string) {
  await page.getByRole("button", { name: `Share ${name}'s link` }).click();
  await page.getByRole("menuitem", { name: "Copy link" }).click();
  await expect(page.getByText(`Link for ${name} copied.`)).toBeVisible();
  return clipboard(page);
}

test("the Organizer copies a link and the guest opens it", async ({ page, request, browser }) => {
  await guestsPage(page, request);
  const row = page.getByRole("listitem").filter({ hasText: "Ann Berg" });
  await expect(row.getByText("Not invited yet")).toBeVisible();

  const link = await copyLink(page, "Ann Berg");
  expect(link).toMatch(/^http:\/\/localhost:3000\/api\/invite\/[A-Za-z0-9_-]{43}$/);
  await expect(row.getByText("Link copied · not opened")).toBeVisible();
  expect(await copyLink(page, "Ann Berg")).toBe(link);

  const guest = await guestBrowser(browser);
  await guest.goto(link);
  await expect(guest).toHaveURL("http://localhost:3000/invite");
  await expect(
    guest.getByRole("heading", { name: "Hi Ann, this is your invitation to Seeded." }),
  ).toBeVisible();
  await expect(guest.getByText("Not Ann? Ask the organizer for your own link.")).toBeVisible();
  await guest.getByRole("button", { name: "Continue" }).click();
  await expect(guest.getByText("You're logged in with your invitation.")).toBeVisible();

  await page.reload();
  await expect(row.getByText("Opened")).toBeVisible();

  // New link: the old one stops working.
  await page.getByRole("button", { name: "Share Ann Berg's link" }).click();
  await page.getByRole("menuitem", { name: "New link" }).click();
  await page.getByRole("button", { name: "Make new link" }).click();
  await expect(page.getByText("New link for Ann Berg copied.")).toBeVisible();
  const renewed = await clipboard(page);
  expect(renewed).not.toBe(link);

  const stranger = await guestBrowser(browser);
  await stranger.goto(link);
  await expect(
    stranger.getByText("This link is no longer active. Ask the organizer for a new one."),
  ).toBeVisible();
  await expect(stranger.getByRole("button", { name: "Continue" })).toHaveCount(0);
});

test("the invitation text and all links are copied", async ({ page, request }) => {
  await guestsPage(page, request);
  await page.getByRole("button", { name: "Share Bo Lie's link" }).click();
  await page.getByRole("menuitem", { name: "Copy invitation text" }).click();
  await expect(page.getByText("Invitation text for Bo Lie copied.")).toBeVisible();
  expect(await clipboard(page)).toMatch(
    /^Hi Bo! You're invited to Seeded on .+\. Open your personal invitation here: http:\/\/localhost:3000\/api\/invite\/[A-Za-z0-9_-]{43}$/,
  );

  await page.getByRole("button", { name: "Copy all links" }).click();
  await expect(page.getByText(/^2 links copied\./)).toBeVisible();
  const lines = (await clipboard(page)).split("\n");
  expect(lines).toHaveLength(2);
  expect(lines[0]).toMatch(
    /^Ann Berg\tann-\d+@example\.com\thttp:\/\/localhost:3000\/api\/invite\//,
  );
  await expect(page.getByText("Link copied · not opened")).toHaveCount(2);
});

test("a cancelled Event's link is read-only and an unknown link says nothing", async ({
  page,
  request,
  browser,
}) => {
  const id = await guestsPage(page, request);
  const link = await copyLink(page, "Ann Berg");
  psql(`update public.events set cancelled_at = now(), cancellation_note = 'Rain, sorry.'
    where id = '${id}'`);

  const guest = await guestBrowser(browser);
  await guest.goto(link);
  await expect(guest.getByText("This event has been cancelled.")).toBeVisible();
  await expect(guest.getByText("Rain, sorry.")).toBeVisible();
  await expect(guest.getByRole("button", { name: "Continue" })).toHaveCount(0);

  // A fresh token each run: the limiter's per-token bucket outlives the test.
  await guest.goto(`/api/invite/${`${Date.now()}${"x".repeat(43)}`.slice(0, 43)}`);
  await expect(
    guest.getByText("This link doesn't work. Ask the person who sent it for a new one."),
  ).toBeVisible();
  await expect(guest.getByText("Seeded")).toHaveCount(0);
});
