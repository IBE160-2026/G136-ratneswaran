---
title: 'Dashboard sections and scope'
type: 'feature'
created: '2026-11-05'
status: 'done'
baseline_revision: 'a681f840de558fa32adf4c738aad394dbd0e1068'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-9-my-tasks.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Epic 5's Dashboard needs one place where the rules for *Needs you*, *At risk* and *On track* live, and proof that `task_state` only shows each viewer what RLS allows. Without it, 5.2 and 5.3 would each re-invent the rules and double count.

**Approach:** A pure function `classifyDashboard(tasks, viewer)` in `src/modules/tasks/dashboard.ts` returns the three sections, each Task once, in the highest matching section. A pgTAP file proves the viewer matrix on `task_state`. No page, no migration, no UI in this story.

## Boundaries & Constraints

**Always:**
- Pure: no I/O, no clock reads; "today" is not needed because `overdue` and `stale_unaccepted` arrive on each input row. Input row: `id, title, deadline, roleId, ownerId, status, blocked, overdue, stale_unaccepted, accepted, obsolete, lifecycle, roleActive`. Viewer: `{ id, isOrganizer, leadRoleIds }`.
- Excluded from every section and count: `lifecycle <> 'active'` (dismissed, proposed) and `obsolete`. Tasks of an inactive Role (`roleActive` false) are never listed; they only raise `inactiveRoleTasks`, and only for the Organizer.
- Scope of Tasks considered: Organizer, all; Role lead, Tasks of the Roles they lead plus everything they own; plain holder, only Tasks they own. A Task owned by someone else is never in a holder's *Needs you*.
- *Needs you* (open Tasks only, never `done`), in this order, each group by deadline (none last), then title: (1) `overdue` in scope, (2) `stale_unaccepted` in scope (Organizer and lead scope only), (3) Tasks the viewer owns that are not accepted ("Not yet accepted"). A Task lands in the first group it matches.
- *At risk* (open, not already in *Needs you*): `status = 'waiting_external'` first, then `blocked`, each by deadline then title.
- *On track*: every remaining in-scope Task, including `done`, summarised per Role as `{ roleId, done, open, overdue }`, never listed. Section counts: every in-scope active Task is in exactly one of the three, so needs + at risk + on-track totals equal the in-scope total.
- Each listed row keeps its secondary flags (`blocked`, `overdue`, `waitingExternal`, `notAccepted`, `staleDays` source value) so the UI never recomputes them.
- pgTAP, as `authenticated` with each viewer's claims and as `anon`: a holder of Role A, a holder of Role B, a user who is only a Guest, and an anonymous caller each receive from `task_state` only rows RLS allows; a Proposed Task in Role A is returned to neither the holder of Role B, the Guest-only user nor `anon`; the Organizer sees every row.

**Never:**
- No Decision, Problem or Proposed groups in the function yet: those Tasks and flags do not exist until Stories 4.8 and 4.10-4.14, which extend this function and its tests. No placeholders for them. No UI, no migration, no new query rules, no `SUPABASE_SECRET_KEY`, no edit of `_bmad/` or planning documents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Triple flag | One Task overdue, blocked and owned unaccepted | Appears once under *Needs you* (overdue group) with all flags on the row | No error expected |
| Organizer scope | Overdue in two Roles, stale in a third | Overdue by deadline, then stale | No error expected |
| Holder scope | Holder owns two, a Role-mate owns an overdue one | Only the two owned; the other never appears | No error expected |
| Lead scope | Lead leads Role X; overdue Task in X and in Y | X's overdue listed, Y's not | No error expected |
| Not yet accepted | Owner holds an unaccepted Task, not overdue | Owner's *Needs you*, flagged `notAccepted` | No error expected |
| At risk order | One waiting_external, two blocked | Waiting first, then blocked by deadline | No error expected |
| On track | Done and open Tasks in two Roles | Per-Role summaries, no listed rows | No error expected |
| Inactive Role | Task in an inactive Role | Not listed; Organizer's `inactiveRoleTasks` counts it, a holder's is 0 | No error expected |
| Excluded | Obsolete, dismissed, proposed | In no section, no count | No error expected |
| Totals | Any mix | Needs + at risk + on-track total equals in-scope active Tasks | No error expected |
| Viewer matrix | Holder A, holder B, Guest-only, anon | Only RLS-allowed `task_state` rows; no Proposed Task outside its Role | Empty result |

</intent-contract>

## Code Map

