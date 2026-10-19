import { expect, test } from "@playwright/test";
import { psql, seed, signedIn } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.61.${octet()}.${octet()}` });
});

test("the Organizer cancels a published Event with a note", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  await page.goto(`/events/${id}/settings`);

  // Escape and Keep event both close the dialog without cancelling.
  await page.getByRole("button", { name: "Cancel event" }).click();
  const dialog = page.getByRole("dialog", { name: "Cancel this event?" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Cancel event" }).click();
  await dialog.getByRole("button", { name: "Keep event" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Cancel event" }).click();
  await dialog.getByLabel("Note (optional)").fill("Moved to the spring.");
  await dialog.getByRole("button", { name: "Cancel event" }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${id}$`));
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await expect(page.getByText("Moved to the spring.")).toBeVisible();

  await page.goto(`/events/${id}/settings`);
  await expect(page.getByText("This event is over or cancelled")).toBeVisible();
  await expect(page.getByLabel("Starts")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cancel event" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete event" })).toBeVisible();

  await page.goto("/events");
  await page.getByText("Past events (1)").click();
  await expect(page.getByRole("link", { name: /^Seeded / })).toContainText("Cancelled");
});

test("the Organizer deletes an Event after typing its name", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days");
  await page.goto(`/events/${id}/settings`);

  await page.getByRole("button", { name: "Delete event" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this event?" });
  const confirm = dialog.getByRole("button", { name: "Delete event" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Event name").fill("Seede");
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Event name").fill(" Seeded ");
  await confirm.click();

  await expect(page).toHaveURL(/\/events\?deleted=event$/);
  await expect(page.getByRole("status").filter({ hasText: "Event deleted." })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Seeded / })).toHaveCount(0);
  expect(psql(`select count(*) from public.roles where event_id = '${id}'`).trim()).toBe("0");
  await page.goto(`/events/${id}`);
  await expect(
    page.getByRole("heading", { name: "You don't have access to this part of the event." }),
  ).toBeVisible();
});

test("the Organizer discards a draft without typing its name", async ({ page, request }) => {
  await signedIn(page, request);
  await page.getByRole("button", { name: "Create new event" }).click();
  await expect(page).toHaveURL(/\/setup$/);
  await page.goto(page.url().replace(/\/setup$/, "/settings"));

  await expect(page.getByRole("button", { name: "Cancel event" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete event" })).toHaveCount(0);
  await page.getByRole("button", { name: "Discard draft" }).click();
  await page
    .getByRole("dialog", { name: "Discard this draft?" })
    .getByRole("button", { name: "Discard draft" })
    .click();

  await expect(page).toHaveURL(/\/events\?deleted=draft$/);
  await expect(page.getByRole("status").filter({ hasText: "Draft discarded." })).toBeVisible();
  await expect(page.getByRole("link", { name: /Draft · continue setup/ })).toHaveCount(0);
});
