"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { LoadError } from "@/components/load-error";

export default function EventsError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  // reset() alone re-renders on the client; refresh() makes the server fetch again.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });
  return (
    <div className="py-12">
      <LoadError onRetry={retry} />
    </div>
  );
}
