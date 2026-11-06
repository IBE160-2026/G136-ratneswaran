---
title: 'Timeline computation'
type: 'feature'
created: '2026-11-06'
status: 'done'
baseline_revision: '1462ac0ad77c005d258af5ae9bc427ad99523e20'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-5-event-cards-show-state.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md'
warnings: []
deferred:
  - 'Decision Task points (filled while open, outline once resolved): Decision Tasks are Target (Story 4.8+); computeTimeline supports `decision`, the loader passes none until then.'
---

<intent-contract>

## Intent

**Problem:** The Timeline (Stories 5.7, 5.8) has no data layer. Nothing orders Tasks by dependency, places a bar, nests Subtasks or hides what a viewer may not read (FR20, AD-13). `tasks` also has no `created_at`, which the bar-start rule needs.

**Approach:** One pure TS function `computeTimeline(roles, tasks, event, today, options)` in `src/modules/tasks/timeline.ts`, plus `loadTimelineInput` (exactly two queries) and `eventToday`. One additive migration gives `tasks` a `created_at`. No page: 5.7 renders the result.

## Boundaries & Constraints

**Always:**
- Nothing stores order: no column or table holds Timeline order, position or rank (pgTAP proves it).
- One lane per active Role, in the order the caller gives, tagged `empty` when it shows no bar. An unreadable lane (`readable: false`) carries only name, holders and lead, no Task data, even if Tasks of that Role are passed in. Dependencies resolve only against Tasks of readable Roles.
- Tasks of `lifecycle` other than `active` never appear. Obsolete Tasks are omitted unless `options.includeObsolete`, then marked `obsolete`; they still define dependants' starts, so toggling does not move bars.
- Order inside a lane (and inside a parent): topological by dependency among siblings, ties by deadline, then `created_at`, then id. A Subtask nests inside its parent (`children`); one whose parent is not shown becomes top-level.
- Bar: `end` = deadline; `start` = latest deadline among resolved dependencies, else the `created_at` date in the Event zone; `days` = inclusive count, at least 1; when start is after end, `start = end` and `marker = true`.
- A Task with `decision` `open` / `resolved` gets `point` `filled` / `outline`, else `null`. The loader passes no decision until Story 4.8 (Target).
- Axis: earliest bar start to the later of latest deadline and Event end, all in the Event zone (no zone: UTC). `today` is passed in; `eventToday(now, zone)` gives the Event-zone date.
- A cycle in a group falls back to deadline order, terminates, and logs only Event and Role ids.
- `inactiveRoleTasks` counts live Tasks of inactive Roles, non-zero only when `options.isOrganizer`. `obsoleteCount` counts hidden-or-shown obsolete live Tasks in readable active lanes.

**Never:**
- No page, no UI text, no `SUPABASE_SECRET_KEY`, no change to `task_state` or Task RLS, no Decision Task data, no stored order.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Order | B depends on A; A deadline later than B's | A before B; equal ranks tie by deadline, `created_at`, id; repeat call identical | none |
| Bars | no deps / dep deadline before / after own | start = created date / latest dep deadline / marker at deadline, `days` 1 | none |
| Lanes | 2 active empty Roles, 1 inactive with Tasks | 2 lanes, `empty`; `inactiveRoleTasks` = n for Organizer, 0 otherwise | none |
| Unreadable lane | Role `readable: false`, Tasks passed | lane has name, holders, lead, `tasks: []`; no title, deadline or id of its Tasks anywhere in result | none |
| Cycle | A depends on B, B on A | deadline order, terminates | logs Event and Role ids only |
| Obsolete | obsolete + dismissed + proposed Tasks | omitted; with option obsolete shown marked; others never | none |
| Scale | 300 Tasks, 12 Roles | one pass, 12 lanes; loader makes 2 queries | loader throws on error |
| Axis / today | Event 2 years ahead; Tasks after Event; midnight and DST in `Europe/Oslo` | range covers both; `eventToday` correct either side of midnight and the 2026-10-25 change | none |

</intent-contract>

## Code Map

