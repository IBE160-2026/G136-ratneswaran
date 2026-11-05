---
title: 'Delegate a Task'
type: 'feature'
created: '2026-11-04'
status: 'done'
baseline_commit: 'a0cc99124b6f88b232f9c5213cbdc0bd2ceb1658'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-4-status-notes-and-overdue.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `owner_user_id`, `delegated_at` and `accepted_at` exist on `tasks` but nothing sets them, so no Task can be handed to a person and nobody is answerable for it.

**Approach:** One migration adds `task_assignment_log`, `tasks_delegate` and the `notifications_emit` no-op stub. The Task detail page gets a *Delegate* control with a `Command` picker and a "held before" line from the log. pgTAP, Vitest and one Playwright flow prove it.

## Boundaries & Constraints

**Always:**
- `task_assignment_log(id, task_id → tasks on delete cascade, from_user, to_user → auth.users on delete set null, by_user → auth.users on delete set null, kind check in ('delegated','accepted','released'), created_at default clock_timestamp())`. RLS select shows a row when the caller can see the Task. Select-only grant; a trigger refuses every update except one that only nulls `from_user`, `to_user` or `by_user` (FK actions), no delete trigger so the cascade works. Only `delegated` is written here; `accepted` is 4.6, `released` is 4.7.
- `tasks_delegate(p_task_id, p_new_owner, p_expected) returns timestamptz`: `security definer`, `search_path = ''`, granted to `authenticated`. Allowed: the Organizer, or the joined lead of the Task's Role; a non-lead holder, a holder of another Role and the Task's owner (unless lead) get `42501`. Then `tasks_assert_writable` and `tasks_check_expected`, then re-read the Task: it must be `active` and not `obsolete` and not `done`, else `22023`. Sets `owner_user_id`, `delegated_at = now()`, `accepted_at = now()` (Core: delegation counts as accepted; Story 4.6 changes this), writes one `delegated` row (`from_user` = previous owner). The same owner again writes nothing and returns the current `updated_at`.
- Target rule: the lead may pick only a joined holder of the Task's Role. The Organizer may pick any `role_members` row of the Event, joined or pending, or themself. Anyone else (outside the Event, or no Role and not the Organizer) gets `42501`. Delegating to oneself is accepted at once and asks no Accept.
- `notifications_emit(event_id, kind, subject_ref, recipients recipient_spec[])` is a definer no-op stub with the final signature, `recipient_spec` a composite `(kind text, id uuid)`, revoked from `public, anon, authenticated`. `tasks_delegate` calls it with `task_assigned` for a published Event and a target other than the caller. Story 3.1 replaces the body.
- The picker is a `Command` list (add the shadcn `command` component with pnpm) of allowed people, "Invite pending" labelled, keyboard operable, 44px hit areas. The detail page shows who held the Task before, from the log. Shown only to those allowed and only while the Event is writable; a double click delegates once. Failure shows `saveFailedToast`; a stale `updated_at` shows the shared concurrent-edit toast.
- Server Action `delegateTask` parses with Zod first and returns `Result`. No names, emails or notes in log lines (AD-11). `database.ts` is regenerated, never hand-edited. The migration is timestamped after `20261104120000`. All text in `nb.json` and `en.json`.

**Decided:**
- Story 4.4's `tasks_set_status` is not changed: an owner who does not hold the Task's Role (Organizer delegated across Roles) can see the Task but only the Organizer or the lead sets its status.
- Delegation changes the owner only. The Task's Role stays as it is; moving a Task to another Role remains the Story 4.3 promote path.

