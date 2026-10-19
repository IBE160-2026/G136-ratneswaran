import { expect, test, type Page } from "@playwright/test";
import { answerStep1, confirmed } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.56.${octet()}.${octet()}` });
});

async function signedIn(page: Page, request: Parameters<typeof confirmed>[1]) {
  const email = await confirmed(page, request);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("abcdefg1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: "Create new event" })).toBeVisible();
}

const next = (page: Page) => page.getByRole("button", { name: "Next", exact: true });

test("a double click makes one draft, and its link reopens the saved answers", async ({
  page,
  request,
}) => {
  await signedIn(page, request);
  await page.getByRole("button", { name: "Create new event" }).dblclick();
  await expect(page.getByRole("heading", { name: "Tell us about your event" })).toBeVisible();

  await page.goto("/events");
  const draft = page.getByRole("link", { name: /Draft · continue setup/ });
  await expect(draft).toHaveCount(1);

  await draft.click();
  await answerStep1(page);
  await next(page).click();
  await expect(page).toHaveURL(/\/events\?saved=1$/);

  await page.getByRole("link", { name: /Draft · continue setup/ }).click();
  await expect(page.getByLabel("What kind of event is it?")).toHaveValue("birthday");
  await expect(page.getByLabel("How many guests?")).toHaveValue("80");
});

test("an offline save keeps the input and saves when the browser is back online", async ({
  page,
  request,
}) => {
  await signedIn(page, request);
  await page.getByRole("button", { name: "Create new event" }).click();
  await expect(page.getByRole("heading", { name: "Tell us about your event" })).toBeVisible();
  await answerStep1(page);

  await page.context().setOffline(true);
  await next(page).click();
  const toast = page.getByText("Couldn't save. Trying again.");
  await expect(toast).toBeVisible();
  await expect(page.getByLabel("How many guests?")).toHaveValue("80");
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

  await page.context().setOffline(false);
  await expect(page).toHaveURL(/\/events\?saved=1$/);
  await expect(toast).toHaveCount(0);
});
