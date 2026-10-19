import { expect, test, type Page } from "@playwright/test";
import { confirmed, psql, unique } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.53.${octet()}.${octet()}` });
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

/** Reads local Auth tables through psql; `email` is a generated `unique()` value, so a quoted literal is safe. */
function usersOf(email: string) {
  const sql = `select u.id, coalesce(u.email_confirmed_at::text, ''), coalesce(string_agg(i.provider, ',' order by i.provider), '')
    from auth.users u left join auth.identities i on i.user_id = u.id
    where u.email = '${email}' group by u.id`;
  return psql(sql)
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, confirmedAt, providers] = line.split("|");
      return { id, confirmedAt, providers: providers.split(",").filter(Boolean) };
    });
}

async function expectSignedOut(page: Page, message: RegExp) {
  await expect(page).toHaveURL(/\/login\?oauth=/);
  await expect(page.locator("main").getByRole("alert")).toHaveText(message);
  await page.goto("/events");
  await expect(page).toHaveURL(/\/login\?next=(%2F|\/)events$/);
}

for (const path of ["/login", "/signup"]) {
  test(`${path} offers both providers`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with GitHub" })).toBeVisible();
  });
}

test("a new verified GitHub user lands on All events", async ({ page }) => {
  const email = unique();
  await asGithubUser(page, { email, verified: true });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expect(page.getByRole("heading", { name: "All events" })).toBeVisible();
  expect(usersOf(email)).toHaveLength(1);
});

test("a verified GitHub email opens the existing password account", async ({ page, request }) => {
  const email = await confirmed(page, request);
  const [before] = usersOf(email);
  await asGithubUser(page, { email, verified: true });
  await page.goto("/signup");
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expect(page.getByRole("heading", { name: "All events" })).toBeVisible();
  const users = usersOf(email);
  expect(users).toHaveLength(1);
  expect(users[0].id).toBe(before.id);
  expect(users[0].providers).toEqual(["email", "github"]);
});

test("an unverified GitHub email shows the message and signs nobody in", async ({ page }) => {
  const email = unique();
  await asGithubUser(page, { email, verified: false });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expectSignedOut(page, /Your email at that provider is not verified/);
  // Auth may keep an unconfirmed row, but nothing is confirmed or signed in.
  const users = usersOf(email);
  expect(users).toHaveLength(1);
  expect(users[0].confirmedAt).toBe("");
});

test("an unverified GitHub email never links to a confirmed password account", async ({
  page,
  request,
}) => {
  const email = await confirmed(page, request);
  const [before] = usersOf(email);
  await asGithubUser(page, { email, verified: false });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expectSignedOut(page, /Your email at that provider is not verified/);
  const users = usersOf(email);
  expect(users).toHaveLength(1);
  expect(users[0].id).toBe(before.id);
  expect(users[0].providers).toEqual(["email"]);
});

test("a cancelled consent shows the message and signs nobody in", async ({ page }) => {
  await asGithubUser(page, { deny: true });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expectSignedOut(page, /You cancelled the sign-in/);
});

test("a bad callback code shows the failure message", async ({ page }) => {
  await page.goto("/auth/callback?code=not-a-real-code");
  await expectSignedOut(page, /Couldn't sign in with that provider/);
});
