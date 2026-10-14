import { expect, test } from "@playwright/test";

test("placeholder page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Arrangly" })).toBeVisible();
});

test("English by default, skip link first, title pattern", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle("Home – Arrangly");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await expect(page.locator("header")).toBeVisible();
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
});

test.describe("Norwegian browser", () => {
  test.use({ locale: "nb-NO" });
  test("renders nb", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "nb");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Hopp til innhold" })).toBeFocused();
  });
});

test("dark preference applies Clear Sky", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(0, 0, 0)");
});

test("no horizontal scroll at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
