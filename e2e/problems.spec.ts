import { expect, test } from "@playwright/test";
import { psql, seed, signedIn, unique } from "./support";

test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.65.${octet()}.${octet()}` });
});

test("an owner reports and resolves a problem; a plain holder cannot", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const holder = await signedIn(page, request);
  const organizer = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${organizer}')`);
  const id = seed(organizer, "30 days");
  psql(`update public.roles set active = true where event_id = '${id}' and key = 'venue'`);
  psql(`insert into public.role_members (event_id, role_id, user_id, name, joined_at)
    select '${id}', r.id, u.id, 'Hanna Holder', now()
    from public.roles r, auth.users u where r.event_id = '${id}' and r.key = 'venue' and u.email = '${holder}'`);
  const task = (title: string, owned: boolean) =>
    psql(`insert into public.tasks (event_id, role_id, title, deadline, owner_user_id, delegated_at, accepted_at)
      select '${id}', r.id, '${title}', current_date + 10,
        ${owned ? "(select id from auth.users where email = '" + holder + "')" : "null"},
        ${owned ? "now(), now()" : "null, null"}
      from public.roles r where r.event_id = '${id}' and r.key = 'venue' returning id`).split(
      "\n",
    )[0];
  const mine = task("My task", true);
  const other = task("Not mine", false);

  await page.goto(`/events/${id}/tasks/${other}`);
  await expect(page.getByRole("heading", { level: 1, name: "Not mine" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Report a problem" })).toHaveCount(0);

  await page.goto(`/events/${id}/tasks/${mine}`);
  await page.getByRole("button", { name: "Report a problem" }).click();
  await expect(page.getByRole("button", { name: "Report problem" })).toBeDisabled();
  await page.getByLabel("What has gone wrong").fill("The hall flooded");
  await expect(page.getByText("16 of 500")).toBeVisible();
  await page.getByRole("button", { name: "Report problem" }).click();
  await expect(page.getByRole("button", { name: "Resolve problem" })).toBeVisible();
  await expect(page.getByText("Problem reported").first()).toBeVisible();
  await expect(page.getByText("The hall flooded").first()).toBeVisible();

  await page.goto(`/events/${id}/tasks`);
  await expect(page.getByRole("link", { name: /My task/ })).toContainText("Problem reported");
  await expect(page.getByRole("link", { name: /My task/ })).toContainText("The hall flooded");
  await page.goto(`/events/${id}`);
  await expect(page.getByRole("region", { name: /^Needs you/ })).toContainText("The hall flooded");

  await page.goto(`/events/${id}/tasks/${mine}`);
  await page.getByRole("button", { name: "Resolve problem" }).click();
  await page.getByLabel("How it was solved (optional)").fill("Dried out");
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await expect(page.getByRole("button", { name: "Report a problem" })).toBeVisible();
  await expect(page.getByText("Problem resolved").first()).toBeVisible();
  await expect(page.getByText("Dried out")).toBeVisible();
  await expect(page.getByText("The hall flooded")).toBeVisible();
});
