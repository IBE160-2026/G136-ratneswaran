---
title: 'Status, notes and Overdue'
type: 'feature'
created: '2026-11-04'
status: 'in-review'
baseline_commit: '1626b61714e0635f12928df0aad4d6b66e145164'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-3-subtasks-and-dependencies.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Task has a status column nobody can change, and nothing says when work is late. The Organizer cannot see where things stand without asking.

**Approach:** One migration adds `status_history`, `tasks_set_status`, `tasks_remove_status_note` and `tasks_overdue_days`, and extends `task_state` with `overdue` and `overdue_days`. The Task detail page gets a status control with an optional note and a history list; Task rows show the status vocabulary and "Overdue N days". pgTAP, Vitest and one Playwright flow prove it. The AI follow-up from a note is Story 6.5, not here.

## Boundaries & Constraints

**Always:**
- `status_history(id, task_id → tasks on delete cascade, changed_by → auth.users on delete set null, from_status, to_status, note, note_removed_at, created_at default clock_timestamp())`, statuses checked against the four values, `note` at most 500 characters. RLS select shows a row when the caller can see the Task (policy reads `tasks` as the caller). Grants: select only; INSERT, UPDATE and DELETE are denied to `authenticated`. A trigger refuses every update except one that sets `note` to null with `note_removed_at` set and leaves all else equal, or one that only nulls `changed_by` (the user-delete FK action must still work). No delete trigger, so the cascade works.
- `tasks_set_status(p_task_id, p_expected, p_status, p_note default null) returns timestamptz`: `security definer`, `search_path = ''`, granted to `authenticated`. Allowed: the Organizer, the lead of the Role, or the joined holder who owns the Task (`owner_user_id = auth.uid()`); a holder who does not own it and every holder of another Role get `42501`. Calls `tasks_assert_writable` and `tasks_check_expected` first. The Task must be `active` and not `obsolete`, else `22023`. A new status writes the status and one history row with the trimmed, nullified-if-empty note. The same status with no note writes nothing and returns the current `updated_at`; the same status with a note writes a history row (from = to). Blocked Tasks may change status (blocked is computed).
- Accept-first rule (Target 2): when the caller is the owner, is neither Organizer nor lead, and `delegated_at is not null and accepted_at is null`, refuse with a new SQLSTATE `55007` mapped to its own message "Accept this task first". The lead and the Organizer are not refused. Until Story 4.6 a pgTAP fixture row sets `delegated_at` directly.
- `tasks_remove_status_note(p_history_id)`: `security definer`; only the note's author (`changed_by = auth.uid()`) or the Organizer; Event writable; sets `note = null` and `note_removed_at = clock_timestamp()` and keeps the row and `created_at`; a repeat is a no-op; anyone else gets `42501`. It does not move the Task's `updated_at`.
- `tasks_overdue_days(p_deadline date, p_time_zone text, p_at timestamptz default now()) returns integer`: null unless `p_at at time zone p_time_zone` is later than the end of the deadline day (so 23:59:59 local is not overdue, 00:00:00 the next day is); otherwise the local date minus the deadline, at least 1. Time zone null falls back to `UTC` (only unpublished Events lack one). `task_state` is extended with `create or replace view`, new columns appended at the end: `overdue` (true when the function returns a number and the Task is `active`, not `obsolete`, not `done`) and `overdue_days`.
- Detail page: a status control with a note `Textarea` — a segmented control on desktop, a full-width `Select` on phone — shown only to those allowed to set status and only while the Event is writable. It updates optimistically, and on failure reverts and shows `saveFailedToast` with *Retry* (a stale `updated_at` shows the shared concurrent-edit toast instead). A history list shows to_status, note, author name if resolvable else nothing, and time, with *Remove* on a note for its author and the Organizer behind a confirmation. A removed note shows "Note removed".
- Status words and icons come from `STATUSES` in `src/lib/status.ts` (add a `notStarted` entry if needed); all four words get `tasks.status.*` keys in `nb.json` and `en.json`. The Task row shows the status icon and word, and for an overdue Task "Overdue N days" with `circle-alert`, in addition to the word, never colour alone (UX-DR4, UX-DR11). Overdue is not a settable status.
- Server Actions `setTaskStatus` and `removeStatusNote` parse with Zod first and return `Result`; add `55007` to the error map. No Task text or note text in log lines (AD-11). No offline queue.
- `src/types/database.ts` is regenerated, never hand-edited. The migration is timestamped after `20261103140000`.

