import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const MAILPIT = "http://127.0.0.1:54324/api/v1";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.52.${octet()}.${octet()}` });
});

const unique = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

async function mailLink(request: APIRequestContext, email: string, count = 1) {
  let id = "";
  await expect
    .poll(async () => {
      const res = await request.get(`${MAILPIT}/search`, { params: { query: `to:${email}` } });
      const body = await res.json();
      id = body.messages?.[0]?.ID ?? "";
      return body.messages_count;
    })
    .toBe(count);
  const message = await (await request.get(`${MAILPIT}/message/${id}`)).json();
  return /https?:\/\/[^\s"<>]+/.exec(message.Text.replace(/&amp;/g, "&"))![0];
}

async function signUp(page: Page, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your inbox to verify your email.")).toBeVisible();
}

async function confirmed(page: Page, request: APIRequestContext, password = "abcdefg1") {
  const email = unique();
  await signUp(page, email, password);
  await page.goto(await mailLink(request, email));
  return email;
}

async function logIn(page: Page, email: string, password: string, path = "/login") {
  await page.goto(path);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

test("log in lands on All events and log out ends the session", async ({ page, request }) => {
  const email = await confirmed(page, request);
  await logIn(page, email, "abcdefg1");
  await expect(page.getByRole("heading", { name: "All events" })).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/events");
  await expect(page).toHaveURL(/\/login\?next=(%2F|\/)events$/);
});

test("wrong password shows the credentials message", async ({ page, request }) => {
  const email = await confirmed(page, request);
  await logIn(page, email, "wrongpass1");
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    "Email or password doesn't match.",
  );
});

test("unverified account sees the message and Resend sends a second mail", async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const email = unique();
  await signUp(page, email, "abcdefg1");
  await logIn(page, email, "abcdefg1");
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    "Check your inbox to verify your email.",
  );
  // Auth refuses a second mail inside its resend window, so wait it out before resending.
  await page.waitForTimeout(61_000);
  await page.getByRole("button", { name: "Resend" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await mailLink(request, email, 2);
});

test("logged-out /events returns there after login; an unsafe next is ignored", async ({
  page,
  request,
}) => {
  const email = await confirmed(page, request);
  await page.goto("/events");
  await expect(page).toHaveURL(/\/login\?next=(%2F|\/)events$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("abcdefg1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/events$/);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await logIn(page, email, "abcdefg1", "/login?next=//evil.com");
  await expect(page).toHaveURL(/127\.0\.0\.1:3000\/events$|localhost:3000\/events$/);
});

test("forgot password, reset link, new password, log in with it", async ({ page, request }) => {
  const email = await confirmed(page, request);
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  // The confirmation mail is the first; the recovery mail is the second.
  const link = await mailLink(request, email, 2);
  await page.goto(link);
  await expect(page).toHaveURL(/\/reset-password$/);
  await page.getByLabel("New password").fill("newpass99");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByRole("heading", { name: "All events" })).toBeVisible();
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await logIn(page, email, "newpass99");
  await expect(page.getByRole("heading", { name: "All events" })).toBeVisible();
});

test("a bad or used reset code lands on the expired message with no session", async ({ page }) => {
  await page.goto("/auth/reset?code=not-a-real-code");
  await expect(page).toHaveURL(/\/forgot-password\?expired=1$/);
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    /That link has expired, was already used, or was opened in a different browser/,
  );
  await page.goto("/reset-password");
  await expect(page).toHaveURL(/\/forgot-password\?expired=1$/);
});
