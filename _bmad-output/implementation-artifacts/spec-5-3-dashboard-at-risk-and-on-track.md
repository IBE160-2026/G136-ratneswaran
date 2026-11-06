---
title: 'Dashboard: At risk and On track'
type: 'feature'
created: '2026-11-06'
status: 'done'
baseline_revision: '5fa7d022ee0b60961d5ba9906654d9703973e9e0'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-2-dashboard-needs-you.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** The Dashboard shows only *Needs you*. The Organizer cannot see what is slipping (waiting on an external party, or blocked) or how each Role is going, so cannot state the Event's status without opening Tasks.

**Approach:** Add *At risk* and *On track* below *Needs you* on `/events/[eventId]`. *At risk* lists `classifyDashboard(...).atRisk` with `TaskRow`; *On track* is one summary row per active Role (done, open, overdue, lead, holders, link to the Role's Tasks), the Organizer-only "N guests added" line and the Organizer-only inactive-Role line. Core scope only.

## Boundaries & Constraints

**Always:**
- Section order *Needs you*, *At risk*, *On track*; each an `h2`. *At risk* has a count pill with the word ("{count} at risk", key `status.atRisk`) and collapses to one quiet line when empty (`h2` stays).
- At-risk rows are `TaskRow` in the order `atRisk` returns (waiting on external first, then blocked, each by deadline). A waiting row shows the status word "Waiting on external" plus an excerpt (first 80 chars, `…` if cut) of the latest `status_history` note with `to_status = 'waiting_external'` and `note_removed_at is null`; no note, no excerpt. A blocked row shows "Waits for: {blocker}" with the existing Blocked tint, never red, never colour alone (icon and word).
- *On track*: one row per **active** Role, in `roleKeys` order, with the Role name, lead name and holders (a holder without `joined_at` is marked "Invite pending"). A Role is *readable* when the viewer is the Organizer or a joined holder of it; a readable row shows done, open and overdue counts of the Role's live Tasks (`lifecycle = 'active'`, not obsolete, Proposed excluded) and a link to `/events/[eventId]/tasks` (no new filter). An unreadable row shows name, lead, holders and "Tasks in {Role} are visible to its team." and no count.
- Organizer only: "N guests added" (`guests` count query with `head: true`, no names or food data read) and, when above zero, "N tasks belong to inactive Roles" linking to `/events/[eventId]/team`. A holder sees neither.
- Data loads under the viewer's session and RLS; no `SUPABASE_SECRET_KEY`, no migration, no new table. Each section is its own `Suspense` with a final-shape `Skeleton`; a failed load throws to `app/events/error.tsx`.
- Cancelled and past Events render the same sections read-only (rows are links; nothing in them mutates). No section is left blank: empty ones show their quiet line.
- Every string in `messages/nb.json` and `messages/en.json`.

**Never:**
- No Decision card, Problem rows, Proposed rows, RSVP split, chart or guest-card state; no placeholders for them. No change to Needs you ordering, `classifyDashboard`'s section rules, `_bmad/` or planning documents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Organizer, mixed | Waiting-on-external Task with note, blocked Task, fine Tasks | *At risk* "2 at risk": waiting row with note excerpt first, then blocked row "Waits for: {blocker}" | No error expected |
| Nothing at risk | No waiting or blocked open Tasks | "Nothing is at risk right now." under the `h2` | No error expected |
| Organizer On track | Active Roles with done, open and overdue Tasks | One row per active Role with its counts; guests line "N guests added"; inactive-Role line only when such Tasks exist | No error expected |
| Holder of another Role | Holds Venue; Guests Role has Tasks | Venue row with counts; Guests row with name, holders and "Tasks in Guests are visible to its team.", no counts, no Guests Task title | No error expected |
| Holder | Any | No guests line, no inactive-Role line | No error expected |
| Load fails | A query returns an error | Retry card with `role="alert"` | Thrown to the error boundary |

</intent-contract>

## Code Map

- `app/events/[eventId]/page.tsx` -- add the two sections after `NeedsYou`, each in its own `Suspense`.
- `app/events/[eventId]/needs-you.tsx` -- pattern to copy (async section, count pill, `Skeleton`).
- `app/events/[eventId]/tasks/load-listed.ts` -- shared loader; extend its return with `roles` (`id`, `key`, `active`, name), `members` (`role_id`, `name`, `is_lead`, `joined_at`) and the viewer's joined `memberRoleIds` (it already reads `roles` and `role_members`); add the latest waiting note per waiting Task as optional `ListedTask.externalNote`. My tasks output must not change.
- `app/events/[eventId]/tasks/task-row.tsx` -- `ListedTask` gets optional `externalNote`; render it after the status word when `status === 'waiting_external'`. Row already renders `waitsFor` with Blocked tint.
- `src/modules/tasks/dashboard.ts` -- `classifyDashboard` (`atRisk`, `inactiveRoleTasks`) read-only; add pure `summarizeRoles(tasks, roles, viewer)` returning per-Role `{roleId, readable, done, open, overdue}`. `onTrack`, `onTrackCount` and `RoleSummary` become unused: remove them and update `src/modules/tasks/dashboard.test.ts`.
- `supabase/migrations/20261104120000_tasks_status.sql` -- `status_history` columns and select policy (RLS via `tasks`); read-only. `guests_select` is Organizer-only, so the guests line is Organizer-only.
- `src/modules/events/roles.ts` -- `roleKeys` order. `messages/nb.json`, `messages/en.json` -- new `dashboard.*` keys.
- `e2e/dashboard.spec.ts` -- extend; seeding helper `setup` and `psql`/`seed`/`signedIn` from `e2e/support.ts`.

## Tasks & Acceptance

**Execution:**
- `src/modules/tasks/dashboard.ts` and its test -- `summarizeRoles`, remove dead On track code, unit-test readable/unreadable/obsolete/proposed/inactive -- single home of the count rule
- `app/events/[eventId]/tasks/load-listed.ts`, `task-row.tsx` -- extra return fields and `externalNote` -- no second mapping
- `app/events/[eventId]/at-risk.tsx`, `on-track.tsx` -- two async sections with skeleton fallbacks -- as specified
- `app/events/[eventId]/page.tsx`, `messages/nb.json`, `messages/en.json` -- wire up and strings
- `e2e/dashboard.spec.ts` -- Organizer At risk (note excerpt, order, blocked text), empty line, On track counts, guests line, inactive-Role line, holder of another Role (unreadable row, no foreign title, no guests line)

**Acceptance Criteria:**
- Given local Supabase, when `supabase db reset && supabase test db`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm exec tsc --noEmit` and `pnpm test:e2e --workers=1` run, then all pass.

## Spec Change Log

## Review Triage Log

### 2026-11-06 — Review pass
- verdicts: 34 findings — high 0, medium 2, low 12, false 4, maybe-false 0 (16 more rejected as out of scope or process notes, counted below)
- findings:
  - `[medium]` `patch` On track rows not in `roleKeys` order (blind) — `loadListed` now sorts `roles` by `roleKeys`.
  - `[medium]` `patch` Note excerpt stopped at the newest history row, so a removed newest note hid an older live one, against the contract's "latest note with `note_removed_at is null`" (edge, gap, blind) — loop now skips rows without a live note; e2e seeds an older note, the shown note and a newer removed note.
  - `[low]` `patch` Three sections each ran `loadListed`, and Needs you rows lacked the note excerpt (blind, edge) — `loadListed` is wrapped in React `cache()` with `notes` as a plain argument; all three Dashboard sections pass `true`, so one load per request.
  - `[low]` `patch` On track link read as bare counts to a screen reader (blind) — Role name added as `sr-only` text.
  - `[low]` `patch` Unbroken 80-character note could overflow at 320px (edge) — `break-words` on the excerpt.
  - `[low]` `patch` Event with no active Role left On track blank (edge) — quiet line `dashboard.onTrackEmpty` in both languages.
  - `[low]` `patch` "Invite pending" marker untested, no test of note removal or note order (gap) — e2e extended.
  - `[low]` `reject` Lead line not asserted in e2e (gap) — the lead key is Story 3.8's covered string; the pending-holder assertion exercises the same list.
  - `[low]` `reject` Empty holders paragraph when a Role has no members (blind, edge) — the lead line already says "no lead"; an empty `<p>` is invisible.
  - `[low]` `reject` Note cut by UTF-16 units can split an emoji (blind, edge) — a guard needs `Intl.Segmenter` for a cosmetic edge.
  - `[low]` `reject` Lead name null or empty (edge) — `role_members.name` is `not null` with a length check.
  - `[low]` `reject` Status-history query is unbounded (blind) — one Event's waiting Tasks; the same scale as the other queries.
  - `[low]` `reject` No test of cancelled or past Events, the Norwegian locale or a failed load (blind, gap, intent) — the sections add no mutation and no state-specific code; locale and error boundary are covered by Stories 1.x.
  - `[low]` `reject` E2e locators depend on fixture internals (blind) — the same helpers as Story 5.2's tests.
  - `[low]` `reject` Removed totals-equal invariant test (edge) — replaced by `summarizeRoles` tests; the sections are now computed separately by design.
  - `[low]` `reject` Loose typing, `rows.get(task.id)!`, raw `members` return (blind) — both lists derive from one array; same pattern as Needs you.
  - `[false]` `reject` Layout change to `NeedsYou` (blind) — only the wrapper spacing around the three sections changed, as the spec's page task states.
  - `[false]` `reject` Waiting Task in Needs you shows no excerpt (edge) — true before the patch above; fixed by loading notes for all sections.
  - `[false]` `reject` Process files missing: `docs/ki-logg.md` and logs (blind) — added at finalization, outside the reviewed diff.
  - `[false]` `reject` Stray `git checkout AGENTS.md` in Verification (blind) — copied from Story 5.2; the e2e run rewrites `AGENTS.md`.
  - `[low]` `reject` Waiting rows before blocked rows, not strictly soonest first (intent) — the epic context fixes this order.
  - `[low]` `reject` Guests line and unreadable counts hidden from holders; no cross-Role SM-5 totals; Blocked tint untested (intent) — RLS makes `guests` Organizer-only, the spec shows no counts for unreadable Roles, SM-5 is checked in Story 5.9, and `TaskRow` owns the tint.
  - `[low]` `reject` My tasks unchanged is untested (intent) — My tasks passes no notes argument and its e2e tests pass.

## Design Notes

Counts are over every live Task the viewer can read in a readable Role, not only the Tasks left after *Needs you* and *At risk*; otherwise an overdue Task would drop out of its Role's overdue count and the Organizer could not read overdue per Role. This is why `onTrack` from Story 5.1 is replaced.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass
- `pnpm lint && pnpm format:check && pnpm test && pnpm exec tsc --noEmit` -- expected: pass
- `pnpm test:e2e --workers=1; git checkout AGENTS.md` -- expected: pass

## Auto Run Result

Status: done. Summary: `/events/[eventId]` shows *At risk* (count pill, waiting-on-external and blocked rows, quiet line) and *On track* (one row per active Role with lead, holders, counts and a link; Organizer-only guests and inactive-Role lines) below *Needs you*.

Files changed:
- `src/modules/tasks/dashboard.ts` and test -- `summarizeRoles`; dead On track code removed.
- `app/events/[eventId]/tasks/load-listed.ts`, `task-row.tsx` -- cached loader with roles, members and note excerpt.
- `app/events/[eventId]/at-risk.tsx`, `on-track.tsx`, `page.tsx` -- the sections.
- `messages/nb.json`, `messages/en.json`, `e2e/dashboard.spec.ts`.

Review: patches applied 7 (2 medium, 5 low); deferred 0; the rest rejected with the reasons above. Follow-up review recommended: true, because `loadListed`'s `cache()` keys on the `event` object, and a second load happens silently if `loadEvent` ever returns a new object per call (performance only).

Verification: `pnpm lint`, `pnpm format:check`, `pnpm test` (414), `pnpm exec tsc --noEmit` and the full `pnpm test:e2e --workers=1` (107) pass after the patches. No migration, so no pgTAP run.

Residual risk: Retry card for a failed load and the 375px layout are not exercised in a test. The 5.3 subagent ran in the background rather than synchronously.
