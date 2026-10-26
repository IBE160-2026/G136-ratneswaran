import { getFormatter, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient, getClaims } from "@/lib/supabase/server";
import { isDraft, isPast } from "@/modules/events/list";
import { roleDescriptionKey, roleKeys, suggestion } from "@/modules/events/roles";
import { loadEvent } from "../load-event";
import { InviteForm } from "./invite-form";
import { PeopleList } from "./people-list";
import { RoleSwitch } from "./role-switch";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props) {
  if (!(await getClaims())) return { title: "Arrangly" };
  const t = await getTranslations("events");
  const event = await loadEvent((await params).eventId);
  return { title: `${t("team.surface")} – ${event.name ?? t("draft.untitled")} – Arrangly` };
}

// Team & Roles, for the Organizer: switch Roles (2.5), invite people (3.6) and read the Access history.
export default async function TeamPage({ params }: Props) {
  const { eventId } = await params;
  const claims = await getClaims();
  if (!claims) redirect(`/login?next=/events/${eventId}/team`);
  const event = await loadEvent(eventId);
  const t = await getTranslations("events");
  const format = await getFormatter();
  const supabase = await createClient();
  const [rolesResult, membersResult, historyResult] = await Promise.all([
    supabase.from("roles").select("id, key, active, toggled_at").eq("event_id", eventId),
    supabase
      .from("role_members")
      .select("id, role_id, user_id, name, email, joined_at")
      .eq("event_id", eventId)
      .order("created_at"),
    supabase
      .from("role_membership_log")
      .select("id, role_id, user_id, action, actor_id, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
  ]);
  if (rolesResult.error || membersResult.error || historyResult.error) {
    throw new Error("Could not load the team");
  }
  const roles = rolesResult.data.toSorted(
    (a, b) => roleKeys.indexOf(a.key) - roleKeys.indexOf(b.key),
  );
  const roleName = new Map(roles.map((role) => [role.id, t(`roles.${role.key}.name`)]));
  // A person can hold several Roles under different names: prefer the row of the logged Role.
  const nameOnRole = new Map(
    membersResult.data.map((member) => [`${member.role_id}:${member.user_id}`, member.name]),
  );
  const anyName = new Map(membersResult.data.map((member) => [member.user_id, member.name]));
  const personName = (roleId: string | null, userId: string | null) =>
    nameOnRole.get(`${roleId}:${userId}`) ?? anyName.get(userId ?? "");
  const members = membersResult.data
    .map((member) => ({
      id: member.id,
      roleId: member.role_id,
      roleName: roleName.get(member.role_id) ?? "",
      roleActive: roles.some((role) => role.id === member.role_id && role.active),
      name: member.name,
      email: member.email,
      joined: member.joined_at !== null,
    }))
    .toSorted(
      (a, b) =>
        roles.findIndex((role) => role.id === a.roleId) -
        roles.findIndex((role) => role.id === b.roleId),
    );
  const activeRoles = roles
    .filter((role) => role.active)
    .map((role) => ({ id: role.id, name: roleName.get(role.id) ?? "" }));
  const former = t("team.history.formerInvitee");
  // Published past and cancelled Events are read-only; the database refuses their changes too.
  const readOnly = !isDraft(event) && isPast(event, new Date());
  return (
    <div className="flex flex-col gap-4 py-12">
      <h1 className="text-large-title">{t("team.title")}</h1>
      <p className="text-muted-foreground">{t(readOnly ? "team.readOnly" : "team.intro")}</p>
      <ul role="list" className="flex flex-col gap-2">
        {roles.map((role) => {
          const hint = suggestion(role, event.event_type);
          return (
            <li key={role.id}>
              <RoleSwitch
                eventId={eventId}
                roleId={role.id}
                active={role.active}
                disabled={readOnly}
                name={t(`roles.${role.key}.name`)}
                description={t(roleDescriptionKey(role.key, event.event_type))}
                hint={hint && t(`team.suggested.${hint}`)}
              />
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="people" className="flex flex-col gap-3 pt-6">
        <h2 id="people" className="text-headline">
          {t("team.people.title")}
        </h2>
        {!readOnly && (
          <div className="bg-card flex flex-col gap-3 rounded-md border p-4">
            <h3 className="font-semibold">{t("team.invite.title")}</h3>
            {activeRoles.length > 0 ? (
              <InviteForm eventId={eventId} roles={activeRoles} />
            ) : (
              <p className="text-muted-foreground">{t("team.invite.noActiveRoles")}</p>
            )}
          </div>
        )}
        <PeopleList eventId={eventId} members={members} readOnly={readOnly} />
      </section>

      <section aria-labelledby="history" className="flex flex-col gap-3 pt-6">
        <h2 id="history" className="text-headline">
          {t("team.history.title")}
        </h2>
        {historyResult.data.length === 0 ? (
          <p className="text-muted-foreground">{t("team.history.empty")}</p>
        ) : (
          <ul role="list" className="divide-border flex flex-col divide-y">
            {historyResult.data.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
                <span className="min-w-0 break-words">
                  {t("team.history.entry", {
                    actor:
                      entry.actor_id === claims.sub
                        ? t("team.history.you")
                        : (anyName.get(entry.actor_id ?? "") ?? former),
                    action: t(`team.history.actions.${entry.action}`),
                    name: personName(entry.role_id, entry.user_id) ?? former,
                    role: roleName.get(entry.role_id ?? "") ?? "",
                  })}
                </span>
                <time
                  dateTime={entry.created_at}
                  className="text-subhead text-muted-foreground ml-auto"
                >
                  {format.dateTime(new Date(entry.created_at), {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: event.time_zone ?? "UTC",
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