**Never:**
- No AI call, `tasks_propose`, `ai_reserve` or word list; Story 6.5 owns them. No delegation, accept action, owner change or Problem flag (Stories 4.5, 4.6, 4.8).
- No status rollup from Subtasks; no stored overdue or blocked value (AD-13).
- No notification and no secret key. Do not edit `_bmad/` or planning documents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Owner sets status with note | Joined owner, Task `not_started`, status `in_progress` + note | Status changes, one history row with note | N/A |
| Repeat without note | Same status, no note | Nothing written, no new row | N/A |
| Same status, new note | Same status + note | History row, from = to | N/A |
| Non-owner holder / other Role's holder | Any status | Denied | `42501` |
| Delegated, not accepted | Owner, `delegated_at` set, `accepted_at` null | Refused; lead and Organizer succeed | `55007` |
| Inactive Task | Dismissed, proposed or obsolete | Refused | `22023` |
| Read-only Event | Cancelled or ended | Refused | `55000` |
| Stale edit | Old `updated_at` | Second writer refused, toast | `40001` |
| Direct write | `INSERT`/`UPDATE`/`DELETE` on `status_history` | Denied | `42501` |
| Remove a note | Author or Organizer | `note` null, `note_removed_at` set, row kept | N/A |
| Remove someone else's note | Lead or other holder | Denied | `42501` |
| Overdue boundary | Deadline D, local 23:59:59 on D, then 00:00:00 on D+1 | Not overdue, then overdue 1 day | N/A |
| Daylight saving | Deadline on a change-over day | Boundary stays local midnight | N/A |
| Done or dismissed Task past deadline | `done`, `dismissed` or `obsolete` | Not overdue | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261103130000_tasks_create_edit.sql` -- `is_role_lead`, definer-function pattern (`tasks_set_deadline` returns `updated_at`), `tasks_dismiss`; reuse, do not edit.
- `supabase/migrations/20261103120000_tasks.sql` -- `tasks_assert_writable`, `tasks_check_expected`, `tasks_touch` trigger, select policy to model `status_history` on.
- `supabase/migrations/20261103140000_tasks_subtasks_dependencies.sql` -- current `task_state` view; copy its columns and append.
- `supabase/tests/tasks_create_edit.test.sql` -- pgTAP fixtures (users, Events, Roles, members) to copy; new file `supabase/tests/tasks_status.test.sql`.
- `src/modules/tasks/actions.ts`, `schemas.ts`, `actions.test.ts` -- `refuseTask`, `caller`, `lifecycleSchema` pattern to extend.
- `src/lib/status.ts`, `src/lib/feedback.ts` -- `STATUSES`, `saveFailedToast`, `undoToast`.
- `app/events/[eventId]/tasks/page.tsx`, `task-row.tsx`, `[taskId]/page.tsx`, `[taskId]/task-detail.tsx` -- row currently shows a generic icon and only the `not_started` word; detail computes `canEdit`.
- `e2e/tasks.spec.ts` -- Playwright style and `psql` fixtures (owner has no UI until Story 4.5, so set `owner_user_id` by psql).

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<ts>_tasks_status.sql` -- table, trigger, policy, grants, three functions, view extension -- one file (AD-15)
- [x] `supabase/tests/tasks_status.test.sql` -- one allow and one deny per function, policy, grant and trigger; accept-first fixture; boundary 23:59:59 / 00:00:00 and a DST case through `tasks_overdue_days`
- [x] `src/types/database.ts` -- regenerate with `supabase gen types`
- [x] `src/modules/tasks/schemas.ts`, `actions.ts`, `actions.test.ts` -- `setTaskStatus`, `removeStatusNote`, `55007` mapping
- [x] `src/lib/status.ts`, `app/events/[eventId]/tasks/**`, `messages/nb.json`, `messages/en.json` -- status control, history list, row status and Overdue
- [x] `e2e/tasks.spec.ts` -- owner sets status with note and sees history; a non-owner holder sees no control; overdue row; remove a note
- [x] `docs/ki-logg.md` -- entry

