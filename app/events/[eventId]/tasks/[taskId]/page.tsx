import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient, getClaims } from "@/lib/supabase/server";
import { eventPath, isDraft, isPast } from "@/modules/events/list";
import { loadEvent } from "../../load-event";
import { TaskDetail } from "./task-detail";

type Props = { params: Promise<{ eventId: string; taskId: string }> };

export async function generateMetadata() {
  const t = await getTranslations("tasks");
  return { title: `${t("surface")} – Arrangly` };
}

// One Task in full (UX-DR13). A Task the caller cannot see is the same no-access page as an unknown one (UX-DR24).
export default async function TaskPage({ params }: Props) {
  const { eventId, taskId } = await params;
  const claims = await getClaims();
  if (!claims) redirect(`/login?next=${eventPath(eventId)}/tasks/${taskId}`);
  const event = await loadEvent(eventId);
  if (!z.uuid().safeParse(taskId).success) notFound();
  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("tasks")
    .select(
      "id, title, description, deadline, days_before, status, lifecycle, owner_user_id, role_id, updated_at",
    )
    .eq("id", taskId)
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw new Error("Could not load the task");
  if (!task) notFound();
  const [roleResult, leadResult] = await Promise.all([
    supabase.from("roles").select("key").eq("id", task.role_id).single(),
    supabase
      .from("role_members")
      .select("id")
      .eq("role_id", task.role_id)
      .eq("user_id", claims.sub)
      .eq("is_lead", true)
      .not("joined_at", "is", null),
  ]);
  if (roleResult.error || leadResult.error) throw new Error("Could not load the task");
  const t = await getTranslations("events");
  const canEdit =
    (event.organizer_id === claims.sub || leadResult.data.length > 0) &&
    !(!isDraft(event) && isPast(event, new Date()));
  return (
    <TaskDetail
      eventId={eventId}
      task={task}
      roleName={t(`roles.${roleResult.data.key}.name`)}
      canEdit={canEdit}
      hasStart={event.starts_at !== null && event.time_zone !== null}
    />
  );
}
