import { expect, test } from "@playwright/test";
import { psql, seed, signedIn, unique } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.61.${octet()}.${octet()}` });
});

function addPending(eventId: string, name: string, lead = false) {
  const user = psql(
    `insert into auth.users (id, email) values (gen_random_uuid(), '${unique()}') returning id`,
  ).split("\n")[0];
  psql(`insert into public.role_members (event_id, role_id, user_id, name, email, is_lead)
    select '${eventId}', r.id, u.id, '${name}', u.email, ${lead}
    from public.roles r, auth.users u where r.event_id = '${eventId}' and r.key = 'venue' and u.id = '${user}'`);
}

test("the Organizer revokes a pending member and the lead", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  psql(`update public.roles set active = true where event_id = '${id}' and key = 'venue'`);
  addPending(id, "Ada Pending");
  addPending(id, "Bo Lead", true);

  await page.goto(`/events/${id}/team`);
  const venue = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("switch", { name: "Venue" }) });
  const people = page.getByRole("region", { name: "People" });
  const ada = people.getByRole("listitem").filter({ hasText: "Ada Pending" });
  const bo = people.getByRole("listitem").filter({ hasText: "Bo Lead" });
  await expect(venue).toContainText("Lead: Bo Lead");

  // Keep leaves the row.
  await ada.getByRole("button", { name: "Revoke: Ada Pending, Venue" }).click();
  const dialog = page.getByRole("dialog", { name: "Remove Ada Pending from Venue?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Keep" }).click();
  await expect(dialog).toBeHidden();
  await expect(ada).toHaveCount(1);

  await ada.getByRole("button", { name: "Revoke: Ada Pending, Venue" }).click();
  await page.getByRole("button", { name: "Remove from Venue" }).click();
  await expect(ada).toHaveCount(0);

  await bo.getByRole("button", { name: "Revoke: Bo Lead, Venue" }).click();
  await page.getByRole("button", { name: "Remove from Venue" }).click();
  await expect(bo).toHaveCount(0);
  await expect(venue).toContainText("No lead yet");
  const history = page.getByRole("region", { name: "Access history" });
  await expect(history.getByRole("listitem").first()).toContainText("Access removed");
});

test("a read-only Event hides Revoke", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  psql(`update public.roles set active = true where event_id = '${id}' and key = 'venue'`);
  addPending(id, "Ada Pending");
  psql(`update public.events set cancelled_at = now() where id = '${id}'`);

  await page.goto(`/events/${id}/team`);
  const people = page.getByRole("region", { name: "People" });
  await expect(people).toContainText("Ada Pending");
  await expect(people.getByRole("button", { name: /^Revoke/ })).toHaveCount(0);
});
