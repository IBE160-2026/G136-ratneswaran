import { Skeleton } from "@/components/ui/skeleton";

// Same shape as the page: h1 line, Jump to today, then the lanes.
export default function TimelineLoading() {
  return (
    <div className="flex flex-col gap-6 py-12">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-9 w-36" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    </div>
  );
}
