import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("privacy");
  return { title: `${t("surface")} – Arrangly` };
}

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  return (
    <div className="flex flex-col gap-4 py-12">
      <h1 className="text-large-title">{t("title")}</h1>
      <h2 className="text-headline">{t("processors.title")}</h2>
      <p>{t("processors.intro")}</p>
      <ul className="list-disc pl-6">
        {(["supabase", "vercel", "anthropic", "google"] as const).map((k) => (
          <li key={k}>{t(`processors.${k}`)}</li>
        ))}
      </ul>
      <h2 className="text-headline">{t("stored.title")}</h2>
      <ul className="list-disc pl-6">
        {(["account", "events", "guests"] as const).map((k) => (
          <li key={k}>{t(`stored.${k}`)}</li>
        ))}
      </ul>
      <h2 className="text-headline">{t("deletion.title")}</h2>
      <p>{t("deletion.body")}</p>
    </div>
  );
}
