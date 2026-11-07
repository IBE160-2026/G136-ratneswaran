import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getClaims } from "@/lib/supabase/server";
import { readInvite, sameEmail } from "@/modules/events/invite";
import { firstName, type GuestLinkPreview, readGuestLink } from "@/modules/guests/link";
import { OAuthButtons } from "../oauth-buttons";
import { GuestContinue, GuestEnded } from "./guest-flow";
import { Ended, JoinButton, Mismatch, NewInvitee, PasswordStep } from "./join-flow";

export async function generateMetadata() {
  const t = await getTranslations("invite");
  return { title: `${t("surface")} – Arrangly` };
}

const NEXT = "/invite";

/**
 * Where the invite link lands, token-free (FR-1, FR-6, AD-4); the state comes from the cookie's token.
 * A guest link has its own view; a Role invitation keeps the join flow.
 */
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
  const { preview: guest } = await readGuestLink();
  if (guest.status === "unavailable") {
    return (
      <Shell>
        <p role="alert">{t("invite.errors.unavailable")}</p>
      </Shell>
    );
  }
  if (guest.status !== "other_kind") return <GuestView preview={guest} />;

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
        {preview.status === "invalid" ? (
          <GuestEnded>{t("guestLink.invalid")}</GuestEnded>
        ) : (
          <Ended message={`invite.${preview.status}`} />
        )}
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

/** The guest side of a personal link: a greeting and *Continue*, or the text of a link that has ended. */
async function GuestView({ preview }: { preview: GuestLinkPreview }) {
  const t = await getTranslations("guestLink");
  const organizer = preview.organizer_name?.trim();
  if (preview.status === "invalid") {
    return (
      <Shell>
        <GuestEnded>{t("invalid")}</GuestEnded>
      </Shell>
    );
  }
  if (preview.status === "revoked") {
    return (
      <Shell>
        <GuestEnded>{organizer ? t("revoked", { organizer }) : t("revokedGeneric")}</GuestEnded>
      </Shell>
    );
  }
  const event = preview.event_name ?? (await getTranslations("events.draft"))("untitled");
  if (preview.status === "cancelled" || preview.status === "ended") {
    return (
      <Shell title={event}>
        <GuestEnded>
          <p>{t(preview.status)}</p>
          {preview.cancellation_note && (
            <p className="break-words whitespace-pre-line">{preview.cancellation_note}</p>
          )}
        </GuestEnded>
      </Shell>
    );
  }

  const first = firstName(preview.guest_name);
  const claims = await getClaims();
  return (
    <Shell title={t("greeting", { name: first, event })}>
      {!claims && (
        <GuestContinue
          notYou={
            organizer
              ? t("notYou", { name: first, organizer })
              : t("notYouGeneric", { name: first })
          }
        />
      )}
      {claims && claims.sub === preview.user_id && <p>{t("signedIn")}</p>}
      {claims && claims.sub !== preview.user_id && <Mismatch message="guestLink.otherAccount" />}
    </Shell>
  );
}
