"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { buttonClass, Failure } from "@/components/form";
import { forgetInvite } from "@/modules/events/join";
import { openGuestLink } from "@/modules/guests/link-actions";
import { LogInForm } from "../login/form";

/** A guest link that can no longer be used: its text, read-only, and the cookie dropped. */
export function GuestEnded({ children }: { children: React.ReactNode }) {
  // Dropping the cookie refreshes the route, which then reads as invalid; keep the first text.
  const [shown] = useState(children);
  useEffect(() => {
    void forgetInvite();
  }, []);
  return <div role="alert">{shown}</div>;
}

/** *Continue*: a session for a guest-only user, otherwise a log-in with the guest's email filled in. */
export function GuestContinue({ notYou }: { notYou: string }) {
  const t = useTranslations("guestLink");
  const [state, action, pending] = useActionState(openGuestLink, null);
  if (state?.ok) {
    return (
      <>
        <p>{t("logInIntro")}</p>
        <LogInForm next="/invite" email={state.data.email} />
      </>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <Failure state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {t("continue")}
      </button>
      <p className="text-muted-foreground">{notYou}</p>
    </form>
  );
}
