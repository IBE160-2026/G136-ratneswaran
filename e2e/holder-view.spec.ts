import { expect, test } from "@playwright/test";
import { addContacts, psql, seed, signedIn, unique } from "./support";

test("a joined Role-holder sees the Team, a trimmed sidebar and no Organizer pages", async ({
  page,
  request,
}) => {
  const holder = await signedIn(page, request);
  const organizer = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}')`);
  const id = seed(organizer, "7 days");
  psql(
    `update public.roles set active = true where event_id = '${id}' and key in ('venue', 'guests')`,
  );
  const member = (key: string, name: string, email: string, joined: boolean, lead = false) =>
    psql(`insert into public.role_members (event_id, role_id, user_id, name, joined_at, is_lead)
      select '${id}', r.id, u.id, '${name}', ${joined ? "now()" : "null"}, ${lead}
      from public.roles r, auth.users u where r.event_id = '${id}' and r.key = '${key}' and u.email = '${email}'`);
  member("venue", "Hanna Holder", holder, true);
  member("guests", "Hanna Holder", holder, true);
  const other = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${other}')`);
  member("venue", "Pia Pending", other, false, true);

  addContacts(id);

  // All events labels the holder's Roles
  await page.goto("/events");
  await expect(page.getByRole("link", { name: /Seeded/ })).toContainText("Venue, Guests");

  await page.goto(`/events/${id}/team`);
  await expect(page.getByRole("heading", { name: "Team & Roles" })).toBeVisible();
  await expect(page.getByText("Pia Pending · Invited · not joined yet")).toBeVisible();
  await expect(page.getByText("Lead: Pia Pending")).toBeVisible();
  await expect(page.getByText(other)).toHaveCount(0);
  await expect(page.getByRole("switch")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Revoke|Invite/ })).toHaveCount(0);

  const nav = page.getByRole("navigation", { name: "Main" }).first();
  await expect(nav.getByRole("link", { name: "Overview" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Team & Roles" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "All events" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Guests" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Event settings" })).toHaveCount(0);

  for (const path of ["guests", "settings", "setup", "setup/description", "setup/guests"]) {
    await page.goto(`/events/${id}/${path}`);
    await expect(
      page.getByRole("heading", { name: "You don't have access to this part of the event." }),
    ).toBeVisible();
    await expect(page.getByText("Ask the Organizer if you need it.")).toBeVisible();
  }

  // A cancelled Event leaves the holder's list
  psql(`update public.events set cancelled_at = now() where id = '${id}'`);
  await page.goto("/events");
  await expect(page.getByRole("link", { name: /Seeded/ })).toHaveCount(0);
});
