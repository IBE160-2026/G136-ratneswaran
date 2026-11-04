import { expect, test } from "@playwright/test";
import { psql, seed, signedIn, unique } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.64.${octet()}.${octet()}` });
});

const activate = (eventId: string) =>
  psql(
    `update public.roles set active = true where event_id = '${eventId}' and key in ('venue', 'guests')`,
  );

test("the Organizer creates, opens, edits, dismisses with Undo and restores a Task", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const id = seed(email, "30 days");
  activate(id);

  await page.goto(`/events/${id}/tasks`);
  await expect(page.getByRole("heading", { level: 1, name: "Tasks" })).toBeVisible();
  await expect(page.getByText("No tasks yet.")).toBeVisible();

  // An out-of-range count is an inline error with focus on the field
  await page.getByLabel("Title").fill("Book the hall");
  await page.getByLabel("Days before the event", { exact: true }).check();
  await page.getByLabel("Days before the event starts").fill("366");
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page.getByText("Enter a whole number from 0 to 365.")).toBeVisible();
  await expect(page.getByLabel("Days before the event starts")).toBeFocused();

  await page.getByLabel("Days before the event starts").fill("14");
  await page.getByRole("button", { name: "Create task" }).click();
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: "Book the hall" })).toBeVisible();
  await expect(page.getByText("14 days before the event")).toBeVisible();
  await expect(page.getByText("Not delegated")).toBeVisible();
  await expect(page.getByRole("definition").filter({ hasText: "Not started" })).toBeVisible();

  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel("Title").fill("Book the big hall");
  await page.getByLabel("Description (optional)").fill("Ask about parking");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Book the big hall" })).toBeVisible();
  await expect(page.getByText("Ask about parking")).toBeVisible();

  await page.getByRole("button", { name: "Dismiss" }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Dismiss" })).toBeVisible();
  await expect(page.getByText("This task is dismissed.")).toHaveCount(0);

  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByText("This task is dismissed.")).toBeVisible();
  await page.getByRole("link", { name: "All tasks" }).click();
  await page.getByText("Show dismissed (1)").click();
  await page.getByRole("button", { name: /^Restore/ }).click();
  await expect(page.getByRole("link", { name: /Book the big hall/ })).toBeVisible();
});

test("a holder cannot create, and a Task of another Role shows the no-access page", async ({
  page,
  request,
}) => {
  const holder = await signedIn(page, request);
  const organizer = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}')`);
  const id = seed(organizer, "30 days");
  activate(id);
  psql(`insert into public.role_members (event_id, role_id, user_id, name, joined_at)
    select '${id}', r.id, u.id, 'Hanna Holder', now()
    from public.roles r, auth.users u where r.event_id = '${id}' and r.key = 'venue' and u.email = '${holder}'`);
  const task = (key: string, title: string) =>
    psql(`insert into public.tasks (event_id, role_id, title, deadline)
      select '${id}', r.id, '${title}', current_date + 10 from public.roles r
      where r.event_id = '${id}' and r.key = '${key}' returning id`).split("\n")[0];
  task("venue", "Venue task");
  const other = task("guests", "Guests task");

  await page.goto(`/events/${id}/tasks`);
  await expect(page.getByRole("link", { name: /Venue task/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Guests task/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "New task" })).toHaveCount(0);

  await page.getByRole("link", { name: /Venue task/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Venue task" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Edit|Dismiss/ })).toHaveCount(0);
  // A holder who does not own the Task cannot add Subtasks or dependencies
  await expect(page.getByRole("heading", { name: "Subtasks" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add subtask" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add dependency" })).toHaveCount(0);

  await page.goto(`/events/${id}/tasks/${other}`);
  await expect(
    page.getByRole("heading", { name: "You don't have access to this part of the event." }),
  ).toBeVisible();
  await expect(page.getByText("Guests task")).toHaveCount(0);

  // The lead of Venue may create there, and only there
  psql(`update public.role_members set is_lead = true where event_id = '${id}'`);
  await page.goto(`/events/${id}/tasks`);
  await expect(page.getByRole("heading", { name: "New task" })).toBeVisible();
  await expect(page.getByLabel("Role").locator("option")).toHaveText(["Venue"]);

  await page.getByRole("link", { name: /Venue task/ }).click();
  await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dismiss" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add subtask" })).toBeVisible();
  await page.goto(`/events/${id}/tasks/${other}`);
  await expect(
    page.getByRole("heading", { name: "You don't have access to this part of the event." }),
  ).toBeVisible();
});

