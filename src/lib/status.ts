import {
  CalendarX,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CircleMinus,
  CircleQuestionMark,
  Flag,
  Hourglass,
  Link,
  Lock,
  Mail,
  MailOpen,
  UserRound,
  UserRoundCheck,
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
  accepted: { icon: UserRoundCheck, tone: "text-status-done" },
  notAccepted: { icon: UserRound, tone: "text-muted-foreground" },
  notStarted: { icon: Circle, tone: "text-muted-foreground" },
  inProgress: { icon: CircleDot, tone: "text-primary" },
  done: { icon: CircleCheck, tone: "text-status-done" },
  obsolete: { icon: CircleMinus, tone: "text-status-obsolete line-through" },
  atRisk: { icon: null, tone: "text-at-risk-text" },
  newItem: { icon: null, tone: "bg-badge px-2 py-0.5 text-badge-foreground" },
  cancelled: { icon: CalendarX, tone: "text-muted-foreground" },
  // A guest's personal link: never copied, copied but not opened, opened (Story 7.1).
  notInvited: { icon: Mail, tone: "text-muted-foreground" },
  linkCopied: { icon: Link, tone: "text-muted-foreground" },
  opened: { icon: MailOpen, tone: "text-primary" },
} satisfies Record<string, { icon: LucideIcon | null; tone: string }>;

export type Status = keyof typeof STATUSES;

/** The vocabulary entry for each stored Task status; Overdue and Blocked are computed, not stored. */
export const taskStatus = {
  not_started: "notStarted",
  in_progress: "inProgress",
  waiting_external: "waiting",
  done: "done",
} as const satisfies Record<string, Status>;
