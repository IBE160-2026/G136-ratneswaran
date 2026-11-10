import { Lock } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { eventPath } from "@/modules/events/list";
import { summarizeRsvps } from "@/modules/guests/summary";
import { classifyDashboard, summarizeRoles } from "@/modules/tasks/dashboard";
import { RsvpPie, RsvpSwatch } from "./rsvp-pie";
import { loadListed } from "./tasks/load-listed";

export async function OnTrack({
  event,
  viewerId,
}: {
  event: { id: string; organizer_id: string; guest_count: number | null };
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
  // Who may read RSVPs: the Organizer and a joined holder of the active Guests Role. Others get the
  // questionnaire's expected count, never a figure from guest rows (which RLS would not return anyway).
  const readsRsvps =
    organizer || roles.some((r) => r.key === "guests" && r.active && memberRoleIds.includes(r.id));
  let rsvp = null;
  if (readsRsvps) {
    // Answers only: no names and no "other needs" are read.
    const result = await (
      await createClient()
    )
      .from("guests")
      .select("rsvps(attending, plus_one)")
      .eq("event_id", event.id);
    if (result.error) throw new Error("Could not load guests");
    rsvp = summarizeRsvps(
      result.data.map(({ rsvps }) => ({
        attending: rsvps[0]?.attending ?? null,
        plusOne: rsvps[0]?.plus_one ?? false,
      })),
    );
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
      {rsvp ? (
        <div className="flex flex-wrap items-center gap-4 py-2">
          {rsvp.invited > 0 && (
            <RsvpPie
              label={t("dashboard.rsvp.pie", rsvp)}
              coming={rsvp.coming}
              notComing={rsvp.notComing}
              notAnswered={rsvp.notAnswered}
            />
          )}
          <table>
            <caption className="text-headline text-left">{t("dashboard.rsvp.title")}</caption>
            <tbody>
              {(["invited", "coming", "notComing", "notAnswered", "headcount"] as const).map(
                (key) => (
                  <tr key={key}>
                    <th scope="row" className="pr-4 text-left font-normal">
                      {rsvp.invited > 0 && key !== "invited" && key !== "headcount" && (
                        <RsvpSwatch slice={key} />
                      )}
                      {t(`dashboard.rsvp.${key}`)}
                    </th>
                    <td className="text-right tabular-nums">{rsvp[key]}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      ) : (
        event.guest_count !== null && (
          <p>{t("dashboard.rsvp.expected", { count: event.guest_count })}</p>
        )
      )}
      {organizer && inactiveRoleTasks > 0 && (
        <p>
          <Link href={`${base}/team`} className="underline">
            {t("dashboard.inactiveRoleTasks", { count: inactiveRoleTasks })}
          </Link>
        </p>
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
