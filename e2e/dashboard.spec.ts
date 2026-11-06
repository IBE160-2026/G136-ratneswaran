import { expect, test, type Page } from "@playwright/test";
import { psql, seed, signedIn, unique } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.65.${octet()}.${octet()}` });
});

/** An Event of a fresh Organizer with an active Venue Role; `holder` joins Venue. */
function setup(organizer: string, holder: string | null) {
  const id = seed(organizer, "30 days");
  psql(`update public.roles set active = true where event_id = '${id}' and key = 'venue'`);
  if (holder) {
    psql(`insert into public.role_members (event_id, role_id, user_id, name, joined_at)
      select '${id}', r.id, u.id, 'Hanna Holder', now()
      from public.roles r, auth.users u where r.event_id = '${id}' and r.key = 'venue' and u.email = '${holder}'`);
  }
  const task = (title: string, days: number, owner: string | null, extra = "") =>
    psql(`insert into public.tasks (event_id, role_id, title, deadline, owner_user_id, delegated_at,
        accepted_at, lifecycle)
      select '${id}', r.id, '${title}', current_date + ${days}, o.id,
        ${owner ? "now() - interval '3 days'" : "null"}, ${extra.includes("accepted") ? "now()" : "null"},
        ${extra.includes("dismissed") ? "'dismissed'" : "'active'"}
      from public.roles r left join auth.users o on o.email = ${owner ? `'${owner}'` : "null"}
      where r.event_id = '${id}' and r.key = 'venue'`);
  return { id, task };
}

const needsYou = (page: Page) => page.getByRole("region", { name: /^Needs you/ }).getByRole("link");

test("the Organizer sees overdue then stale Tasks under Needs you, and the title and nav", async ({
  page,
  request,
}) => {
  const organizer = await signedIn(page, request);
  const holder = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${holder}')`);
  const { id, task } = setup(organizer, holder);
  task("Late permit", -5, null);
  task("Stale ask", 10, holder);
  task("Fine task", 20, null);
  task("Dismissed late", -9, null, "dismissed");
  psql(`insert into public.tasks (event_id, role_id, title, deadline)
    select '${id}', r.id, 'Inactive role late', current_date - 4 from public.roles r
    where r.event_id = '${id}' and r.key = 'guests'`);

  await page.goto(`/events/${id}`);
  await expect(page).toHaveTitle("Dashboard – Seeded – Arrangly");
  const nav = page.getByRole("navigation", { name: "Main" }).first();
  await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("heading", { level: 2, name: /^Needs you/ })).toContainText("2");
  await expect(needsYou(page)).toHaveCount(2);
  await expect(needsYou(page).first()).toContainText("Late permit");
  await expect(needsYou(page).first()).toContainText("Overdue 5 days");
  await expect(needsYou(page).last()).toContainText("Stale ask");
  await expect(page.getByText("Fine task")).toHaveCount(0);
  await expect(page.getByText("Dismissed late")).toHaveCount(0);
  await expect(page.getByText("Inactive role late")).toHaveCount(0);
  await needsYou(page).first().click();
  await expect(page).toHaveURL(new RegExp(`/events/${id}/tasks/`));
});

test("a joined holder stays on the Dashboard and sees only their own Tasks", async ({
  page,
  request,
}) => {
  const holder = await signedIn(page, request);
  const organizer = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}')`);
  const { id, task } = setup(organizer, holder);
  task("My late one", -2, holder, "accepted");
  task("My new one", 9, holder);
  task("Mate late one", -4, organizer, "accepted");

  await page.goto(`/events/${id}`);
  await expect(page).toHaveURL(`/events/${id}`);
  await expect(needsYou(page)).toHaveCount(2);
  await expect(needsYou(page).first()).toContainText("My late one");
  await expect(needsYou(page).last()).toContainText("Not yet accepted");
  await expect(page.getByText("Mate late one")).toHaveCount(0);
});

test("a joined lead also sees overdue Tasks of their Role, but not of another Role", async ({
  page,
  request,
}) => {
  const lead = await signedIn(page, request);
  const organizer = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}')`);
  const { id, task } = setup(organizer, lead);
  psql(`update public.roles set active = true where event_id = '${id}' and key = 'guests'`);
  psql(`update public.role_members set is_lead = true where event_id = '${id}'`);
  task("Venue mate late", -3, organizer, "accepted");
  psql(`insert into public.tasks (event_id, role_id, title, deadline)
    select '${id}', r.id, 'Guests late', current_date - 3 from public.roles r
    where r.event_id = '${id}' and r.key = 'guests'`);

  await page.goto(`/events/${id}`);
  await expect(needsYou(page)).toHaveCount(1);
  await expect(needsYou(page).first()).toContainText("Venue mate late");
  await expect(page.getByText("Guests late")).toHaveCount(0);
});

test("nothing needing the viewer shows the quiet line, and a stranger gets no access", async ({
  page,
  request,
}) => {
  const organizer = await signedIn(page, request);
  const { id, task } = setup(organizer, null);
  task("Far away", 25, null);

  await page.goto(`/events/${id}`);
  await expect(page.getByRole("heading", { level: 2, name: /^Needs you/ })).toBeVisible();
  await expect(page.getByText("Nothing needs you right now.")).toBeVisible();
  await expect(needsYou(page)).toHaveCount(0);

  const stranger = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${stranger}')`);
  const other = setup(stranger, null);
  other.task("Secret title", -1, null);
  await page.goto(`/events/${other.id}`);
  await expect(
    page.getByRole("heading", { name: "You don't have access to this part of the event." }),
  ).toBeVisible();
  await expect(page.getByText("Secret title")).toHaveCount(0);
});
