import { expect, test } from "@playwright/test";
import { answerStep1, psql, seed, signedIn } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.63.${octet()}.${octet()}` });
});

/** Inserts one guest with its contact; callers pass literals without quotes. */
const addGuest = (eventId: string, name: string, email: string) =>
  psql(`with g as (insert into public.guests (event_id, name)
      values ('${eventId}', '${name}') returning id, event_id)
    insert into public.guest_contacts (guest_id, event_id, email)
    select id, event_id, '${email}' from g`);

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

  // Oldest first, not alphabetical.
  await rows.fill("Aaron, aaron@x.no");
  await page.getByRole("button", { name: "Add guests" }).click();
  await expect(page.getByRole("region", { name: "2 guests" }).getByRole("listitem")).toHaveText([
    /^Ann Berg/,
    /^Aaron/,
  ]);
});

test("a failed add offers Retry and adds once back online", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  await page.goto(`/events/${id}/guests`);
  await page.getByLabel("Guests, one per line").fill("Ann Berg, ann@x.no");
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Add guests" }).click();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await page.context().setOffline(false);
  await expect(page.getByRole("status").filter({ hasText: "1 guest added" })).toBeVisible();
});

test("a list of 40 guests reads at 320px", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  addGuest(
    id,
    "Annabelle Christina Bergersen-Dahl",
    "annabelle.christina.bergersen-dahl@example.com",
  );
  psql(`with g as (insert into public.guests (event_id, name)
      select '${id}', 'Guest ' || i from generate_series(1, 39) as i returning id, event_id, name)
    insert into public.guest_contacts (guest_id, event_id, email)
    select id, event_id, replace(lower(name), ' ', '') || '@example.com' from g`);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(`/events/${id}/guests`);
  await expect(page.getByRole("heading", { level: 2, name: "40 guests" })).toBeVisible();
  await expect(page.getByText("Not invited yet")).toHaveCount(40);
  const overflows = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  expect(await overflows()).toBe(false);
  await page.getByRole("button", { name: "Edit Annabelle Christina Bergersen-Dahl" }).click();
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
  expect(await overflows()).toBe(false);
});

test("a cancelled Event shows its guests without the form", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  addGuest(id, "Ann Berg", "ann@x.no");
  psql(`update public.events set cancelled_at = now() where id = '${id}'`);
  await page.goto(`/events/${id}/guests`);
  await expect(page.getByText("This event is over or cancelled")).toBeVisible();
  await expect(page.getByLabel("Guests, one per line")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "1 guest" })).toContainText("Ann Berg");
  await expect(page.getByRole("button", { name: /^(Edit|Remove) / })).toHaveCount(0);
  await page.goto(`/events/${id}/setup/guests`);
  await expect(page).toHaveURL(new RegExp(`/events/${id}$`));
});

test("a guest's name and email are edited inline, under the rules of adding", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  addGuest(id, "Ann Berg", "ann@x.no");
  addGuest(id, "Bo", "bo@x.no");
  await page.goto(`/events/${id}/guests`);

  await page.getByRole("button", { name: "Edit Ann Berg" }).click();
  const name = page.getByLabel("Name", { exact: true });
  await expect(name).toBeFocused();
  await expect(name).toHaveValue("Ann Berg");
  const contact = page.getByLabel("Email", { exact: true });
  await contact.fill("BO@x.no");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(contact).toHaveAttribute("aria-invalid", "true");
  await expect(contact).toBeFocused();
  await expect(page.getByText("Already on the list.")).toBeVisible();

  await name.fill("Ann Dahl");
  await contact.fill("ann.berg@x.no");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Edit Ann Dahl" })).toBeFocused();
  await page.reload();
  await expect(page.getByRole("region", { name: "2 guests" }).getByRole("listitem")).toHaveText([
    /^Ann Dahl\s*ann\.berg@x\.no/,
    /^Bo/,
  ]);

  await page.getByRole("button", { name: "Edit Bo" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Bob");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Edit Bo" })).toBeFocused();
});

test("a removed guest comes back with Undo, and stays gone without it", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  addGuest(id, "Ann Berg", "ann@x.no");
  addGuest(id, "Bo", "bo@x.no");
  await page.goto(`/events/${id}/guests`);

  await page.getByRole("button", { name: "Remove Ann Berg" }).click();
  await expect(page.getByRole("button", { name: "Edit Bo" })).toBeFocused();
  await expect(page.getByRole("region", { name: "1 guest" })).toBeVisible();
  await expect(page.getByText("Ann Berg removed.")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  // The restored guest returns at the end of the list.
  await expect(page.getByRole("region", { name: "2 guests" }).getByRole("listitem")).toHaveText([
    /^Bo/,
    /^Ann Berg\s*ann@x\.no/,
  ]);

  await page.getByRole("button", { name: "Remove Bo" }).click();
  await expect(page.getByText("Bo removed.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "1 guest" }).getByRole("listitem")).toHaveText([
    /^Ann Berg/,
  ]);

  await page.getByRole("button", { name: "Remove Ann Berg" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Guests" })).toBeFocused();
  await expect(page.getByText("No guests yet. Add them by name and email.")).toBeVisible();
});

test("Undo after the email was added again duplicates nothing", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  addGuest(id, "Ann Berg", "ann@x.no");
  await page.goto(`/events/${id}/guests`);

  await page.getByRole("button", { name: "Remove Ann Berg" }).click();
  await expect(page.getByText("Ann Berg removed.")).toBeVisible();
  await page.getByLabel("Guests, one per line").fill("Ann Berg, ann@x.no");
  await page.getByRole("button", { name: "Add guests" }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 guest added" })).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(
    page.getByText("That email is on the list again, so nothing was brought back."),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "1 guest" }).getByRole("listitem")).toHaveText([
    /^Ann Berg/,
  ]);
});
