import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// The invite token must never leak through a Referer header (AD-4).
const noReferrer = [{ key: "Referrer-Policy", value: "no-referrer" }];

const nextConfig: NextConfig = {
  headers: async () => [
    { source: "/invite", headers: noReferrer },
    { source: "/api/invite/:path*", headers: noReferrer },
  ],
};

export default withNextIntl(nextConfig);
