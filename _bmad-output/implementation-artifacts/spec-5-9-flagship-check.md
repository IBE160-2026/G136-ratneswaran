---
title: 'Flagship check'
type: 'chore'
created: '2026-11-07'
status: 'done'
baseline_revision: '864992a40462e8f641c9782f5aed052cf8806d22'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-8-timeline-list-view.md'
warnings: []
deferred:
  - summary: >-
      Re-seed idempotency is asserted only in Playwright, not in pgTAP.
    evidence: |-
      CI loads the seed once; the second reseedFlagship() call fails the e2e beforeAll on error but compares no row counts.
    location: >-
      e2e/flagship.spec.ts
    severity: medium
  - summary: >-
      Problem, Decision Task and Proposed card are not seeded or asserted; the placeholder guard uses guessed strings.
    evidence: |-
      Core has no schema for Problem or Decision Task (Stories 4.8, 4.10-4.14); Proposed cards come with Epic 6.
    location: >-
      supabase/seed.sql
    severity: medium
---

<intent-contract>

## Intent

**Problem:** Nothing proves the Dashboard and Timeline together on the flagship 40th-birthday scenario, and `supabase/seed.sql` is empty. Story 5.9 asks for the seed, pgTAP against it, and Playwright for the Organizer and a Role-holder (FR19, FR20, UJ-1, SM-3, SM-5, NFR1, NFR12).

**Approach:** Fill `supabase/seed.sql` (AD-15) with the flagship Event, fictional users, Roles and a Task graph covering every state the Core schema supports. Add a pgTAP test over the seeded rows, a Playwright flagship spec that re-applies the seed and signs in as the Organizer and a Role-holder, and a manual timed script under `docs/`.

**Core-only deviation (explicit, narrow):** The ACs also list a Problem, an open Decision Task and a Proposed Task. The Core schema has no Problem or Decision Task (Stories 4.6, 4.8, 4.10-4.14 are Target, not built) and `epic-5-context.md` says to keep the flagship seed to Core states until they ship. So: no schema is invented; the seed holds the done, overdue, blocked, waiting and not-yet-accepted states, plus one `lifecycle = 'proposed'` row (the column exists; Epic 6 fills it) that must appear nowhere and count nowhere. "Problem", "Decision card first" and "awaiting decision" are not asserted as present; tests assert that no Decision or Problem placeholder renders. Carry-forward: Stories 4.8, 4.10-4.14 and Epic 6 extend the seed and the Playwright spec with those states.

## Boundaries & Constraints

**Always:**
- Seed only fictional data (AD-15 owns it): emails `@example.com`, generic names ("Demo Organizer"), no allergy, food or hotel data. Fixed UUIDs, dates relative to `current_date`/`now()`. `seed.sql` is re-runnable: it first deletes its own `auth.users` (cascade), so a test can re-apply it and get fresh dates.
- Users can sign in with a password (auth.users plus auth.identities, token columns `''`, confirmed). Users: Organizer, Venue holder (lead), Food & Beverage holder, one pending invitee on Entertainment. Active Roles: Venue, Food & Beverage, Entertainment, Program; Guests and Travel stay off.
- Task graph (all `lifecycle = 'active'` except the proposed row): done (2, in two Roles), overdue (2), blocked (1, via `task_dependencies`), waiting_external (1), delegated-unaccepted older than 48 h (1, owned by the Venue holder), a Subtask, plain open ones, one proposed row. The Venue holder owns no Task in another Role.
- Tests run only against local Supabase. Playwright uses `psql` from `e2e/support.ts` and the existing `x-forwarded-for` limiter trick.

**Never:**
- No migration, no change to app code, `task_state`, RLS or `src/types/database.ts`. No edit of `_bmad/`, planning documents or `docs/refleksjonsnotater.md`. No `SUPABASE_SECRET_KEY`. No placeholders for Problem or Decision in the UI.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Organizer Dashboard | seeded Event, Organizer | Needs you lists the 2 overdue then the stale Task; At risk lists waiting then blocked; On track shows done/open/overdue per Role; proposed row absent | none |
| Organizer Timeline | same | one lane per active Role (4), a bar opens its Task | none |
| Holder Dashboard | Venue holder | own Tasks first (Not yet accepted), Venue lane with bars, other lanes only the unreadable line | no other Role's title anywhere on Dashboard, Timeline (lanes and list), My tasks |
| Re-seed | `seed.sql` run twice | second run succeeds, same row counts | none |
| Fictional only | all seeded emails | end in `@example.com` | pgTAP fails otherwise |

