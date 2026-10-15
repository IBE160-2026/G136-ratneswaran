import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { getClaims } from "@/lib/supabase/server";
import { resolveLocale } from "./locale";

export default getRequestConfig(async () => {
  const claims = await getClaims();
  const locale = resolveLocale(
    (await headers()).get("accept-language"),
    claims?.user_metadata?.language,
  );
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
