import { describe, expect, it } from "vitest";
import { defaultRoles, roleDescriptionKey, roleKeys, suggestion } from "./roles";
import { eventTypes } from "./schemas";

describe("defaultRoles", () => {
  it("activates five Roles for a birthday", () => {
    expect(defaultRoles("birthday")).toEqual([
      "venue",
      "guests",
      "food_beverage",
      "entertainment",
      "program",
    ]);
  });

  it("does not activate Entertainment for a seminar, but does activate Program", () => {
    expect(defaultRoles("seminar")).not.toContain("entertainment");
    expect(defaultRoles("seminar")).toContain("program");
  });

  it("activates the whole pool for a wedding and the base three without a known type", () => {
    expect(defaultRoles("wedding")).toEqual([...roleKeys]);
    for (const type of ["other", null, "unknown"]) {
      expect(defaultRoles(type)).toEqual(["venue", "guests", "food_beverage"]);
    }
  });

  it("only uses pool keys for every event type", () => {
    for (const type of eventTypes) {
      for (const key of defaultRoles(type)) expect(roleKeys).toContain(key);
    }
  });
});

describe("roleDescriptionKey", () => {
  it("describes Program as speakers and talks only at a seminar", () => {
    expect(roleDescriptionKey("program", "seminar")).toBe("roles.program.seminarDescription");
    expect(roleDescriptionKey("program", "birthday")).toBe("roles.program.description");
    expect(roleDescriptionKey("venue", "seminar")).toBe("roles.venue.description");
  });
});

describe("suggestion", () => {
  const role = (active: boolean, toggled: boolean) => ({
    key: "program" as const,
    active,
    toggled_at: toggled ? "2026-10-19T12:00:00Z" : null,
  });

  it("is silent for a Role the Organizer never switched", () => {
    expect(suggestion(role(false, false), "seminar")).toBeNull();
  });

  it("suggests the type's choice when a switched Role differs from it", () => {
    expect(suggestion(role(false, true), "seminar")).toBe("on");
    expect(suggestion(role(true, true), "party")).toBe("off");
  });

  it("is silent when the switched Role matches the type", () => {
    expect(suggestion(role(true, true), "seminar")).toBeNull();
  });
});
