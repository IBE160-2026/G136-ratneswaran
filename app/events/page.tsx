import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClaims } from "@/lib/supabase/server";
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
  return (
    <div className="flex flex-col gap-4 py-12">
      <h1 className="text-large-title">{t("title")}</h1>
      {saved === "1" && <p role="status">{t("saved")}</p>}
      <p className="text-headline">{t("empty.title")}</p>
      <p className="text-muted-foreground">{t("empty.hint")}</p>
      <CreateEventButton />
    </div>
  );
}
