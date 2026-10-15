export type Locale = "nb" | "en";

const NORWEGIAN = new Set(["nb", "nn", "no"]);

// AD-14: the user's own choice wins; otherwise Norwegian browsers get Bokmål, everything else English. Only the first (preferred) tag counts.
export function resolveLocale(
  acceptLanguage: string | null | undefined,
  preferred?: unknown,
): Locale {
  if (preferred === "nb" || preferred === "en") return preferred;
  const first = acceptLanguage?.split(",")[0]?.split(";")[0]?.trim().toLowerCase() ?? "";
  return NORWEGIAN.has(first.split("-")[0]) ? "nb" : "en";
}
