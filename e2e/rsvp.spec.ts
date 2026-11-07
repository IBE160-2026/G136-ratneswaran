import { expect, test, type Browser, type Page } from "@playwright/test";
import { psql, seed, signedIn } from "./support";

// Limiter buckets are per IP and shared by every test, so give each browser its own.
const ip = () => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  return { "x-forwarded-for": `198.62.${octet()}.${octet()}` };
};

test.beforeEach(async ({ page }) => {
  await page.context().setExtraHTTPHeaders(ip());
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
});

/** The Organizer's Event with one guest, Ann Berg; returns the Event id and her personal link. */
async function invite(page: Page, request: Parameters<typeof signedIn>[1]) {
  const organizer = await signedIn(page, request);
  const id = seed(organizer, "7 days");
  psql(`with g as (insert into public.guests (event_id, name) values ('${id}', 'Ann Berg') returning id)
    insert into public.guest_contacts (guest_id, event_id, email)
    select id, '${id}', 'ann-${Date.now()}@example.com' from g`);
  psql(
    `update public.events set rsvp_wanted = true, rsvp_due_date = current_date + 3 where id = '${id}'`,
  );
  await page.goto(`/events/${id}/guests`);
  await page.getByRole("button", { name: "Share Ann Berg's link" }).click();
  await page.getByRole("menuitem", { name: "Copy link" }).click();
  await expect(page.getByText("Link for Ann Berg copied.")).toBeVisible();
  return { id, link: await page.evaluate(() => navigator.clipboard.readText()) };
}

/** The guest's own browser at phone width, opened on her link and signed in. */
async function guestAt(browser: Browser, link: string) {
  const guest = await (
    await browser.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: ip(),
      viewport: { width: 375, height: 812 },
    })
  ).newPage();
  await guest.goto(link);
  await guest.getByRole("button", { name: "Continue" }).click();
  await expect(guest.getByRole("heading", { name: "Will you be there?" })).toBeFocused();
  return guest;
}

test("a guest says yes with a plus-one and other needs, and the Organizer sees it", async ({
  page,
  request,
  browser,
}) => {
  const { id, link } = await invite(page, request);
  const guest = await guestAt(browser, link);

  await expect(guest.getByText("Hi Ann")).toBeVisible();
  await expect(guest.getByText(/^Seeded · /)).toBeVisible();
  await expect(guest.getByText(/^Reply by /)).toBeVisible();
  await expect(guest.getByText("Question 1 of 3")).toBeVisible();
  await expect(guest.getByRole("button", { name: "Back" })).toHaveCount(0);
  await guest.getByRole("button", { name: "Next", exact: true }).click();
  await expect(guest.getByText("Choose one answer to continue.")).toBeVisible();

  await guest.getByLabel("Yes, I'll be there").check();
  await guest.getByRole("button", { name: "Next", exact: true }).click();
  await expect(guest.getByRole("heading", { name: "Are you bringing a plus-one?" })).toBeFocused();
  await expect(guest.getByText("Question 2 of 3")).toBeVisible();
  await guest.getByLabel("Yes, I'm bringing someone").check();
  await guest.getByLabel("Their name (optional)").fill("Per");
  await guest.getByRole("button", { name: "Next", exact: true }).click();

  await expect(guest.getByText("Question 3 of 3")).toBeVisible();
  await guest.getByLabel("Other needs").fill("x".repeat(501));
  await guest.getByRole("button", { name: "Send my answer" }).click();
  await expect(guest.getByText("That is too long.")).toBeVisible();
  await guest.getByLabel("Other needs").fill("<script>alert(1)</script>\nQuiet seat");
  await guest.getByRole("button", { name: "Send my answer" }).click();
  await expect(
    guest.getByRole("heading", {
      name: "You're on the list, Ann! We'll send the details closer to the day.",
    }),
  ).toBeVisible();
  await expect(guest.getByText("<script>alert(1)</script>")).toBeVisible();

  await page.goto(`/events/${id}/guests`);
  const row = page.getByRole("listitem").filter({ hasText: "Ann Berg" });
  await expect(row.getByText("Coming", { exact: true })).toBeVisible();
  await expect(row.getByText("Plus-one: Per")).toBeVisible();
  await expect(row.getByText("<script>alert(1)</script>")).toBeVisible();
});

