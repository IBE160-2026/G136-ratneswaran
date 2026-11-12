---
title: 'Story 4.8: Problem flag'
type: 'feature'
created: '2026-11-11'
status: 'done'
baseline_revision: '36a72beead2211dc8c9e58807504e9099ab8876f'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-7-role-lead-and-revoke-hooks.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** A Task owner has no way to say that something has gone wrong, so the Organizer and the Role lead learn about it late. The status vocabulary already holds "Problem reported" (`STATUSES.problem`) but nothing sets it.

**Approach:** A `problems` table and two mutation functions, `tasks_report_problem` and `tasks_resolve_problem`, for the owner, the Role lead and the Organizer. The Task row, the Task page and the Dashboard's *Needs you* show an open Problem with a flag, the words and a note excerpt; `task_state` gains `has_problem`; the history lists raised and resolved Problems; one `problem_reported` notification (stub in Core) carries ids only.

## Boundaries & Constraints

**Always:**
- Table `public.problems` (tasks module owns it): `id`, `task_id` (`ON DELETE CASCADE`), `raised_by` and `resolved_by` (`ON DELETE SET NULL`), `note` (required, trimmed, 1–500 chars, CHECK), `raised_at`, `resolved_at`, `resolution_note` (null or 1–500 chars), CHECK that `resolved_at`, `resolved_by` and `resolution_note` are only set together with a resolution, and a partial unique index `(task_id) where resolved_at is null` (one open Problem per Task). RLS on; `authenticated` gets `SELECT` only, through a policy that follows Task visibility (a viewer who can read the Task reads its Problems), and no INSERT, UPDATE or DELETE; anon gets nothing (AD-3, AD-16, AD-19).
- `tasks_report_problem(p_task_id uuid, p_note text) returns uuid` (the Problem id) and `tasks_resolve_problem(p_task_id uuid, p_note text default null) returns void`: `security definer`, `search_path = ''`, granted to `authenticated`, revoked from `public` and `anon` (AD-2, AD-5), authorising from `auth.uid()` and the AD-3 helpers (`is_organizer(event_id)`, `is_role_lead(role_id)`, or `owner_user_id = auth.uid()`), never from a caller-supplied user id. Anyone else, an unknown Task and a holder of another Role get 42501 with one message, so ids cannot be probed. Both call `tasks_assert_writable(event_id)`.
- Report: only on a Task with `lifecycle = 'active'` and not `obsolete`; a Task in any status, `done` included. `proposed`, `dismissed` and `obsolete` Tasks raise 22023 (`task_not_active`, as `tasks_accept`). A second call while a Problem is open returns the existing Problem's id, changes nothing and emits nothing. Resolve closes the open Problem, sets `resolved_at`, `resolved_by` and the trimmed optional note (blank stored as null); with no open Problem it returns and changes nothing.
- Notification: when the Event is published (`published_at is not null`), report emits exactly one `problem_reported` through `notifications_emit(event_id, 'problem_reported', <problem id>, recipients)` to the Organizer and the Role lead (`role_members.is_lead`, joined), de-duplicated by user id when they are the same person, excluding the reporter, and none when no recipient remains or the Event is a draft. The call carries ids only: never the note, never the Task title (AD-7, AD-10, AD-11).
- `task_state` (`create or replace view`, same columns and order, `has_problem` appended after `obsolete`, still `security_invoker`): `has_problem` is true when the Task has an open Problem and is not `obsolete`.
- UI, all copy in `messages/en.json` and `messages/nb.json` with key parity (natural Bokmål), `STATUSES.problem` for icon and tone (Flag, never colour alone, visibly different from Blocked):
  - Task row (`app/events/[eventId]/tasks/task-row.tsx`, used wherever a Task row renders): an open Problem shows the flag, "Problem reported" and a one-line excerpt of the note (about 80 characters, ellipsis, rendered as plain text).
  - Task page: owner, lead and Organizer see *Report a problem* (a dialog with a required note up to 500 characters, counter, inline error) when none is open, and *Resolve problem* (dialog with an optional note) when one is open; everyone who can read the Task sees the open Problem with its full note. Idempotent repeats show no error. A cancelled or ended Event hides both buttons.
  - History: the Task's history lists each raised Problem (who, when, note) and each resolution (who, when, optional note) in time order with the existing status history; no new history table.
  - Dashboard (Epic 5 says each Target story adds its own row type, seed row and assertions): `classifyDashboard` puts open Problems in *Needs you* in the order of Story 5.1 (after Decision Tasks, which do not exist yet, before overdue and not-yet-accepted), by soonest deadline then title, each Task once with its other flags kept on the row, within the viewer's scope; the row shows the Problem excerpt. A Task that is overdue, blocked and has a Problem appears once under *Needs you*.
