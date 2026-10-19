import { Skeleton } from "@/components/ui/skeleton";

// Same shape as the All events page: h1 line, then a grid of cards.
export default function EventsLoading() {
  return (
    <div className="flex flex-col gap-4 py-12">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
      </div>
    </div>
  );
}
