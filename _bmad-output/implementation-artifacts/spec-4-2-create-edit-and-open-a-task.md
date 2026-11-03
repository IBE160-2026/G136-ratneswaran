---
title: 'Create, edit and open a Task'
type: 'feature'
created: '2026-11-03'
status: 'in-progress'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The `tasks` table exists but nothing can write to it, and no page shows a Task. The Team cannot yet write down the work of a Role.

**Approach:** One migration adds `tasks_create`, `tasks_set_deadline`, `tasks_dismiss`, `tasks_restore` and the system function `tasks_recalculate_deadlines`, plus the `days_before` and guest-program columns. A per-Event Tasks list, a create form and a Task detail page use them. All of it is proven by pgTAP, Vitest and one Playwright flow.

## Boundaries & Constraints

**Always:**
- `tasks_create(p_id, p_role_id, p_title, p_description, p_deadline, p_days_before)` is `security definer`, `search_path = ''`, granted to `authenticated`. It derives `event_id` from the Role, calls `tasks_assert_writable`, and lets only the Organizer or the joined lead of that Role (`role_members.is_lead`) through. It refuses an inactive Role. The row is `active`, `not_started`, `owner_user_id` null, `created_by = auth.uid()`. A repeat call with the same `p_id` creates nothing and raises nothing.
- Deadline: a date, or `days_before` N in 0..365 resolved as `(starts_at at time zone time_zone)::date - N`. Both are stored. N without a start time and time zone is refused (`22023`). A past date is accepted. Zod and a CHECK (`days_before is null or between 0 and 365`) both enforce the range.
- `tasks_set_deadline(p_task_id, p_expected, p_deadline, p_days_before)` calls `tasks_check_expected` first and stores a fixed date with `days_before` null.
- `tasks_recalculate_deadlines(event_id)` is a system function (revoked from `public, anon, authenticated`). It recomputes only rows with `days_before` set, changes a row only when the date differs, and is called from `events_update_schedule` where Story 2.6 left the marked call site. It emits no notification.
- New columns: `days_before smallint`, `show_on_guest_program boolean not null default false`, `guest_label text`, `guest_time time`. CHECKs: label required when shown, label at most 80 characters, title at most 120, description at most 2000.
- Direct `UPDATE` grants widen to `title, description, show_on_guest_program, guest_label, guest_time`. The `tasks_update` policy lets the Organizer and the lead of the Task's Role edit. A trigger refuses a change to the three guest-program columns by anyone but the Organizer (`42501`).
- `tasks_dismiss` and `tasks_restore` take the same authorisation and `p_expected`, are idempotent, and set `lifecycle` to `dismissed` or `active`. Nothing is hard-deleted.
- Server Actions parse with Zod first and return `Result`; failures map `42501`, `55000`, `40001` (concurrent edit toast) and `22023` to next-intl keys. No Task text reaches a log line (AD-11).
- Routes `/events/[eventId]/tasks` and `/events/[eventId]/tasks/[taskId]`, linked from `AppNav` for Organizer and holders. A row follows UX-DR11 and opens the detail page (UX-DR13): back control, grouped metadata card, sticky bottom action bar on phone with safe-area inset. A Task the caller cannot see shows the existing no-access page with no data (UX-DR24). Dismiss uses an Undo toast and a timeless *Restore* under *Show dismissed (n)*.
- Text only in `messages/nb.json` and `messages/en.json`. `src/types/database.ts` is regenerated, never hand-edited. The migration filename is timestamped after `20261103120000`.

