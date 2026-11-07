"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ROLE_COLUMN } from "@/modules/tasks/timeline-layout";

const FADE = "pointer-events-none absolute inset-y-0 z-20 w-12 from-card to-transparent";

/** The scroll area, its 48px edge fades where it scrolls, and Jump to today. */
export function TimelineScroller({
  todayX,
  children,
}: {
  /** Pixel position of today on the axis; outside the axis the scroll stops at the nearest edge. */
  todayX: number;
  children: React.ReactNode;
}) {
  const t = useTranslations("timeline");
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      left: el.scrollLeft > 0,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    // The canvas changes width when Show obsolete is toggled.
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [measure]);

  // Centre today in the visible axis; the browser clamps to either edge when it is outside.
  const jump = () => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: todayX - (el.clientWidth - ROLE_COLUMN) / 2, behavior: "auto" });
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button type="button" variant="outline" onClick={jump}>
          {t("jumpToToday")}
        </Button>
      </div>
      <div className="bg-card relative overflow-hidden rounded-md border">
        <div
          ref={ref}
          role="region"
          aria-label={t("region")}
          tabIndex={0}
          onScroll={measure}
          className="overflow-x-auto"
        >
          {children}
        </div>
        {edges.left && (
          <div aria-hidden className={`${FADE} bg-linear-to-r`} style={{ left: ROLE_COLUMN }} />
        )}
        {edges.right && <div aria-hidden className={`${FADE} bg-linear-to-l right-0`} />}
      </div>
    </div>
  );
}
