import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { classifyDashboard } from "@/modules/tasks/dashboard";
import { loadListed } from "./tasks/load-listed";
import { TaskRow } from "./tasks/task-row";

export async function AtRisk({
  event,
  viewerId,
}: {
  event: { id: string; organizer_id: string };
  viewerId: string;
}) {
  const t = await getTranslations();
  const { listed, leadRoleIds } = await loadListed(event, viewerId, true);
  const { atRisk } = classifyDashboard(
    listed.map((x) => x.dash),
    { id: viewerId, isOrganizer: event.organizer_id === viewerId, leadRoleIds },
  );
  const rows = new Map(listed.map((x) => [x.row.id, x.row]));
  return (
    <section aria-labelledby="at-risk" className="flex max-w-2xl flex-col gap-2">
      <h2 id="at-risk" className="text-title flex items-center gap-2">
        {t("dashboard.atRisk")}
        {atRisk.length > 0 && (
          <span className="bg-badge text-badge-foreground inline-flex items-center rounded-full px-2 text-sm font-semibold">
            {t("status.atRisk", { count: atRisk.length })}
          </span>
        )}
      </h2>
      {atRisk.length === 0 ? (
        <p className="text-muted-foreground">{t("dashboard.atRiskEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {atRisk.map((task) => (
            <TaskRow key={task.id} eventId={event.id} task={rows.get(task.id)!} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function AtRiskSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-14" />
      <Skeleton className="h-14" />
    </div>
  );
}
