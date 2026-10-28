import { expect, test } from "@playwright/test";
import { psql, seed, signedIn, unique } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.60.${octet()}.${octet()}` });
});

test("the Organizer makes a lead, changes it and undoes the change", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  psql(`update public.roles set active = true where event_id = '${id}' and key = 'venue'`);
  for (const name of ["Ada Pending", "Bo Pending"]) {
    const user = psql(
      `insert into auth.users (id, email) values (gen_random_uuid(), '${unique()}') returning id`,
    ).split("\n")[0];
    psql(`insert into public.role_members (event_id, role_id, user_id, name, email)
      select '${id}', r.id, u.id, '${name}', u.email
      from public.roles r, auth.users u where r.event_id = '${id}' and r.key = 'venue' and u.id = '${user}'`);
  }

  await page.goto(`/events/${id}/team`);
  const venue = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("switch", { name: "Venue" }) });
  await expect(venue).toContainText("No lead yet");

  const people = page.getByRole("region", { name: "People" });
  const ada = people.getByRole("listitem").filter({ hasText: "Ada Pending" });
  const bo = people.getByRole("listitem").filter({ hasText: "Bo Pending" });
  await ada.getByRole("button", { name: "Make lead: Ada Pending, Venue" }).click();
  await expect(page.getByText("Ada Pending is now lead of Venue")).toBeVisible();
  await expect(venue).toContainText("Lead: Ada Pending");
  await expect(ada).toContainText("Role lead");
  await expect(ada.getByRole("button", { name: /^Make lead/ })).toHaveCount(0);
  const history = page.getByRole("region", { name: "Access history" });
  await expect(history.getByRole("listitem").first()).toContainText(
    "You · Role lead changed · Ada Pending · Venue",
  );

  await bo.getByRole("button", { name: "Make lead: Bo Pending, Venue" }).click();
  await expect(venue).toContainText("Lead: Bo Pending");
  await expect(bo).toContainText("Role lead");
  await expect(ada).not.toContainText("Role lead");

  await page
    .locator("[data-sonner-toast]")
    .filter({ hasText: "Bo Pending is now lead of Venue" })
    .getByRole("button", { name: "Undo" })
    .click();
  await expect(venue).toContainText("Lead: Ada Pending");
  await expect(ada).toContainText("Role lead");
  await expect(bo).not.toContainText("Role lead");

  // The lead's row is removed (Correct email today, revoke in 3.9): the Role has no lead.
  psql(`delete from public.role_members where event_id = '${id}' and is_lead`);
  await page.reload();
  await expect(venue).toContainText("No lead yet");
  await expect(people.getByRole("listitem").filter({ hasText: "Role lead" })).toHaveCount(0);
});
