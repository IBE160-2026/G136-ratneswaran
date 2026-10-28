---
title: 'Story 3.8: Role lead'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_commit: '886253004e53e74de487a7da0534cf90aa0bf73b'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** A Role has members (3.6, 3.7), but nobody can be named its Role lead. The person who delegates the Role's Tasks (Epic 4) cannot be set, and Team & Roles cannot show who leads each Role.

**Approach:** Add a lead flag on `role_members`, guarded by a partial unique index. A new mutation function `events_set_role_lead` sets the flag, swapping it in one statement, or clears it, and logs `lead_changed`. Team & Roles gets *Make lead* on each person row with an Undo toast, and each active Role shows its lead or "No lead yet".

## Boundaries & Constraints

**Always:**
- `role_members.is_lead boolean not null default false`, plus `create unique index … on role_members (role_id) where is_lead`. The index is the invariant (AD-19). The function only makes it hold without errors.
- `events_set_role_lead(p_role_id uuid, p_member_id uuid default null)`: `security definer`, `search_path = ''`, executable by `authenticated` only (revoked from `public, anon`). It authorises with `is_organizer` on the Role's Event, never with a caller-supplied user id. An unknown Role looks the same as another Organizer's Role (42501). It refuses an inactive Role (22023, message `role_inactive`), a cancelled or ended Event (55000, the same rule as `events_invite_to_role`) and a member who is not in that Role (22023, message `not_a_member`). A null `p_member_id` clears the lead (used by Undo, since zero leads is allowed).
- The swap is one `UPDATE` statement, so there is never zero or two leads (see Design Notes). The function first locks the Role row (`for update`) so concurrent calls run one after the other.
- A pending invitee (`joined_at is null`) can be lead.
- Every real change appends one `role_membership_log` row: `action = 'lead_changed'`, `user_id` = the new lead (or, on clear, the previous lead), `actor_id = auth.uid()`. Setting the current lead again changes nothing and logs nothing.
- The function carries a prose comment that marks where Epic 4 adds `tasks_assign_role_owned_to_lead(role_id)` (AD-18). It contains no commented-out code.
- Server Action `setRoleLead` is Zod-parsed and returns `Result`. Its messages are next-intl keys in `messages/{en,nb}.json`. Logs hold ids and codes only.

**Never:** a grant that lets a client write `is_lead` directly; a lead column on `roles` (AD-19 names the partial unique index); building revoke (3.9); building the non-Organizer view of leads (3.10); a confirmation dialog for *Make lead* (an Undo toast is used instead).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First lead | Organizer; Role with no lead; joined or pending member | that member `is_lead`; one `lead_changed` log | — |
| Change lead | Role has lead A; set B | B lead, A not; exactly one lead; one log | — |
| Same lead | set the current lead | no change, no log | — |
| Clear (Undo) | `p_member_id` null, Role has a lead | no lead; one log for the previous lead | — |
| Not Organizer | stranger, member or anon calls | nothing changes | 42501 → `events.team.lead.errors.forbidden`; anon has no execute |
| Direct write | `update role_members set is_lead` as `authenticated` | denied | permission denied (42501) |
| Member of another Role | member id not in `p_role_id` | nothing changes | 22023 → `…lead.errors.unavailable` |
| Inactive Role / read-only Event | — | nothing changes | 22023 / 55000 → `…lead.errors.roleInactive` / `events.settings.errors.readOnly` |
| Lead removed | the lead's row is deleted (Correct email today, revoke in 3.9) | Role has no lead; Team shows "No lead yet" | — |

</intent-contract>

## Code Map