test("a Task gets a Subtask and a dependency, shows Blocked, and cannot be dismissed with open links", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const id = seed(email, "30 days");
  activate(id);
  const task = (title: string) =>
    psql(`insert into public.tasks (event_id, role_id, title, deadline)
      select '${id}', r.id, '${title}', current_date + 10 from public.roles r
      where r.event_id = '${id}' and r.key = 'venue' returning id`).split("\n")[0];
  const waiting = task("Send invitations");
  task("Confirm the venue");

  await page.goto(`/events/${id}/tasks/${waiting}`);
  await page.getByLabel("Subtask title").fill("Print the cards");
  await page.getByLabel("Subtask deadline").fill("2027-01-10");
  await page.getByRole("button", { name: "Add subtask" }).click();
  await expect(page.getByRole("link", { name: /Print the cards/ })).toBeVisible();

  await page.getByLabel("Waits for").selectOption({ label: "Confirm the venue" });
  await page.getByRole("button", { name: "Add dependency" }).click();
  await expect(page.getByText("Waits for: Confirm the venue").first()).toBeVisible();

  // The Subtask is not listed at the top level; its parent shows the count and that it waits
  await page.getByRole("link", { name: "All tasks" }).click();
  await expect(page.getByRole("link", { name: /Print the cards/ })).toHaveCount(0);
  const row = page.getByRole("link", { name: /Send invitations/ });
  await expect(row).toContainText("1 subtask");
  await expect(row).toContainText("Waits for: Confirm the venue");
  await expect(page.getByRole("link", { name: /Not started Confirm the venue/ })).toContainText(
    "Blocks 1 task",
  );

  // Dismiss is refused while links are open, and the message says why
  await page.getByRole("link", { name: /Not started Confirm the venue/ }).click();
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByText(/has Subtasks or tasks that depend on it/)).toBeVisible();
  await expect(page.getByText("This task is dismissed.")).toHaveCount(0);

  // Removing the dependency unblocks at once
  await page.goto(`/events/${id}/tasks/${waiting}`);
  await page.getByRole("button", { name: /^Remove: Confirm the venue/ }).click();
  await expect(page.getByText("Waits for: Confirm the venue")).toHaveCount(0);

  // The Subtask opens on its own page with a link back and Promote to task
  await page.getByRole("link", { name: /Print the cards/ }).click();
  await expect(page.getByRole("link", { name: "Part of Send invitations" })).toBeVisible();
  await page.getByRole("button", { name: "Promote to task" }).click();
  await expect(page.getByRole("link", { name: "Part of Send invitations" })).toHaveCount(0);
});

test("a Done or dismissed waiting Task loses Waits for, and restoring under a dismissed parent says why", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const id = seed(email, "30 days");
  activate(id);
  const task = (title: string, parent = "null") =>
    psql(`insert into public.tasks (event_id, role_id, title, deadline, parent_task_id)
      select '${id}', r.id, '${title}', current_date + 10, ${parent} from public.roles r
      where r.event_id = '${id}' and r.key = 'venue' returning id`).split("\n")[0];
  const waiting = task("Waiting task");
  const blocker = task("Blocking task");
  psql(`insert into public.task_dependencies values ('${waiting}', '${blocker}')`);

  await page.goto(`/events/${id}/tasks`);
  await expect(page.getByRole("link", { name: /Waiting task/ })).toContainText(
    "Waits for: Blocking task",
  );

  psql(`update public.tasks set status = 'done' where id = '${waiting}'`);
  await page.goto(`/events/${id}/tasks`);
  await expect(page.getByRole("link", { name: /Waiting task/ })).not.toContainText("Waits for");
  await page.goto(`/events/${id}/tasks/${waiting}`);
  await expect(page.getByRole("heading", { level: 1, name: "Waiting task" })).toBeVisible();
  await expect(page.getByText("Waits for: Blocking task")).toHaveCount(0);

  psql(
    `update public.tasks set status = 'not_started', lifecycle = 'dismissed' where id = '${waiting}'`,
  );
  await page.goto(`/events/${id}/tasks/${waiting}`);
  await expect(page.getByText("This task is dismissed.")).toBeVisible();
  await expect(page.getByText("Waits for: Blocking task")).toHaveCount(0);

  // A dismissed Subtask cannot come back under a dismissed parent
  const parent = task("Parent task");
  const sub = task("Child task", `'${parent}'`);
  psql(`update public.tasks set lifecycle = 'dismissed' where id = '${sub}'`);
  await page.goto(`/events/${id}/tasks/${parent}`);
  await page.getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByText("This task is dismissed.")).toBeVisible();
  await page.getByRole("link", { name: "All tasks" }).click();
  await page.getByText(/Show dismissed/).click();
  await page.getByRole("button", { name: /^Restore: Child task/ }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Restore the parent task first." }),
  ).toBeVisible();
});

