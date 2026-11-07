import { createTranslator } from "next-intl";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { INVITE_COOKIE } from "@/modules/events/invite";
import { inviteTokenSchema } from "@/modules/events/schemas";
import type { Database } from "@/types/database";
import en from "../../../messages/en.json";
import nb from "../../../messages/nb.json";

type PreviewRow = Database["public"]["Functions"]["guests_link_preview"]["Returns"][number];

export type GuestLinkStatus =
  "valid" | "revoked" | "cancelled" | "ended" | "invalid" | "other_kind" | "unavailable";

export type GuestLinkPreview = Partial<Omit<PreviewRow, "status">> & { status: GuestLinkStatus };

/**
 * The guest link behind the invite cookie, through the system function `guests_link_preview` and the
 * secret key (AD-5). No cookie, a malformed token and an unknown token all read invalid. Server only.
 */
export async function readGuestLink(): Promise<{
  token: string | null;
  preview: GuestLinkPreview;
}> {
  const token = (await cookies()).get(INVITE_COOKIE)?.value ?? null;
  if (!token || !inviteTokenSchema.safeParse(token).success) {
    return { token: null, preview: { status: "invalid" } };
  }
  const { data, error } = await createAdminClient().rpc("guests_link_preview", { p_token: token });
  const row = data?.[0];
  if (error || !row) return { token, preview: { status: "unavailable" } };
  return { token, preview: { ...row, status: row.status as GuestLinkStatus } };
}

/** The first word of a name, for "Hi {first name}". */
export const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] ?? "";

/**
 * *Copy invitation text*: in the Event's language (fallback en), the date in its time zone, a variant
 * without a date for an Event that has none yet.
 */
export function invitationText(event: {
  language: string | null;
  name: string | null;
  starts_at: string | null;
  time_zone: string | null;
  guestName: string;
  link: string;
}) {
  const locale = event.language === "nb" ? "nb" : "en";
  const t = createTranslator({
    locale,
    messages: locale === "nb" ? nb : en,
    namespace: "guests.link.invitation",
  });
  const values = {
    name: firstName(event.guestName),
    event: event.name ?? t("untitled"),
    link: event.link,
  };
  if (!event.starts_at) return t("noDate", values);
  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeZone: event.time_zone ?? "UTC",
  }).format(new Date(event.starts_at));
  return t("withDate", { ...values, date });
}
