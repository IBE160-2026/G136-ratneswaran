import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const getClaims = vi.fn();
const maybeSingle = vi.fn();
const update = vi.fn();
const updated = vi.fn();
const eq = vi.fn();
const filter = {
  eq: (...args: unknown[]) => {
    eq(...args);
    return filter;
  },
  maybeSingle,
};
const from = () => ({
  select: () => filter,
  update: (values: unknown) => {
    update(values);
    return { eq: () => ({ select: updated }) };
  },
});
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc, from }), getClaims }));
const createUser = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ auth: { admin: { createUser } } }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const {
  cancelEvent,
  createEvent,
  deleteEvent,
  inviteToRole,
  publishEvent,
  saveDescription,
  saveQuestionnaire,
  setRoleActive,
  setRoleLead,
  updateSchedule,
} = await import("./actions");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const answers = {
  eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  eventType: "birthday",
  startsLocal: "2027-06-01T18:00",
  timeZone: "Europe/Oslo",
  durationHours: "4",
  guestCount: "80",
  venueKnown: "unknown",
  rsvpWanted: "no",
  guestListMethod: "manual",
  language: "nb",
};

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ sub: "u1" });
  rpc.mockResolvedValue({ data: null, error: null });
});

describe("saveQuestionnaire", () => {
  it("calls the function with null for Not sure yet and opens step 2", async () => {
    await expect(saveQuestionnaire(null, form(answers))).rejects.toThrow(
      `REDIRECT /events/${answers.eventId}/setup/guests`,
    );
    expect(rpc).toHaveBeenCalledWith(
      "events_save_questionnaire",
      expect.objectContaining({
        p_event_id: answers.eventId,
        p_duration_minutes: 240,
        p_guest_count: 80,
        p_venue_known: null,
        p_rsvp_wanted: false,
        p_rsvp_due_date: null,
        p_unknown_answers: ["venue_known"],
        p_default_roles: ["venue", "guests", "food_beverage", "entertainment", "program"],
      }),
    );
  });

  it("sends the base Roles when the event type is Not sure yet", async () => {
    await expect(
      saveQuestionnaire(null, form({ ...answers, eventType: "unknown" })),
    ).rejects.toThrow("REDIRECT");
    expect(rpc).toHaveBeenCalledWith(
      "events_save_questionnaire",
      expect.objectContaining({
        p_event_type: null,
        p_default_roles: ["venue", "guests", "food_beverage"],
      }),
    );
  });

  it("rejects invalid input inline without calling the database", async () => {
    const result = await saveQuestionnaire(null, form({ ...answers, guestCount: "0" }));
    expect(result).toMatchObject({
      ok: false,
      error: { code: "invalid_input", fields: { guestCount: "events.wizard.errors.guestCount" } },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "forbidden"],
    ["55000", "read_only"],
    ["23514", "invalid_input"],
    ["22023", "invalid_input"],
    ["22008", "invalid_input"],
    ["XX000", "unavailable"],
  ])("maps database error %s to %s", async (code, expected) => {
    rpc.mockResolvedValue({ data: null, error: { code } });
    expect(await saveQuestionnaire(null, form(answers))).toMatchObject({
      ok: false,
      error: { code: expected },
    });
  });

  it("sends a signed-out caller to log in", async () => {
    getClaims.mockResolvedValue(null);
    await expect(saveQuestionnaire(null, form(answers))).rejects.toThrow("REDIRECT /login");
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("updateSchedule", () => {
  const settings = {
    eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    startsLocal: "2027-06-01T18:00",
    endsLocal: "2027-06-01T23:30",
    timeZone: "Europe/Oslo",
    rsvpDueDate: "",
    language: "nb",
  };

  it("saves through events_update_schedule with null for an empty reply-by date", async () => {
    expect(await updateSchedule(null, form(settings))).toEqual({ ok: true, data: null });
    expect(rpc).toHaveBeenCalledWith("events_update_schedule", {
      p_event_id: settings.eventId,
      p_starts_local: "2027-06-01T18:00",
      p_ends_local: "2027-06-01T23:30",
      p_time_zone: "Europe/Oslo",
      p_rsvp_due_date: null,
      p_language: "nb",
    });
  });

  it("rejects an end before the start inline without calling the database", async () => {
    const result = await updateSchedule(null, form({ ...settings, endsLocal: "2027-06-01T17:00" }));
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "invalid_input",
        fields: { endsLocal: "events.settings.errors.endBeforeStart" },
      },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "forbidden"],
    ["55000", "read_only"],
    ["23514", "invalid_input"],
    ["22023", "invalid_input"],
    ["XX000", "unavailable"],
  ])("maps database error %s to %s", async (code, expected) => {
    rpc.mockResolvedValue({ data: null, error: { code } });
    expect(await updateSchedule(null, form(settings))).toMatchObject({
      ok: false,
      error: { code: expected },
    });
  });

  it("sends a signed-out caller to log in", async () => {
    getClaims.mockResolvedValue(null);
    await expect(updateSchedule(null, form(settings))).rejects.toThrow(
      `REDIRECT /login?next=/events/${settings.eventId}/settings`,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("createEvent", () => {
  it("opens step 1 of the new draft", async () => {
    rpc.mockResolvedValue({ data: "new-id", error: null });
    await expect(createEvent()).rejects.toThrow("REDIRECT /events/new-id/setup");
  });

  it("reports a failed create", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
    expect(await createEvent()).toMatchObject({
      ok: false,
      error: { code: "unavailable" },
    });
  });
});

describe("setRoleActive", () => {
  const input = {
    eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    roleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    active: false,
  };

  it("sends a signed-out caller to log in", async () => {
    getClaims.mockResolvedValue(null);
    await expect(setRoleActive(input)).rejects.toThrow(
      `REDIRECT /login?next=/events/${input.eventId}/team`,
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("switches the Role through events_set_role_active", async () => {
    expect(await setRoleActive(input)).toEqual({ ok: true, data: null });
    expect(rpc).toHaveBeenCalledWith("events_set_role_active", {
      p_role_id: input.roleId,
      p_active: false,
    });
  });

  it("refuses a malformed id without calling the database", async () => {
    expect(await setRoleActive({ ...input, roleId: "nope" })).toMatchObject({
      ok: false,
      error: { code: "invalid_input" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "forbidden"],
    ["55000", "read_only"],
    ["XX000", "unavailable"],
  ])("maps database error %s to %s", async (code, expected) => {
    rpc.mockResolvedValue({ data: null, error: { code } });
    expect(await setRoleActive(input)).toMatchObject({ ok: false, error: { code: expected } });
  });
});

describe("setRoleLead", () => {
  const input = {
    eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    roleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    memberId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  };

  beforeEach(() => {
    maybeSingle.mockResolvedValue({ data: { id: input.roleId }, error: null });
  });

  it("makes the member lead through events_set_role_lead", async () => {
    expect(await setRoleLead(input)).toEqual({ ok: true, data: null });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("events_set_role_lead", {
      p_role_id: input.roleId,
      p_member_id: input.memberId,
    });
    // The Role must belong to the Event in the URL.
    expect(eq).toHaveBeenCalledWith("event_id", input.eventId);
  });

  it("clears the lead when the member is null", async () => {
    expect(await setRoleLead({ ...input, memberId: null })).toEqual({ ok: true, data: null });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("events_set_role_lead", {
      p_role_id: input.roleId,
    });
  });

  it("refuses a Role of another Event without calling the function", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await setRoleLead(input)).toMatchObject({
      ok: false,
      error: { code: "forbidden", message: "events.team.lead.errors.forbidden" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses a malformed id without calling the database", async () => {
    expect(await setRoleLead({ ...input, memberId: "nope" })).toMatchObject({
      ok: false,
      error: { code: "invalid_input" },
    });
    expect(maybeSingle).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", undefined, "events.team.lead.errors.forbidden"],
    ["22023", "role_inactive", "events.team.lead.errors.roleInactive"],
    ["22023", "not_a_member", "events.team.lead.errors.unavailable"],
    ["55000", undefined, "events.settings.errors.readOnly"],
    ["XX000", undefined, "events.team.lead.errors.unavailable"],
  ])("maps database error %s (%s) to %s", async (code, message, expected) => {
    rpc.mockResolvedValue({ data: null, error: { code, message } });
    expect(await setRoleLead(input)).toMatchObject({ ok: false, error: { message: expected } });
  });
});

describe("inviteToRole", () => {
  const input = {
    eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    roleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    name: "  Cleo Example ",
    email: " cleo@example.com ",
  };

  beforeEach(() => {
    maybeSingle.mockResolvedValue({ data: { id: input.roleId }, error: null });
    createUser.mockResolvedValue({ data: {}, error: null });
    rpc.mockResolvedValue({ data: [{ status: "invited", token: "tok" }], error: null });
  });

  it("invites an existing account under the Organizer's session, creating no user", async () => {
    expect(await inviteToRole(input)).toEqual({
      ok: true,
      data: { status: "invited", token: "tok" },
    });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("events_invite_to_role", {
      p_role_id: input.roleId,
      p_name: "Cleo Example",
      p_email: "cleo@example.com",
    });
    expect(createUser).not.toHaveBeenCalled();
    // The Role must belong to the Event in the URL.
    expect(eq).toHaveBeenCalledWith("id", input.roleId);
    expect(eq).toHaveBeenCalledWith("event_id", input.eventId);
  });

  it("creates the user only after the database finds no account, then invites again", async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: { code: "P0002" } })
      .mockResolvedValueOnce({ data: [{ status: "invited", token: "tok" }], error: null });
    expect(await inviteToRole(input)).toEqual({
      ok: true,
      data: { status: "invited", token: "tok" },
    });
    expect(createUser).toHaveBeenCalledExactlyOnceWith({
      email: "cleo@example.com",
      email_confirm: true,
      app_metadata: { password_pending: true },
      user_metadata: { name: "Cleo Example" },
    });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("passes the row Correct email replaces", async () => {
    const replaces = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    await inviteToRole({ ...input, replaces });
    expect(rpc).toHaveBeenCalledWith(
      "events_invite_to_role",
      expect.objectContaining({ p_replaces: replaces }),
    );
  });

  it("treats an account created meanwhile as success", async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: { code: "P0002" } })
      .mockResolvedValueOnce({ data: [{ status: "added", token: null }], error: null });
    createUser.mockResolvedValue({ data: {}, error: { code: "email_exists" } });
    expect(await inviteToRole(input)).toEqual({ ok: true, data: { status: "added", token: null } });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("creates no user when the Role read shows nothing", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await inviteToRole(input)).toMatchObject({ ok: false, error: { code: "forbidden" } });
    expect(createUser).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("stops when the user cannot be created", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0002" } });
    createUser.mockResolvedValue({ data: {}, error: { code: "unexpected_failure" } });
    expect(await inviteToRole(input)).toMatchObject({ ok: false, error: { code: "unavailable" } });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("asks only once more after creating the user", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0002" } });
    expect(await inviteToRole(input)).toMatchObject({ ok: false, error: { code: "unavailable" } });
    expect(createUser).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it("refuses bad input with field keys, calling nothing", async () => {
    expect(
      await inviteToRole({ ...input, roleId: "nope", name: " ", email: "not-an-email" }),
    ).toEqual({
      ok: false,
      error: {
        code: "invalid_input",
        message: "events.team.invite.errors.invalidInput",
        fields: {
          roleId: "events.team.invite.errors.roleRequired",
          name: "events.team.invite.errors.nameRequired",
          email: "events.team.invite.errors.emailInvalid",
        },
      },
    });
    expect(maybeSingle).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it("sends a signed-out caller to log in", async () => {
    getClaims.mockResolvedValue(null);
    await expect(inviteToRole(input)).rejects.toThrow(
      `REDIRECT /login?next=/events/${input.eventId}/team`,
    );
    expect(createUser).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "forbidden", "forbidden", undefined],
    ["55000", "read_only", "readOnly", undefined],
    ["22023", "role_inactive", "roleInactive", undefined],
    ["53400", "cap", "cap", undefined],
    ["23514", "invalid_input", "invalidInput", undefined],
    ["P0001", "stale_invitation", "staleInvitation", "stale_invitation"],
    ["P0001", "unavailable", "unavailable", "some other raise"],
    ["XX000", "unavailable", "unavailable", undefined],
  ])("maps database error %s to %s, creating no user", async (code, expected, key, message) => {
    rpc.mockResolvedValue({ data: null, error: { code, message } });
    expect(await inviteToRole(input)).toEqual({
      ok: false,
      error: { code: expected, message: `events.team.invite.errors.${key}` },
    });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("logs ids and the code, never the name or email", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { code: "53400" } });
    await inviteToRole(input);
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain(input.roleId);
    expect(logged).toContain("53400");
    expect(logged).not.toMatch(/cleo/i);
    log.mockRestore();
  });
});

const eventId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("cancelEvent", () => {
  it("cancels with the trimmed note and opens the Event home", async () => {
    await expect(cancelEvent(null, form({ eventId, note: "  Rain  " }))).rejects.toThrow(
      `REDIRECT /events/${eventId}`,
    );
    expect(rpc).toHaveBeenCalledWith("events_cancel", { p_event_id: eventId, p_note: "Rain" });
  });

  it("rejects a note over 500 characters inline without calling the database", async () => {
    const result = await cancelEvent(null, form({ eventId, note: "x".repeat(501) }));
    expect(result).toMatchObject({
      ok: false,
      error: { code: "invalid_input", fields: { note: "events.settings.cancel.noteTooLong" } },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "forbidden"],
    ["55000", "read_only"],
    ["XX000", "unavailable"],
  ])("maps database error %s to %s", async (code, expected) => {
    rpc.mockResolvedValue({ data: null, error: { code } });
    expect(await cancelEvent(null, form({ eventId, note: "" }))).toMatchObject({
      ok: false,
      error: { code: expected },
    });
  });

  it("sends a signed-out caller to log in", async () => {
    getClaims.mockResolvedValue(null);
    await expect(cancelEvent(null, form({ eventId, note: "" }))).rejects.toThrow(
      `REDIRECT /login?next=/events/${eventId}/settings`,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("deleteEvent", () => {
  const published = { name: "Summer party", published_at: "2027-01-01", cancelled_at: null };

  beforeEach(() => maybeSingle.mockResolvedValue({ data: published, error: null }));

  it("deletes once the typed name matches, ignoring surrounding spaces", async () => {
    await expect(
      deleteEvent(null, form({ eventId, confirmName: " Summer party " })),
    ).rejects.toThrow("REDIRECT /events?deleted=event");
    expect(rpc).toHaveBeenCalledWith("events_delete", { p_event_id: eventId });
  });

  it.each(["summer party", "Summer", ""])(
    "refuses the typed name %j inline without deleting",
    async (confirmName) => {
      expect(await deleteEvent(null, form({ eventId, confirmName }))).toMatchObject({
        ok: false,
        error: {
          code: "invalid_input",
          fields: { confirmName: "events.settings.delete.nameMismatch" },
        },
      });
      expect(rpc).not.toHaveBeenCalled();
    },
  );

  it("discards a draft without a typed name", async () => {
    maybeSingle.mockResolvedValue({
      data: { name: null, published_at: null, cancelled_at: null },
      error: null,
    });
    await expect(deleteEvent(null, form({ eventId }))).rejects.toThrow(
      "REDIRECT /events?deleted=draft",
    );
    expect(rpc).toHaveBeenCalledWith("events_delete", { p_event_id: eventId });
  });

  it("needs the name for a cancelled Event", async () => {
    maybeSingle.mockResolvedValue({
      data: { ...published, cancelled_at: "2027-01-02" },
      error: null,
    });
    expect(await deleteEvent(null, form({ eventId }))).toMatchObject({
      error: { code: "invalid_input" },
    });
  });

  it("reports a failed lookup without deleting", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { code: "XX000" } });
    expect(await deleteEvent(null, form({ eventId, confirmName: "x" }))).toMatchObject({
      error: { code: "unavailable" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses an Event the caller cannot see", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await deleteEvent(null, form({ eventId, confirmName: "x" }))).toMatchObject({
      error: { code: "forbidden" },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["42501", "forbidden"],
    ["XX000", "unavailable"],
  ])("maps database error %s to %s", async (code, expected) => {
    rpc.mockResolvedValue({ data: null, error: { code } });
    expect(await deleteEvent(null, form({ eventId, confirmName: "Summer party" }))).toMatchObject({
      ok: false,
      error: { code: expected },
    });
  });

  it("refuses a malformed id and sends a signed-out caller to log in", async () => {
    expect(await deleteEvent(null, form({ eventId: "nope" }))).toMatchObject({
      error: { code: "invalid_input" },
    });
    getClaims.mockResolvedValue(null);
    await expect(deleteEvent(null, form({ eventId }))).rejects.toThrow(
      `REDIRECT /login?next=/events/${eventId}/settings`,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("saveDescription", () => {
  beforeEach(() => updated.mockResolvedValue({ data: [{ id: eventId }], error: null }));

  it("saves the trimmed name and description and opens the Event home", async () => {
    await expect(
      saveDescription(null, form({ eventId, name: " Lucas 40 ", description: " Dinner " })),
    ).rejects.toThrow(`REDIRECT /events/${eventId}`);
    expect(update).toHaveBeenCalledWith({ name: "Lucas 40", description: "Dinner" });
  });

  it("stores blank fields as null", async () => {
    await expect(
      saveDescription(null, form({ eventId, name: "  ", description: "" })),
    ).rejects.toThrow("REDIRECT");
    expect(update).toHaveBeenCalledWith({ name: null, description: null });
  });

  it("rejects a description over 2000 characters inline without saving", async () => {
    const result = await saveDescription(
      null,
      form({ eventId, name: "x", description: "x".repeat(2001) }),
    );
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "invalid_input",
        fields: { description: "events.description.errors.descriptionTooLong" },
      },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("marks the name when a published Event would lose it", async () => {
    updated.mockResolvedValue({ data: null, error: { code: "23514" } });
    expect(await saveDescription(null, form({ eventId, name: " " }))).toMatchObject({
      error: { code: "invalid_input", fields: { name: "events.description.errors.nameRequired" } },
    });
  });

  it("refuses an Event the caller cannot see", async () => {
    updated.mockResolvedValue({ data: [], error: null });
    expect(await saveDescription(null, form({ eventId, name: "x" }))).toMatchObject({
      error: { code: "forbidden" },
    });
  });

  it.each([
    ["55000", "read_only"],
    ["XX000", "unavailable"],
  ])("maps database error %s to %s", async (code, expected) => {
    updated.mockResolvedValue({ data: null, error: { code } });
    expect(await saveDescription(null, form({ eventId, name: "x" }))).toMatchObject({
      error: { code: expected },
    });
  });

  it("sends a signed-out caller to log in", async () => {
    getClaims.mockResolvedValue(null);
    await expect(saveDescription(null, form({ eventId }))).rejects.toThrow(
      `REDIRECT /login?next=/events/${eventId}/setup/description`,
    );
    expect(update).not.toHaveBeenCalled();
  });
});

describe("publishEvent", () => {
  it("publishes and opens the Event home with the published status", async () => {
    await expect(publishEvent(null, form({ eventId }))).rejects.toThrow(
      `REDIRECT /events/${eventId}?published=1`,
    );
    expect(rpc).toHaveBeenCalledWith("events_publish", { p_event_id: eventId });
  });

  it("names each missing field of an incomplete draft", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "23514" } });
    maybeSingle.mockResolvedValue({
      data: {
        name: null,
        starts_at: "2027-06-01T16:00:00Z",
        ends_at: null,
        time_zone: "Europe/Oslo",
        language: "en",
      },
      error: null,
    });
    expect(await publishEvent(null, form({ eventId }))).toEqual({
      ok: false,
      error: {
        code: "incomplete",
        message: "events.publish.errors.incomplete",
        fields: { name: "events.publish.missing.name", ends_at: "events.publish.missing.ends_at" },
      },
    });
  });

  it.each([
    ["42501", "forbidden"],
    ["55000", "read_only"],
    ["XX000", "unavailable"],
  ])("maps database error %s to %s", async (code, expected) => {
    rpc.mockResolvedValue({ data: null, error: { code } });
    expect(await publishEvent(null, form({ eventId }))).toMatchObject({
      ok: false,
      error: { code: expected },
    });
  });

  it("refuses a malformed id and sends a signed-out caller to log in", async () => {
    expect(await publishEvent(null, form({ eventId: "nope" }))).toMatchObject({
      error: { code: "invalid_input" },
    });
    getClaims.mockResolvedValue(null);
    await expect(publishEvent(null, form({ eventId }))).rejects.toThrow(
      `REDIRECT /login?next=/events/${eventId}`,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});