</intent-contract>

## Code Map

- `supabase/seed.sql` -- empty (0 lines); wired by `supabase/config.toml` `[db.seed] sql_paths`. `supabase start`/`db reset` load it, so CI pgTAP sees it.
- `supabase/migrations/20261103120000_tasks.sql`, `...tasks_subtasks_dependencies.sql`, `...task_state_obsolete.sql` -- columns (`lifecycle`, `status`, `owner_user_id`, `delegated_at`, `accepted_at`, `parent_task_id`, `obsolete`), `task_dependencies`, derived `blocked`/`overdue`/`stale_unaccepted`. `role_members` (needs `email`, `joined_at`, `is_lead`), `roles` (`active`), `events` need `published_at`, `time_zone`, `language`.
- `supabase/tests/holder_scoped_view.test.sql`, `task_state_scope.test.sql` -- pgTAP conventions: `begin; select plan(n)`, role switching for `authenticated`.
- `e2e/support.ts` -- `psql`, `seed`, `signedIn`; add `reseedFlagship()` piping `supabase/seed.sql` into `docker exec -i supabase_db_Arrangly psql -v ON_ERROR_STOP=1`.
- `e2e/dashboard.spec.ts`, `e2e/timeline.spec.ts`, `e2e/holder-view.spec.ts` -- selector patterns (`Needs you`/`At risk`/`On track` regions, `Timeline` region, unreadable text "Tasks in {Role} are visible to its team.").
- `src/modules/tasks/dashboard.ts` -- `classifyDashboard`, `summarizeRoles` (read-only evidence for section rules).
- `docs/ki-logg.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml` -- entry; `5-9-flagship-check` to `review`.

## Tasks & Acceptance

**Execution:**
- `supabase/seed.sql` -- flagship Event, users, Roles, members, Task graph as in Boundaries -- the demo scenario
- `supabase/tests/flagship_seed.test.sql` -- pgTAP: seed present, each state's count via `task_state`, proposed row excluded from `task_state` totals the app uses, fictional-only emails, Venue holder reads only Venue and own rows (one allow, one deny), anon reads none
- `e2e/support.ts` -- `reseedFlagship()` helper
- `e2e/flagship.spec.ts` -- Organizer: counts and sections in the right place, no Decision/Problem placeholder, proposed title absent, Timeline has 4 lanes, open a Task from a bar. Holder: Needs you shows own Tasks first, Venue lane with bars, other lanes unreadable, every non-Venue seeded title has count 0 on Dashboard, Timeline (swimlane and `?view=list`) and My tasks
- `docs/flagship-manual-check.md` -- timed manual script for the first-time Role-holder (invite, join, find own Task) with SM-3 and NFR12 target fields to fill in
- `docs/ki-logg.md`, `sprint-status.yaml` -- entry and `review`

**Acceptance Criteria:**
- Given `seed.sql` is loaded twice, when pgTAP runs, then it passes and no seeded email is outside `@example.com`.
- Given the seeded Event, when the Organizer opens the Dashboard, then done, overdue, blocked, waiting and not-accepted counts are readable without opening a Task, and the Timeline shows 4 lanes and opens a Task from a bar.
- Given the Venue holder, when they open Dashboard, Timeline and My tasks, then no other Role's Task title appears.
- Given a broken section rule, lane count or leak, then Vitest, pgTAP or Playwright fails (AI not involved, fixture mode).

## Spec Change Log

## Review Triage Log

