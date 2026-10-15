import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClaims } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("events");
  return { title: `${t("surface")} – Arrangly` };
}

// No events table until Epic 2, so this always shows the empty state.
export default async function EventsPage() {
  if (!(await getClaims())) redirect("/login?next=/events");
  const t = await getTranslations("events");
  return (
    <div className="flex flex-col gap-4 py-12">
      <h1 className="text-large-title">{t("title")}</h1>
      <p className="text-headline">{t("empty.title")}</p>
      <p className="text-muted-foreground">{t("empty.hint")}</p>
    </div>
  );
}
