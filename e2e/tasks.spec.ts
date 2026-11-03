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
  await expect(page.getByText("Not started")).toBeVisible();

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
  await page.goto(`/events/${id}/tasks/${other}`);
  await expect(
    page.getByRole("heading", { name: "You don't have access to this part of the event." }),
  ).toBeVisible();
});
