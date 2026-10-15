import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { expect, it } from "vitest";
import en from "../../messages/en.json";
import { LoadError } from "./load-error";

it("renders an alert with the message and a Retry button", () => {
  const html = renderToString(
    <NextIntlClientProvider locale="en" messages={en}>
      <LoadError onRetry={() => {}} />
    </NextIntlClientProvider>,
  );
  expect(html).toContain('role="alert"');
  expect(html).toContain("Couldn&#x27;t load this. Check your connection and try again.");
  expect(html).toMatch(/<button[^>]*>Retry<\/button>/);
});
