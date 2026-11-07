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

test.describe("List view", () => {
  test("phone default is the List; rows wrap, stay 44px high and open the Task", async ({
    page,
    request,
  }) => {
    const organizer = await signedIn(page, request);
    const { id, task, idOf } = setup(organizer, null);
    const long = "Confirm the extremely long named caterer delivery arrangements for the hall";
    task("venue", long, 10);
    task("venue", "Hang banner", 15);
    psql(`update public.tasks set parent_task_id = '${idOf(long)}'
      where id = '${idOf("Hang banner")}'`);
    task("program", "Plan speeches", 12);
    psql(
      `update public.roles set active = true where event_id = '${id}' and key = 'entertainment'`,
    );
    const noOverflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      );

    for (const width of [375, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`/events/${id}/timeline`);
      await expect(page.getByRole("heading", { level: 2, name: "Venue" })).toBeVisible();
      await expect(page.getByRole("region", { name: "Timeline" })).toBeHidden();
      await expect(page.getByRole("link", { name: "List" })).toHaveAttribute(
        "aria-current",
        "true",
      );
      expect(await noOverflow()).toBe(true);
      for (const link of await page.getByRole("list", { name: "Venue" }).getByRole("link").all()) {
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
    }
    await expect(page.getByText("No tasks in this Role yet")).toBeVisible();
    const parent = page.getByRole("listitem").filter({ hasText: long }).first();
    await expect(
      parent.getByRole("list").getByRole("link", { name: /^Hang banner/ }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Swimlanes" }).click();
    await expect(page).toHaveURL(`/events/${id}/timeline?view=lanes`);
    await expect(page.getByRole("region", { name: "Timeline" })).toBeVisible();
    await page.getByRole("link", { name: "List" }).click();
    await expect(page).toHaveURL(`/events/${id}/timeline?view=list`);

    await page.getByRole("link", { name: /^Plan speeches/ }).click();
    await expect(page).toHaveURL(new RegExp(`/events/${id}/tasks/${idOf("Plan speeches")}`));
  });

  test("desktop default is swimlanes; ?view=list shows the List with matching link names", async ({
    page,
    request,
  }) => {
    const organizer = await signedIn(page, request);
    const { id, task } = setup(organizer, null);
    task("venue", "Book hall", 10);
    task("venue", "Old task", 11, "obsolete");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/events/${id}/timeline`);
    await expect(page.getByRole("region", { name: "Timeline" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Swimlanes" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    const laneName = await page
      .getByRole("region", { name: "Timeline" })
      .getByRole("link", { name: /^Book hall/ })
      .getAttribute("aria-label");

    await page.goto(`/events/${id}/timeline?view=list`);
    await expect(page.getByRole("region", { name: "Timeline" })).toBeHidden();
    await expect(page.getByRole("link", { name: /^Book hall/ })).toHaveAttribute(
      "aria-label",
      laneName!,
    );
    await page.getByRole("link", { name: "Show obsolete (1)" }).click();
    await expect(page).toHaveURL(`/events/${id}/timeline?view=list&obsolete=1`);
    await expect(page.getByRole("link", { name: /^Old task, .*Obsolete/ })).toBeVisible();
    await page.getByRole("link", { name: "Swimlanes" }).click();
    await expect(page).toHaveURL(`/events/${id}/timeline?view=lanes&obsolete=1`);
    await page.getByRole("link", { name: "Hide obsolete" }).click();
    await expect(page).toHaveURL(`/events/${id}/timeline?view=lanes`);

    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(`/events/${id}/timeline?view=bogus`);
    await expect(page.getByRole("link", { name: /^Book hall/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Timeline" })).toBeHidden();
    await expect(page.getByRole("link", { name: "List" })).toHaveAttribute("aria-current", "true");
  });

  test("a holder sees the unreadable text and no inactive-Role line; the Organizer does", async ({
    page,
    request,
  }) => {
    const holder = await signedIn(page, request);
    const organizer = unique();
    psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}')`);
    const { id, task } = setup(organizer, holder);
    task("venue", "Mine to do", 10);
    task("program", "Secret program task", 12);

    await page.goto(`/events/${id}/timeline?view=list`);
    await expect(
      page.getByText("Tasks in Program are visible to its team.").filter({ visible: true }),
    ).toBeVisible();
    await expect(page.getByText("Secret program task")).toHaveCount(0);
    await expect(page.getByText(/belong to inactive Roles?/)).toHaveCount(0);
  });

  test("the Organizer sees the inactive-Role line linking to Team & Roles", async ({
    page,
    request,
  }) => {
    const organizer = await signedIn(page, request);
    const { id, task } = setup(organizer, null);
    task("venue", "Book hall", 10);
    task("program", "Plan speeches", 12);
    task("program", "Plan music", 13);
    psql(`update public.roles set active = false where event_id = '${id}' and key = 'program'`);
    await page.goto(`/events/${id}/timeline?view=list`);
    await expect(
      page.getByRole("link", { name: "2 tasks belong to inactive Roles" }),
    ).toHaveAttribute("href", `/events/${id}/team`);
  });
});
