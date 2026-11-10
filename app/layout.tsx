import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { createClient, getClaims } from "@/lib/supabase/server";
import { heldGuestsEventIds } from "@/modules/guests/access";
import { AppNav } from "@/components/app-nav";
import { MobileMenu } from "@/components/mobile-menu";
import { OfflineNotice } from "@/components/offline-notice";
import { Toaster } from "@/components/ui/sonner";
import { ToastHotkey } from "@/components/toast-hotkey";
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
  // Which Events the viewer organizes, for the sidebar. RLS shows an Organizer their own Events and a holder theirs.
  const organized = claims
    ? await (await createClient()).from("events").select("id").eq("organizer_id", claims.sub)
    : { data: [], error: null };
  // Failing closed would hand an Organizer the holder sidebar, so a failed query is an error page.
  if (organized.error) throw new Error("Could not load the sidebar");
  const organizedEventIds = organized.data.map((event) => event.id);
  // The Guests item also shows to a holder of the active Guests Role (Story 7.7).
  const guestsEventIds = claims ? await heldGuestsEventIds(claims.sub) : [];
  // Urgent per Event: the viewer's own open Tasks that are overdue. task_state holds the overdue
  // flag and tasks the owner, so two queries cover every Event at once.
  const supabase = claims ? await createClient() : null;
  const [owned, overdue] = supabase
    ? await Promise.all([
        supabase.from("tasks").select("id, event_id").eq("owner_user_id", claims!.sub),
        supabase.from("task_state").select("id").eq("overdue", true),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];
  // The badge is a nicety: if either query fails the sidebar renders without it.
  const urgentByEvent: Record<string, number> = {};
  if (!owned.error && !overdue.error) {
    const overdueIds = new Set(overdue.data.map((task) => task.id));
    for (const task of owned.data) {
      if (overdueIds.has(task.id))
        urgentByEvent[task.event_id] = (urgentByEvent[task.event_id] ?? 0) + 1;
    }
  }
  const theme = claims?.user_metadata?.theme;
  return (
    <html lang={locale} data-theme={theme === "light" || theme === "dark" ? theme : undefined}>
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
          <OfflineNotice />
          <RouteFocus />
          <ToastHotkey />
          <div className="flex flex-1">
            {claims && (
              <div className="bg-sidebar w-sidebar hidden shrink-0 lg:block">
                <AppNav
                  profileLabel={profileLabel}
                  organizedEventIds={organizedEventIds}
                  guestsEventIds={guestsEventIds}
                  urgentByEvent={urgentByEvent}
                />
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
              {claims && (
                <MobileMenu
                  profileLabel={profileLabel}
                  organizedEventIds={organizedEventIds}
                  guestsEventIds={guestsEventIds}
                  urgentByEvent={urgentByEvent}
                />
              )}
            </main>
          </div>
          <footer className="px-gutter py-3">
            <Link href="/privacy" className="text-primary min-h-touch inline-flex items-center">
              {t("privacy")}
            </Link>
          </footer>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
