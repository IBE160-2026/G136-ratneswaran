import { Skeleton } from "@/components/ui/skeleton";

// Same shape as the page: h1 line, the Event line, then the "My RSVP" card.
export default function RsvpLoading() {
  return (
    <div className="flex max-w-md flex-col gap-4 py-12">
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}
