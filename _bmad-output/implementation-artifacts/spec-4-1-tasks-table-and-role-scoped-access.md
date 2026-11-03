---
title: 'Tasks table and Role-scoped access'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: '204853c6ab3e3ee1fa6ee62a96dfe8847b3d9b8d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Epic 4 has nowhere to store Tasks, and no database rule says who may read or change one. Without it, Role-scoping would live only in the UI.

**Approach:** One migration creates `tasks` with RLS, column grants, CHECKs, a read-only trigger, two helper functions and the `task_state` view, each proven by pgTAP. The migration states the one privilege model every later `tasks_*` function follows. No Server Action or UI is built here; `src/types/database.ts` is regenerated.

## Boundaries & Constraints

**Always:**
- Columns exactly as the story lists: `id`, `event_id` (cascade), `role_id` (required), `title`, `description`, `deadline` (`date`), `owner_user_id` (nullable, `ON DELETE SET NULL`), `lifecycle ∈ {proposed, active, dismissed}`, `status ∈ {not_started, in_progress, waiting_external, done}`, `accepted_at`, `delegated_at`, `obsolete` (boolean), `confirmed_at`, `created_by` (`ON DELETE SET NULL`), `updated_at`. Enums or CHECKs follow how earlier migrations type their sets.
- CHECK: `lifecycle = 'active'` requires `deadline`; `proposed` may lack one.
- SELECT policy: `is_organizer(event_id)` sees everything. Anyone else needs `holds_role(role_id)` or `owner_user_id = (select auth.uid())`, and the Event published, and the Role `active`. Never match on email. A Guest-only user, a holder of another Role and an anonymous caller see nothing.
- Grants: revoke all from `public, anon, authenticated`; `SELECT` plus `UPDATE (title, description)` only. `INSERT` and `DELETE` are denied.
- A `before update` trigger reuses `events_refuse_read_only()` so a cancelled or ended Event refuses even the direct title edit. A second trigger sets `updated_at = clock_timestamp()` on every update.
- `tasks_assert_writable(p_event_id)` raises `55000` on a cancelled or ended Event (an unknown or hidden Event also refuses). `tasks_check_expected(p_task_id, p_expected timestamptz)` raises `concurrent_edit` (errcode `40001`) when `updated_at` differs. Both are `security invoker`, `search_path = ''`; later `tasks_*` functions call them first.
- `task_state` is `security_invoker`: `is_delegated = owner_user_id is not null`, `is_pending = owner_user_id is null`, plus `id`, `event_id`, `role_id`. Independent of status.
- Privilege model, stated in the migration header: every `tasks_*` function is `security definer`, `search_path = ''`, `revoke … from public, anon`, `grant … to authenticated`, authorises from `auth.uid()` and the AD-3 helpers before any write, and takes no user id from its caller.
- Migration filename is timestamped after `20261030130000`. Regenerate `src/types/database.ts` with `supabase gen types`; never hand-edit it.

**Never:**
- No `tasks_create` or any other `tasks_*` mutation, no Server Action, no UI, no messages. Stories 4.2+ own them.
- No columns or tables for `source`, parents, dependencies, history, Problems or options.
- No `security definer` helper beyond the AD-5 kinds; no secret key.
- Do not edit `_bmad/` or planning documents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Read as insider | Organizer, Role holder, Task owner on a published Event with an active Role | Row visible | N/A |
| Read as outsider | Holder of another Role, Guest-only user, anonymous | Zero rows | N/A |
| Inactive Role | `roles.active = false` | Organizer only; visible again to the holder when reactivated | N/A |
| Draft Event | Event unpublished | Organizer only | N/A |
| Active without deadline | `lifecycle = 'active'`, `deadline` null | Rejected | CHECK violation |
| Proposed without deadline | `lifecycle = 'proposed'` | Accepted | N/A |
| Direct write | `INSERT`, `DELETE`, or `UPDATE` of any column outside `title`, `description` | Denied | `42501` |
| Direct title edit | Organizer edits `title` of a live Event | Allowed, `updated_at` advances | N/A |
| Cancelled or ended Event | Direct title edit; `tasks_assert_writable` | Refused | `55000` |
| Stale edit | `tasks_check_expected` with an old `updated_at` | Refused | `concurrent_edit` |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261030120000_holder_scoped_view.sql` -- `holds_role`, `is_team_member`; shows the invoker-helper and policy style to copy.
- `supabase/migrations/20261019210000_events_cancel_delete.sql` -- `events_refuse_read_only()` already handles child tables through `old.event_id`; attach a trigger, do not copy it.
- `supabase/migrations/20261019170000_roles.sql` -- `roles.active`, `role_key`, the revoke-then-grant pattern and a definer function example.
- `supabase/migrations/20261026120000_role_members.sql` -- FK style (`on delete set null` on user columns).
- `supabase/migrations/20261029120000_revoke_role.sql`, `20261028120000_role_lead.sql` -- the marked Epic 4 call sites; leave untouched (Story 4.7).
- `supabase/tests/revoke_role.test.sql` -- pgTAP fixture style: fixed UUIDs, `auth.users` rows, Events live, cancelled and ended, role switching.
- `src/types/database.ts` -- regenerated output only. `src/modules/tasks/` is empty and stays so.

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/migrations/20261103120000_tasks.sql` -- table, CHECKs, indexes on `event_id` and `role_id`, RLS policy, grants, triggers, helpers, `task_state`, privilege-model header -- everything in one file (AD-15).
- [ ] `supabase/tests/tasks.test.sql` -- one allow and one deny per policy, grant, CHECK, trigger, helper and the view, per the matrix. Prove each denied direct `UPDATE` for `status`, `owner_user_id`, `accepted_at`, `delegated_at`, `role_id`, `lifecycle`, `obsolete`, `event_id`. Prove the privilege model with a throwaway `security definer` function created inside the test transaction: the direct write is denied, the function succeeds.
- [ ] `src/types/database.ts` -- regenerate after the migration (`supabase gen types`).

