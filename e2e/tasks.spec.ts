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

test("the lead delegates a Task to a holder and sees who held it; a non-lead sees no control", async ({
  page,
  request,
}) => {
  const lead = await signedIn(page, request);
  const organizer = unique();
  const holder = unique();
  psql(
    `insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}'), (gen_random_uuid(), '${holder}')`,
  );
  const id = seed(organizer, "30 days");
  activate(id);
  psql(`insert into public.role_members (event_id, role_id, user_id, name, joined_at, is_lead)
    select '${id}', r.id, u.id, case when u.email = '${lead}' then 'Lena Lead' else 'Hanna Holder' end, now(), u.email = '${lead}'
    from public.roles r, auth.users u where r.event_id = '${id}' and r.key = 'venue' and u.email in ('${lead}', '${holder}')`);
  const task = psql(`insert into public.tasks (event_id, role_id, title, deadline)
    select '${id}', r.id, 'Rent tables', current_date + 5 from public.roles r
    where r.event_id = '${id}' and r.key = 'venue' returning id`).split("\n")[0];

  await page.goto(`/events/${id}/tasks/${task}`);
  await page.getByRole("button", { name: "Choose a person" }).click();
  await page.getByRole("option", { name: "Hanna Holder" }).click();
  await expect(page.getByText("Task delegated.")).toBeVisible();
  await expect(page.locator("dd", { hasText: "Hanna Holder" })).toBeVisible();
  expect(
    psql(`select count(*) from public.task_assignment_log where task_id = '${task}'`).split(
      "\n",
    )[0],
  ).toBe("1");

  // Handing it on shows who held it before
  await page.reload();
  await page.getByRole("button", { name: "Choose a person" }).click();
  await page.getByRole("option", { name: "Lena Lead" }).click();
  await expect(page.getByText("Held before by Hanna Holder")).toBeVisible();

  // A plain holder gets no control
  psql(`update public.role_members set is_lead = false where event_id = '${id}'`);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Delegate", exact: true })).toHaveCount(0);
});

