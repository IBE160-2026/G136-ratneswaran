import { expect, test } from "@playwright/test";
import { answerStep1, psql, seed, signedIn } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.63.${octet()}.${octet()}` });
});

test("step 2 adds pasted guests, reports the failed lines and lists the guests", async ({
  page,
  request,
}) => {
  await signedIn(page, request);
  await page.getByRole("button", { name: "Create new event" }).click();
  await expect(page).toHaveURL(/\/setup$/);
  const setup = page.url();
  await answerStep1(page);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/\/setup\/guests$/);
  await expect(page.getByText("Step 2 of 6")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Add your guests" })).toBeFocused();
  await expect(page.getByText("No guests yet. Add them by name and email.")).toBeVisible();
  await expect(page.getByRole("link", { name: /invite link/i })).toHaveCount(0);

  const rows = page.getByLabel("Guests, one per line");
  await rows.fill(
    "Ann Berg, ann@x.no\nBo\tbo@x.no\nCia Dahl <CIA@x.no>\nDan, dan@\nAnn again, ANN@x.no",
  );
  await page.getByRole("button", { name: "Add guests" }).click();
  await expect(page.getByRole("status").filter({ hasText: "3 guests added" })).toBeVisible();
  const failed = page.locator("#rows-failed").getByRole("listitem");
  await expect(failed).toHaveText([
    "Dan, dan@: Invalid email.",
    "Ann again, ANN@x.no: Duplicate email.",
  ]);
  await expect(rows).toHaveValue("Dan, dan@\nAnn again, ANN@x.no");
  await expect(rows).toHaveAttribute("aria-invalid", "true");
  await expect(rows).toBeFocused();

  const list = page.getByRole("region", { name: "3 guests" });
  await expect(list.getByRole("listitem")).toHaveCount(3);
  await expect(list.getByRole("listitem").filter({ hasText: "Cia Dahl" })).toContainText(
    "CIA@x.no",
  );
  await expect(list.getByText("Not invited yet")).toHaveCount(3);

  await page.reload();
  await expect(page.getByRole("region", { name: "3 guests" })).toBeVisible();
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(setup);
  await page.goto(`${setup}/description`);
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(`${setup}/guests`);
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(`${setup}/description`);
});

test("the Guests page is in the sidebar and refuses an email already on the list", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/events/${id}`);
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Guests" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/events/${id}/guests$`));
  await expect(page).toHaveTitle("Guests – Seeded – Arrangly");
  await expect(page.getByRole("heading", { level: 1, name: "Guests" })).toBeVisible();
  await expect(page.getByText("No guests yet. Add them by name and email.")).toBeVisible();

  const rows = page.getByLabel("Guests, one per line");
  await rows.fill("Ann Berg, ann@x.no");
  await page.getByRole("button", { name: "Add guests" }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 guest added" })).toBeVisible();
  await expect(rows).toHaveValue("");

  await rows.fill("Ann B, Ann@X.no");
  await page.getByRole("button", { name: "Add guests" }).click();
  await expect(page.getByRole("status").filter({ hasText: "No guests added" })).toBeVisible();
  await expect(page.locator("#rows-failed").getByRole("listitem")).toHaveText([
    "Ann B, Ann@X.no: Already on the list.",
  ]);
  await expect(page.getByRole("region", { name: "1 guest" })).toBeVisible();
});

test("the guest list reads at 320px", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  psql(`with g as (insert into public.guests (event_id, name)
      values ('${id}', 'Annabelle Christina Bergersen-Dahl') returning id, event_id)
    insert into public.guest_contacts (guest_id, event_id, email)
    select id, event_id, 'annabelle.christina.bergersen-dahl@example.com' from g`);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(`/events/${id}/guests`);
  await expect(page.getByText("Not invited yet")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test("a cancelled Event shows its guests without the form", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  psql(`update public.events set cancelled_at = now() where id = '${id}'`);
  await page.goto(`/events/${id}/guests`);
  await expect(page.getByText("This event is over or cancelled")).toBeVisible();
  await expect(page.getByLabel("Guests, one per line")).toHaveCount(0);
  await page.goto(`/events/${id}/setup/guests`);
  await expect(page).toHaveURL(new RegExp(`/events/${id}$`));
});
