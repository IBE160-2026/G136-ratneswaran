import { getTranslations } from "next-intl/server";
import { SignUpForm } from "./form";

export async function generateMetadata() {
  const t = await getTranslations("auth.signUp");
  return { title: `${t("surface")} – Arrangly` };
}

export default async function SignUpPage() {
  const t = await getTranslations("auth.signUp");
  return (
    <div className="flex max-w-md flex-col gap-4 py-12">
      <h1 className="text-large-title">{t("title")}</h1>
      <SignUpForm />
    </div>
  );
}
