import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { confirmed } from "./support";

const octet = () => Math.floor(Math.random() * 254) + 1;
test.beforeEach(async ({ page }) => {
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.54.${octet()}.${octet()}` });
});

async function loggedIn(page: Page, request: APIRequestContext) {
  const email = await confirmed(page, request);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("abcdefg1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "All events" })).toBeVisible();
}

test("offline shows exactly one alert and online removes it", async ({ page, request }) => {
  await loggedIn(page, request);
  const offline = page.getByRole("alert").filter({ hasText: "You're offline" });
  await expect(offline).toHaveCount(0);
  await expect(page.locator("[data-sonner-toaster]")).toHaveCount(0);
  await page.context().setOffline(true);
  await expect(offline).toHaveCount(1);
  await page.context().setOffline(false);
  await expect(offline).toHaveCount(0);
});

test("offline text is Norwegian in an nb browser", async ({ page, request, browser }) => {
  await loggedIn(page, request);
  const nb = await browser.newContext({
    baseURL: "http://localhost:3000",
    locale: "nb-NO",
    storageState: await page.context().storageState(),
  });
  const nbPage = await nb.newPage();
  await nbPage.goto("/events");
  await nb.setOffline(true);
  await expect(nbPage.getByRole("alert").filter({ hasText: "Du er frakoblet" })).toHaveCount(1);
  await nb.close();
});
