import { expect, test, type Page } from "@playwright/test";
import { confirmed } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.55.${octet()}.${octet()}` });
});

async function setupStep1(page: Page, request: Parameters<typeof confirmed>[1]) {
  const email = await confirmed(page, request);
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("abcdefg1");
  await page.getByRole("button", { name: "Log in" }).click();
  await page.getByRole("button", { name: "Create new event" }).click();
  await expect(page.getByRole("heading", { name: "Tell us about your event" })).toBeVisible();
}

test("the Organizer answers step 1, sees inline errors and gets the answers back", async ({
  page,
  request,
}) => {
  await setupStep1(page, request);
  await expect(page.getByText("Step 1 of 6")).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);

  await page.getByLabel("What kind of event is it?").selectOption("birthday");
  await page.getByLabel("Date and time").fill("2027-06-01T18:00");
  await page.getByLabel("Time zone").selectOption("Europe/Oslo");
  await page.getByLabel("How long will it last (hours)?").fill("4");
  await page.getByLabel("How many guests?").fill("0");
  await page
    .getByRole("radiogroup", { name: "Do you have a venue?" })
    .getByLabel("Not sure yet")
    .check();
  const rsvp = page.getByRole("radiogroup", { name: "Do you want guests to reply (RSVP)?" });
  await expect(page.getByLabel("Reply by")).toHaveCount(0);
  await rsvp.getByLabel("Yes").check();
  await page.getByLabel("Reply by").fill("2027-06-02");
  await page
    .getByRole("radiogroup", { name: "How will you build the guest list?" })
    .getByLabel("Add them by hand")
    .check();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  const count = page.getByLabel("How many guests?");
  await expect(count).toHaveAttribute("aria-invalid", "true");
  await expect(count).toBeFocused();
  await expect(page.getByText("Enter a whole number between 1 and 100,000.")).toBeVisible();
  await expect(page.getByText("The reply date can't be after the event date.")).toBeVisible();

  await count.fill("80");
  await page.getByLabel("Reply by").fill("2027-05-20");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/\/events\?saved=1$/);
  await expect(page.getByText("Your answers are saved.")).toBeVisible();

  await page.goBack();
  await page.reload();
  await expect(page.getByLabel("What kind of event is it?")).toHaveValue("birthday");
  await expect(page.getByLabel("Date and time")).toHaveValue("2027-06-01T18:00");
  await expect(page.getByLabel("How many guests?")).toHaveValue("80");
  await expect(
    page.getByRole("radiogroup", { name: "Do you have a venue?" }).getByLabel("Not sure yet"),
  ).toBeChecked();
  await expect(page.getByLabel("Reply by")).toHaveValue("2027-05-20");

  await rsvp.getByLabel("No", { exact: true }).check();
  await expect(page.getByLabel("Reply by")).toHaveCount(0);
});

test("another user cannot open someone else's Event", async ({ page, request, browser }) => {
  await setupStep1(page, request);
  const url = page.url();

  const other = await browser.newContext({ baseURL: "http://localhost:3000" });
  const otherPage = await other.newPage();
  await other.setExtraHTTPHeaders({ "x-forwarded-for": "198.55.77.77" });
  await setupStep1(otherPage, request);
  await otherPage.goto(url);
  await expect(otherPage.getByRole("heading", { name: "Tell us about your event" })).toHaveCount(0);
  await expect(otherPage.getByLabel("What kind of event is it?")).toHaveCount(0);
  await other.close();
});
