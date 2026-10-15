"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { signInWithProvider } from "@/modules/auth/actions";

const providers = ["google", "github"] as const;

export function OAuthButtons({ failure }: { failure?: string }) {
  const t = useTranslations();
  const [state, action, pending] = useActionState(signInWithProvider, null);
  const message = state && !state.ok ? state.error.message : failure;
  return (
    <form action={action} className="flex flex-col gap-2">
      {message && (
        <p role="alert" className="text-destructive">
          {t(message)}
        </p>
      )}
      {providers.map((provider) => (
        <button
          key={provider}
          type="submit"
          name="provider"
          value={provider}
          disabled={pending}
          className="border-input min-h-touch rounded-full border px-6"
        >
          {t(`auth.oauth.${provider}`)}
        </button>
      ))}
    </form>
  );
}
