import type { createClient } from "@/lib/supabase/server";

export type CardCounts = {
  open: number;
  new: number;
  overdue: number;
  needYou: number;
  atRisk: number;
};

export const noCounts: CardCounts = { open: 0, new: 0, overdue: 0, needYou: 0, atRisk: 0 };

/** One grouped read for every visible Event, under the viewer's RLS. Events without a readable Task have no entry. */
export async function loadCardCounts(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc("events_card_counts");
  if (error) throw new Error("Could not load events");
  return new Map<string, CardCounts>(
    data.map((r) => [
      r.event_id,
      {
        open: r.open_count,
        new: r.new_count,
        overdue: r.overdue_count,
        needYou: r.need_you_count,
        atRisk: r.at_risk_count,
      },
    ]),
  );
}

/** The single home of the card rules: one urgent line (overdue before need-you), else the at-risk line. */
export function cardState(counts: CardCounts) {
  const urgent = counts.needYou > 0 ? (counts.overdue > 0 ? "overdue" : "needYou") : null;
  return { urgent, atRisk: urgent === null && counts.atRisk > 0 } as const;
}
