"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppNav } from "@/components/app-nav";

// Rendered after {children} in main so it follows the page h1 in DOM order; CSS puts it top right.
export function MobileMenu({ profileLabel }: { profileLabel: string }) {
  const t = useTranslations("shell");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(pathname);
  if (seen !== pathname) {
    setSeen(pathname);
    setOpen(false);
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={t("menu")}
        className="min-h-touch min-w-touch text-primary absolute top-2 right-4 inline-flex items-center justify-center rounded-sm lg:hidden"
      >
        <Menu aria-hidden strokeWidth={1.75} className="size-6" />
      </SheetTrigger>
      <SheetContent side="right" className="bg-sidebar w-72">
        <SheetTitle className="sr-only">{t("navLabel")}</SheetTitle>
        <AppNav profileLabel={profileLabel} onNavigate={() => setOpen(false)} />
        <SheetClose
          aria-label={t("closeMenu")}
          className="min-h-touch min-w-touch absolute top-2 right-2 inline-flex items-center justify-center rounded-sm"
        >
          <X aria-hidden strokeWidth={1.75} className="size-6" />
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
