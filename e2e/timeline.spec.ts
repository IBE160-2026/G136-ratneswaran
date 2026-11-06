import { expect, test } from "@playwright/test";
import { psql, seed, signedIn, unique } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.66.${octet()}.${octet()}` });
});

/** An Event with Venue and Program active; `holder` joins Venue only. */
function setup(organizer: string, holder: string | null) {
  const id = seed(organizer, "30 days");
  psql(
    `update public.roles set active = true where event_id = '${id}' and key in ('venue', 'program')`,
  );
  if (holder) {
    psql(`insert into public.role_members (event_id, role_id, user_id, name, joined_at)
      select '${id}', r.id, u.id, 'Hanna Holder', now()
      from public.roles r, auth.users u where r.event_id = '${id}' and r.key = 'venue' and u.email = '${holder}'`);
  }
  const task = (key: string, title: string, days: number, extra = "") =>
    psql(`insert into public.tasks (event_id, role_id, title, deadline, obsolete)
      select '${id}', r.id, '${title}', current_date + ${days}, ${extra === "obsolete"} from public.roles r
      where r.event_id = '${id}' and r.key = '${key}'`);
  const idOf = (title: string) =>
    psql(`select id from public.tasks where event_id = '${id}' and title = '${title}'`).trim();
  return { id, task, idOf };
}

test("the Organizer reads lanes, a Subtask, a blocked bar and opens a Task", async ({
  page,
  request,
}) => {
  const organizer = await signedIn(page, request);
  const { id, task, idOf } = setup(organizer, null);
  task("venue", "Book hall", 10);
  task("venue", "Decorate hall", 20);
  task("venue", "Hang banner", 15);
  task("program", "Plan speeches", 12);
  psql(`update public.tasks set parent_task_id = '${idOf("Decorate hall")}'
    where id = '${idOf("Hang banner")}'`);
  psql(`insert into public.task_dependencies (task_id, depends_on_id)
    values ('${idOf("Decorate hall")}', '${idOf("Book hall")}')`);

  await page.goto(`/events/${id}`);
  await page
    .getByRole("navigation", { name: "Main" })
    .first()
    .getByRole("link", { name: "Timeline" })
    .click();
  await expect(page).toHaveURL(`/events/${id}/timeline`);
  await expect(page).toHaveTitle("Timeline – Seeded – Arrangly");
  await expect(page.getByRole("heading", { level: 1, name: "Timeline" })).toBeVisible();
  const region = page.getByRole("region", { name: "Timeline" });
  await expect(region).toHaveAttribute("tabindex", "0");
  await expect(region.getByRole("list", { name: "Venue" })).toBeVisible();
  await expect(region.getByRole("list", { name: "Program" })).toBeVisible();
  const parent = region.getByRole("listitem").filter({ hasText: "Decorate hall" }).first();
  await expect(parent.getByRole("list").getByRole("link", { name: /^Hang banner/ })).toBeVisible();
  await expect(
    region.getByRole("link", { name: /^Decorate hall, .*, waits for Book hall$/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Jump to today" }).click();

  await region.getByRole("link", { name: /^Plan speeches/ }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${id}/tasks/${idOf("Plan speeches")}`));
});

test("a holder sees another Role's lane with the unreadable text and no bars", async ({
  page,
  request,
}) => {
  const holder = await signedIn(page, request);
  const organizer = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}')`);
  const { id, task } = setup(organizer, holder);
  task("venue", "Mine to do", 10);
  task("program", "Secret program task", 12);

  await page.goto(`/events/${id}/timeline`);
  const region = page.getByRole("region", { name: "Timeline" });
  await expect(region.getByRole("link", { name: /^Mine to do/ })).toBeVisible();
  await expect(region.getByText("Tasks in Program are visible to its team.")).toBeVisible();
  await expect(region.getByRole("heading", { name: "Program" })).toBeVisible();
  await expect(page.getByText("Secret program task")).toHaveCount(0);
});

test("Show obsolete survives a reload", async ({ page, request }) => {
  const organizer = await signedIn(page, request);
  const { id, task } = setup(organizer, null);
  task("venue", "Live task", 10);
  task("venue", "Old task", 11, "obsolete");

  await page.goto(`/events/${id}/timeline`);
  await expect(page.getByRole("link", { name: /^Old task/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Show obsolete (1)" }).click();
  await expect(page).toHaveURL(`/events/${id}/timeline?obsolete=1`);
  await page.reload();
  await expect(page.getByRole("link", { name: /^Old task, .*Obsolete/ })).toBeVisible();
});

test("an empty Event offers New task; a cancelled one is read-only; two years scroll", async ({
  page,
  request,
}) => {
  const organizer = await signedIn(page, request);
  const { id, task } = setup(organizer, null);
  await page.goto(`/events/${id}/timeline`);
  await expect(page.getByText("The timeline fills in as tasks are added.")).toBeVisible();
  await expect(page.getByRole("link", { name: "New task" })).toBeVisible();

  task("venue", "Late permit", -3);
  task("venue", "Far away", 700);
  await page.goto(`/events/${id}/timeline`);
  await expect(page.getByRole("link", { name: /^Late permit, .*, Overdue 3 days$/ })).toBeVisible();
  const region = page.getByRole("region", { name: "Timeline" });
  expect(await region.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await page.getByRole("button", { name: "Jump to today" }).click();
  await expect(page.getByText("Today", { exact: true })).toBeVisible();

  psql(`update public.events set cancelled_at = now() where id = '${id}'`);
  await page.goto(`/events/${id}/timeline`);
  await expect(page.getByText(/can no longer be changed/)).toBeVisible();
  await expect(page.getByRole("link", { name: "New task" })).toHaveCount(0);
});
