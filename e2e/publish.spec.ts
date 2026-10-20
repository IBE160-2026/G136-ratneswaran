import { expect, test, type Page } from "@playwright/test";
import { answerStep1, psql, seed, signedIn } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.62.${octet()}.${octet()}` });
});

const next = (page: Page) => page.getByRole("button", { name: "Next", exact: true });

test("step 3 saves the name and description and shows them again", async ({ page, request }) => {
  await signedIn(page, request);
  await page.getByRole("button", { name: "Create new event" }).click();
  await expect(page).toHaveURL(/\/setup$/);
  const setup = page.url();
  await answerStep1(page);
  await next(page).click();
  await expect(page).toHaveURL(/\/setup\/guests$/);
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/\/setup\/description$/);
  await expect(page.getByText("Step 3 of 6")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

  const description = page.getByLabel("Description");
  await page.getByLabel("Event name").fill("Lucas 40");
  await expect(description).toHaveAttribute("maxlength", "2000");
  await description.fill("Dinner, speeches, a quiz and a DJ.");
  await next(page).click();
  await expect(page).toHaveURL(setup.replace(/\/setup$/, ""));
  await expect(page.getByRole("heading", { level: 1, name: "Lucas 40" })).toBeVisible();

  await page.goto(`${setup}/description`);
  await expect(page.getByLabel("Event name")).toHaveValue("Lucas 40");
  await expect(description).toHaveValue("Dinner, speeches, a quiz and a DJ.");
  await page.getByRole("link", { name: "Back" }).click();
  await expect(page).toHaveURL(`${setup}/guests`);
});

test("an incomplete draft lists exactly what is missing and cannot be published", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days", false);
  psql(`update public.events set name = null, ends_at = null where id = '${id}'`);
  await page.goto(`/events/${id}`);
  await expect(
    page.getByText("Only your team can see this event. Publish to send invitations."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Publish" }).click();
  const dialog = page.getByRole("dialog", { name: "Publish this event?" });
  await expect(dialog.getByRole("listitem")).toHaveText(["Event name", "End time"]);
  await expect(dialog.getByRole("button", { name: "Publish" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(psql(`select published_at is null from public.events where id = '${id}'`).trim()).toBe(
    "t",
  );
});

test("a stale tab learns from the refusal what is missing", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days", false);
  await page.goto(`/events/${id}`);
  psql(`update public.events set ends_at = null where id = '${id}'`);

  await page.getByRole("button", { name: "Publish" }).click();
  const dialog = page.getByRole("dialog", { name: "Publish this event?" });
  await dialog.getByRole("button", { name: "Publish" }).click();
  await expect(dialog.getByRole("listitem")).toHaveText(["End time"]);
  await expect(dialog.getByRole("button", { name: "Publish" })).toHaveCount(0);
});

test("a complete draft is published once, the banner goes, and its settings stay editable", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const id = seed(email, "7 days", false);
  await page.goto(`/events/${id}`);

  await page.getByRole("button", { name: "Publish" }).click();
  const dialog = page.getByRole("dialog", { name: "Publish this event?" });
  await expect(dialog).toContainText("Guests aren't invited yet");
  await dialog.getByRole("button", { name: "Not yet" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Publish" }).click();
  await dialog.getByRole("button", { name: "Publish" }).dblclick();
  await expect(page).toHaveURL(new RegExp(`/events/${id}\\?published=1$`));
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Your event is published. Guests aren't invited yet." }),
  ).toBeVisible();
  await expect(page.getByText("Only your team can see this event.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publish" })).toHaveCount(0);
  const publishedAt = psql(`select published_at from public.events where id = '${id}'`).trim();
  expect(publishedAt).not.toBe("");

  await page.goto(`/events/${id}/settings`);
  await page.getByLabel("Language for guests").selectOption("nb");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Settings saved." })).toBeVisible();
  expect(psql(`select published_at from public.events where id = '${id}'`).trim()).toBe(
    publishedAt,
  );
});
