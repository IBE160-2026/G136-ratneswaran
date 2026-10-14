import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClaims } from "@/lib/supabase/server";

export async function generateMetadata() {
  const t = await getTranslations("events");
  return { title: `${t("surface")} – Arrangly` };
}

// Placeholder: Story 1.7 replaces the body and keeps the route and the redirect.
export default async function EventsPage() {
  if (!(await getClaims())) redirect("/login?next=/events");
  const t = await getTranslations("events");
  return (
    <div className="flex flex-col gap-4 py-12">
      <h1 className="text-large-title">{t("title")}</h1>
    </div>
  );
}
