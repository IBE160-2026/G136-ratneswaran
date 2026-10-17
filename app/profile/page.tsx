import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient, getClaims } from "@/lib/supabase/server";
import { providerSchema } from "@/modules/auth/schemas";
import {
  AppearanceForm,
  ConnectButton,
  EmailForm,
  LanguageForm,
  NameForm,
  PasswordForm,
} from "./forms";

export async function generateMetadata() {
  const t = await getTranslations("profile");
  return { title: `${t("surface")} – Arrangly` };
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>;
}) {
  const claims = await getClaims();
  if (!claims) redirect("/login?next=/profile");
  const t = await getTranslations("profile");
  const { link } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUserIdentities();
  const linked = new Set(data?.identities.map((identity) => identity.provider));
  const meta = claims.user_metadata ?? {};
  const section = "flex flex-col gap-3";

  return (
    <div className="flex max-w-md flex-col gap-8 py-12">
      <h1 className="text-large-title">{t("title")}</h1>
      {(link === "failed" || link === "cancelled") && (
        <p role="alert" className="text-destructive">
          {t(`link.${link}`)}
        </p>
      )}
      <section aria-labelledby="name" className={section}>
        <h2 id="name" className="text-headline">
          {t("name.title")}
        </h2>
        <NameForm name={typeof meta.name === "string" ? meta.name : ""} />
      </section>
      <section aria-labelledby="email" className={section}>
        <h2 id="email" className="text-headline">
          {t("email.title")}
        </h2>
        <EmailForm current={String(claims.email ?? "")} />
      </section>
      <section aria-labelledby="password" className={section}>
        <h2 id="password" className="text-headline">
          {t("password.title")}
        </h2>
        <PasswordForm />
      </section>
      <section aria-labelledby="accounts" className={section}>
        <h2 id="accounts" className="text-headline">
          {t("accounts.title")}
        </h2>
        <ul className="flex flex-col gap-2">
          {linked.has("email") && (
            <li className="min-h-touch flex items-center justify-between gap-3">
              {t("accounts.email")}
              <span className="flex items-center gap-1">
                <Check aria-hidden strokeWidth={1.75} className="size-4" />
                {t("accounts.connected")}
              </span>
            </li>
          )}
          {providerSchema.options.map((provider) => (
            <li key={provider} className="min-h-touch flex items-center justify-between gap-3">
              {t(`accounts.${provider}`)}
              {linked.has(provider) ? (
                <span className="flex items-center gap-1">
                  <Check aria-hidden strokeWidth={1.75} className="size-4" />
                  {t("accounts.connected")}
                </span>
              ) : (
                <ConnectButton provider={provider} />
              )}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="language" className={section}>
        <h2 id="language" className="text-headline">
          {t("language.title")}
        </h2>
        <LanguageForm
          value={meta.language === "nb" || meta.language === "en" ? meta.language : "auto"}
        />
      </section>
      <section aria-labelledby="appearance" className={section}>
        <h2 id="appearance" className="text-headline">
          {t("appearance.title")}
        </h2>
        <AppearanceForm
          value={meta.theme === "light" || meta.theme === "dark" ? meta.theme : "system"}
        />
      </section>
    </div>
  );
}
