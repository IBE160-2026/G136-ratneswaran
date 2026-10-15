import { Skeleton } from "@/components/ui/skeleton";

// Same shape as the All events page: h1 line, then the empty-state block.
export default function EventsLoading() {
  return (
    <div className="flex flex-col gap-4 py-12">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-5 w-80 max-w-full" />
    </div>
  );
}