- Server Actions `reportProblem` and `resolveProblem` in `src/modules/tasks/actions.ts` follow the file's pattern: Zod first (trim, bound, reject control characters), `getClaims()`, `Result` with next-intl keys, `revalidatePath`, error codes mapped from 42501, 22023 and 55000; logs carry Event id, Task id, user id and error code only.
- AD-11: the note and the resolution note are never sent to AI, never written to a log line, an error message, a URL or a notification payload.
- Flagship seed (`supabase/seed.sql`): one open Problem, raised by its Task's owner or the Organizer, on a Core Task that is otherwise in no *Needs you* group (for example "Order tables"), with fictional text. Update every flagship assertion this changes (pgTAP counts, Dashboard *Needs you* and *On track* counts, the `noPlaceholders` check in `e2e/flagship.spec.ts`, which must keep asserting that Decision cards stay absent while "Problem reported" now appears exactly where expected); never loosen a check.
- Regenerate `src/types/database.ts` with `supabase gen types` after the migration; never hand-edit it. Migration is a new file in `supabase/migrations/`; the cloud project is not touched.

**Never:**
- No change to any other mutation function's behaviour, to RLS of other tables, or to the Epic 3 seams. No new status value and no stored `blocked`/`overdue`. No Realtime or polling. No email, push or outbox work (the stub stays). No secret key. No Decision Tasks, options or Proposed Task handling. No edits to `_bmad/`, planning artifacts or `docs/` except `docs/ki-logg.md`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Owner reports | active Task, owner calls with a note | open Problem; `has_problem` true; one `problem_reported` in a published Event | none |
| Repeat report | Problem already open | existing id returned, no new row, no emit | none |
| Report on `done` Task | status `done` | Problem created | none |
| Lead and Organizer | lead / Organizer call | allowed; the reporter is excluded from recipients; Organizer = lead gets one | none |
| Draft Event | not published | Problem created, no notification | none |
| Not allowed | plain holder of the Role who does not own it, holder of another Role, non-member, anon | denied | 42501 |
| Wrong lifecycle | obsolete, proposed, dismissed Task | refused | 22023 |
| Read-only Event | cancelled or ended | refused | 55000 |
| Bad note | blank, over 500 chars | refused, nothing stored | 23514 / Zod `invalid_input` |
| Resolve | open Problem, optional note | closed with who and when; history shows both entries | none |
| Repeat resolve | no open Problem | nothing changes | none |
| Task becomes obsolete | open Problem | `has_problem` false | none |
| Direct write | `authenticated` insert, update or delete on `problems` | denied | 42501 |
| Dashboard | Task overdue, blocked and with a Problem | once under *Needs you*, flags kept | none |

</intent-contract>

## Code Map

