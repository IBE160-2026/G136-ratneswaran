import { getTranslations } from "next-intl/server";
import { ForgotForm } from "./form";

export async function generateMetadata() {
  const t = await getTranslations("auth.forgot");
  return { title: `${t("surface")} – Arrangly` };
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const t = await getTranslations("auth.forgot");
  const { expired } = await searchParams;
  return (
    <div className="flex max-w-md flex-col gap-4 py-12">
      <h1 className="text-large-title">{t("title")}</h1>
      <ForgotForm expired={Boolean(expired)} />
    </div>
  );
}