- `src/modules/tasks/my-tasks.ts` and `my-tasks.test.ts` -- existing ordering helper and test style to follow; `app/events/[eventId]/tasks/task-row.tsx` `ListedTask` shows the field names the page maps from `tasks` and `task_state`.
- `supabase/migrations/20261105140000_task_state_obsolete.sql` -- latest `task_state` (columns `blocked`, `overdue`, `is_delegated`, `is_pending`, `accepted`, `stale_unaccepted`, `obsolete`); `lifecycle` and `status` live on `tasks`.
- `supabase/tests/task_state.test.sql` (4.9) and `holder_scoped_view.test.sql` -- fixtures and claim-switching pattern to copy; Guest-only users come from the `guests` fixtures in `guests.test.sql`. New `supabase/tests/task_state_scope.test.sql`.
- `supabase/migrations/20261103120000_tasks.sql:39-49` -- `tasks_select`: Organizer, or holder or owner while published and the Role is active.

## Tasks & Acceptance

**Execution:**
- `src/modules/tasks/dashboard.ts` -- `classifyDashboard` and its types -- the only home of the section rules
- `src/modules/tasks/dashboard.test.ts` -- every Matrix row, including the triple-flag Task shown once and the totals invariant
- `supabase/tests/task_state_scope.test.sql` -- the viewer matrix on `task_state`
- `docs/ki-logg.md` -- entry

**Acceptance Criteria:**
- Given local Supabase, when `supabase db reset && supabase test db`, `pnpm lint`, `pnpm format:check` and `pnpm test` run, then all pass.

## Spec Change Log

## Review Triage Log

### 2026-11-05 — Review pass
- verdicts: 30 findings — high 0, medium 8, low 18, false 4, maybe-false 0
- findings:
  - `[medium]` `patch` Not-yet-accepted group uses `!accepted`, the flag uses `accepted === false`, so `null` lands in Needs you (reported by blind, edge twice, gap and intent) — one shared predicate `accepted === false`; null case tested.
  - `[medium]` `patch` Lead's own Tasks in a Role they do not lead untested (gap) — test added.
  - `[medium]` `patch` Test for the plain-holder stale rule passes without the `manages` check (gap) — own stale Task ordering test added.
  - `[medium]` `patch` Missing Vitest edge cases (blind) — empty input, no deadline last, equal deadline and title, null accepted added.
  - `[low]` `patch` Sort not deterministic for equal deadline and title (blind, edge) — `id` tiebreak, locale-independent comparison.
  - `[low]` `reject` Guest-only pgTAP user is not a real Guest (blind, edge, gap, intent) — guests have no user link yet; recorded in ki-logg.
  - `[low]` `reject` `anon` expects 42501, the matrix says empty (blind, edge, gap, intent) — `anon` has no select grant on the view; the fix would be editing the spec; recorded in ki-logg.
  - `[low]` `reject` pgTAP lacks unpublished Event and inactive Role (blind, edge) — covered in `tasks.test.sql`, which this view reads through.
  - `[low]` `reject` On-track `overdue` is effectively always 0 (blind, gap, edge) — the story specifies `{ done, open, overdue }`; kept for the UI.
  - `[low]` `reject` Naming of `staleDays`, mixed snake and camel case, plain-string status (blind) — fields mirror `task_state`; no wrong outcome.
  - `[low]` `reject` `seen` bookkeeping hard to read (blind) — works, covered by the totals test.
  - `[low]` `reject` Done overdue guard, totals versus inactive Roles (edge) — open overdue is the only overdue the view reports; inactive Role Tasks are counted separately.
  - `[low]` `reject` No caller or mapper from `task_state` yet (intent) — Stories 5.2 and 5.3 consume the function.
  - `[false]` `reject` Process records inconsistent (blind) — updated at finalization.
  - `[false]` `reject` Unknown statuses treated as open (edge) — a CHECK constraint limits `tasks.status`.
  - `[false]` `reject` `viewer.leadRoleIds` is trusted (edge) — it is a caller input by design; RLS still limits the rows.
  - `[false]` `reject` Decision, Problem and Proposed groups absent (intent) — Core scope per the epic; later stories extend the function.

## Auto Run Result

Status: done. Summary: pure `classifyDashboard` in `src/modules/tasks/dashboard.ts` with Vitest, plus a pgTAP viewer matrix on `task_state`. Patches applied: 5 groups of findings. Deferred: none. Verification: `supabase test db` (27 files), lint, format, tsc and Vitest (413) pass; Playwright not run (no UI). Residual risk: the Guest-only case is modelled as a user with no Role.

## Design Notes

Core scope only (`sprint-change-proposal-2026-10-12.md`, epic context): Decision, Problem and Proposed groups are left out and their stories add them. "Not yet accepted" is in because Story 4.6 already shipped `accepted`.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass
- `pnpm lint && pnpm format:check && pnpm test` -- expected: pass