- `supabase/migrations/20261105120000_tasks_accept.sql` -- `tasks_accept` (the pattern: lock, authorise, `tasks_assert_writable`, `task_not_active` 22023, idempotent early return), the `task_state` definition and the `notifications_emit(... array[row('user', id)::public.recipient_spec])` call guarded by `published_at is not null`. `20261105140000_task_state_obsolete.sql` -- the latest `task_state` (copy its columns, append `has_problem`). `20261104130000_tasks_delegate.sql` -- `notifications_emit` stub and `recipient_spec`. `20261104120000_tasks_status.sql` -- `status_history`, `tasks_overdue_days`, `tasks_check_expected`. `20261103120000_tasks.sql` -- privilege model, `tasks_assert_writable`, RLS and grants. Read AD-1, AD-2, AD-3, AD-5, AD-7, AD-11, AD-16, AD-19 in `_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md` before writing SQL.
- `supabase/tests/tasks_accept.test.sql`, `tasks_status.test.sql`, `task_state.test.sql`, `task_state_scope.test.sql`, `tasks_role_hooks.test.sql` -- actor setup, allow and deny patterns, and the `task_state` column list test that gains `has_problem`. New pgTAP file for `problems`.
- `src/modules/tasks/actions.ts` (+ `actions.test.ts`, `schemas.ts`) -- Server Action pattern, error mapping, `revalidatePath`. `src/modules/tasks/dashboard.ts` (+ `dashboard.test.ts`) -- `classifyDashboard`, `DashboardTask`, `DashboardRow`; add `hasProblem` and the Problem group.
- `app/events/[eventId]/tasks/task-row.tsx`, `load-listed.ts` -- the shared Task row and its query (add `has_problem` and the open Problem's note). `app/events/[eventId]/tasks/[taskId]/{page,task-detail,status-panel}.tsx` -- the Task page, its history merge and panels; `accept-banner.tsx` and `delegate-panel.tsx` -- dialog and action UI patterns.
- `app/events/[eventId]/{on-track,page}.tsx` and the Dashboard components that render *Needs you* rows; `src/lib/status.ts` (`STATUSES.problem`), `src/components/status-label.tsx` -- vocabulary; `src/components/ui/dialog.tsx`, `textarea.tsx` -- house dialog and field.
- `supabase/seed.sql` (flagship; Task ids `…-c3` "Order tables" and others), `supabase/tests/flagship_seed.test.sql`, `e2e/flagship.spec.ts` (its `noPlaceholders` regex `/Needs your decision|Problem reported/` and the Dashboard counts), `e2e/tasks.spec.ts`, `e2e/support.ts` -- seed and e2e patterns.
- `node_modules/next/dist/docs/` -- read the relevant guide before using a Next API not yet used in this repo.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/<timestamp>_problems.sql` -- table, CHECKs, partial unique index, RLS select policy, grants, the two functions, `task_state` with `has_problem` -- FR8, AD-2, AD-3, AD-5.
- `supabase/tests/problems.test.sql` -- every matrix row at the database: allow and deny per actor, idempotence, lifecycle and read-only refusals, bad notes, direct writes denied, `has_problem` incl. obsolete, notification not emitted for a draft or with the note (assert via a recording replacement of the stub inside the transaction, or by asserting the call arguments) -- AD-16.
- `src/types/database.ts` -- regenerate.
- `src/modules/tasks/{actions,schemas}.ts` + tests -- `reportProblem`, `resolveProblem`; `dashboard.ts` + `dashboard.test.ts` -- Problem group, once-only rule with overdue and blocked.
- `app/events/[eventId]/tasks/**`, Dashboard rows, `messages/*.json` -- Task row, Task page dialogs and history, Dashboard row, copy.
- `supabase/seed.sql`, `supabase/tests/flagship_seed.test.sql`, `e2e/flagship.spec.ts` -- the seeded Problem and every assertion it changes.
- `e2e/tasks.spec.ts` (or a new `e2e/problems.spec.ts`) -- owner reports and sees the row and page state; lead and Organizer resolve; a plain holder sees no buttons; the Dashboard row; history entries; at 375px.
- `docs/ki-logg.md` -- the story's entry in the existing format, verdict left for the owner.

**Acceptance Criteria:**
- Given a Task owner, Role lead or Organizer, when they report a problem with a note, then an open Problem exists, a repeat returns it, it works on a `done` Task, and a non-member, a holder of another Role or an `obsolete`, `proposed` or `dismissed` Task is refused.
- Given an open Problem in a published Event, when it commits, then one `problem_reported` is queued to the Organizer and the lead (merged, reporter excluded), none in a draft, with ids only.
- Given an open Problem, when a Task row, the Task page or the Dashboard renders it, then it shows the flag, "Problem reported" and a note excerpt, never colour alone, and `has_problem` is true until it is resolved or the Task becomes obsolete.
- Given an open Problem, when the owner, lead or Organizer resolves it, then it closes with who and when, a repeat changes nothing, and both entries appear in the Task's history.
- Given a Problem note or resolution note, when it is stored, logged or sent, then it never reaches AI, a log line or a notification payload.

## Spec Change Log

## Review Triage Log

### 2026-11-12 — Review pass
- verdicts: 28 findings — high 0, medium 0, low 27, false 1, maybe-false 0 (blind, edge, gap and intent layers)
- findings:
  - `[low]` `[patch]` (blind) concurrent reports hit an unhandled unique violation — `tasks_report_problem` inserts with `on conflict … do nothing` and returns the winner's id (agent's last fixes).
  - `[false]` `[reject]` (blind) any non-22023 error shows the note-length message — `refuseTask` maps only 23514 and 22023 to the note message; every other code (network, 23505) is `unavailable`.
  - `[low]` `[reject]` (blind) a repeat report drops the new note without saying so — the story says a second call returns the existing Problem; the panel hides *Report* while one is open.
  - `[low]` `[reject]` (blind) resolve is a silent no-op when nothing is open — the story says a repeat call changes nothing; the stale-page toast is the cost.
  - `[low]` `[reject]` (blind) resolving notifies nobody — the story names only `problem_reported`; a new kind is a new feature.
  - `[low]` `[reject]` (blind) a dismissed Task keeps an unresolvable flag — the buttons return when the Task is restored; every view hides dismissed Tasks.
  - `[low]` `[patch]` (blind) resolve tests are thin — Vitest error mapping and pgTAP anon and read-only cases for `tasks_resolve_problem` added.
  - `[low]` `[patch]` (blind) dialog state is not reset on cancel and is shared by both dialogs — text cleared on close.
  - `[low]` `[reject]` (blind) `problem?: undefined` on `HistoryEntry` is a code smell — a style choice within one file; entries are sorted by timestamp.
  - `[low]` `[reject]` (blind) the GDPR guardrail for the note is only a hint — AD-11 bars AI, logs and payloads, which hold; the note is the team's own text.
  - `[low]` `[reject]` (blind) the counter and textarea have accessibility gaps — the same dialog pattern as the other panels; no rule here asks for more.
  - `[low]` `[reject]` (blind) process artifacts are missing from the diff — `docs/ki-logg.md` was excluded from the reviewed diff and has the entry; sprint status is updated at finalize; a reflection entry is offered to the owner.
  - `[low]` `[reject]` (blind) redundant index and no retention rule — the index serves the history order; Task deletion cascades the notes.
  - `[low]` `[patch]` (edge) concurrent reports raise 23505 — same fix as the blind row.
  - `[low]` `[reject]` (edge) the Task row is read without a lock during a concurrent dismiss — `tasks_accept` and the other functions read the same way.
  - `[low]` `[reject]` (edge) a dismissed Task keeps the flag — same as the blind row.
  - `[low]` `[reject]` (edge) control characters or a lone newline through a direct RPC call — Zod rejects them on the normal path and the other functions of the module accept the same direct input.
  - `[low]` `[patch]` (edge) a stale draft after Cancel — same fix as the blind row.
  - `[low]` `[patch]` (edge) `slice(0, 80)` can split an emoji — excerpt cut on code points.
  - `[low]` `[patch]` (edge) claim: one-line excerpt, but line breaks make the row taller — whitespace collapsed.
  - `[low]` `[patch]` (edge) claim: the index makes a repeat quiet, but the loser raised 23505 — same fix as the first row.
  - `[low]` `[patch]` (gap) `resolveProblem` error mapping and the no-log property are not pinned by a test — Vitest test added.
  - `[low]` `[reject]` (gap) an obsolete Task that is restored shows the flag again, untested — the view is computed from the row, which the pgTAP fixture exercises.
  - `[low]` `[reject]` (gap) resolve has no lifecycle check — intended: the UI offers it where the Problem is visible.
  - `[low]` `[reject]` (intent) no assertion on the flag icon or the contrast with Blocked in e2e — the icon is an `aria-hidden` SVG from the shared vocabulary and the word is asserted.
  - `[low]` `[patch]` (intent) the no-log property has no test at the action layer for resolve — same Vitest test as the gap row.
  - `[low]` `[reject]` (intent) obsolete is tested through a fixture, not a transition — `has_problem` is computed from the row.
  - `[low]` `[reject]` (intent) resolve is permissive about lifecycle — the story is silent; same as the gap row.

## Design Notes

- The report function returns the Problem id (not `updated_at`) because it takes no `expected_updated_at`: the partial unique index already serialises it, so a concurrent edit cannot create a second open Problem.
- A plain Role holder who is not the owner cannot report (the story names the owner, the lead and the Organizer); this keeps flags with people who can act on them.
- A Problem does not change the Task row's `updated_at`, status or acceptance; it is a flag beside status (Epic 4 context).
- The Dashboard change is in scope because Epic 5 states that each Target story adds its row type, seed row and assertions; Decision Tasks, Proposed Tasks and not-yet-accepted ordering stay as built.
- Work on the current branch in small one-concern commits `4.8: <what and why>` (at least four words after the prefix) with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; never push; never skip hooks; pnpm only. Do not commit this spec file. Run Playwright in the foreground with `--workers=1`; `next dev` rewrites AGENTS.md during e2e, so `git checkout AGENTS.md` before committing.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP pass (local Supabase running)
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test` -- expected: pass
- `pnpm exec playwright test --workers=1` -- expected: the whole suite passes serially

## Auto Run Result

Status: done

**Summary:** A Task owner, the Role lead or the Organizer can report a Problem with a note on an active Task in any status, and resolve it with an optional note. A repeat report returns the open Problem; concurrent reports resolve to one. `task_state.has_problem` is true for an open Problem on a Task that is not obsolete. The Task row, the Task page and *Needs you* show the flag, "Problem reported" and a one-line note excerpt; open Problems lead *Needs you*; history lists raised and resolved Problems. One `problem_reported` goes to `notifications_emit` for a published Event, ids only, reporter excluded.

**Files:** `supabase/migrations/20261111120000_problems.sql` (table, policy, two functions, `task_state`), `supabase/tests/problems.test.sql` (new), `src/modules/tasks/{actions,schemas,dashboard}.ts` with tests, `app/events/[eventId]/tasks/{task-row,load-listed,page}.tsx`, `app/events/[eventId]/tasks/[taskId]/{problem-panel,page,status-panel,task-detail}.tsx`, `messages/*.json`, `supabase/seed.sql` (one open Problem on Order tables), `supabase/tests/flagship_seed.test.sql`, `e2e/{problems,flagship}.spec.ts`, `src/types/database.ts` (regenerated), `docs/ki-logg.md`.

**Review:** 28 findings. Patched: 10 rows in 5 fixes (all low). Deferred: none. Rejected: 18 with reasons in the log, 1 of them false.

**Follow-up review:** not recommended; no high and no medium finding.

**Verification:** after `supabase db reset`: `supabase test db` 1261/1261; lint, format:check and tsc pass; Vitest 517/517; Playwright serial 157/157 (whole suite). Verification also found one stale flagship assertion (the Venue holder leads Venue, so the seeded Problem shows in their *Needs you*), fixed in a commit of its own. An earlier full run stopped because a hung `next dev` held the project lock; it was stopped and the suite rerun clean.

**Residual risks:** the Role lead or the Organizer resolving a Problem, and a draft Event, are covered in pgTAP but not in e2e; the Problem row has not been looked at in a browser in light and dark theme; the build agent was launched detached and was stopped by a usage limit once; a plain Role holder who does not own the Task cannot report (per the story).
