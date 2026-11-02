import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { roleKeys } from "@/modules/events/roles";

/** Team & Roles for a Role-holder: who is on each active Role and who leads it. Read-only, and no emails. */
export async function HolderTeam({ eventId }: { eventId: string }) {
  const t = await getTranslations("events");
  const supabase = await createClient();
  const [rolesResult, membersResult] = await Promise.all([
    supabase.from("roles").select("id, key").eq("event_id", eventId).eq("active", true),
    supabase
      .from("role_members")
      .select("id, role_id, name, joined_at, is_lead")
      .eq("event_id", eventId)
      .order("created_at"),
  ]);
  if (rolesResult.error || membersResult.error) throw new Error("Could not load the team");
  const roles = rolesResult.data.toSorted(
    (a, b) => roleKeys.indexOf(a.key) - roleKeys.indexOf(b.key),
  );
  return (
    <div className="flex flex-col gap-4 py-12">
      <h1 className="text-large-title">{t("team.title")}</h1>
      <p className="text-muted-foreground">{t("team.holderIntro")}</p>
      <ul role="list" className="flex flex-col gap-3">
        {roles.map((role) => {
          const members = membersResult.data.filter((m) => m.role_id === role.id);
          const lead = members.find((m) => m.is_lead);
          return (
            <li key={role.id} className="bg-card flex flex-col gap-1 rounded-md border p-4">
              <h2 className="text-headline">{t(`roles.${role.key}.name`)}</h2>
              <p className="text-subhead text-muted-foreground">
                {lead ? t("team.lead.current", { name: lead.name }) : t("team.lead.none")}
              </p>
              <ul role="list">
                {members.map((m) => (
                  <li key={m.id}>
                    {m.name}
                    {m.joined_at === null && (
                      <span className="text-muted-foreground"> · {t("team.people.pending")}</span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
