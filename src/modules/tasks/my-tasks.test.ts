import { describe, expect, it } from "vitest";
import { byAcceptanceAndDeadline } from "./my-tasks";

const task = (
  title: string,
  accepted: boolean | null,
  deadline: string | null,
  status = "not_started",
) => ({ title, accepted, deadline, status });

describe("byAcceptanceAndDeadline", () => {
  it("puts unaccepted first, then open before done, then deadline, then title", () => {
    const sorted = [
      task("B", true, "2026-12-01"),
      task("A", true, "2026-12-01"),
      task("Late", false, "2026-12-09"),
      task("None", true, null),
      task("Soon", true, "2026-11-20"),
      task("Done", null, "2026-11-01", "done"),
    ].toSorted(byAcceptanceAndDeadline);
    expect(sorted.map((t) => t.title)).toEqual(["Late", "Soon", "A", "B", "None", "Done"]);
  });
});
