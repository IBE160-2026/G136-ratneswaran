---
title: '2.5: Roles from the Branch Pool'
type: 'feature'
created: '2026-10-19'
status: 'done'
route: 'dispatch'
baseline_commit: 'c6b30135a6475322d5f84660f4badebed2257545'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** An Event has no Roles, so later epics have nothing to group Tasks, people or guest data under, and the Organizer cannot shape the work to the Event (FR-2, GitHub issue #49).

**Approach:** Add the Branch Pool as a Postgres enum and a `roles` table with one row per pool key per Event. Activate defaults from the event type through a TS mapping, and let the Organizer switch Roles on and off on a *Team & Roles* page.

## Boundaries & Constraints

**Always:**
- Pool = enum `role_key`: `venue`, `guests`, `food_beverage`, `entertainment`, `travel_logistics`, `program`, in that display order. TS reads it from the generated `Constants`, never a second list. Names are localised in messages. Each Role has a one-line description; Program's reads "Speakers and talks" for a seminar and "Speeches and the run of show" otherwise.
- Defaults live in one TS function with Vitest: birthday = venue, guests, food_beverage, entertainment, program; wedding = all six; party = venue, guests, food_beverage, entertainment; seminar = venue, guests, food_beverage, program, travel_logistics; other, unknown or no type = venue, guests, food_beverage.
- `roles`: `id`, `event_id` (`on delete cascade`), `key role_key`, `active boolean not null default false`, `toggled_at timestamptz`, `unique (event_id, key)`, RLS select through `is_organizer(event_id)`. `authenticated` gets SELECT only; no INSERT, UPDATE or DELETE.
- `events_create` inserts every pool row, inactive, when it inserts an Event. A blank draft to reuse must also have no toggled Role.
- `events_save_questionnaire` gains `p_default_roles role_key[] default null`. It sets `active = key = any(p_default_roles)` on that Event's rows with `toggled_at is null`, in the same call. Null leaves Roles unchanged. The app always passes `defaultRoles(eventType)`.
- `events_set_role_active(p_role_id, p_active)` is an AD-2 mutation function: it authorises with `is_organizer` and sets `active` and `toggled_at = now()`. The type mapping never changes a toggled Role.
- *Team & Roles* at `/events/[id]/team`, also in the sidebar event group. `h1` "Team & Roles", title "Team & Roles – {Event} – Arrangly". Every Role is a native checkbox with `role="switch"`, named by the Role and described by its description. A toggled Role whose state differs from the current type's default shows "Suggested: on" or "Suggested: off". A failed toggle keeps the old state and shows an inline alert. Switches are disabled for a published past Event or a cancelled one.
- A comment on `roles.active` names it the single source for "owning Role inactive, so the Organizer owns its guest data".
- Migration backfills rows for existing Events with the other-type defaults. All strings in `messages/nb.json` and `messages/en.json`.

**Never:**
- No Role is deleted. No activation from the description (2.8, Epic 6), no people, invites or Role lead (Epic 3), no Roles in Event settings (2.6).
- No edit of earlier migrations, `_bmad/` or planning documents. No hand edit of `src/types/database.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Create | `events_create` | six rows, all inactive | N/A |
| First type | save type birthday | the five birthday Roles active | N/A |
| Type change | birthday → seminar, nothing toggled | Entertainment off, Travel & Logistics on | N/A |
| Toggled kept | Program toggled off, then type seminar | Program stays off, shows "Suggested: on" | N/A |
| Toggle | Organizer switches a Role | `active` flips, `toggled_at` set | inline alert on failure |
| Not Organizer | B calls `events_set_role_active` or saves with roles | refused | `42501` |
| Direct write | INSERT, UPDATE or DELETE on `roles` as authenticated | denied | `42501` |
| Event deleted | `delete from events` | its roles rows gone | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261019150000_events_cancelled_at.sql` -- latest `events_create` body to copy into `create or replace`. `20261019120000_events_questionnaire.sql` -- `events_save_questionnaire` (12 args) to drop and recreate with the 13th; repeat its revoke and grant with the new signature.
- `supabase/tests/events_questionnaire.test.sql`, `events_drafts.test.sql` -- call the save positionally with 12 args (still valid with the default). Their claims and role pattern is the template for `roles.test.sql`.
- `src/modules/events/actions.ts` -- `saveQuestionnaire` builds `args`; add `p_default_roles`. `actions.test.ts:46` asserts the RPC args.
- `src/modules/events/schemas.ts` -- `eventTypes`. `src/types/database.ts` -- regenerate; it exports `Constants.public.Enums`.
- `app/events/[eventId]/load-event.ts`, `setup/page.tsx` -- loader and guard pattern (`isDraft`, `isPast` from `src/modules/events/list.ts`). `src/components/app-nav.tsx` -- event group. `src/components/form.tsx` -- `Failure`.
- `e2e/events-list.spec.ts` -- `signedIn`, `seed` pattern; `e2e/support.ts` -- `psql`. `e2e/events-drafts.spec.ts` -- `answerStep1`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<ts>_roles.sql` -- enum, table, RLS, grants, backfill, `events_create`, `events_save_questionnaire`, `events_set_role_active` -- FR-2, AD-2, AD-19.
- [x] `supabase/tests/roles.test.sql` -- every matrix row the database decides, plus the reuse guard, enum values and function attributes -- AD-16.
- [x] `src/types/database.ts` -- regenerate -- AD-15.
- [x] `src/modules/events/roles.ts` + `roles.test.ts` -- `roleKeys`, `defaultRoles(type)`, `suggestion(role, type)` -- Vitest for each type and the hint rule.
- [x] `src/modules/events/actions.ts` + `actions.test.ts` -- pass defaults; `setRoleActive` Server Action (Zod, `Result`).
- [x] `app/events/[eventId]/team/page.tsx`, `role-switch.tsx` -- *Team & Roles*.
- [x] `src/components/app-nav.tsx` -- *Team & Roles* in the event group.
- [x] `messages/nb.json`, `messages/en.json` -- Role names, descriptions, page and hint strings.
- [x] `e2e/roles.spec.ts` -- birthday defaults on the page, toggle persists after reload, seminar change keeps the toggled Role with its hint, another user gets no access.
- [x] `docs/ki-logg.md` -- Story 2.5 entry.

**Acceptance Criteria:**
- Given *Team & Roles*, when read with a screen reader, then each switch announces the Role, its state and its description, and a hint is text, not colour.
- Given the change, when `supabase test db`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e` and `.githooks/test.sh` run, then they pass.

## Implementation Notes

- Implemented in this session without an implementation subagent; the three review layers ran as subagents.
- `events_save_questionnaire` was dropped and recreated with the 13th argument, so exactly one signature exists (pgTAP checks it). The 2.2 tests call it positionally with 12 arguments and pass unchanged.
- `RoleSwitch` uses `useOptimistic`, so a failed save falls back to the server state by itself; `callSafely` keeps a login redirect from being read as a failure.
- `answerStep1` moved from `events-drafts.spec.ts` into `e2e/support.ts` with the event type as a parameter.
- Running the whole e2e suite several times within five minutes hits local Auth's `sign_in_sign_ups` limit (30 per 5 minutes per IP) and fails most sign-up tests; waiting the window out and running once passes.

## Spec Change Log

## Review Triage Log

### 2026-10-19 — Review pass 1
- verdicts: 30 findings (blind 11, edge 6, gap 5 plus 8 sub-points) grouped into 17 entries — 10 patched (all low), 1 deferred, 6 rejected.
- findings:
  - `[low]` `[patch]` (blind 3) the switch was disabled while saving, which drops keyboard focus to the body — it stays enabled with `aria-busy` and ignores a second press; e2e toggles by keyboard and asserts focus.
  - `[low]` `[patch]` (blind 2) disabled switches had no reason — the intro reads "This event is over or cancelled, so its Roles can no longer be changed." when read-only.
  - `[low]` `[patch]` (blind 9) the seminar Program description was decided in the page — `roleDescriptionKey` in `roles.ts` with Vitest.
  - `[low]` `[patch]` (blind 6) pgTAP missed `public` execute, `p_active` null and empty defaults, and did not pin one save signature — added.
  - `[low]` `[patch]` (edge 6) the null-defaults check compared only a count — compares the active set.
  - `[low]` `[patch]` (gap 3, blind 7) no test that `setRoleActive` sends a signed-out caller to log in — added.
  - `[low]` `[patch]` (blind 7) no test of the defaults sent for "Not sure yet" — added.
  - `[low]` `[patch]` (gap 1) a failed switch was never driven end to end — e2e goes offline and asserts the fallback and the alert.
  - `[low]` `[patch]` (gap 2) read-only was tested only for a published past Event — e2e asserts enabled switches for a future published Event and a past draft.
  - `[low]` `[patch]` (gap 4) Role order was not asserted — e2e checks the pool order after a toggle and reload.
  - `[low]` `[defer]` (gap 5) the backfill never runs in a test — see `deferred-work.md`.
  - `[low]` `[reject]` (blind 1, edge 1, edge 3) the Role switch and the questionnaire save still write to a read-only Event through a direct call — the frozen intent keeps database read-only for Story 2.7, as in 2.4.
  - `[low]` `[reject]` (blind 4, edge 4, gap other) the backfill gives typed Events the base three — frozen decision 6 (owner: demo data only).
  - `[low]` `[reject]` (edge 5) a blank draft from before the migration has the base three active while a new one has none — the first type answer applies the mapping to both, so the Organizer never sees the difference on a typed Event.
  - `[low]` `[reject]` (blind 5) `p_default_roles default null` lets a future caller skip Roles — a frozen decision; `actions.test.ts` pins the app's caller.
  - `[low]` `[reject]` (blind 8, edge 2) `setRoleActive` revalidates the `eventId` the client sent — both ids come from the same server render, and a mismatch only refreshes the wrong page.
  - `[false]` `[reject]` (blind 10) missing `docs/ki-logg.md` entry — written at hand-over; the TS mapping is a recorded owner decision, so no reflection note is needed beyond the offer.
  - `[low]` `[reject]` (blind 11) nav e2e only on desktop — the phone Sheet shares `AppNav` and its navigation close is covered in `events-list.spec.ts`.

## Design Notes

The mapping is TS (one place, Vitest) but activation must commit with the type answer, so the Server Action passes the default keys into the same function. An Organizer could pass any keys, but they can switch any Role anyway, so nothing is gained. `toggled_at` is the only extra state: it keeps the mapping away from a Role the Organizer chose, and the hint is computed per request (AD-13 spirit), never stored.

## Verification

**Commands:**
- `supabase db reset` -- expected: all migrations apply
- `supabase test db` -- expected: all pgTAP pass
- `supabase gen types --local --lang typescript | diff - src/types/database.ts` -- expected: no diff
- `pnpm lint && pnpm format:check && pnpm test && .githooks/test.sh` -- expected: exit 0
- `pnpm test:e2e` -- expected: all pass
