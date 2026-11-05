type Ordered = {
  accepted: boolean | null;
  status: string;
  deadline: string | null;
  title: string;
};

/** Not yet accepted first, then open before done, then soonest deadline (none last), then title. */
export const byAcceptanceAndDeadline = (a: Ordered, b: Ordered) =>
  Number(b.accepted === false) - Number(a.accepted === false) ||
  Number(a.status === "done") - Number(b.status === "done") ||
  (a.deadline ?? "9999-12-31").localeCompare(b.deadline ?? "9999-12-31") ||
  a.title.localeCompare(b.title);
