import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { RouteFocus } from "@/components/route-focus";
import "./globals.css";

// Pages set the full title "{Surface} – {Event} – Arrangly"; this is only the fallback.
export const metadata: Metadata = { title: "Arrangly" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations("shell");
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>
          <a
            href="#main"
            className="bg-primary text-primary-foreground sr-only z-50 rounded-full px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
          >
            {t("skipToContent")}
          </a>
          <header className="px-gutter flex items-center gap-4 py-3">
            <span className="text-headline">Arrangly</span>
            <nav aria-label={t("navLabel")}>
              <Link href="/" className="text-primary min-h-touch inline-flex items-center">
                {t("home")}
              </Link>
              <Link
                href="/signup"
                className="text-primary min-h-touch ml-4 inline-flex items-center"
              >
                {t("signUp")}
              </Link>
            </nav>
          </header>
          <RouteFocus />
          <main id="main" tabIndex={-1} className="px-gutter max-w-content mx-auto">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
