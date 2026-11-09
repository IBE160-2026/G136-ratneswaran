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
  await expect(guest.getByText(/^Seeded · /)).toBeVisible();
  await expect(
    guest.getByRole("region", { name: "My RSVP" }).getByText("No, I can't make it"),
  ).toBeVisible();
  await expect(guest.getByRole("button", { name: "Change my answer" })).toHaveCount(0);
});

const GENERIC = "This link has expired. Ask the person who invited you for a new one.";

/** A phone-width browser with no cookies at all. */
const phone = async (browser: Browser) =>
  (
    await browser.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: ip(),
      viewport: { width: 375, height: 812 },
    })
  ).newPage();

test("the RSVP page sends no referrer, and tells a stranger only that the link has expired", async ({
  page,
  request,
  browser,
}) => {
  const { id } = await invite(page, request);
  const stranger = await phone(browser);
  const response = await stranger.goto(`/rsvp/${id}`);
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(stranger.getByText(GENERIC)).toBeVisible();
  await expect(stranger.getByRole("textbox")).toHaveCount(0);
  await expect(stranger.getByText("Seeded")).toHaveCount(0);
});

test("a returning guest finds the Event, My RSVP and can change the answer after the due date", async ({
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
  await guest.getByRole("button", { name: "Send my answer" }).click();
  await expect(guest.getByRole("heading", { name: /^You're on the list, Ann!/ })).toBeVisible();

  // The due date is soft: a change after it is saved as usual.
  // A zone that is neither the server's nor Oslo: 18:00 UTC is 2 PM in New York.
  psql(`update public.events set rsvp_due_date = current_date - 1, starts_at = '2027-06-01 18:00+00',
    ends_at = '2027-06-01 22:00+00', time_zone = 'America/New_York' where id = '${id}'`);
  await guest.goto(`/rsvp/${id}`);
  await expect(guest.getByText(/^Seeded · June 1, 2027 at 2:00\sPM$/)).toBeVisible();
  const card = guest.getByRole("region", { name: "My RSVP" });
  await expect(card.getByText("Yes, I'll be there")).toBeVisible();
  await expect(card.getByText("Plus-one: Per")).toBeVisible();
  expect(await guest.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  await card.getByRole("button", { name: "Change my answer" }).click();
  await expect(guest.getByText("Question 1 of 3")).toBeVisible();
  await expect(guest.getByLabel("Yes, I'll be there")).toBeChecked();
  await guest.getByLabel("No, I can't make it").check();
  await guest.getByRole("button", { name: "Send my answer" }).click();
  await expect(card.getByText("No, I can't make it")).toBeVisible();
  await expect(card.getByText("Plus-one: Per")).toHaveCount(0);
  expect(psql(`select attending from public.rsvps where event_id = '${id}'`).trim()).toBe("f");
});

test("a lost session with the link's cookie goes back to Continue", async ({
  page,
  request,
  browser,
}) => {
  const { id, link } = await invite(page, request);
  const guest = await guestAt(browser, link);
  await guest.context().clearCookies({ name: /^sb-/ });
  await guest.goto(`/rsvp/${id}`);
  await expect(guest).toHaveURL("http://localhost:3000/invite");
  await expect(guest.getByRole("button", { name: "Continue" })).toBeVisible();
});

test("a cancelled Event opened without a session shows the cancelled text on /invite", async ({
  page,
  request,
  browser,
}) => {
  const { id, link } = await invite(page, request);
  const guest = await phone(browser);
  await guest.goto(link);
  await expect(guest.getByRole("button", { name: "Continue" })).toBeVisible();
  psql(`update public.events set cancelled_at = now(), cancellation_note = 'Rain, sorry.'
    where id = '${id}'`);

  await guest.goto(`/rsvp/${id}`);
  await expect(guest).toHaveURL("http://localhost:3000/invite");
  await expect(guest.getByText("This event has been cancelled.")).toBeVisible();
  await expect(guest.getByText("Rain, sorry.")).toBeVisible();
});

test("a reissued link names the Organizer to ask, and never the Event", async ({
  page,
  request,
  browser,
}) => {
  const { id, link } = await invite(page, request);
  psql(`update auth.users set raw_user_meta_data = raw_user_meta_data || '{"name": "Olga"}'
    where id = (select organizer_id from public.events where id = '${id}')`);
  // The guest holds the link's cookie but never pressed Continue.
  const guest = await phone(browser);
  await guest.goto(link);
  await expect(guest.getByRole("button", { name: "Continue" })).toBeVisible();

  await page.getByRole("button", { name: "Share Ann Berg's link" }).click();
  await page.getByRole("menuitem", { name: "New link" }).click();
  await page.getByRole("button", { name: "Make new link" }).click();
  await expect(page.getByText("New link for Ann Berg copied.")).toBeVisible();

  await guest.goto(`/rsvp/${id}`);
  await expect(guest.getByText("This link has expired. Ask Olga for a new one.")).toBeVisible();
  await expect(guest.getByRole("textbox")).toHaveCount(0);
  await expect(guest.getByText("Seeded")).toHaveCount(0);
});

test("a browser that blocks cookies is told so instead of the expired text", async ({
  page,
  request,
  browser,
}) => {
  const { id } = await invite(page, request);
  const guest = await phone(browser);
  await guest.addInitScript(() =>
    Object.defineProperty(Navigator.prototype, "cookieEnabled", { get: () => false }),
  );
  const blocked = "Your browser blocks cookies. Open the link in your usual browser.";
  await guest.goto(`/rsvp/${id}`);
  await expect(guest.getByText(blocked)).toBeVisible();
  await expect(guest.getByText(GENERIC)).toHaveCount(0);
  await guest.goto("/invite");
  await expect(guest.getByText(blocked)).toBeVisible();
  await expect(guest.getByText(GENERIC)).toHaveCount(0);
});

test("an ended Event shows thanks and no way to change the answer", async ({
  page,
  request,
  browser,
}) => {
  const { id, link } = await invite(page, request);
  const guest = await guestAt(browser, link);
  await guest.getByLabel("No, I can't make it").check();
  await guest.getByRole("button", { name: "Send my answer" }).click();
  await expect(guest.getByRole("button", { name: "Change my answer" })).toBeVisible();

  psql(`update public.events set starts_at = now() - interval '3 hours',
    ends_at = now() - interval '1 hour', rsvp_due_date = null where id = '${id}'`);
  await guest.goto(`/rsvp/${id}`);
  await expect(guest.getByRole("heading", { name: "Thanks for coming!" })).toBeVisible();
  await expect(guest.getByText("No, I can't make it")).toBeVisible();
  await expect(guest.getByRole("button", { name: "Change my answer" })).toHaveCount(0);
});

test("a plus-one without a name reads as such on the Guests tab", async ({ page, request }) => {
  const { id } = await invite(page, request);
  psql(`insert into public.rsvps (guest_id, event_id, attending, plus_one)
    select id, event_id, true, true from public.guests where event_id = '${id}'`);
  await page.goto(`/events/${id}/guests`);
  await expect(page.getByText("Brings a plus-one")).toBeVisible();
});

test("an Event the viewer is only a guest of is not on All events", async ({
  page,
  request,
  browser,
}) => {
  const email = await signedIn(page, request);
  seed(email, "7 days");
  const other = await (
    await browser.newContext({ baseURL: "http://localhost:3000", extraHTTPHeaders: ip() })
  ).newPage();
  const host = await signedIn(other, request);
  const hosted = seed(host, "7 days");
  psql(`update public.events set name = 'Hosted by someone else' where id = '${hosted}'`);
  psql(`insert into public.guests (event_id, name, user_id)
    select '${hosted}', 'Me', id from auth.users where email = '${email}'`);

  await page.goto("/events");
  await expect(page.getByRole("link", { name: /Seeded/ })).toHaveCount(1);
  await expect(page.getByText("Hosted by someone else")).toHaveCount(0);
});
