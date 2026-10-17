"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { logOut } from "@/modules/auth/actions";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  icon: Icon,
  onNavigate,
  children,
}: {
  href: string;
  icon: typeof CalendarDays;
  onNavigate?: () => void;
  children: React.ReactNode;
}) {
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "min-h-touch relative flex items-center gap-3 rounded-sm px-3 transition-colors",
        active && "bg-primary-soft text-primary font-semibold",
      )}
    >
      {active && <span aria-hidden className="bg-primary absolute inset-y-2 left-0 w-[3px]" />}
      <Icon aria-hidden strokeWidth={1.75} className="size-5 shrink-0" />
      {children}
    </Link>
  );
}

// Shared by the desktop sidebar and the phone Sheet.
export function AppNav({
  profileLabel,
  onNavigate,
}: {
  profileLabel: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations("shell");
  return (
    <nav aria-label={t("navLabel")} className="flex h-full flex-col gap-1 p-3">
      {/* The event group of later epics goes here. */}
      <NavLink href="/events" icon={CalendarDays} onNavigate={onNavigate}>
        {t("allEvents")}
      </NavLink>
      <div className="border-border mt-auto flex flex-col gap-1 border-t pt-3">
        <NavLink href="/profile" icon={UserRound} onNavigate={onNavigate}>
          <span className="min-w-0 truncate">{profileLabel}</span>
        </NavLink>
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
