import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClaims } from "@/lib/supabase/server";
import { eventPath } from "@/modules/events/list";
import { byAcceptanceAndDeadline } from "@/modules/tasks/my-tasks";
import { loadEvent } from "../load-event";
import { loadListed } from "../tasks/load-listed";
import { HolderTeam } from "../team/holder-team";
import { MyTasksView } from "./my-tasks-view";

type Props = { params: Promise<{ eventId: string }> };

export async function generateMetadata({ params }: Props) {
  if (!(await getClaims())) return { title: "Arrangly" };
  const t = await getTranslations();
  const event = await loadEvent((await params).eventId);
  return {
    title: `${t("tasks.mine.surface")} – ${event.name ?? t("events.draft.untitled")} – Arrangly`,
  };
}

// The viewer's own Tasks and the Team. RLS decides which Tasks the viewer may see at all.
export default async function MyTasksPage({ params }: Props) {
  const { eventId } = await params;
  const claims = await getClaims();
  if (!claims) redirect(`/login?next=${eventPath(eventId)}/my-tasks`);
  const event = await loadEvent(eventId);
  const t = await getTranslations();
  const { listed } = await loadListed(event, claims.sub);
  const mine = listed.filter((x) => x.row.owner_user_id === claims.sub);
  const owned = mine.filter((x) => !x.obsolete).map((x) => x.row);
  const obsolete = mine.filter((x) => x.obsolete).map((x) => x.row);
  const pending = listed
    .filter((x) => x.pending && !x.obsolete)
    .map((x) => x.row)
    .toSorted(byAcceptanceAndDeadline);
  return (
    <div className="flex max-w-2xl flex-col gap-6 py-12">
      <h1 className="text-large-title">{t("tasks.mine.title")}</h1>
      <MyTasksView
        eventId={eventId}
        owned={owned.toSorted(byAcceptanceAndDeadline)}
        obsolete={obsolete.toSorted(byAcceptanceAndDeadline)}
        pending={pending}
      />
      <HolderTeam eventId={eventId} embedded />
    </div>
  );
}
