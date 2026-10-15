import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { getClaims } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { MobileMenu } from "@/components/mobile-menu";
import { RouteFocus } from "@/components/route-focus";
import "./globals.css";

// Pages set the full title "{Surface} – {Event} – Arrangly"; this is only the fallback.
export const metadata: Metadata = { title: "Arrangly" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations("shell");
  const claims = await getClaims();
  const profileLabel =
    [claims?.user_metadata?.name, claims?.email].find((v) => typeof v === "string" && v) ?? "";
  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <a
            href="#main"
            className="bg-primary text-primary-foreground sr-only z-50 rounded-full px-4 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
          >
            {t("skipToContent")}
          </a>
          <header className="px-gutter flex items-center gap-4 py-3">
            <span className="text-headline">Arrangly</span>
            {!claims && (
              <nav aria-label={t("navLabel")}>
                <Link href="/" className="text-primary min-h-touch inline-flex items-center">
                  {t("home")}
                </Link>
                <Link
                  href="/login"
                  className="text-primary min-h-touch ml-4 inline-flex items-center"
                >
                  {t("logIn")}
                </Link>
                <Link
                  href="/signup"
                  className="text-primary min-h-touch ml-4 inline-flex items-center"
                >
                  {t("signUp")}
                </Link>
              </nav>
            )}
          </header>
          <RouteFocus />
          <div className="flex flex-1">
            {claims && (
              <div className="bg-sidebar w-sidebar hidden shrink-0 lg:block">
                <AppNav profileLabel={profileLabel} />
              </div>
            )}
            <main
              id="main"
              tabIndex={-1}
              className={
                claims
                  ? "max-w-content relative mx-auto w-full min-w-0 pr-[calc(var(--gutter)+3rem)] pl-gutter lg:pr-gutter"
                  : "px-gutter max-w-content mx-auto w-full min-w-0"
              }
            >
              {children}
              {claims && <MobileMenu profileLabel={profileLabel} />}
            </main>
          </div>
          <footer className="px-gutter py-3">
            <Link href="/privacy" className="text-primary min-h-touch inline-flex items-center">
              {t("privacy")}
            </Link>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
