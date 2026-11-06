import { describe, expect, it, vi } from "vitest";
import { cardState, loadCardCounts, noCounts } from "./card-state";

const counts = (c: Partial<typeof noCounts>) => ({ ...noCounts, ...c });

describe("cardState", () => {
  it("shows overdue first when something is overdue", () => {
    expect(cardState(counts({ open: 3, new: 1, overdue: 1, needYou: 2, atRisk: 1 }))).toEqual({
      urgent: "overdue",
      atRisk: false,
    });
  });

  it("shows need you when nothing is overdue", () => {
    expect(cardState(counts({ open: 1, new: 1, needYou: 1 }))).toEqual({
      urgent: "needYou",
      atRisk: false,
    });
  });

  it("shows at risk only when nothing needs the viewer", () => {
    expect(cardState(counts({ atRisk: 1 }))).toEqual({ urgent: null, atRisk: true });
  });

  it("shows no line for an Event without Tasks", () => {
    expect(cardState(noCounts)).toEqual({ urgent: null, atRisk: false });
  });
});

describe("loadCardCounts", () => {
  const row = (n: number) => ({
    event_id: `e${n}`,
    open_count: n,
    new_count: 0,
    overdue_count: 0,
    need_you_count: 0,
    at_risk_count: 0,
  });

  it("makes one rpc call for 50 Events", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: Array.from({ length: 50 }, (_, n) => row(n)), error: null });
    const map = await loadCardCounts({ rpc } as never);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("events_card_counts");
    expect(map.size).toBe(50);
    expect(map.get("e7")?.open).toBe(7);
  });

  it("throws when the call fails", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "x" } });
    await expect(loadCardCounts({ rpc } as never)).rejects.toThrow("Could not load events");
  });
});