test("the picker lists only who the caller may pick", async ({ page, request }) => {
  const me = await signedIn(page, request);
  const organizer = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}')`);
  const id = seed(organizer, "30 days");
  activate(id);
  const member = (role: string, name: string, joined: boolean, lead = false, owner = false) =>
    psql(`insert into public.role_members (event_id, role_id, user_id, name, joined_at, is_lead)
      select '${id}', r.id, ${owner || name === "Lena Lead" ? `(select id from auth.users where email = '${me}')` : "gen_random_uuid()"}, '${name}', ${joined ? "now()" : "null"}, ${lead}
      from public.roles r where r.event_id = '${id}' and r.key = '${role}'`);
  // Plain members need an auth row first, so give each its own account
  const account = (name: string, role: string, joined: boolean) => {
    const email = unique();
    psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${email}')`);
    psql(`insert into public.role_members (event_id, role_id, user_id, name, joined_at)
      select '${id}', r.id, u.id, '${name}', ${joined ? "now()" : "null"}
      from public.roles r, auth.users u where r.event_id = '${id}' and r.key = '${role}' and u.email = '${email}'`);
  };
  member("venue", "Lena Lead", true, true);
  account("Hanna Holder", "venue", true);
  account("Olga Owner", "venue", true);
  account("Pia Pending", "venue", false);
  account("Gunn Guests", "guests", true);
  const task = psql(`insert into public.tasks (event_id, role_id, title, deadline, owner_user_id)
    select '${id}', r.id, 'Rent tables', current_date + 5, m.user_id
    from public.roles r, public.role_members m
    where r.event_id = '${id}' and r.key = 'venue' and m.event_id = '${id}' and m.name = 'Olga Owner' returning id`).split(
    "\n",
  )[0];

  // The lead: joined holders of the Role only, never the owner
  await page.goto(`/events/${id}/tasks/${task}`);
  await page.getByRole("button", { name: "Choose a person" }).click();
  await expect(page.getByRole("option", { name: "Hanna Holder" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Lena Lead" })).toBeVisible();
  await expect(page.getByRole("option", { name: /Pia Pending/ })).toHaveCount(0);
  await expect(page.getByRole("option", { name: /Gunn Guests/ })).toHaveCount(0);
  await expect(page.getByRole("option", { name: /Olga Owner/ })).toHaveCount(0);

  // The Organizer: pending invitees and other Roles too, and themself
  psql(`delete from public.role_members where event_id = '${id}' and name = 'Lena Lead'`);
  psql(
    `update public.events set organizer_id = (select id from auth.users where email = '${me}') where id = '${id}'`,
  );
  await page.reload();
  await page.getByRole("button", { name: "Choose a person" }).click();
  await expect(page.getByRole("option", { name: "You" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Hanna Holder" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Gunn Guests" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Pia Pending Invite pending" })).toBeVisible();
  await expect(page.getByRole("option", { name: /Olga Owner/ })).toHaveCount(0);
});

test("the owner accepts a delegated Task once; a non-owner sees no banner", async ({
  page,
  request,
}) => {
  const holder = await signedIn(page, request);
  const organizer = unique();
  const other = unique();
  psql(
    `insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}'), (gen_random_uuid(), '${other}')`,
  );
  const id = seed(organizer, "30 days");
  activate(id);
  psql(`insert into public.role_members (event_id, role_id, user_id, name, joined_at)
    select '${id}', r.id, u.id, case when u.email = '${holder}' then 'Hanna Holder' else 'Olav Other' end, now()
    from public.roles r, auth.users u where r.event_id = '${id}' and r.key = 'venue' and u.email in ('${holder}', '${other}')`);
  const task = (title: string, email: string) =>
    psql(`insert into public.tasks (event_id, role_id, title, deadline, owner_user_id, delegated_at)
      select '${id}', r.id, '${title}', current_date + 5, u.id, now() from public.roles r, auth.users u
      where r.event_id = '${id}' and r.key = 'venue' and u.email = '${email}' returning id`).split(
      "\n",
    )[0];
  const mine = task("Hang the banner", holder);
  const theirs = task("Pick up the cake", other);
  const old = task("Mop the floor", holder);
  psql(`update public.tasks set delegated_at = now() - interval '3 days' where id = '${old}'`);

  await page.goto(`/events/${id}/tasks`);
  await expect(page.getByRole("link", { name: /Pick up the cake/ })).toContainText(
    "Delegated to Olav Other",
  );
  await expect(page.getByRole("link", { name: /Hang the banner/ })).toContainText(
    "Delegated to you",
  );

  await expect(page.getByRole("link", { name: /Mop the floor/ })).not.toContainText("days");
  await page.goto(`/events/${id}/tasks/${old}`);
  await expect(page.getByText("Not yet accepted", { exact: true })).toBeVisible();
  await expect(page.getByText(/\bdays?\b/)).toHaveCount(0);

  await page.goto(`/events/${id}/tasks/${theirs}`);
  await expect(page.getByRole("heading", { level: 1, name: "Pick up the cake" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept task" })).toHaveCount(0);

  await page.goto(`/events/${id}/tasks/${mine}`);
  await expect(page.getByText("Not yet accepted")).toBeVisible();
  await page.getByRole("button", { name: "Accept task" }).dblclick();
  await expect(page.getByText("Task accepted.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept task" })).toHaveCount(0);
  await expect(page.getByText("Accepted", { exact: true })).toBeVisible();
  expect(
    psql(
      `select count(*) from public.task_assignment_log where task_id = '${mine}' and kind = 'accepted'`,
    ).split("\n")[0],
  ).toBe("1");
});

test("the Organizer sees Delegated to, the accepted signal and the days a Task has waited", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const holder = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${holder}')`);
  const id = seed(email, "30 days");
  activate(id);
  psql(`insert into public.role_members (event_id, role_id, user_id, name, joined_at)
    select '${id}', r.id, u.id, 'Hanna Holder', now()
    from public.roles r, auth.users u where r.event_id = '${id}' and r.key = 'venue' and u.email = '${holder}'`);
  const task = (title: string, accepted: string) =>
    psql(`insert into public.tasks (event_id, role_id, title, deadline, owner_user_id, delegated_at, accepted_at)
      select '${id}', r.id, '${title}', current_date + 5, u.id, now() - interval '3 days', ${accepted}
      from public.roles r, auth.users u
      where r.event_id = '${id}' and r.key = 'venue' and u.email = '${holder}' returning id`).split(
      "\n",
    )[0];
  const waitingId = task("Waiting task", "null");
  task("Accepted task", "now()");

  await page.goto(`/events/${id}/tasks`);
  const waiting = page.getByRole("link", { name: /Waiting task/ });
  await expect(waiting).toContainText("Delegated to Hanna Holder");
  await expect(waiting).toContainText("Not yet accepted · 3 days");
  const accepted = page.getByRole("link", { name: /Accepted task/ });
  await expect(accepted).toContainText("Accepted");
  await expect(accepted).not.toContainText("Not yet accepted");

  await page.goto(`/events/${id}/tasks/${waitingId}`);
  await expect(page.getByText("Not yet accepted · 3 days")).toBeVisible();
});

test("a joined holder lands on My tasks, sees only their own Tasks, the Team and an Urgent badge", async ({
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
  const task = (
    title: string,
    role: "venue" | "guests",
    days: number,
    owner: "holder" | "organizer" | null,
    cols: Record<string, string> = {},
  ) => {
    const names = ["event_id", "role_id", "title", "deadline", "owner_user_id", "delegated_at"];
    const values = [
      `'${id}'`,
      "r.id",
      `'${title}'`,
      `current_date + ${days}`,
      owner ? "o.id" : "null",
      owner ? "now()" : "null",
    ];
    for (const [name, value] of Object.entries(cols)) {
      names.push(name);
      values.push(value);
    }
    psql(`insert into public.tasks (${names.join(", ")})
      select ${values.join(", ")} from public.roles r
      left join auth.users o on o.email = ${owner === "holder" ? `'${holder}'` : `'${organizer}'`}
      where r.event_id = '${id}' and r.key = '${role}'`);
  };
  const accepted = { accepted_at: "now()" };
  task("Accepted early", "venue", 2, "holder", accepted);
  task("Not accepted late", "venue", 9, "holder");
  task("Overdue one", "venue", -3, "holder", accepted);
  task("Nobody owns this", "venue", 4, null);
  task("Obsolete one", "venue", 4, "holder", { obsolete: "true" });
  task("Dismissed one", "venue", 4, "holder", { lifecycle: "'dismissed'" });
  task("Proposed one", "venue", 4, null, { lifecycle: "'proposed'" });
  task("Someone elses overdue", "venue", -3, "organizer", accepted);
  task("Obsolete overdue", "venue", -3, "holder", { obsolete: "true", ...accepted });
  task("Other role pending", "guests", 4, null);

  await page.goto(`/events/${id}`);
  await expect(page).toHaveURL(`/events/${id}/my-tasks`);
  await expect(page.getByRole("heading", { level: 1, name: "My tasks" })).toBeVisible();
  const rows = page
    .getByRole("main")
    .getByRole("link", { name: /Not accepted late|Accepted early|Overdue one/ });
  await expect(page.getByRole("link", { name: /Nobody owns this/ })).toHaveCount(0);
  for (const hidden of [
    "Obsolete one",
    "Dismissed one",
    "Proposed one",
    "Someone elses overdue",
    "Other role pending",
  ]) {
    await expect(page.getByRole("link", { name: new RegExp(hidden) })).toHaveCount(0);
  }
  await expect(rows.first()).toContainText("Not accepted late");
  await expect(page.getByRole("heading", { name: "Team & Roles" })).toBeVisible();
  await expect(page.getByText("Hanna Holder").first()).toBeVisible();

  await page.getByText("Show obsolete (2)").click();
  await expect(page.getByRole("link", { name: /Obsolete one/ })).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Main" }).first();
  await expect(nav.getByRole("link", { name: "My tasks, 1 overdue" })).toBeVisible();

  await page.getByRole("button", { name: "Not delegated" }).click();
  await expect(page.getByRole("status")).toContainText("Showing 1 pending task");
  await expect(page.getByRole("link", { name: /Nobody owns this/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Overdue one/ })).toHaveCount(0);
  for (const hidden of ["Dismissed one", "Proposed one", "Other role pending"]) {
    await expect(page.getByRole("link", { name: new RegExp(hidden) })).toHaveCount(0);
  }
});

test("the Organizer keeps the Event home, and Not delegated lists pending Tasks of every Role", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const id = seed(email, "30 days");
  activate(id);
  psql(`insert into public.tasks (event_id, role_id, title, deadline)
    select '${id}', r.id, 'Pending ' || r.key, current_date + 5 from public.roles r
    where r.event_id = '${id}' and r.key in ('venue', 'guests')`);

  await page.goto(`/events/${id}`);
  await expect(page).toHaveURL(`/events/${id}`);
  await page.goto(`/events/${id}/my-tasks`);
  await expect(page.getByText("You're all caught up.")).toBeVisible();
  await page.getByRole("button", { name: "Not delegated" }).click();
  await expect(page.getByRole("status")).toContainText("Showing 2 pending tasks");
  await expect(page.getByRole("link", { name: /Pending venue/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Pending guests/ })).toBeVisible();
});
