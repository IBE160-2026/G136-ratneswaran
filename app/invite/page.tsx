import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getClaims } from "@/lib/supabase/server";
import { readInvite, sameEmail } from "@/modules/events/invite";
import { OAuthButtons } from "../oauth-buttons";
import { Ended, JoinButton, Mismatch, NewInvitee, PasswordStep } from "./join-flow";

export async function generateMetadata() {
  const t = await getTranslations("invite");
  return { title: `${t("surface")} – Arrangly` };
}

const NEXT = "/invite";

/** Where the invite link lands, token-free (FR-1, AD-4); the state comes from the cookie's invitation. */
export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations();
  const { error } = await searchParams;
  if (error === "rateLimited" || error === "unavailable") {
    return (
      <Shell>
        <p role="alert">{t(`invite.errors.${error}`)}</p>
      </Shell>
    );
  }
  const { preview } = await readInvite();
  if (preview.status === "unavailable") {
    return (
      <Shell>
        <p role="alert">{t("invite.errors.unavailable")}</p>
      </Shell>
    );
  }
  if (preview.status !== "valid") {
    return (
      <Shell>
        <Ended message={`invite.${preview.status}`} />
      </Shell>
    );
  }

  const claims = await getClaims();
  if (claims && !sameEmail(claims.email, preview.email)) {
    return (
      <Shell>
        <Mismatch />
      </Shell>
    );
  }
  const step = claims
    ? preview.has_account
      ? "join"
      : "password"
    : preview.has_account
      ? "logIn"
      : "new";
  return (
    <Shell title={t("invite.title", { event: preview.event_name ?? t("events.draft.untitled") })}>
      <p>{t("invite.intro", { role: t(`events.roles.${preview.role_key}.name`) })}</p>
      <dl className="flex flex-col gap-1">
        <dt className="text-muted-foreground">{t("invite.name")}</dt>
        <dd>{preview.name}</dd>
        <dt className="text-muted-foreground">{t("invite.email")}</dt>
        <dd className="break-words">{preview.email}</dd>
      </dl>
      {step === "new" && <NewInvitee email={preview.email} />}
      {step === "password" && <PasswordStep />}
      {step === "join" && <JoinButton />}
      {step === "logIn" && (
        <>
          <p>{t("invite.logInIntro")}</p>
          <Link
            href={`/login?next=${encodeURIComponent(NEXT)}`}
            className="bg-primary text-primary-foreground min-h-touch inline-flex items-center justify-center rounded-full px-6"
          >
            {t("invite.logIn")}
          </Link>
          <OAuthButtons next={NEXT} />
        </>
      )}
    </Shell>
  );
}

async function Shell({ title, children }: { title?: string; children: React.ReactNode }) {
  const t = await getTranslations("invite");
  return (
    <div className="flex max-w-md flex-col gap-4 py-12">
      <h1 className="text-large-title break-words">{title ?? t("surface")}</h1>
      {children}
    </div>
  );
}