**Acceptance Criteria:**
- Given local Supabase, when `supabase test db`, `pnpm lint`, `pnpm format:check` and `pnpm test` run, then all pass.
- Given the generated types, then `database.ts` shows the new table, functions and view columns and no hand edit.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Layer | Verdict | Route | Evidence |
|---------|-------|---------|-------|----------|
| `tasks_set_status` lets any caller through on an unowned Task | edge | high | patch | `owner_user_id = auth.uid()` is null on an unowned Task, so the deny test was null and no `42501` was raised; the function is definer and reads any Task. Fixed with `coalesce`; pgTAP now denies a holder on an unowned Task. |
| `tasks_remove_status_note` lets anyone remove a note whose author was deleted | edge | high | patch | `changed_by = auth.uid()` is null for a deleted author, so the deny test was null. Fixed with `coalesce`; pgTAP covers a holder (denied) and the Organizer (allowed). |
| Owner who lost the Role is not denied in a test | gap, edge | medium | patch | The `holds_role` term had no deny case. Added one. |
| Note removal on a cancelled Event has no test | gap | medium | patch | Added a case expecting `55000`. |
| `tasks_overdue_days` has no grant test | blind | medium | patch | Added one allow and one deny. |
| Stale `updated_at` leaves the panel stuck after a concurrent toast | blind, edge | medium | patch | The panel now calls `router.refresh()` on `concurrent`. |
| `t.status` is read before the row lock, so `from_status` can be stale | edge | medium | patch | The row is read again after `tasks_check_expected`. |
| Unused `statusControl.retry` keys | blind | low | patch | Removed from both locales. |
| Accept-first gate on the page has no e2e test | gap | low | defer | The database rule is pinned by pgTAP; Story 4.6 builds *Accept* and can add the case. |
| "Save note" and the stale toast have no e2e step | gap | low | defer | Server rules and the action mapping are tested; add the step when the panel is next touched. |
| No `note_removed_by` column | blind | low | defer | The spec fixes the columns of `status_history`; a record of who removed a note is a spec change for the owner to decide. |
| Role check and status validation run before `tasks_assert_writable` and `tasks_check_expected` | edge | low | rejected | Authorising first is the AD-2 order; the spec's "first" means before any write. |
| Note-only write does not bump `updated_at` | edge | low | rejected | The spec says a same-status note writes a history row and nothing else. |
| Unknown time zone breaks the view | edge | low | rejected | `events_update_schedule` validates the zone against `pg_timezone_names`. |
| Unchecked status casts, Organizer author label, no-op click on the selected status, remove-button name, revoked author removing own note, wide author query | blind, edge | low | rejected | Cosmetic or guarded by the database CHECK; no wrong data results. |

## Design Notes

- Pass `updated_at` back as the raw string, as in Stories 4.2 and 4.3; the optimistic control chains on the value `tasks_set_status` returns.
- Overdue lives in one function so pgTAP can test the boundary and a daylight-saving day with a given `p_at`, while the view just calls it with `now()`.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass
- `supabase gen types typescript --local > src/types/database.ts` -- expected: diff shows only the new table, functions and view columns
- `pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e` -- expected: pass
