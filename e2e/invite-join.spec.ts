import { expect, test, type Browser, type Page } from "@playwright/test";
import { confirmed, mailCode, psql, seed, signedIn, unique } from "./support";

// Limiter buckets are per IP and shared by every test, so give each browser its own.
const ip = () => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return { "x-forwarded-for": `198.60.${octet()}.${octet()}` };
};

test.beforeEach(async ({ page }) => {
  await page.context().setExtraHTTPHeaders(ip());
});

/** A second browser for the invitee, with its own cookies. */
const invitee = async (browser: Browser) =>
  (
    await browser.newContext({ baseURL: "http://localhost:3000", extraHTTPHeaders: ip() })
  ).newPage();

/** The Organizer invites `email` to Venue on a fresh Event and gets the link. */
async function invite(
  page: Page,
  request: Parameters<typeof signedIn>[1],
  email: string,
  published = true,
) {
  const organizer = await signedIn(page, request);
  const id = seed(organizer, "7 days", published);
  psql(`update public.roles set active = true where event_id = '${id}' and key = 'venue'`);
  await page.goto(`/events/${id}/team`);
  await page.getByLabel("Name").fill("Ola Nordmann");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create invitation" }).click();
  return { id, link: await page.getByLabel("Invitation link").inputValue() };
}

const users = (email: string) =>
  psql(`select count(*) from auth.users where email = '${email}'`).trim();

test("a new invitee verifies a code, sets a password and lands on the Event", async ({
  page,
  request,
  browser,
}) => {
  const email = unique();
  // A draft: the member reads it, but only the Organizer gets the Publish banner.
  const { id, link } = await invite(page, request, email, false);

  const guest = await invitee(browser);
  const landed = await guest.goto(link);
  expect(landed!.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(guest).toHaveURL("http://localhost:3000/invite");
  await expect(guest.getByRole("heading", { name: "Join Seeded" })).toBeVisible();
  await expect(guest.getByText("You are invited to the Venue Role.")).toBeVisible();
  await expect(guest.getByText(email)).toBeVisible();

  await guest.getByRole("button", { name: "Send me a code" }).click();
  await expect(guest.getByText(`We sent a 6-digit code to ${email}.`)).toBeVisible();
  await guest.getByLabel("Code").fill("000000");
  await guest.getByRole("button", { name: "Continue" }).click();
  await expect(
    guest.getByText("That code is wrong or has expired. Check it or send a new one."),
  ).toBeVisible();
  await guest.getByLabel("Code").fill(await mailCode(request, email));
  await guest.getByRole("button", { name: "Continue" }).click();

  await guest.getByLabel("Choose a password").fill("abcdefg1");
  await guest.getByRole("button", { name: "Join" }).click();
  await expect(guest).toHaveURL(`http://localhost:3000/events/${id}`);
  await expect(guest.getByRole("heading", { name: "Seeded" })).toBeVisible();
  await expect(guest.getByText("Only your team can see this event.")).toHaveCount(0);
  await expect(guest.getByRole("button", { name: "Publish" })).toHaveCount(0);
  expect(users(email)).toBe("1");

  await page.reload();
  const row = page
    .getByRole("region", { name: "People" })
    .getByRole("listitem")
    .filter({ hasText: "Ola Nordmann" });
  await expect(row).not.toContainText("Invited · not joined yet");
  await expect(
    page.getByRole("region", { name: "Access history" }).getByRole("listitem").first(),
  ).toContainText("Ola Nordmann · Joined · Ola Nordmann · Venue");

  // The link is spent: a second visit shows the used text.
  await guest.goto(link);
  await expect(guest.getByText("This invite has already been used. Log in instead.")).toBeVisible();
});

test("an existing account logs in and joins, with no second user", async ({
  page,
  request,
  browser,
}) => {
  const signup = await invitee(browser);
  const email = await confirmed(signup, request);
  const { id, link } = await invite(page, request, email);

  const guest = await invitee(browser);
  await guest.goto(link);
  await expect(guest.getByText("You already have an account. Log in to join.")).toBeVisible();
  await guest.getByRole("link", { name: "Log in to join" }).click();
  await guest.getByLabel("Email").fill(email);
  await guest.getByLabel("Password", { exact: true }).fill("abcdefg1");
  await guest.getByRole("button", { name: "Log in" }).click();
  await expect(guest).toHaveURL("http://localhost:3000/invite");
  await guest.getByRole("button", { name: "Join" }).click();
  await expect(guest).toHaveURL(`http://localhost:3000/events/${id}`);
  expect(users(email)).toBe("1");
});

test("another signed-in account is told so, logs out and gets the invitation back", async ({
  page,
  request,
  browser,
}) => {
  const email = unique();
  const { link } = await invite(page, request, email);

  const other = await invitee(browser);
  await signedIn(other, request);
  await other.goto(link);
  await expect(other.getByText("This invite was sent to another email address.")).toBeVisible();
  await expect(other.getByText(email)).toHaveCount(0);
  await other.getByRole("main").getByRole("button", { name: "Log out" }).click();
  await expect(other.getByRole("button", { name: "Send me a code" })).toBeVisible();
  await expect(other).toHaveURL("http://localhost:3000/invite");
  await expect(other.getByRole("heading", { name: "Join Seeded" })).toBeVisible();
  await expect(other.getByText(email)).toBeVisible();
});

test("an unknown link shows the used text", async ({ page }) => {
  // A fresh token each run: the limiter's per-token bucket outlives the test.
  const token = () => `${Date.now()}${"x".repeat(43)}`.slice(0, 43);
  const route = await page.request.get(`/api/invite/${token()}`, { maxRedirects: 0 });
  expect(route.status()).toBe(307);
  expect(route.headers()["referrer-policy"]).toBe("no-referrer");
  await page.goto(`/api/invite/${token()}`);
  await expect(page).toHaveURL("http://localhost:3000/invite");
  await expect(page.getByText("This invite has already been used. Log in instead.")).toBeVisible();
});