test("a No ends at the first question and clears an earlier Yes", async ({
  page,
  request,
  browser,
}) => {
  const { id, link } = await invite(page, request);
  const guest = await guestAt(browser, link);

  await guest.getByLabel("Yes, I'll be there").check();
  await guest.getByRole("button", { name: "Next", exact: true }).click();
  await guest.getByLabel("Yes, I'm bringing someone").check();
  await guest.getByLabel("Their name (optional)").fill("Per");
  await guest.getByRole("button", { name: "Next", exact: true }).click();
  await guest.getByLabel("Other needs").fill("Quiet seat");
  await guest.getByRole("button", { name: "Send my answer" }).click();
  await guest.getByRole("button", { name: "Change my answer" }).click();

  await expect(guest.getByLabel("Yes, I'll be there")).toBeChecked();
  await guest.getByLabel("No, I can't make it").check();
  await expect(guest.getByText("Question 1 of 1")).toBeVisible();
  await guest.getByRole("button", { name: "Send my answer" }).click();
  await expect(
    guest.getByRole("heading", { name: "Thanks for letting us know, Ann." }),
  ).toBeVisible();

  expect(
    psql(`select attending, plus_one, plus_one_name, other_needs from public.rsvps
      where event_id = '${id}'`).trim(),
  ).toBe("f|f||");
  await page.goto(`/events/${id}/guests`);
  await expect(page.getByText("Not coming", { exact: true })).toBeVisible();
});

test("an answer changed on another device asks to see the changes", async ({
  page,
  request,
  browser,
}) => {
  const { id, link } = await invite(page, request);
  const guest = await guestAt(browser, link);
  await guest.getByLabel("No, I can't make it").check();
  await guest.getByRole("button", { name: "Send my answer" }).click();
  await guest.getByRole("button", { name: "Change my answer" }).click();

  psql(`update public.rsvps set updated_at = clock_timestamp() where event_id = '${id}'`);
  await guest.getByLabel("Yes, I'll be there").check();
  await guest.getByRole("button", { name: "Next", exact: true }).click();
  await guest.getByRole("button", { name: "Next", exact: true }).click();
  await guest.getByRole("button", { name: "Send my answer" }).click();
  await expect(guest.locator("p[role=alert]")).toHaveText(
    "Your answer was changed on another device. See changes.",
  );
  await guest.getByRole("button", { name: "See changes." }).click();
  await expect(
    guest.getByRole("heading", { name: "Thanks for letting us know, Ann." }),
  ).toBeVisible();
});

test("a cancelled Event shows the answer read-only", async ({ page, request, browser }) => {
  const { id, link } = await invite(page, request);
  const guest = await guestAt(browser, link);
  await guest.getByLabel("No, I can't make it").check();
  await guest.getByRole("button", { name: "Send my answer" }).click();
  await expect(guest.getByRole("button", { name: "Change my answer" })).toBeVisible();

  psql(`update public.events set cancelled_at = now(), cancellation_note = 'Rain, sorry.'
    where id = '${id}'`);
  await guest.goto(`/rsvp/${id}`);
  await expect(
    guest.getByRole("heading", { name: "This event has been cancelled." }),
  ).toBeVisible();
  await expect(guest.getByText("Rain, sorry.")).toBeVisible();
  await expect(guest.getByText("No, I can't make it")).toBeVisible();
  await expect(guest.getByRole("button", { name: "Change my answer" })).toHaveCount(0);
});

test("the RSVP page sends no referrer, and asks a stranger to open the link", async ({
  page,
  request,
  browser,
}) => {
  const { id } = await invite(page, request);
  const stranger = await (
    await browser.newContext({ baseURL: "http://localhost:3000", extraHTTPHeaders: ip() })
  ).newPage();
  const response = await stranger.goto(`/rsvp/${id}`);
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(
    stranger.getByText("Open your personal invitation link again to answer."),
  ).toBeVisible();
});