**Never:**
- No status change, owner, delegation, Subtask, dependency or history; Stories 4.3+ own them.
- No new `security definer` kind beyond AD-5; no secret key; no email or notification.
- `tasks_dismiss` does not check Subtasks or dependents, because neither exists yet. Story 4.3 adds the refusal at a marked call site.
- Do not edit `_bmad/` or planning documents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Create as lead | Lead of an active Role, live Event, title, date | Active, not started, pending Task | N/A |
| Double submit | Same `p_id` twice | One Task | N/A |
| Non-lead holder, other Role's holder | Call `tasks_create` | Denied | `42501` |
| Inactive Role or cancelled Event | Call `tasks_create` | Denied | `22023` / `55000` |
| N days before | N = 14, `starts_at` set | `deadline` = start date minus 14, `days_before` = 14 | N/A |
| N out of range or no start | N = -1, 366, or Event without `starts_at` | Refused | Inline error, focus on first error |
| Past date | Yesterday | Accepted | N/A |
| Start moves | `events_update_schedule` | Only `days_before` rows move; fixed dates untouched; a second run changes nothing | N/A |
| Guest-program edit by lead | Direct `UPDATE` of `guest_label` | Refused | `42501` |
| Stale edit | Old `updated_at` | Refused, concurrent-edit toast | `40001` |
| Dismiss and restore | Organizer dismisses, then restores | `dismissed`, then `active`; repeat is a no-op | N/A |
| Task out of sight | Open another Role's Task URL | No-access page, no data | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261103120000_tasks.sql` -- table, `tasks_update` policy, `tasks_read_only` and `tasks_touch` triggers, `tasks_assert_writable`, `tasks_check_expected`, `task_state`; extend, do not edit.
- `supabase/migrations/20261019190000_events_update_schedule.sql` -- redefine with `create or replace`, same signature, and add the recalculation call at the marked line.
- `supabase/migrations/20261028120000_role_lead.sql` -- `role_members.is_lead`; model for a definer function guarding on a Role.
- `supabase/migrations/20261030120000_holder_scoped_view.sql` -- `holds_role`; add an invoker `is_role_lead(role_id)` in the same style.
- `supabase/tests/tasks.test.sql`, `supabase/tests/role_lead.test.sql` -- pgTAP fixtures to copy; new file `supabase/tests/tasks_create_edit.test.sql`.
- `src/modules/guests/actions.ts`, `schemas.ts` -- Server Action, `caller`, `refuse`/`fieldErrors` and Zod pattern to copy into `src/modules/tasks/`.
- `src/lib/feedback.ts` (`undoToast`, `saveFailedToast`), `src/lib/status.ts`, `src/components/status-label.tsx` -- reuse for Undo and the status word.
- `app/events/[eventId]/guests/page.tsx`, `load-event.ts` -- page and no-access (`notFound`) pattern; `src/components/app-nav.tsx` -- add the Tasks link.
- `e2e/guests.spec.ts`, `e2e/holder-view.spec.ts` -- Playwright style.

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/migrations/<ts>_tasks_create_edit.sql` -- columns, CHECKs, `is_role_lead`, widened grants and policy, guest-program trigger, the five functions, `events_update_schedule` call -- one file (AD-15)
- [ ] `supabase/tests/tasks_create_edit.test.sql` -- allow and deny for every function, grant, policy, trigger and CHECK in the matrix
- [ ] `src/types/database.ts` -- regenerate with `supabase gen types`
- [ ] `src/modules/tasks/schemas.ts`, `actions.ts` + Vitest -- Zod schemas, create/edit/set-deadline/dismiss/restore actions, error mapping
- [ ] `app/events/[eventId]/tasks/**`, `src/components/app-nav.tsx`, `messages/nb.json`, `messages/en.json` -- list, create form, detail page, edit form, dismiss and restore
- [ ] `e2e/tasks.spec.ts` -- create, open, edit, dismiss with Undo, restore; a holder cannot create
- [ ] `docs/ki-logg.md` -- entry; offer a `docs/refleksjonsnotater.md` entry that `tasks_create` joins the AD-2 list

**Acceptance Criteria:**
- Given local Supabase, when `supabase test db`, `pnpm lint`, `pnpm format:check` and `pnpm test` run, then all pass.
- Given the generated types, then `database.ts` shows the new columns and functions and no hand edit.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

- Past and `updated_at` handling: pass the raw `updated_at` string back as `p_expected`, never a JS `Date` (4.1 deferred microsecond finding).
- A lead edits through the widened `tasks_update` policy; the guest-program trigger, not the policy, keeps those columns Organizer-only because column grants cannot differ per user.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass
- `supabase gen types typescript --local > src/types/database.ts` -- expected: diff shows only the new columns and functions
- `pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e` -- expected: pass
