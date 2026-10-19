import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { confirmed } from "./support";

const octet = () => Math.floor(Math.random() * 254) + 1;
let ip = "";
test.beforeEach(async ({ page }) => {
  ip = `198.53.${octet()}.${octet()}`;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": ip });
});

async function loggedIn(page: Page, request: APIRequestContext) {
  const email = await confirmed(page, request);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("abcdefg1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "All events" })).toBeVisible();
  return email;
}

const processors = ["Supabase", "Vercel", "Anthropic", "Google"];

test("desktop sidebar marks All events and shows the profile", async ({ page, request }) => {
  const email = await loggedIn(page, request);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/events");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "All events" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav.getByText(email)).toBeVisible();
  await expect(nav.getByRole("button", { name: "Log out" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
  await expect(page.getByText("Let's plan something.")).toBeVisible();
});

test("phone menu follows the h1, traps Esc and closes on navigation", async ({ page, request }) => {
  await loggedIn(page, request);
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto("/events");
  const button = page.getByRole("button", { name: "Menu" });
  // The page can still show its loading state right after goto, so wait for the real h1 and the menu.
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(button).toBeVisible();
  const after = await page.evaluate(() => {
    const h1 = document.querySelector("main h1")!;
    const b = document.querySelector("main [aria-label='Menu']")!;
    return Boolean(h1.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(after).toBe(true);
  await button.click();
  const link = page.getByRole("dialog").getByRole("link", { name: "All events" });
  await expect(link).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(button).toBeFocused();
  await button.click();
  await link.click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("no horizontal scroll at 320px while logged in", async ({ page, request }) => {
  await loggedIn(page, request);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/events");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("empty state and privacy page in nb", async ({ browser, request }) => {
  const en = await browser.newContext({
    locale: "en-US",
    extraHTTPHeaders: { "x-forwarded-for": ip },
  });
  await loggedIn(await en.newPage(), request);
  const nb = await browser.newContext({ locale: "nb-NO", storageState: await en.storageState() });
  const page = await nb.newPage();
  await page.goto("/events");
  await expect(page.getByText("La oss planlegge noe.")).toBeVisible();
  await page.getByRole("link", { name: "Personvernerklæring" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  for (const p of processors) await expect(page.getByText(p).first()).toBeVisible();
  await en.close();
  await nb.close();
});

test("footer reaches the privacy notice while logged out", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Menu" })).toHaveCount(0);
  await page.getByRole("link", { name: "Privacy notice" }).click();
  await expect(page).toHaveTitle("Privacy notice – Arrangly");
  for (const p of processors) await expect(page.getByText(p).first()).toBeVisible();
});