- `supabase/migrations/20261026120000_role_members.sql` -- `role_members`, `role_membership_log` (the `lead_changed` action already exists), and `events_invite_to_role`: its read-only check (line ~152) and its Organizer/unknown-Role refusal are the patterns to copy. The table has no update grant (AD-19). Keep it that way.
- `supabase/tests/role_members.test.sql` -- fixture style (fixed uuids, `set local role authenticated` plus claims, `throws_ok` with SQLSTATE). Copy its shape for a new test file.
- `src/modules/events/actions.ts:155-175` -- `setRoleActive`: the pattern for the new action (Zod object, `getClaims` redirect, error-code mapping, `revalidatePath`). `refuseInvite` shows how the codes map.
- `src/modules/events/actions.test.ts` -- how actions are tested with a mocked Supabase client.
- `app/events/[eventId]/team/page.tsx` -- loads `role_members`. Add `is_lead` to the select, pass the lead name for each active Role to `RoleSwitch`, and pass `isLead` on each `Member`.
- `app/events/[eventId]/team/role-switch.tsx` -- the Role card. Add one line under the description: "Lead: {name}" or "No lead yet", for active Roles only.
- `app/events/[eventId]/team/people-list.tsx` -- `PersonRow`. Add a "Role lead" label and a *Make lead* button (not read-only, Role active, not already lead). `aria-label` = "Make {name} lead of {role}".
- `src/lib/feedback.ts` -- `undoToast(message, onUndo, undoLabel)`. `app/events/[eventId]/guests/guest-rows.tsx:69` shows how it is used. The Undo label is `feedback.undo`.
- `src/modules/events/save.ts` -- `callSafely` wraps actions that are called from client components.
- `e2e/team-invite.spec.ts`, `e2e/support.ts` -- `signedIn`, `seed`, `psql`, `unique`, and the per-test `x-forwarded-for`.
- Local check of the swap (no `psql` on host, use `docker exec -i supabase_db_Arrangly psql -U postgres`): a plain `update … set is_lead = (id = new)` fails with 23505 when the new row comes first physically. The CTE form in Design Notes passed.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20261028120000_role_lead.sql` -- add the `is_lead` column, the partial unique index and `events_set_role_lead` as specified in Always. Add a comment on the column that only the function writes it.
- [x] `supabase/tests/role_lead.test.sql` -- pgTAP: the function attributes (definer, `search_path`, execute for `authenticated`, not for `anon`); every matrix row; the index rejects a second lead inserted directly as `postgres`; a swap where the new lead's row was inserted before the old lead's row (the physical-order case); clearing the lead by deleting the lead's row with `events_invite_to_role(… p_replaces)` leaves the Role with no lead.
- [x] `src/types/database.ts` -- regenerate with `supabase gen types`.
- [x] `src/modules/events/actions.ts` + `actions.test.ts` -- `setRoleLead({ eventId, roleId, memberId: uuid | null })`: check that the Role belongs to `eventId` (same as `inviteToRole`), call the rpc, map 42501 → `forbidden`, 22023 with message `role_inactive` → `roleInactive`, 55000 → `events.settings.errors.readOnly`, and everything else (including `not_a_member`) → `unavailable`, then `revalidatePath`. Tests: rpc arguments, code mapping, invalid input.
- [x] `app/events/[eventId]/team/page.tsx`, `role-switch.tsx`, `people-list.tsx` -- the UI described in the Code Map. On success, *Make lead* shows `undoToast("{name} is now lead of {role}")`. Undo calls `setRoleLead` with the previous lead's member id, or null. A failure shows the message key with `role="alert"`, as the row does today.
- [x] `messages/en.json`, `messages/nb.json` -- `events.team.lead.*`: `none` ("No lead yet"), `current` ("Lead: {name}"), `badge` ("Role lead"), `make`, `makeLabel`, `changed`, and `errors.{forbidden,roleInactive,unavailable}`.
- [x] `e2e/team-lead.spec.ts` -- the Organizer seeds an active Venue with two pending members (psql), sees "No lead yet", makes the first member lead, then sees "Lead: …", the badge and an Access history entry. Makes the second member lead, and only the second has the badge. Clicks Undo, and the first is lead again.

**Acceptance Criteria:**
- Given a Role with no lead, when the Organizer opens Team & Roles, then its card shows "No lead yet".
- Given the lead's row is removed, when the Team page reloads, then that Role shows "No lead yet" and no member has the badge.
- Given the change commits, when `role_members` is queried for the Role, then at most one row has `is_lead`, and at no point did the function leave two.

## Spec Change Log

## Review Triage Log

### 2026-10-28 — Review pass
- verdicts: 21 findings — high 0, medium 3, low 13, false 5, maybe-false 0
- findings:
  - `[low]` `[patch]` (blind) Inactive check runs before the read-only check, so a stale tab on a read-only Event with an off Role gets "switch it on" — reordered: read-only (55000) first, plus a pgTAP case.
  - `[low]` `[reject]` (blind) A clear (Undo of a first lead) logs `lead_changed` for the previous lead, which reads like the set — the line is true for both rows ("Role lead changed · Ada"), it only follows an Undo within the toast's 10 s, and telling them apart needs a new log action and label, more than a direct correction. Reported to the owner.
  - `[low]` `[reject]` (blind) Correct email on a pending lead removes the lead without a `lead_changed` row — the same call already logs `revoked` for that person and the card shows "No lead yet"; logging it would change `events_invite_to_role` (3.6), more than a direct correction.
  - `[medium]` `[patch]` (blind) *Make lead* accessible name does not contain its visible text (WCAG 2.5.3) — label changed to "Make lead: {name}, {role}" / "Gjør til leder: {name}, {role}", e2e updated.
  - `[low]` `[reject]` (blind) Undo on an older toast restores a stale previous lead — needs two lead changes inside 10 s and Undo on the older toast; a guard needs a new function parameter (public surface).
  - `[false]` `[reject]` (blind) Review diff leaves out `database.ts`, `AGENTS.md`, `docs/ki-logg.md` — `database.ts` is generated (`supabase gen types`, unchanged by hand), the `AGENTS.md` block is written by `next dev` and is not this story's change, and the KI-logg entry is delivered at PR time.
  - `[false]` `[reject]` (blind) CTE swap tested in only one direction — the untested direction (old lead's row first) cannot hit the row-order hazard; the tested direction (new lead's row first) is the one that fails without the CTE.
  - `[low]` `[patch]` (blind) Lead badge shows for a switched-off Role while its card shows none — badge now requires `roleActive`.
  - `[low]` `[reject]` (blind) `setRoleLead` unit tests miss the `roleError`, `revalidatePath` and redirect paths — same shape as the tested sibling actions; adding tests is not a defect fix and the paths are trivial.
  - `[low]` `[reject]` (blind) e2e misses Undo-to-no-lead and failure paths — the clear is covered in pgTAP and the action test (null member → rpc without `p_member_id`); the UI uses the same `changeLead` call.
  - `[low]` `[reject]` (edge) Older toast's Undo clears or restores the wrong lead — same root cause as the stale-Undo row above.
  - `[low]` `[reject]` (edge) Two rows clicked before revalidation capture a stale previous lead — same root cause as the stale-Undo row above.
  - `[low]` `[reject]` (edge) Undo failure after the row is gone shows on a missing or wrong row — needs Correct email inside the toast's 10 s; a toast-based error path adds a branch.
  - `[low]` `[patch]` (edge) Badge on an inactive Role, stale lead revives on reactivation — badge fixed with the blind row; keeping `is_lead` while a Role is off matches AD-19 (deactivation is a flag; members are kept too).
  - `[medium]` `[patch]` (edge) Target row deleted concurrently by Correct email after it was read: success, a `lead_changed` row for a deleted member, no lead — `for update` added to the target and previous-lead selects.
  - `[low]` `[patch]` (edge) The Role row lock does not serialise against Correct email, so `v_previous` can be stale — same fix as the row above.
  - `[false]` `[reject]` (intent) Zero leads is reachable, but the epic says "never zero or two" — the epic context says "Exactly one Role lead per Role (zero allowed, never two)"; "never zero" applies during a swap, which stays one statement.
  - `[medium]` `[patch]` (intent) The lead-removed AC is tested only in SQL, not on the Team page — e2e now deletes the lead's row, reloads, and checks "No lead yet" and no badge.
  - `[false]` `[reject]` (intent) The `for update` lock is never tested under concurrency — the invariant is the partial unique index, which pgTAP proves; the lock only turns a 23505 race into a wait.
  - `[low]` `[reject]` (intent) Undo-to-zero UI path never runs end to end — same as the blind e2e row above.
  - `[false]` `[reject]` (intent) Reviewed diff omits types, `AGENTS.md`, spec and KI-logg — same refutation as the blind diff-scope row.

### 2026-10-28 — Review pass (follow-up)
- verdicts: 27 findings — high 0, medium 3, low 17, false 7, maybe-false 0
- findings:
  - `[low]` `[reject]` (edge) Older Undo toast clears or replaces a newer lead — carried: same as the pass-1 stale-Undo row.
  - `[low]` `[reject]` (edge) `previousLeadId` stale after a change in another tab — carried: same root cause as the stale-Undo row.
  - `[low]` `[reject]` (edge) A lead revives when its Role is switched back on — carried: keeping `is_lead` while a Role is off follows AD-19 (deactivation is a flag); the badge part was patched in pass 1.
  - `[low]` `[reject]` (edge) Undo failure shows inline under a row that may be gone — carried: same as the pass-1 row.
  - `[low]` `[reject]` (edge) Correct email on the lead writes no `lead_changed` — carried: `revoked` is already logged for that person.
  - `[false]` `[reject]` (edge) The aria-label differs from the Code Map wording — the label was changed on purpose in pass 1 for WCAG 2.5.3; the fix would edit the spec.
  - `[medium]` `[patch]` (verification-gap) The read-only Team test does not assert that *Make lead* is hidden — added a `/^Make lead/` count-0 assertion in `e2e/team-invite.spec.ts`.
  - `[medium]` `[patch]` (verification-gap) No test that a switched-off Role hides its badge, lead line and *Make lead* (a pass-1 patch) — `e2e/team-lead.spec.ts` now switches Venue off, asserts all three are hidden, then switches it back on.
  - `[low]` `[reject]` (intent) Undo of a first lead (UI → clear → "No lead yet") is not end to end — carried: same as the pass-1 e2e row.
  - `[low]` `[reject]` (intent) Nothing asserts what Undo writes to Access history — same root cause as the row above; the log rows are proven in pgTAP.
  - `[false]` `[reject]` (intent) Non-Organizer refusal has no e2e — the database is the boundary (AD-19), and pgTAP covers a stranger, a member and anon.
  - `[low]` `[reject]` (intent) Refusal keys are never shown in a UI test — the UI hides the button in those states; the mapping is unit-tested; only a race reaches them.
  - `[false]` `[reject]` (intent) "Same lead" cannot be reached from the UI — not a defect: the current lead's row has no button, and the database no-op is tested.
  - `[false]` `[reject]` (intent) Concurrency not tested; the lock comes after the auth read — carried: the index is the invariant; the auth read does not depend on the lock.
  - `[low]` `[reject]` (intent) The lead-removed e2e deletes with psql instead of the Correct email UI — pgTAP runs the real Correct email path; the e2e checks the render.
  - `[false]` `[reject]` (intent) The swap's in-between state is never observed — it cannot be observed inside one statement by design; the physical-order case proves the statement succeeds.
  - `[false]` `[reject]` (blind) No `docs/ki-logg.md` entry — carried: delivered at PR time.
  - `[low]` `[reject]` (blind) Correct email silently drops the lead — carried.
  - `[low]` `[reject]` (blind) A lead outlives switching the Role off — carried (AD-19).
  - `[false]` `[reject]` (blind) The not-found checks rely on `user_id` being non-null — `role_members.user_id` is `not null`, so the outcome cannot happen.
  - `[low]` `[reject]` (blind) The CTE swap is more complex than two statements — the intent contract asks for one statement; the fix would edit the spec.
  - `[low]` `[reject]` (blind) The log names only the new lead, and a clear reads like an appointment — carried: reported to the owner in pass 1.
  - `[low]` `[reject]` (blind) Undo can overwrite another session's change — carried: same as the stale-Undo row.
  - `[low]` `[patch]` (blind) `outcome` and `leadFailure` never clear each other, so an old alert stays up — `changeLead` clears a failed `outcome` (a shown invite link is kept, since it appears only once), and `newLink` clears `leadFailure`.
  - `[medium]` `[patch]` (blind) e2e gaps: *Make lead* hidden on read-only and inactive, plus a first-lead Undo, a real Correct email and `PersonRow` unit tests — grouped with the two verification-gap rows (patched); the rest carried or rejected as above.
  - `[low]` `[reject]` (blind) Routine refusals are logged with `console.error`, and the cross-Event Role is not logged — this matches `inviteToRole`'s existing pattern; no named harm.
  - `[low]` `[reject]` (blind) The current lead is computed twice, quadratic per row — a Role has a handful of members; this is negligible.

## Auto Run Result

**Summary:** The Organizer can name one Role lead per Role on Team & Roles. `role_members.is_lead` is guarded by a partial unique index. `events_set_role_lead` sets the lead with a single-statement swap (a data-modifying CTE), or clears it for Undo, and logs `lead_changed`. Each active Role card shows "Lead: {name}" or "No lead yet". Person rows get a "Role lead" badge and *Make lead* with an Undo toast. Epic 4's `tasks_assign_role_owned_to_lead` call site is marked in the function.

**Files changed:**
- `supabase/migrations/20261028120000_role_lead.sql` -- the column, the partial unique index and `events_set_role_lead`.
- `supabase/tests/role_lead.test.sql` -- 30 pgTAP tests: grants, every matrix row, the physical-order swap, the index, and the lead removed through Correct email.
- `src/types/database.ts` -- regenerated.
- `src/modules/events/actions.ts`, `actions.test.ts` -- the `setRoleLead` action and its tests.
- `app/events/[eventId]/team/page.tsx`, `role-switch.tsx`, `people-list.tsx` -- the lead line on each card, the badge, *Make lead* and Undo.
- `messages/en.json`, `messages/nb.json` -- `events.team.lead.*`.
- `e2e/team-lead.spec.ts` -- make a lead, change it, Undo, then remove the lead's row and check "No lead yet".

**Review findings:** 21 findings (high 0, medium 3, low 13, false 5).
- Patched (5 entries): read-only before the inactive check (low); label in name for *Make lead* (medium); badge only on active Roles (low); `for update` on the target and previous-lead rows against a concurrent Correct email (medium); e2e for the lead-removed AC (medium).
- Deferred: none.
- Rejected: every rejected finding and its reason is in the Review Triage Log above. For the owner: a clear (Undo of a first lead) logs the same "Role lead changed" line as the set.

**Follow-up review recommended:** true. Three medium entries were patched (none high). The unverified risk is the two `for update` locks added against a concurrent Correct email. No test exercises them under real concurrency.

**Verification:**
- `supabase db reset && supabase test db`: 16 files, 478 tests, PASS.
- `pnpm lint`, `pnpm format:check` and `pnpm test` (348): pass.
- `pnpm test:e2e`: the full run had timeouts under load in unrelated specs (a different set each run). Every failure passed on rerun, and `guests.spec.ts:17` passed twice on its own. `team-lead` passed in every run.

**Residual risks:**
- The CTE ordering relies on the scalar subquery running as an initplan, which Postgres documents as unspecified order for `WITH` sub-statements. The physical-order pgTAP case catches a regression.
- The full e2e suite is flaky under parallel load. This is pre-existing.

**Follow-up pass (2026-10-28):** 27 findings (high 0, medium 3, low 17, false 7). Most were carried from pass 1.
- Patched (3 entries): an e2e assertion that *Make lead* is hidden on a read-only Event (medium), an e2e step that hides the lead on a switched-off Role (medium), and stale alerts clearing each other on a row (low).
- Deferred: none.
- Follow-up review recommended: false. No high was patched, so the work has converged.
- Verification: pgTAP 478/478, lint, format and Vitest (348) pass. `pnpm test:e2e --workers=2` passed 84/84. The earlier timeouts were caused by parallel load.

## Design Notes

The partial unique index is checked row by row, not at the end of the statement, and a partial index cannot be `DEFERRABLE`. So `update … set is_lead = (id = $new) where role_id = $r and (is_lead or id = $new)` fails whenever Postgres visits the new lead before the old one. This was verified locally. The single statement that works puts the clear in a data-modifying CTE. The main `UPDATE` reads that CTE through a scalar subquery, which becomes an initplan, so the CTE runs to completion first:

```sql
with cleared as (
  update public.role_members set is_lead = false
  where role_id = p_role_id and is_lead and id is distinct from p_member_id
  returning user_id
)
update public.role_members set is_lead = true
where id = p_member_id and (select count(*) from cleared) >= 0;
```

For a clear (`p_member_id` null), the CTE alone does the work. Keep a short comment in the migration explaining why the CTE is needed, so nobody "simplifies" it.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass
- `pnpm lint && pnpm format:check && pnpm test` -- expected: pass
- `pnpm test:e2e` -- expected: team-lead and the existing specs pass
