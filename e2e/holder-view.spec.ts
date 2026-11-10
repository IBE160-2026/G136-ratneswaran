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
  await expect(nav.getByRole("link", { name: "My tasks" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Team & Roles" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "All events" })).toBeVisible();
  // The holder has the active Guests Role, so the Guests tab is theirs to read (Story 7.7).
  await expect(nav.getByRole("link", { name: "Guests" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Event settings" })).toHaveCount(0);

  for (const path of ["settings", "setup", "setup/description", "setup/guests"]) {
    await page.goto(`/events/${id}/${path}`);
    await expect(
      page.getByRole("heading", { name: "You don't have access to this part of the event." }),
    ).toBeVisible();
    await expect(page.getByText("Ask the Organizer if you need it.")).toBeVisible();
  }

  // With the Guests Role switched off, only the Organizer has the tab
  psql(`update public.roles set active = false where event_id = '${id}' and key = 'guests'`);
  await page.goto(`/events/${id}/guests`);
  await expect(
    page.getByRole("heading", { name: "You don't have access to this part of the event." }),
  ).toBeVisible();
  await expect(nav.getByRole("link", { name: "Guests" })).toHaveCount(0);

  // A cancelled Event leaves the holder's list
  psql(`update public.events set cancelled_at = now() where id = '${id}'`);
  await page.goto("/events");
  await expect(page.getByRole("link", { name: /Seeded/ })).toHaveCount(0);
});

test("a holder of the active Guests Role reads the guest list without emails or actions", async ({
  page,
  request,
}) => {
  const holder = await signedIn(page, request);
  const organizer = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}')`);
  const id = seed(organizer, "7 days");
  psql(`update public.roles set active = true where event_id = '${id}' and key = 'guests'`);
  psql(`insert into public.role_members (event_id, role_id, user_id, name, joined_at)
    select '${id}', r.id, u.id, 'Hanna Holder', now()
    from public.roles r, auth.users u where r.event_id = '${id}' and r.key = 'guests' and u.email = '${holder}'`);
  psql(`with g as (insert into public.guests (event_id, name)
      values ('${id}', 'Ann Berg'), ('${id}', 'Bo Dahl') returning id, event_id, name)
    insert into public.guest_contacts (guest_id, event_id, email)
    select id, event_id, replace(lower(name), ' ', '.') || '@x.no' from g`);
  psql(`insert into public.rsvps (guest_id, event_id, attending, plus_one, other_needs)
    select id, event_id, true, true, 'Quiet seat' from public.guests
    where event_id = '${id}' and name = 'Ann Berg'`);

  await page.goto(`/events/${id}`);
  await expect(
    page.getByRole("img", {
      name: "RSVP summary: 2 invited, 1 coming, 0 not coming, 1 not answered.",
    }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main" })
    .first()
    .getByRole("link", { name: "Guests" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Guests" })).toBeVisible();
  const main = page.getByRole("main");
  const rows = main.getByRole("region", { name: "2 guests" }).getByRole("listitem");
  await expect(rows.first()).toContainText("Ann Berg");
  await expect(rows.first()).toContainText("Coming");
  await expect(rows.first()).toContainText("Brings a plus-one");
  await expect(rows.first()).toContainText("Other needs: Quiet seat");
  await expect(rows.last()).toContainText("Not invited yet");
  await expect(main.getByRole("button", { name: /^Coming\s*1$/ })).toBeVisible();
  await expect(main.getByText("@x.no")).toHaveCount(0);
  await expect(main.getByLabel("Guests, one per line")).toHaveCount(0);
  await expect(main.getByRole("button", { name: /Edit|Remove|Share|Copy/ })).toHaveCount(0);
});