### 2026-11-07 — Review pass
- verdicts: 29 findings — high 0, medium 4, low 14, false 0, maybe-false 0 (11 duplicates of the same root causes, graded with their group)
- findings:
  - `[medium]` `patch` Manual script gives the invited tester no Task (blind, edge) — added a delegate-a-Task setup step and a fresh-address note to `docs/flagship-manual-check.md`
  - `[medium]` `patch` Seed deadlines use UTC `current_date`, not the Event's Oslo day (blind, edge) — seed now uses `(now() at time zone 'Europe/Oslo')::date`
  - `[medium]` `patch` Future deadlines go overdue 10 days after load, breaking the pgTAP counts on an old local DB (edge) — future deadlines moved to 30+ days, Event to 90 days out
  - `[low]` `patch` Lane count only checks four named lists (edge) — spec now asserts the Guests and Travel lanes are absent
  - `[low]` `patch` Seed has no local-only warning (blind) — header comment added
  - `[medium]` `defer` Re-seed idempotency is proven only by Playwright, not pgTAP (blind, edge, gap, alignment) — CI loads the seed once; a count check after the second `reseedFlagship()` would close it
  - `[low]` `defer` `noPlaceholders` strings "Needs your decision|Problem reported" are not catalogue keys (blind) — replace with the real keys when Story 4.8/4.10 ships
  - `[low]` `reject` Proposed row exclusion is not asserted in pgTAP (edge, gap) — `task_state` has no totals; the app-level exclusion is asserted in Playwright (Program "2 open", title absent)
  - `[low]` `reject` Relative `supabase/seed.sql` path and hard-coded container name (blind, edge, gap) — same convention as `psql()`; Playwright always runs from the repo root
  - `[low]` `reject` Prefix filter in three older pgTAP tests (blind) — the full `supabase test db` run is green after `db reset`; a rule would be larger than the fix
  - `[low]` `reject` Seed password committed and cloud risk (blind) — CI pushes migrations only, never `seed.sql`; password is the same local test value as the e2e helpers
  - `[low]` `reject` ki-logg Review/Min vurdering "NIL", no PR link (blind) — filled in with the PR triage after the PR exists
  - `[low]` `reject` Extra Playwright assertions: My tasks, Norwegian locale, blocked bar, list view for the Organizer (blind) — beyond the ACs; other specs cover them
  - `[medium]` `defer` Problem, Decision card, awaiting-decision count and the Proposed card are not seeded or asserted (alignment) — Core-only deviation recorded in the intent; Stories 4.8, 4.10-4.14 and Epic 6 extend seed and spec. Carry-forward: AC4 "epic summary lists FR19/FR20 covered" belongs to the Epic 5 retrospective
  - `[low]` `reject` SM-3/NFR12 manual timing not run (alignment) — the story asks for the script, not the run

## Verification

**Commands:**
- `pnpm lint && pnpm format:check` -- expected: pass
- `pnpm exec tsc --noEmit` -- expected: no errors outside stale `.next/dev/types`
- `pnpm test` -- expected: pass
- `supabase test db` -- expected: all pass
- `pnpm exec playwright test e2e/flagship.spec.ts e2e/dashboard.spec.ts e2e/timeline.spec.ts e2e/holder-view.spec.ts` -- expected: pass (fixtures using `current_date` fail 00:00-01:00 Oslo)

## Auto Run Result

Status: done

- Summary: `supabase/seed.sql` now holds the flagship "Demo 40th Birthday" (4 fictional signing-in users, 4 active Roles, 13 Tasks: done, overdue, blocked, waiting, unaccepted-after-48h, Subtask, one proposed row); pgTAP, Playwright flagship spec and a manual SM-3/NFR12 script cover it.
- Files: `supabase/seed.sql`, `supabase/tests/flagship_seed.test.sql`, `e2e/flagship.spec.ts`, `e2e/support.ts`, `docs/flagship-manual-check.md`, `docs/ki-logg.md`, `sprint-status.yaml`; three older pgTAP tests scoped away from seed rows (`revoke_role`, `role_lead`, `task_state_scope`).
- Review: 5 patches applied, 3 deferred, rest rejected with reasons above. Follow-up review recommended: false.
- Verification: lint, format:check, tsc (outside `.next`), `pnpm test` 446 passed, `supabase test db` pass after `supabase db reset`, Playwright flagship/dashboard/timeline/holder-view 19 passed (holder-view timed out once on cold compile, passed on rerun).
- Residual risks: the DB must be seeded fresh for pgTAP (stale e2e data breaks unscoped older tests); fixtures with `current_date` fail 00:00-01:00 Oslo.