test("the owner sets a status with a note, sees the history and removes the note; an overdue row says so", async ({
  page,
  request,
}) => {
  const owner = await signedIn(page, request);
  const organizer = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}')`);
  const id = seed(organizer, "30 days");
  activate(id);
  psql(`insert into public.role_members (event_id, role_id, user_id, name, joined_at)
    select '${id}', r.id, u.id, 'Olga Owner', now()
    from public.roles r, auth.users u where r.event_id = '${id}' and r.key = 'venue' and u.email = '${owner}'`);
  psql(`insert into public.tasks (event_id, role_id, title, deadline, owner_user_id)
    select '${id}', r.id, 'Book the band', current_date - 2, u.id
    from public.roles r, auth.users u
    where r.event_id = '${id}' and r.key = 'venue' and u.email = '${owner}'`);

  await page.goto(`/events/${id}/tasks`);
  await expect(page.getByRole("link", { name: /Book the band/ })).toContainText(
    /Overdue \d+ days?/,
  );

  await page.getByRole("link", { name: /Book the band/ }).click();
  await expect(page.getByText(/Overdue \d+ days?/).first()).toBeVisible();
  await page.getByLabel("Note (optional)").fill("Called the agency");
  await page.getByRole("button", { name: "In progress" }).click();
  await expect(page.getByRole("button", { name: "In progress" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText("Called the agency")).toBeVisible();
  await expect(page.getByText(/Olga Owner/)).toBeVisible();

  await page.getByRole("button", { name: "Waiting on external" }).click();
  await expect(page.getByRole("list").filter({ hasText: "Waiting on external" })).toBeVisible();

  await page.getByRole("button", { name: /^Remove the note from In progress/ }).click();
  await page.getByRole("button", { name: "Remove note" }).click();
  await expect(page.getByText("Note removed")).toBeVisible();
  await expect(page.getByText("Called the agency")).toHaveCount(0);

  // Done ends the Overdue state
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.goto(`/events/${id}/tasks`);
  await expect(page.getByRole("link", { name: /Book the band/ })).not.toContainText("Overdue");
});

test("a holder who does not own the Task sees its status but no control", async ({
  page,
  request,
}) => {
  const holder = await signedIn(page, request);
  const organizer = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}')`);
  const id = seed(organizer, "30 days");
  activate(id);
  psql(`insert into public.role_members (event_id, role_id, user_id, name, joined_at)
    select '${id}', r.id, u.id, 'Hanna Holder', now()
    from public.roles r, auth.users u where r.event_id = '${id}' and r.key = 'venue' and u.email = '${holder}'`);
  const task = psql(`insert into public.tasks (event_id, role_id, title, deadline)
    select '${id}', r.id, 'Order chairs', current_date + 5 from public.roles r
    where r.event_id = '${id}' and r.key = 'venue' returning id`).split("\n")[0];

  await page.goto(`/events/${id}/tasks/${task}`);
  await expect(page.getByRole("heading", { level: 1, name: "Order chairs" })).toBeVisible();
  await expect(page.getByText("Not started").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "In progress" })).toHaveCount(0);
  await expect(page.getByLabel("Note (optional)")).toHaveCount(0);
  await expect(page.getByText("No status changes yet.")).toBeVisible();
});
