import { expect, test } from "@playwright/test";
import { answerStep1, psql, seed, signedIn, unique } from "./support";

// Limiter buckets are per IP and shared by every test, so give each its own.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({ "x-forwarded-for": `198.59.${octet()}.${octet()}` });
});

test("the Organizer changes the schedule and language and gets them back in the Event's time zone", async ({
  page,
  request,
}) => {
  await signedIn(page, request);
  await page.getByRole("button", { name: "Create new event" }).click();
  await expect(page).toHaveURL(/\/setup$/);
  const setup = page.url();
  const eventId = setup.split("/").at(-2);
  await answerStep1(page);
  await page
    .getByRole("radiogroup", { name: "Do you want guests to reply (RSVP)?" })
    .getByLabel("Yes")
    .check();
  await page.getByLabel("Reply by").fill("2027-05-20");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/\/setup\/guests$/);

  await page.goto(setup.replace(/\/setup$/, "/settings"));
  await expect(page).toHaveTitle("Event settings – New event – Arrangly");
  await expect(page.getByLabel("Starts")).toHaveValue("2027-06-01T18:00");
  await expect(page.getByLabel("Ends")).toHaveValue("2027-06-01T22:00");

  // An end before the start is caught inline, with focus on it.
  const ends = page.getByLabel("Ends");
  await ends.fill("2027-06-01T17:00");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(ends).toHaveAttribute("aria-invalid", "true");
  await expect(ends).toBeFocused();
  await expect(ends).toHaveAccessibleDescription("The end must be after the start.");

  await page.getByLabel("Starts").fill("2027-06-02T17:00");
  await ends.fill("2027-06-02T23:30");
  await page.getByLabel("Time zone").selectOption("Europe/London");
  await page.getByLabel("Reply by").fill("2027-05-25");
  await page.getByLabel("Language for guests").selectOption("nb");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Settings saved." })).toBeVisible();
  await expect(ends).not.toHaveAttribute("aria-invalid");

  await page.reload();
  // The Event language is nb, but the Organizer's own interface stays English.
  await expect(page.getByRole("heading", { level: 1, name: "Event settings" })).toBeVisible();
  await expect(page.getByLabel("Starts")).toHaveValue("2027-06-02T17:00");
  await expect(page.getByLabel("Ends")).toHaveValue("2027-06-02T23:30");
  await expect(page.getByLabel("Time zone")).toHaveValue("Europe/London");
  await expect(page.getByLabel("Reply by")).toHaveValue("2027-05-25");
  await expect(page.getByLabel("Language for guests")).toHaveValue("nb");
  expect(
    psql(`select to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI')
      from public.events where id = '${eventId}'`).trim(),
  ).toBe("2027-06-02 16:00");

  await page.goto(setup);
  await expect(page.getByLabel("Date and time")).toHaveValue("2027-06-02T17:00");
  await expect(page.getByLabel("How long will it last (hours)?")).toHaveValue("6.5");
});

test("Event settings is in the event group, read-only once over or cancelled, and closed to others", async ({
  page,
  request,
}) => {
  const email = await signedIn(page, request);
  const upcoming = seed(email, "7 days");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/events/${upcoming}`);
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Event settings" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/events/${upcoming}/settings$`));
  await expect(page.getByRole("heading", { level: 1, name: "Event settings" })).toBeVisible();
  await expect(page.getByLabel("Starts")).toBeEnabled();
  // RSVP is not wanted, so there is no reply-by date.
  await expect(page.getByLabel("Reply by")).toHaveCount(0);

  const over = seed(email, "-30 days");
  const cancelled = seed(email, "7 days");
  psql(`update public.events set cancelled_at = now() where id = '${cancelled}'`);
  for (const id of [over, cancelled]) {
    await page.goto(`/events/${id}/settings`);
    await expect(page.getByText("This event is over or cancelled")).toBeVisible();
    for (const label of ["Starts", "Ends", "Time zone", "Language for guests"]) {
      await expect(page.getByLabel(label)).toBeDisabled();
    }
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
    if (id === over) {
      await expect(page.getByRole("button", { name: "Cancel event" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Delete event" })).toBeVisible();
    }
  }

  // A draft stays editable after its date has passed, so a mistyped date can be fixed.
  const pastDraft = seed(email, "-30 days", false);
  await page.goto(`/events/${pastDraft}/settings`);
  await expect(page.getByRole("heading", { level: 1, name: "Event settings" })).toBeVisible();
  await expect(page.getByText("This event is over or cancelled")).toHaveCount(0);
  for (const label of ["Starts", "Ends", "Time zone", "Language for guests"]) {
    await expect(page.getByLabel(label)).toBeEnabled();
  }
  await expect(page.getByRole("button", { name: "Save" })).toBeEnabled();

  const other = unique();
  psql(`insert into auth.users (id, email) values (gen_random_uuid(), '${other}')`);
  const foreign = seed(other, "7 days");
  await page.goto(`/events/${foreign}/settings`);
  await expect(
    page.getByRole("heading", { name: "You don't have access to this part of the event." }),
  ).toBeVisible();
  await expect(page.getByLabel("Starts")).toHaveCount(0);
});