**Never:**
- No Accept step, 48-hour rule, owner release, revoke hook, Problem flag or Decision Task. No real notification, outbox table or secret key. Do not edit `_bmad/` or planning documents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Lead delegates to holder | Active Task, target joined in the Role | Owner set, accepted, one log row | N/A |
| Organizer delegates to pending invitee | Target `joined_at` null | Owner set, log row, "Invite pending" in picker | N/A |
| Lead picks outside the Role | Target holds another Role only | Refused | `42501` |
| Target outside the Event | Unknown or other Event's user | Refused | `42501` |
| Non-lead holder, other Role's holder, owner | Any target | Denied | `42501` |
| Self-delegation | Caller picks themself | Accepted, no notification | N/A |
| Repeat to same owner | Double click | One log row | N/A |
| Done, obsolete, dismissed or proposed Task | Any target | Refused | `22023` |
| Read-only Event | Cancelled or ended | Refused | `55000` |
| Stale edit | Old `updated_at` | Second writer refused, toast | `40001` |
| Direct write | `INSERT`/`UPDATE`/`DELETE` on the log | Denied | `42501` |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261104120000_tasks_status.sql` -- `status_history` trigger and policy and `tasks_set_status` to copy; `tasks_assert_writable`, `tasks_check_expected` in `20261103120000_tasks.sql`; `is_role_lead` in `20261103130000_tasks_create_edit.sql`. Reuse, do not edit.
- `supabase/migrations/20261026120000_role_members.sql` -- `role_members(user_id, role_id, joined_at, name)`; pending = `joined_at is null`.
- `supabase/tests/tasks_status.test.sql` -- pgTAP fixtures to copy; new `supabase/tests/tasks_delegate.test.sql`.
- `src/modules/tasks/actions.ts`, `schemas.ts`, `actions.test.ts` -- `refuseTask`, `caller`, schemas to extend.
- `app/events/[eventId]/tasks/[taskId]/page.tsx`, `task-detail.tsx`, `status-panel.tsx` -- detail data, `canEdit`, history list pattern.
- `e2e/tasks.spec.ts` -- Playwright and `psql` fixtures.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<ts>_tasks_delegate.sql` -- log table, trigger, policy, grants, `tasks_delegate`, `recipient_spec`, `notifications_emit` stub -- one file (AD-15)
- [x] `supabase/tests/tasks_delegate.test.sql` -- one allow and one deny per function, policy, grant, trigger and stub grant; every Matrix row
- [x] `src/types/database.ts` -- regenerate with `supabase gen types`
- [x] `src/modules/tasks/schemas.ts`, `actions.ts`, `actions.test.ts` -- `delegateTask`
- [x] `components/ui/command` and `app/events/[eventId]/tasks/[taskId]/**`, `messages/nb.json`, `messages/en.json` -- Delegate control, picker, held-before line
- [x] `e2e/tasks.spec.ts` -- lead delegates to a holder; a non-lead sees no control
- [x] `docs/ki-logg.md` -- entry

**Acceptance Criteria:**
- Given local Supabase, when `supabase test db`, `pnpm lint`, `pnpm format:check` and `pnpm test` run, then all pass.
- Given the generated types, then `database.ts` shows the new table and functions and no hand edit.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Layer | Verdict | Route | Evidence |
|---------|-------|---------|-------|----------|
| Owner cell and "Held before" are empty when the Organizer owns or last held the Task and the viewer is not the Organizer | blind, edge, gap | medium | patch | The Organizer has no `role_members` row, so `names.get(id)` is undefined and `nameOf` returns null. Fixed with an "Organizer" label. |
| Picker list-building (pending, other-Role, owner, self) has no UI test | blind, gap | medium | patch | Dropping the `joined_at`, `role_id` or `pending` check leaves every test green. e2e extended for the lead and the Organizer. |
| ki-logg entry has no review trail | blind | low | patch | Review outcome appended to the Story 4.5 entry; the PR link is added when the PR exists. |
| Unused shadcn files (`button`, `input`, `textarea`, `dialog`) | blind | false | rejected | `command.tsx` imports `dialog` and `input-group`; `input-group.tsx` imports `button`, `input` and `textarea`. |
| A null name is shown as "You" for anyone | blind, edge | false | rejected | `role_members.name` is `NOT NULL`; only the Organizer's own candidate has a null name. |
| Delegate control may hide from the Organizer | edge | false | rejected | `lead` in `page.tsx` is `organizer_id === claims.sub \|\| leadResult.data.length > 0`. |
| Previous owner is not notified | blind | false | rejected | The story notifies the new owner only. |
| No `accepted` log row on delegation | blind | false | rejected | The spec writes only `delegated`; `accepted` is Story 4.6. |
| Delegate control visibility on done, dismissed or read-only has no test | gap | low | defer | The server refuses all three, so the harm is a control that returns an error. |
| Target removed between the checks and the row lock | edge | low | rejected | Authorising first is the AD-2 order, as in Story 4.4; the window is one statement. |
| `task_assignment_log_guard` passes any null-out | blind, edge | low | rejected | It mirrors the Story 4.4 trigger and only a privileged role can reach it; `authenticated` has no UPDATE grant. |
| `42501` covers both "not allowed" and "cannot hold" | blind | low | rejected | Both are denials; a separate code adds a branch for a rare stale pick. |
| `notifications_emit` branch has no test | blind | low | rejected | The stub does nothing to assert; Story 3.1 tests the outbox. |
| Same-owner repeat ignores a missing `accepted_at` | edge | low | rejected | Core sets `accepted_at` with every delegation. |
| "Held before" vanishes when the previous owner was deleted | blind, edge | low | rejected | Cosmetic; the log row is kept. |
| Stale picker after a non-concurrent failure, focus and Escape, toast roles, `busy` and `pending` overlap, brittle e2e setup, empty-list control | blind, edge | low | rejected | Cosmetic or handled by `cmdk`; no wrong data results. |

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass
- `supabase gen types typescript --local > src/types/database.ts` -- expected: diff shows only the new table and functions
- `pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e` -- expected: pass
