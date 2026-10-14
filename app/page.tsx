import { Calendar } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("home");
  return { title: `${t("surface")} – Arrangly` };
}

export default async function Home() {
  const t = await getTranslations("home");
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <Calendar aria-hidden strokeWidth={1.75} className="text-primary size-10" />
      <h1 className="text-large-title">{t("title")}</h1>
      <p className="text-muted-foreground">{t("tagline")}</p>
    </div>
  );
}
