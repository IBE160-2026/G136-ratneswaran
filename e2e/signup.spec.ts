import { expect, test, type Page } from "@playwright/test";

const MAILPIT = "http://127.0.0.1:54324/api/v1";

// The limiter allows 5 sign-ups a minute per IP and every test shares one, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.51.${octet()}.${octet()}` });
});

async function submit(page: Page, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
}

const unique = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

test("new account sees the inbox message and gets a confirmation mail", async ({
  page,
  request,
}) => {
  const email = unique();
  await submit(page, email, "abcdefg1");
  await expect(page.getByText("Check your inbox to verify your email.")).toBeVisible();
  await expect
    .poll(async () => {
      const res = await request.get(`${MAILPIT}/search`, { params: { query: `to:${email}` } });
      return (await res.json()).messages_count;
    })
    .toBe(1);
});

test("an existing email gets the identical screen", async ({ page }) => {
  const email = unique();
  await submit(page, email, "abcdefg1");
  await expect(page.getByText("Check your inbox to verify your email.")).toBeVisible();
  const first = await page.locator("main").innerText();
  await submit(page, email, "abcdefg1");
  await expect(page.getByText("Check your inbox to verify your email.")).toBeVisible();
  expect(await page.locator("main").innerText()).toBe(first);
});

test("weak password shows the rules and focuses the first error", async ({ page }) => {
  await submit(page, unique(), "abc");
  const password = page.getByLabel("Password", { exact: true });
  await expect(password).toHaveAttribute("aria-invalid", "true");
  await expect(password).toHaveAttribute("aria-describedby", /password-error/);
  await expect(password).toBeFocused();
});

test("malformed email focuses the email field", async ({ page }) => {
  await submit(page, "not-an-email", "abcdefg1");
  const email = page.getByLabel("Email");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toBeFocused();
});

test("an unconfirmed account cannot log in", async ({ page }) => {
  const email = unique();
  await submit(page, email, "abcdefg1");
  await expect(page.getByText("Check your inbox to verify your email.")).toBeVisible();
  const res = await page.request.post("http://127.0.0.1:54321/auth/v1/token?grant_type=password", {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" },
    data: { email, password: "abcdefg1" },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).error_code).toBe("email_not_confirmed");
});

test("the sixth sign-up in a minute from one IP is refused", async ({ page }) => {
  // The counter uses fixed one-minute windows; start early in a window so all six land in one.
  const secondsLeft = 60 - new Date().getSeconds();
  if (secondsLeft < 15) await page.waitForTimeout((secondsLeft + 1) * 1000);
  for (let i = 0; i < 5; i++) {
    await submit(page, unique(), "abcdefg1");
    await expect(page.getByText("Check your inbox to verify your email.")).toBeVisible();
  }
  await submit(page, unique(), "abcdefg1");
  await expect(page.getByText("Too many attempts")).toBeVisible();
});