- `supabase/migrations/20261103120000_tasks.sql` -- `tasks` (no `created_at`; `updated_at` only), triggers `tasks_read_only`, `tasks_touch`; select-only grant plus column-level update grants, so a new column is read-only to clients.
- `supabase/migrations/20261103140000_tasks_subtasks_dependencies.sql` -- `parent_task_id` (one level, same Role), `task_dependencies(task_id, depends_on_id)`; FK names `task_dependencies_task_id_fkey` for embedding.
- `src/modules/tasks/dashboard.ts` -- style and comparator pattern (read-only); `app/events/[eventId]/tasks/load-listed.ts` -- how Roles, members and `joined_at` are read (read-only).
- `src/modules/events/card-state.ts` / `.test.ts` -- loader-takes-supabase pattern and the mocked query-count test.
- `src/modules/events/roles.ts` -- `roleKeys` display order (caller sorts).
- `supabase/tests/task_state_scope.test.sql` -- pgTAP fixture pattern.
- `docs/ki-logg.md` -- add the 5.6 entry.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/20261106130000_tasks_created_at.sql` -- add `tasks.created_at timestamptz not null default clock_timestamp()`; backfill existing rows from `updated_at` with user triggers disabled around the update -- the bar-start rule needs it
- `supabase/tests/tasks_created_at.test.sql` -- pgTAP: column exists and is set on insert; `authenticated` cannot update it (deny); no column or table on `tasks` or elsewhere in `public` named like order/position/rank/sort/timeline (AD-13)
- `src/types/database.ts` -- regenerate with `supabase gen types --local --lang typescript`
- `src/modules/tasks/timeline.ts` -- types, `computeTimeline`, `eventToday`, `loadTimelineInput(supabase, eventId, viewerId, isOrganizer)` (query 1: `roles` with embedded `role_members`; query 2: `tasks` with embedded `task_dependencies`, lifecycle active)
- `src/modules/tasks/timeline.test.ts` -- Vitest for every matrix row, lane count equals active Role count, `eventToday` around midnight and DST, loader runs two `from` calls for 300 Tasks
- `docs/ki-logg.md` -- Story 5.6 entry

**Acceptance Criteria:**
- Given roles, tasks, event and today, when `computeTimeline` runs, then lanes, order, nesting, bars, points, axis, counts and unreadable lanes follow the contract above, and repeated calls are identical.
- Given the schema, then no stored order exists and `tasks.created_at` is set on insert and not client-writable (pgTAP).
- Given a viewer's session, when `loadTimelineInput` runs, then exactly two queries run and only RLS-readable rows are returned.

## Spec Change Log

## Review Triage Log

### 2026-11-06 — Review pass
- verdicts: 38 findings — high 0, medium 4, low 22, false 12, maybe-false 0 (blind 12, edge 14, verification gap 3, intent 9)
- findings:
  - `[medium]` `patch` Hidden obsolete dependency still listed in `dependsOn` (blind) — `dependsOn` is now filtered to shown Tasks; obsolete Tasks still set the dependant's start.
  - `[low]` `reject` Cross-group dependencies can start a bar after a later bar's end (blind) — Story 4.3 forbids cycles; a cross-group edge only sets the start date, which the AC defines that way; ordering stays deterministic.
  - `[low]` `patch` Quadratic ordering loop (blind) — replaced `out.some` with a Set of placed ids.
  - `[low]` `reject` Cycle fallback is coarse for the whole group (blind) — the AC says fall back to deadline order for the lane; impossible by Story 4.3.
  - `[false]` `reject` Null-deadline Tasks dropped silently, pending name may be null (blind) — `tasks_active_needs_deadline` guarantees a deadline for active Tasks, and `role_members.name` is `not null`.
  - `[medium]` `patch` Loader tests mock away `readable`, pending and role order (blind) — added loader cases for non-member, pending member, Organizer, role order and null deadline; the embed syntax was also checked against local PostgREST (200).
  - `[low]` `patch` Invalid or empty time zone throws (blind) — `zone || "UTC"`; an invalid IANA name cannot be saved (Event setup validates it).
  - `[low]` `reject` Migration lock and untested backfill (blind) — one-off statement in a transaction on a pre-launch table; a pgTAP test cannot observe a pre-migration row.
  - `[low]` `patch` pgTAP name regex matches substrings (blind) — anchored to whole words.
  - `[low]` `reject` ki-logg has `Review: NIL` (blind) — filled at finalization, outside the reviewed diff.
  - `[low]` `reject` Missing tests for inactive-Role obsolete counts and a Subtask in another Role (blind) — the Subtask case is impossible (`tasks_check_parent`); the counts follow from existing tests.
  - `[false]` `reject` No caller or page (blind) — Story 5.7 renders the result; the epic context says 5.6 underpins 5.7.
  - `[medium]` `patch` Dangling hidden obsolete dependency id (edge) — same fix as the first row.
  - `[low]` `patch` Empty or invalid time zone crashes (edge) — same fix as above.
  - `[false]` `reject` Invalid `createdAt` or `endsAt` (edge) — columns are `timestamptz not null` / typed timestamps from PostgREST.
  - `[false]` `reject` Malformed deadline gives NaN (edge) — `deadline` is a `date` column, always `YYYY-MM-DD`.
  - `[false]` `reject` Grandchild Task never rendered (edge) — `tasks_check_parent` enforces one level.
  - `[low]` `reject` `today` outside the axis (edge) — the AC defines the axis range without today; 5.7 handles the line.
  - `[low]` `patch` Cubic worst case (edge) — same fix as the quadratic row.
  - `[low]` `reject` Cycle logs on every request (edge) — a cycle is impossible; one line with ids is what the AC asks.
  - `[false]` `reject` Null deadline vanishes (edge) — same as the false row above.
  - `[low]` `reject` PostgREST `max_rows` 1000 (edge) — every other Event loader has the same limit; the AC sizes the case at 300 Tasks.
  - `[false]` `reject` Role key not in `roleKeys` sorts first (edge) — `role_key` is a database enum, so it is always in `roleKeys`.
  - `[low]` `reject` Query error cause discarded (edge) — matches `loadCardCounts` and `loadListed`.
  - `[low]` `patch` pgTAP regex too loose (edge) — same fix as above.
  - `[low]` `reject` Add-column rewrite plus update lock (edge) — same as the migration row.
  - `[medium]` `patch` Loader `readable` deny case untested (verification gap) — same loader tests as above.
  - `[low]` `reject` Backfill not exercised by a test (verification gap) — same as the migration row; filed disposition was defer, but the cost is a one-off on a pre-launch table.
  - `[low]` `reject` ki-logg `Review: NIL` (verification gap, other findings) — filled at finalization.
  - `[false]` `reject` No call site (intent) — reading A, the function-level reading every AC uses.
  - `[low]` `reject` Loader tested only against a mock (intent) — the AC asks for a query-count test; embed syntax verified against PostgREST by hand.
  - `[false]` `reject` `isOrganizer` is a parameter (intent) — the page knows the Organizer from the Event, as the Dashboard does.
  - `[low]` `defer` Decision points unreachable from loaded data (intent) — Decision Tasks are Target (Story 4.8); listed in `deferred`.
  - `[false]` `reject` Unreadable-lane test filters full data (intent) — it covers the stricter case; with no Tasks passed the lane is the same.
  - `[false]` `reject` `today` is a parameter (intent) — the AC signature takes `today`; `eventToday` is tested for midnight and DST.
  - `[low]` `reject` Axis is `null` with no bars (intent) — the AC is silent; 5.7 shows the empty state.
  - `[false]` `reject` Cycle test does not assert termination (intent) — the test returns, which is the assertion.
  - `[low]` `reject` Backfill is an unstated assumption (intent) — `updated_at` is the best known moment for existing rows.

## Design Notes

Dependency edges only order siblings of one group (a lane's top level, or one parent's Subtasks); an edge between groups still sets the bar start. The Subtask-to-parent nesting makes cross-group ordering unnecessary for 5.7's rendering.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass
- `pnpm lint && pnpm format:check && pnpm test && pnpm exec tsc --noEmit` -- expected: pass
- `pnpm test:e2e --workers=1; git checkout AGENTS.md` -- expected: pass (task creation still works with the new column)
- `.githooks/test.sh` -- expected: pass

## Auto Run Result

Status: done. Summary: the Timeline data layer. `computeTimeline` (pure, AD-13) returns one lane per active Role with topological order, tie-breaks, nested Subtasks, bars, Decision points, axis, and the inactive and obsolete counts; unreadable lanes carry no Task data. `eventToday` gives the Event-zone date. `loadTimelineInput` runs exactly two queries. `tasks` gained a read-only `created_at`.

Files changed:
- `supabase/migrations/20261106130000_tasks_created_at.sql` -- `tasks.created_at`, backfilled from `updated_at`.
- `supabase/tests/tasks_created_at.test.sql` -- pgTAP (5): column set on insert, not client-writable, no stored order.
- `src/types/database.ts` -- regenerated.
- `src/modules/tasks/timeline.ts`, `timeline.test.ts` -- function, helper, loader and 18 Vitest tests.
- `docs/ki-logg.md` -- Story 5.6 entry.

Review: patches applied 5 concerns (4 medium findings: hidden obsolete `dependsOn`, loader deny-case tests; lows: UTC fallback, linear ordering loop, whole-word pgTAP regex); deferred 1 (Decision points in loaded data, Target 4.8); the rest rejected with the reasons in the log. Follow-up review recommended: false (patched mediums: 4 counted as 2 root causes, none high; fixes are small and covered by tests).

Verification: `supabase db reset`, `supabase test db` (29 files PASS), `pnpm lint`, `pnpm format:check`, `pnpm test` (438), `pnpm exec tsc --noEmit`, `.githooks/test.sh` (27 passed) after the patches. `pnpm test:e2e --workers=1` (110 passed) ran before the patches, which touched no app code.

Residual risk: the loader is tested against a mock; the embed syntax was checked by hand against local PostgREST only. No page calls the function yet (Story 5.7). A group with a cycle falls back to deadline order for the whole group.
