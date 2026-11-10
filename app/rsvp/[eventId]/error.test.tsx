import { renderToString } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { expect, it, vi } from "vitest";
import en from "../../../messages/en.json";
import RsvpError from "./error";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

it("renders the Retry card", () => {
  const html = renderToString(
    <NextIntlClientProvider locale="en" messages={en}>
      <RsvpError error={new Error("x")} reset={() => {}} />
    </NextIntlClientProvider>,
  );
  expect(html).toContain('role="alert"');
  expect(html).toMatch(/<button[^>]*>Retry<\/button>/);
});
