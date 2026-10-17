import { expect, test, type Page } from "@playwright/test";
import { confirmed, mailLink, unique } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.54.${octet()}.${octet()}` });
});

/** The mock GitHub reads who signs in from this cookie (docs/oauth-testing.md). */
async function asGithubUser(page: Page, identity: object) {
  await page.context().addCookies([
    {
      name: "mock_identity",
      value: encodeURIComponent(JSON.stringify(identity)),
      url: "http://host.docker.internal:54399",
    },
  ]);
}

async function signedIn(page: Page, request: Parameters<typeof confirmed>[1]) {
  const email = await confirmed(page, request);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("abcdefg1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "All events" })).toBeVisible();
  await page.goto("/profile");
  return email;
}

const sidebar = (page: Page) => page.locator("div.lg\\:block nav");

test("/profile logged out redirects to log in", async ({ page }) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?next=(%2F|\/)profile$/);
});

test("the sidebar links to Profile & Settings and marks it current", async ({ page, request }) => {
  await signedIn(page, request);
  await expect(page).toHaveTitle("Profile & Settings – Arrangly");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Profile & Settings");
  await expect(sidebar(page).locator("a[aria-current='page']")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Name",
    "Email",
    "Password",
    "Connected accounts",
    "Language",
    "Appearance",
  ]);
});

test("a changed name shows in the sidebar", async ({ page, request }) => {
  await signedIn(page, request);
  await page.getByLabel("Display name").fill("  Ada L  ");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Name saved.")).toBeVisible();
  await expect(sidebar(page).getByRole("link", { name: "Ada L", exact: true })).toBeVisible();
  await page.getByLabel("Display name").fill("");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Enter a name of 1 to 80 characters.")).toBeVisible();
});

test("language applies at once and survives reload and a new login", async ({ page, request }) => {
  const email = await signedIn(page, request);
  await page.getByLabel("Norsk bokmål").check();
  await expect(page.locator("html")).toHaveAttribute("lang", "nb");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Profil og innstillinger");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "nb");
  await page.getByRole("button", { name: "Logg ut" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("abcdefg1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Alle arrangementer" })).toBeVisible();
  await page.goto("/profile");
  await expect(page.locator("html")).toHaveAttribute("lang", "nb");
  await page.getByLabel("Auto").check();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("appearance sets and removes data-theme", async ({ page, request }) => {
  await signedIn(page, request);
  await page.getByLabel("Dark").check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Light").check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("System").check();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
});

test("an email change asks for confirmation and mails the new address", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const next = unique();
  await page.getByLabel("New email").fill(next);
  await page.getByRole("button", { name: "Change email" }).click();
  await expect(page.getByText("Check your inbox to confirm the new email.")).toBeVisible();
  await expect(page.getByText(`Current email: ${email}`)).toBeVisible();
  await mailLink(request, next);
});

test("a weak new password shows the rules", async ({ page, request }) => {
  await signedIn(page, request);
  await page.getByLabel("New password").fill("short");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("The password does not meet the rules below.")).toBeVisible();
  await page.getByLabel("New password").fill("abcdefg2");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("Password saved.")).toBeVisible();
});

test("a GitHub user adds a password and logs in with it", async ({ page }) => {
  const email = unique();
  await asGithubUser(page, { email, verified: true });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expect(page.getByRole("heading", { name: "All events" })).toBeVisible();
  await page.goto("/profile");
  await page.getByLabel("New password").fill("abcdefg1");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("Password saved.")).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("abcdefg1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "All events" })).toBeVisible();
});

test("an email user connects GitHub through the mock", async ({ page, request }) => {
  const email = await signedIn(page, request);
  const row = (name: string) => page.getByRole("listitem").filter({ hasText: name });
  await expect(row("GitHub").getByRole("button", { name: "Connect GitHub" })).toBeVisible();
  await expect(row("Google").getByRole("button", { name: "Connect Google" })).toBeVisible();
  await asGithubUser(page, { email, verified: true });
  await page.getByRole("button", { name: "Connect GitHub" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(row("GitHub")).toContainText("Connected");
  await expect(row("Email")).toContainText("Connected");
  await expect(page.getByRole("button", { name: "Connect GitHub" })).toHaveCount(0);
});

test("a cancelled link shows the alert and links nothing", async ({ page, request }) => {
  await signedIn(page, request);
  await asGithubUser(page, { deny: true });
  await page.getByRole("button", { name: "Connect GitHub" }).click();
  await expect(page).toHaveURL(/\/profile\?link=cancelled/);
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    "You cancelled connecting the account.",
  );
  await expect(page.getByRole("button", { name: "Connect GitHub" })).toBeVisible();
});

test("the page does not scroll sideways at 320px", async ({ page, request }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await signedIn(page, request);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