**Acceptance Criteria:**
- Given the migration is applied on local Supabase, when `supabase test db` runs, then the whole suite passes, existing tests included.
- Given `pnpm lint`, `pnpm format:check` and `pnpm test`, then all pass and no hand-edit of `database.ts` is visible in the diff.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Layer | Verdict | Route | Evidence |
|---------|-------|---------|-------|----------|
| tasks_check_expected is stable, no row lock | blind | medium | patch | Two transactions can pass the check before either writes; `for update` closes it. |
| Blank title storable by direct UPDATE | blind, edge | low | patch | The organizer holds UPDATE (title); a non-blank CHECK is a one-line fix and cannot clash with 4.2 limits. |
| No-op UPDATE advances updated_at | edge | low | patch | Spurious concurrent_edit for another editor; `when (old.* is distinct from new.*)` fixes it. |
| Cancelled Event hiding never exercised | gap | medium | patch | No holder is a member of the cancelled Event's Role in the fixture, so the assertion cannot fail. |
| Owner not a joined member untested | edge | low | patch | Design Notes claim fail-closed; no test proves it. |
| Guest-only user has no guests row | edge | low | patch | Matrix row "Guest-only user" is covered only by an unrelated user. |
| Missing anon deny for tasks_check_expected and task_state; trigger fn revoke; tasks_update owner deny | blind, edge, gap | low | patch | AD-16 requires one allow and one deny per grant, function and policy. |
| Cross-Event Role link possible | blind, edge | low | rejected | role_id and event_id cannot be written directly (no INSERT, not in UPDATE grant); Story 4.2's definer function derives event_id from the Role. Fix would alter `roles`. |
| updated_at microsecond precision vs JS Date | blind, edge | medium | defer | Real risk for Story 4.2's Server Action; settled by passing the raw string. Not exercised by this story. |
| State columns not tied to lifecycle/owner; owner deleted keeps accepted_at | blind, edge | low | defer | A CHECK would make `ON DELETE SET NULL` fail on user deletion; belongs to the account-deletion and 4.7 release path. |
| Missing indexes on owner_user_id, created_by | blind | low | rejected | Rare user deletes; unlikely to be met. |
| task_state is_pending ignores lifecycle/obsolete | blind, edge | low | rejected | Matches the spec and FR-12 (owner exists or not); later stories extend the view. |
| tasks_update lets Organizer edit closed Tasks | edge | low | rejected | Speculative; 4.2 owns the edit rules. |
| tasks_assert_writable / check_expected use one error for unknown/hidden | blind, edge | low | rejected | Spec states unknown or hidden refuses; fail-closed by design. |
| Read-only rule restated in tasks_assert_writable | edge | low | rejected | Duplicates a two-line predicate; no divergence demonstrated. |
| database.ts diff also lists two functions | edge | low | rejected | Cosmetic wording in the spec. |
| Ended Event holder visibility unpinned | gap | low | rejected | Intended behaviour; no harm shown. |
| No ki-logg entry | blind | low | deferred to PR step | Required by AGENTS.md for the story PR; written with the commit step. |

## Design Notes

- A Task owner who sits outside the Role is still a joined Team member, so the policy's subqueries on `events` and `roles` resolve for them. A revoked owner not yet released (Story 4.7) loses sight, which fails closed.
- A cancelled Event is invisible to non-Organizers through `events_select_member`, so its Tasks are too; this matches Story 3.10.
- `clock_timestamp()` is used for `updated_at` so two updates in one transaction still differ.
- Title and description length limits are not set here; Story 4.2's Zod schema picks them and may add a CHECK then.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass.
- `supabase gen types typescript --local > src/types/database.ts` -- expected: diff shows `tasks` and `task_state` only.
- `pnpm lint && pnpm format:check && pnpm test` -- expected: pass.
