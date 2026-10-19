import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient, getClaims } from "@/lib/supabase/server";
import { groupEvents } from "@/modules/events/list";
import { CreateEventButton } from "./create-event-button";
import { EventCard } from "./event-card";

export async function generateMetadata() {
  const t = await getTranslations("events");
  return { title: `${t("surface")} – Arrangly` };
}

// role="list": Safari drops the list role from a ul without list-style.
const gridClass = "grid gap-3 sm:grid-cols-2";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}) {
  if (!(await getClaims())) redirect("/login?next=/events");
  const t = await getTranslations("events");
  const { saved, deleted } = await searchParams;
  // RLS limits this to the Organizer's own Events.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, name, starts_at, ends_at, time_zone, published_at, cancelled_at")
    // Newest first, so Events with the same or no date keep a stable order through the date sort.
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load events");
  const { upcoming, past } = groupEvents(data, new Date());
  return (
    <div className="flex flex-col gap-4 py-12">
      <h1 className="text-large-title">{t("title")}</h1>
      {saved === "1" && <p role="status">{t("saved")}</p>}
      {(deleted === "event" || deleted === "draft") && (
        <p role="status">{t(`deleted.${deleted}`)}</p>
      )}
      {data.length === 0 && <p className="text-headline">{t("empty.title")}</p>}
      <ul role="list" className={gridClass}>
        {upcoming.map((card) => (
          <li key={card.id}>
            <EventCard card={card} />
          </li>
        ))}
        <li>
          <CreateEventButton />
        </li>
      </ul>
      {past.length > 0 && (
        <details>
          <summary className="min-h-touch text-headline cursor-pointer py-2">
            {t("past", { count: past.length })}
          </summary>
          <ul role="list" className={`${gridClass} mt-3`}>
            {past.map((card) => (
              <li key={card.id}>
                <EventCard card={card} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
