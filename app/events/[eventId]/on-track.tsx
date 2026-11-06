import { Lock } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { eventPath } from "@/modules/events/list";
import { classifyDashboard, summarizeRoles } from "@/modules/tasks/dashboard";
import { loadListed } from "./tasks/load-listed";

export async function OnTrack({
  event,
  viewerId,
}: {
  event: { id: string; organizer_id: string };
  viewerId: string;
}) {
  const t = await getTranslations();
  const organizer = event.organizer_id === viewerId;
  const { listed, leadRoleIds, memberRoleIds, roles, members } = await loadListed(
    event,
    viewerId,
    true,
  );
  const dash = listed.map((x) => x.dash);
  const summaries = summarizeRoles(dash, roles, { isOrganizer: organizer, memberRoleIds });
  const { inactiveRoleTasks } = classifyDashboard(dash, {
    id: viewerId,
    isOrganizer: organizer,
    leadRoleIds,
  });
  let guests = 0;
  if (organizer) {
    // Count only: no guest names or food data are read.
    const result = await (
      await createClient()
    )
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id);
    if (result.error) throw new Error("Could not load guests");
    guests = result.count ?? 0;
  }
  const byId = new Map(roles.map((r) => [r.id, r]));
  const base = eventPath(event.id);
  return (
    <section aria-labelledby="on-track" className="flex max-w-2xl flex-col gap-2">
      <h2 id="on-track" className="text-title">
        {t("dashboard.onTrack")}
      </h2>
      {summaries.length === 0 && (
        <p className="text-muted-foreground">{t("dashboard.onTrackEmpty")}</p>
      )}
      <ul className="flex flex-col gap-2">
        {summaries.map((s) => {
          const role = byId.get(s.roleId)!;
          const mine = members.filter((m) => m.role_id === s.roleId);
          const lead = mine.find((m) => m.is_lead);
          return (
            <li key={s.roleId} className="bg-card flex flex-col gap-1 rounded-md border p-4">
              <h3 className="text-headline">{role.name}</h3>
              <p className="text-subhead text-muted-foreground">
                {lead
                  ? t("events.team.lead.current", { name: lead.name })
                  : t("events.team.lead.none")}
              </p>
              <p className="text-subhead">
                {mine.map((m, i) => (
                  <span key={m.user_id}>
                    {i > 0 && ", "}
                    {m.name}
                    {m.joined_at === null && (
                      <span className="text-muted-foreground">
                        {" · "}
                        {t("events.team.people.pending")}
                      </span>
                    )}
                  </span>
                ))}
              </p>
              {s.readable ? (
                <Link
                  href={`${base}/tasks`}
                  className="min-h-touch hover:bg-muted -mx-2 flex flex-wrap items-center gap-x-4 rounded-sm px-2 py-2"
                >
                  <span className="sr-only">{role.name}: </span>
                  <span>{t("dashboard.done", { count: s.done })}</span>
                  <span>{t("dashboard.open", { count: s.open })}</span>
                  <span>{t("dashboard.overdue", { count: s.overdue })}</span>
                </Link>
              ) : (
                <p className="text-subhead text-muted-foreground inline-flex items-center gap-1.5">
                  <Lock aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
                  {t("dashboard.unreadable", { role: role.name })}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {organizer && (
        <>
          <p>{t("dashboard.guestsAdded", { count: guests })}</p>
          {inactiveRoleTasks > 0 && (
            <p>
              <Link href={`${base}/team`} className="underline">
                {t("dashboard.inactiveRoleTasks", { count: inactiveRoleTasks })}
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}

export function OnTrackSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
    </div>
  );
}
