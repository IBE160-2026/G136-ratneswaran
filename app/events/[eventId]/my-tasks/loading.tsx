import { Skeleton } from "@/components/ui/skeleton";

// Same shape as the page: h1 line, the toggle, then task rows.
export default function MyTasksLoading() {
  return (
    <div className="flex max-w-2xl flex-col gap-6 py-12">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-11 w-40 rounded-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    </div>
  );
}
