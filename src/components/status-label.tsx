import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { STATUSES, type Status } from "@/lib/status";

export function StatusLabel({
  status,
  values,
  className,
}: {
  status: Status;
  values?: Record<string, string | number>;
  className?: string;
}) {
  const t = useTranslations("status");
  const { icon: Icon, tone } = STATUSES[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full text-subhead", tone, className)}
    >
      {Icon && <Icon aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />}
      <span>{t(status, values)}</span>
    </span>
  );
}
