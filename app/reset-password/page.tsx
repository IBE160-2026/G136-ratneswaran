import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getClaims } from "@/lib/supabase/server";
import { ResetForm } from "./form";

export async function generateMetadata() {
  const t = await getTranslations("auth.reset");
  return { title: `${t("surface")} – Arrangly` };
}

export default async function ResetPasswordPage() {
  if (!(await getClaims())) redirect("/forgot-password?expired=1");
  const t = await getTranslations("auth.reset");
  return (
    <div className="flex max-w-md flex-col gap-4 py-12">
      <h1 className="text-large-title">{t("title")}</h1>
      <ResetForm />
    </div>
  );
}
