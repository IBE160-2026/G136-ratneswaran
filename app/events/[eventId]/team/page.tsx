import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient, getClaims } from "@/lib/supabase/server";
import { isDraft, isPast } from "@/modules/events/list";
import { roleDescriptionKey, roleKeys, suggestion } from "@/modules/events/roles";
import { loadEvent } from "../load-event";
import { RoleSwitch } from "./role-switch";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props) {
  if (!(await getClaims())) return { title: "Arrangly" };
  const t = await getTranslations("events");
  const event = await loadEvent((await params).eventId);
  return { title: `${t("team.surface")} – ${event.name ?? t("draft.untitled")} – Arrangly` };
}

// Team & Roles: in 2.5 the Organizer switches Roles; Epic 3 adds the people.
export default async function TeamPage({ params }: Props) {
  const { eventId } = await params;
  if (!(await getClaims())) redirect(`/login?next=/events/${eventId}/team`);
  const event = await loadEvent(eventId);
  const t = await getTranslations("events");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, key, active, toggled_at")
    .eq("event_id", eventId);
  if (error) throw new Error("Could not load roles");
  const roles = data.toSorted((a, b) => roleKeys.indexOf(a.key) - roleKeys.indexOf(b.key));
  // Published past and cancelled Events are read-only; Story 2.7 enforces it in the database.
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
    </div>
  );
}
