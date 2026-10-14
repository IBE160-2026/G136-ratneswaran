import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { resolveLocale } from "./locale";

export default getRequestConfig(async () => {
  const locale = resolveLocale((await headers()).get("accept-language"));
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default };
});
