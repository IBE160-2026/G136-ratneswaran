import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { classifyDashboard } from "@/modules/tasks/dashboard";
import { loadListed } from "./tasks/load-listed";
import { TaskRow } from "./tasks/task-row";

export async function NeedsYou({
  event,
  viewerId,
}: {
  event: { id: string; organizer_id: string };
  viewerId: string;
}) {
  const t = await getTranslations("dashboard");
  const { listed, leadRoleIds } = await loadListed(event, viewerId, true);
  const { needsYou } = classifyDashboard(
    listed.map((x) => x.dash),
    { id: viewerId, isOrganizer: event.organizer_id === viewerId, leadRoleIds },
  );
  const rows = new Map(listed.map((x) => [x.row.id, x.row]));
  return (
    <section aria-labelledby="needs-you" className="flex max-w-2xl flex-col gap-2">
      <h2 id="needs-you" className="text-title flex items-center gap-2">
        {t("needsYou")}
        <span className="bg-badge text-badge-foreground inline-flex min-w-6 items-center justify-center rounded-full px-2 text-sm font-semibold">
          {needsYou.length}
        </span>
      </h2>
      {needsYou.length === 0 ? (
        <p className="text-muted-foreground">{t("needsYouEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {needsYou.map((task) => (
            <TaskRow key={task.id} eventId={event.id} task={rows.get(task.id)!} />
          ))}
        </ul>
      )}
    </section>
  );
}

// Same shape as the section: header row, then three task rows.
export function NeedsYouSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
    </div>
  );
}
