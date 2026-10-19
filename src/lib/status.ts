import {
  CalendarX,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CircleMinus,
  CircleQuestionMark,
  Flag,
  Hourglass,
  Lock,
  UserRound,
  type LucideIcon,
} from "lucide-react";

// UX-DR4: the one status vocabulary. Fixed colour, icon and message key per status; the word is
// always rendered, so status is never colour alone. Blocked is a muted tint, never red.
export const STATUSES = {
  decision: { icon: CircleQuestionMark, tone: "text-status-decision" },
  overdue: { icon: CircleAlert, tone: "text-status-overdue" },
  problem: { icon: Flag, tone: "text-status-overdue" },
  waiting: { icon: Hourglass, tone: "text-status-waiting" },
  blocked: { icon: Lock, tone: "bg-status-blocked-row px-2 py-0.5 text-muted-foreground" },
  notAccepted: { icon: UserRound, tone: "text-muted-foreground" },
  inProgress: { icon: CircleDot, tone: "text-primary" },
  done: { icon: CircleCheck, tone: "text-status-done" },
  obsolete: { icon: CircleMinus, tone: "text-status-obsolete line-through" },
  atRisk: { icon: null, tone: "text-at-risk-text" },
  newItem: { icon: null, tone: "bg-badge px-2 py-0.5 text-badge-foreground" },
  cancelled: { icon: CalendarX, tone: "text-muted-foreground" },
} satisfies Record<string, { icon: LucideIcon | null; tone: string }>;

export type Status = keyof typeof STATUSES;
