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

const taskId = (event: string, title: string) =>
  psql(`select id from public.tasks where event_id = '${event}' and title = '${title}'`).trim();

const atRisk = (page: Page) => page.getByRole("region", { name: /^At risk/ });
const onTrack = (page: Page) => page.getByRole("region", { name: "On track" });

test("the Organizer sees At risk and On track with counts, guests and the inactive-Role line", async ({
  page,
  request,
}) => {
  const organizer = await signedIn(page, request);
  const holder = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${holder}')`);
  const { id, task } = setup(organizer, holder);
  task("Vendor reply", 12, null);
  task("Needs permit", 8, null);
  task("Permit", 15, null);
  task("Finished one", 5, null);
  task("Late one", -3, null);
  psql(`update public.tasks set status = 'done' where id = '${taskId(id, "Finished one")}'`);
  psql(
    `update public.tasks set status = 'waiting_external' where id = '${taskId(id, "Vendor reply")}'`,
  );
  // Oldest first: an older note, the note that shows, then a newer note the author removed.
  psql(`insert into public.status_history (task_id, from_status, to_status, note)
    values ('${taskId(id, "Vendor reply")}', 'not_started', 'waiting_external', 'older note')`);
  psql(`insert into public.status_history (task_id, from_status, to_status, note)
    values ('${taskId(id, "Vendor reply")}', 'not_started', 'waiting_external', '${"x".repeat(100)}')`);
  psql(`insert into public.status_history (task_id, from_status, to_status, note, note_removed_at)
    values ('${taskId(id, "Vendor reply")}', 'not_started', 'waiting_external', 'removed note', now())`);
  const pending = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${pending}')`);
  psql(`insert into public.role_members (event_id, role_id, user_id, name)
    select '${id}', r.id, u.id, 'Pia Pending'
    from public.roles r, auth.users u where r.event_id = '${id}' and r.key = 'venue' and u.email = '${pending}'`);
  psql(
    `insert into public.task_dependencies values ('${taskId(id, "Needs permit")}', '${taskId(id, "Permit")}')`,
  );
  psql(`insert into public.guests (event_id, name) values ('${id}', 'G1'), ('${id}', 'G2')`);
  psql(`insert into public.tasks (event_id, role_id, title, deadline)
    select '${id}', r.id, 'Inactive role late', current_date - 4 from public.roles r
    where r.event_id = '${id}' and r.key = 'guests'`);

  await page.goto(`/events/${id}`);
  await expect(page.getByRole("heading", { level: 2, name: /^At risk/ })).toContainText(
    "2 at risk",
  );
  const rows = atRisk(page).getByRole("link");
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Vendor reply");
  await expect(rows.first()).toContainText("Waiting on external");
  await expect(rows.first()).toContainText(`${"x".repeat(80)}…`);
  await expect(rows.first()).not.toContainText("x".repeat(81));
  await expect(rows.first()).not.toContainText("older note");
  await expect(rows.first()).not.toContainText("removed note");
  await expect(rows.last()).toContainText("Needs permit");
  await expect(rows.last()).toContainText("Waits for: Permit");

  const venue = onTrack(page).getByRole("listitem").filter({ hasText: "Venue" });
  await expect(venue).toContainText("Hanna Holder");
  await expect(venue).toContainText("Pia Pending");
  await expect(venue).toContainText("Invited · not joined yet");
  await expect(venue.getByRole("link")).toContainText("1 done");
  await expect(venue.getByRole("link")).toContainText("4 open");
  await expect(venue.getByRole("link")).toContainText("1 overdue");
  await venue.getByRole("link").click();
  await expect(page).toHaveURL(`/events/${id}/tasks`);
  await page.goBack();
  await expect(page.getByText("2 guests added")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "1 task belongs to an inactive Role" }),
  ).toHaveAttribute("href", `/events/${id}/team`);
});

test("nothing at risk shows the quiet line", async ({ page, request }) => {
  const organizer = await signedIn(page, request);
  const { id, task } = setup(organizer, null);
  task("Easy one", 20, null);
  await page.goto(`/events/${id}`);
  await expect(page.getByRole("heading", { level: 2, name: /^At risk/ })).toBeVisible();
  await expect(page.getByText("Nothing is at risk right now.")).toBeVisible();
  await expect(page.getByText("0 guests added")).toBeVisible();
  await expect(page.getByText(/inactive Role/)).toHaveCount(0);
});

test("a cancelled Event's Dashboard is read-only: no Publish, banner or action buttons", async ({
  page,
  request,
}) => {
  const organizer = await signedIn(page, request);
  const { id, task } = setup(organizer, null);
  task("Late permit", -5, null);
  psql(`update public.events set published_at = null, cancelled_at = now() where id = '${id}'`);

  await page.goto(`/events/${id}`);
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(page.getByText("Only your team can see this event.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
  await expect(needsYou(page).first()).toContainText("Late permit");
});

test("a holder of another Role sees an unreadable row, no foreign title and no organizer lines", async ({
  page,
  request,
}) => {
  const holder = await signedIn(page, request);
  const organizer = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}')`);
  const { id, task } = setup(organizer, holder);
  psql(`update public.roles set active = true where event_id = '${id}' and key = 'guests'`);
  task("Venue task", 10, null);
  psql(`insert into public.tasks (event_id, role_id, title, deadline)
    select '${id}', r.id, 'Guests secret', current_date + 3 from public.roles r
    where r.event_id = '${id}' and r.key = 'guests'`);

  await page.goto(`/events/${id}`);
  const venue = onTrack(page).getByRole("listitem").filter({ hasText: "Venue" });
  await expect(venue.getByRole("link")).toContainText("1 open");
  const guests = onTrack(page).getByRole("listitem").filter({ hasText: "Guests" });
  await expect(guests).toContainText("Tasks in Guests are visible to its team.");
  await expect(guests.getByRole("link")).toHaveCount(0);
  await expect(page.getByText("Guests secret")).toHaveCount(0);
  await expect(page.getByText(/guests? added/)).toHaveCount(0);
  await expect(page.getByText(/inactive Role/)).toHaveCount(0);
});
