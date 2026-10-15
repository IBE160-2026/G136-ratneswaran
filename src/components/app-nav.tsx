"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { useTranslations } from "next-intl";
import { logOut } from "@/modules/auth/actions";
import { cn } from "@/lib/utils";

// Shared by the desktop sidebar and the phone Sheet.
export function AppNav({
  profileLabel,
  onNavigate,
}: {
  profileLabel: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("shell");
  const active = usePathname() === "/events";
  return (
    <nav aria-label={t("navLabel")} className="flex h-full flex-col gap-1 p-3">
      {/* The event group of later epics goes here. */}
      <Link
        href="/events"
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "min-h-touch relative flex items-center gap-3 rounded-sm px-3 transition-colors",
          active && "bg-primary-soft text-primary font-semibold",
        )}
      >
        {active && <span aria-hidden className="bg-primary absolute inset-y-2 left-0 w-[3px]" />}
        <CalendarDays aria-hidden strokeWidth={1.75} className="size-5 shrink-0" />
        {t("allEvents")}
      </Link>
      <div className="border-border mt-auto flex flex-col gap-1 border-t pt-3">
        <p className="px-3 text-subhead">{profileLabel}</p>
        <form action={logOut}>
          <button
            type="submit"
            className="text-primary min-h-touch w-full rounded-sm px-3 text-left"
          >
            {t("logOut")}
          </button>
        </form>
      </div>
    </nav>
  );
}
