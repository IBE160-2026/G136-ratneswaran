import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { safeNext } from "@/modules/auth/schemas";
import { OAuthButtons } from "../oauth-buttons";
import { LogInForm } from "./form";

export async function generateMetadata() {
  const t = await getTranslations("auth.logIn");
  return { title: `${t("surface")} – Arrangly` };
}

export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; oauth?: string }>;
}) {
  const t = await getTranslations("auth.logIn");
  const { next, oauth } = await searchParams;
  const failure = ["cancelled", "unverified", "failed"].includes(oauth ?? "")
    ? `auth.oauth.${oauth}`
    : undefined;
  return (
    <div className="flex max-w-md flex-col gap-4 py-12">
      <h1 className="text-large-title">{t("title")}</h1>
      <LogInForm next={safeNext(next)} />
      <OAuthButtons failure={failure} next={safeNext(next)} />
      <Link href="/forgot-password" className="text-primary min-h-touch inline-flex items-center">
        {t("forgot")}
      </Link>
    </div>
  );
}
