import { useTranslations } from "next-intl";

// UX-DR24: a foreign, unknown or malformed Event id shows the same message, so nothing about the Event leaks.
export default function EventNotFound() {
  const t = useTranslations("events");
  return (
    <div className="py-12">
      <h1 className="text-large-title">{t("noAccess")}</h1>
    </div>
  );
}
