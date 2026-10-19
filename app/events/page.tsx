import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getClaims } from "@/lib/supabase/server";
import { setupPath } from "@/modules/events/save";
import { CreateEventButton } from "./create-event-button";

export async function generateMetadata() {
  const t = await getTranslations("events");
  return { title: `${t("surface")} – Arrangly` };
}

// The list of Events arrives with Story 2.4; until then this shows the empty state.
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!(await getClaims())) redirect("/login?next=/events");
  const t = await getTranslations("events");
  const { saved } = await searchParams;
  // RLS limits this to the Organizer's own Events. Story 2.4 replaces the list with cards.
  const supabase = await createClient();
  const { data: drafts, error } = await supabase
    .from("events")
    .select("id, name")
    .is("published_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load drafts");
  return (
    <div className="flex flex-col gap-4 py-12">
      <h1 className="text-large-title">{t("title")}</h1>
      {saved === "1" && <p role="status">{t("saved")}</p>}
      {drafts.length > 0 ? (
        <section aria-labelledby="drafts" className="flex flex-col gap-2">
          <h2 id="drafts" className="text-headline">
            {t("draft.title")}
          </h2>
          <ul className="flex flex-col gap-2">
            {drafts.map((draft) => (
              <li key={draft.id}>
                <Link
                  href={setupPath(draft.id)}
                  className="min-h-touch bg-card flex items-center rounded-lg border px-4"
                >
                  {draft.name ?? t("draft.untitled")} – {t("draft.continue")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <p className="text-headline">{t("empty.title")}</p>
          <p className="text-muted-foreground">{t("empty.hint")}</p>
        </>
      )}
      <CreateEventButton />
    </div>
  );
}
