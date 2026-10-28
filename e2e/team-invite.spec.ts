import { expect, test } from "@playwright/test";
import { psql, seed, signedIn, unique } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.59.${octet()}.${octet()}` });
});

const LINK = /^http:\/\/localhost:3000\/api\/invite\/[A-Za-z0-9_-]{43}$/;

test("the Organizer invites a new email, copies the link and gets a new one", async ({
  page,
  request,
}) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  psql(`update public.roles set active = true where event_id = '${id}' and key = 'venue'`);
  const invitee = unique();

  await page.goto(`/events/${id}/team`);
  await page.getByLabel("Name").fill("Ola Nordmann");
  await page.getByLabel("Email").fill(invitee);
  await expect(page.getByLabel("Role")).toHaveValue(/.+/);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(`Is ${invitee} the right address?`)).toBeVisible();
  await page.getByRole("button", { name: "Create invitation" }).click();

  await expect(page.getByText("Send this link to Ola Nordmann")).toBeVisible();
  const first = await page.getByLabel("Invitation link").inputValue();
  expect(first).toMatch(LINK);
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Link copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(first);
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByLabel("Invitation link")).toHaveCount(0);

  const people = page.getByRole("region", { name: "People" });
  const row = people.getByRole("listitem").filter({ hasText: "Ola Nordmann" });
  await expect(row).toContainText("Venue");
  await expect(row).toContainText("Invited · not joined yet");

  await row.getByRole("button", { name: "New link for Ola Nordmann" }).click();
  await expect(row.getByLabel("Invitation link")).toHaveValue(LINK);
  expect(await row.getByLabel("Invitation link").inputValue()).not.toBe(first);

  const history = page.getByRole("region", { name: "Access history" });
  await expect(history.getByRole("listitem")).toHaveCount(2);
  await expect(history.getByRole("listitem").first()).toContainText(
    "You · Invited · Ola Nordmann · Venue",
  );

  // Correct email: the row moves to the new address and the old one is revoked.
  await row.getByRole("button", { name: "Correct email for Ola Nordmann" }).click();
  const correction = page.getByRole("region", { name: "Correct email for Ola Nordmann" });
  const corrected = unique();
  await expect(correction.getByLabel("Email")).toBeFocused();
  await correction.getByLabel("Email").fill(corrected);
  await correction.getByRole("button", { name: "Continue" }).click();
  await expect(correction.getByText(`Is ${corrected} the right address?`)).toBeVisible();
  await correction.getByRole("button", { name: "Create invitation" }).click();
  await expect(correction.getByText("Send this link to Ola Nordmann")).toBeVisible();
  await expect(correction.getByLabel("Invitation link")).toHaveValue(LINK);

  await expect(people.getByRole("listitem")).toHaveCount(1);
  await expect(history.getByRole("listitem")).toHaveCount(4);
  await expect(history.getByRole("listitem").first()).toContainText(
    "You · Invited · Ola Nordmann · Venue",
  );
  await expect(history.getByRole("listitem").nth(1)).toContainText(
    "You · Access removed · Former invitee · Venue",
  );
});

test("inviting someone already on the Role says so and shows no link", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  psql(`update public.roles set active = true where event_id = '${id}' and key = 'venue'`);
  const member = unique();
  const memberId = psql(
    `insert into auth.users (id, email) values (gen_random_uuid(), '${member}') returning id`,
  ).split("\n")[0];
  psql(`insert into public.role_members (event_id, role_id, user_id, name, email, joined_at)
    select '${id}', id, '${memberId}', 'Per Joined', '${member}', now()
    from public.roles where event_id = '${id}' and key = 'venue'`);

  await page.goto(`/events/${id}/team`);
  await page.getByLabel("Name").fill("Per Joined");
  await page.getByLabel("Email").fill(member);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create invitation" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Per Joined is already on this Role." }),
  ).toBeVisible();
  await expect(page.getByLabel("Invitation link")).toHaveCount(0);
});

test("a read-only Event hides the invite form and the pending row's actions", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  // Set up while the Event is live, then end it: the read-only trigger refuses changes afterwards.
  const id = seed(email, "7 days");
  psql(`update public.roles set active = true where event_id = '${id}' and key = 'venue'`);
  const invitee = psql(
    `insert into auth.users (id, email) values (gen_random_uuid(), '${unique()}') returning id`,
  ).split("\n")[0];
  psql(`insert into public.role_members (event_id, role_id, user_id, name, email)
    select '${id}', r.id, '${invitee}', 'Kari Pending', u.email
    from public.roles r, auth.users u where r.event_id = '${id}' and r.key = 'venue' and u.id = '${invitee}'`);
  psql(`update public.events set starts_at = now() - interval '30 days',
    ends_at = now() - interval '30 days' + interval '4 hours' where id = '${id}'`);

  await page.goto(`/events/${id}/team`);
  const row = page
    .getByRole("region", { name: "People" })
    .getByRole("listitem")
    .filter({ hasText: "Kari Pending" });
  await expect(row).toContainText("Invited · not joined yet");
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
  await expect(page.getByLabel("Name")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /New link/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Correct email/ })).toHaveCount(0);
  await expect(row.getByRole("button", { name: /^Make lead/ })).toHaveCount(0);
});
