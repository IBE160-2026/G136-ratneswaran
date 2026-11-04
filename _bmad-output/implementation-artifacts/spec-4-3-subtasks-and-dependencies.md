---
title: 'Subtasks and dependencies'
type: 'feature'
created: '2026-11-03'
status: 'done'
baseline_commit: 'e6ee5ed8850226c2cfc8c89c2fe77ad31b7bc510'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-2-create-edit-and-open-a-task.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Task cannot be broken down, and nothing says what it waits for. The order of work is invisible and blocked work looks like any other.

**Approach:** One migration adds `parent_task_id`, the table `task_dependencies`, the functions `tasks_promote_subtask`, `tasks_move_to_role`, `tasks_add_dependency` and `tasks_remove_dependency`, and extends `tasks_create`, `tasks_set_lifecycle` and `task_state`. The Task detail page gets *Subtasks* and *Depends on* cards, and a Task row shows when it is blocked. pgTAP, Vitest and one Playwright flow prove it.

## Boundaries & Constraints

**Always:**
- `tasks.parent_task_id uuid references tasks(id)`. A trigger on insert and on update of it requires: the parent is in the same Role and Event, the parent is `active`, the parent has no parent (one level), and the row has no Subtasks of its own. Role and Event are not directly writable, so a Subtask never changes Role.
- `tasks_create` gains `p_parent_id uuid default null` (drop and recreate; update the grant and `database.ts`). With a parent, the Role comes from the parent. Who may add a Subtask: the Organizer, the lead of the Role, or the joined holder who owns the parent. Without a parent, the rules of Story 4.2 are unchanged. The repeat-call rule still holds.
- `tasks_promote_subtask(p_task_id, p_expected)`: Organizer or lead; sets `parent_task_id` null; idempotent. `tasks_move_to_role(p_task_id, p_expected, p_role_id)`: Organizer only; refuses a Subtask (`22023`), a Task with Subtasks, dependencies or dependents (`55006`), an inactive target Role or one in another Event; sets the new Role and resets `owner_user_id`, `delegated_at` and `accepted_at` to null. Both are `security definer`, `search_path = ''`, granted to `authenticated`, and call `tasks_assert_writable` and `tasks_check_expected` first.
- `task_dependencies(task_id, depends_on_id)`: both reference `tasks(id)` with `on delete cascade`; primary key is the pair; CHECK `task_id <> depends_on_id`. RLS select shows a row when the caller can see both Tasks (the policy reads `tasks` as the caller). No direct write for `authenticated`.
- `tasks_add_dependency(p_task_id, p_depends_on_id)` and `tasks_remove_dependency(...)`: Organizer, lead of the Role, or the joined holder who owns `p_task_id`. A trigger requires both Tasks in the same Role and Event and both `active`, and rejects a cycle by walking the graph under `pg_advisory_xact_lock` keyed on the Event. A repeat add or remove is a no-op. A pgTAP test with two connections adding A→B and B→A at once shows exactly one succeeds (reuse the pattern of an existing two-connection test if one exists; otherwise a Vitest or script test against local Supabase).
- `task_state` is extended with `create or replace view`, new columns appended: `blocked`, `blocked_by` (the first open blocker's id, earliest deadline then id), `blocked_by_count` (the other open blockers) and `blocks_count` (active Tasks that wait on this one). A blocker is open when `active`, not `obsolete`, not `done`. A dismissed, proposed or obsolete Task never blocks anything.
- `tasks_set_lifecycle` refuses a dismiss while the Task has an active Subtask or an active dependent (`55006`, message `has_open_children`). `tasks_restore` refuses a Subtask whose parent is not active (`22023`). A dismissed Task's own dependency rows stay.
- Server Actions parse with Zod first and return `Result`; add `55006` to the error map with its own message key. No Task text in log lines.
- Detail page: a *Subtasks* card (list, inline add by title and deadline, Subtask rows open their own page), a *Depends on* card (list, add from the Role's other active Tasks, remove) and, on a Subtask, a "Part of {parent}" link plus *Promote to Task*. A Subtask is not listed at the top level of the Tasks list; its parent row shows the Subtask count. A blocked row has the blocked tint, a Lucide icon and "Waits for: {blocker}" (with "+N" for the rest), never red and never colour alone; a blocker row shows "Blocks N tasks" (UX-DR4, UX-DR11). Blocked looks different from the Problem flag of Story 4.8.
- No status rollup: a parent can be Done with open Subtasks, noted as a deliberate simplification in the migration header.
- Text only in `messages/nb.json` and `messages/en.json`. `src/types/database.ts` is regenerated, never hand-edited. The migration is timestamped after `20261103130000`.

**Never:**
- No status change, owner, delegation or history; Stories 4.4+ own them.
- No UI for `tasks_move_to_role`; it is a function only in this story.
- No Timeline ordering; Epic 5 computes it per request (AD-13).
- No new `security definer` kind beyond AD-5; no secret key; no notification.
- Do not edit `_bmad/` or planning documents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Owner adds a Subtask | Holder owns the active parent | Subtask in the parent's Role | N/A |
| Non-owner holder, other Role's holder | Add a Subtask or dependency | Denied | `42501` |
| Nested Subtask | Parent is itself a Subtask | Rejected | `23514` |
| Parent not active | Parent dismissed | Rejected | `23514` |
| Parent in another Role | Direct or function call | Rejected | `23514` |
| Move a Subtask or a Task with links | `tasks_move_to_role` | Refused | `22023` / `55006` |
| Move a plain Task | Organizer, active target Role | New Role; owner, `delegated_at`, `accepted_at` null | N/A |
| Promote | Lead promotes a Subtask | Top-level Task; repeat is a no-op | N/A |
| Dependency across Roles or on a dismissed Task | `tasks_add_dependency` | Rejected | `23514` |
| Self or cycle | A→A, or B→A after A→B | Rejected; two connections race: one wins | `23514` |
| Blocked state | A depends on open B | `blocked`, `blocked_by` = B; B shows `blocks_count` 1 | N/A |
| Blocker ends | B done, obsolete or dismissed | A unblocked at once | N/A |
| Dismiss with open links | Active Subtask or dependent | Refused, message shown | `55006` |
| Restore under dismissed parent | Subtask | Refused | `22023` |
| Stale edit | Old `updated_at` | Refused, concurrent-edit toast | `40001` |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261103130000_tasks_create_edit.sql` -- `tasks_create` (drop and recreate with `p_parent_id`), `tasks_set_lifecycle` (marked refusal site, "Story 4.3 refuses here"), `is_role_lead`, `tasks_resolve_deadline`; reuse, do not edit.
- `supabase/migrations/20261103120000_tasks.sql` -- `task_state` view, `tasks_assert_writable`, `tasks_check_expected`, RLS policy to model `task_dependencies` on.
- `supabase/migrations/20261030120000_holder_scoped_view.sql` -- `holds_role`, `is_team_member`; the owner test is `tasks.owner_user_id = auth.uid()` with a joined membership.
- `supabase/tests/tasks_create_edit.test.sql` -- pgTAP fixtures to copy; new file `supabase/tests/tasks_subtasks_dependencies.test.sql`.
- `src/modules/tasks/actions.ts`, `schemas.ts` -- `refuseTask`, `caller`, Zod and `Result` pattern to extend.
- `app/events/[eventId]/tasks/page.tsx`, `task-row.tsx`, `task-form.tsx`, `[taskId]/page.tsx`, `[taskId]/task-detail.tsx` -- list, row and detail to extend; the detail page computes `canEdit`.
- `e2e/tasks.spec.ts` -- Playwright style and fixtures.

## Tasks & Acceptance

**Execution:**
- [ ] `supabase/migrations/<ts>_tasks_subtasks_dependencies.sql` -- column, triggers, table, policy, functions, view, lifecycle refusals, header note -- one file (AD-15)
- [ ] `supabase/tests/tasks_subtasks_dependencies.test.sql` -- one allow and one deny per function, policy, trigger and CHECK in the matrix, including the two-connection cycle race
- [ ] `src/types/database.ts` -- regenerate with `supabase gen types`
- [ ] `src/modules/tasks/schemas.ts`, `actions.ts` + Vitest -- add Subtask, promote, add and remove dependency, new error mapping
- [ ] `app/events/[eventId]/tasks/**`, `messages/nb.json`, `messages/en.json` -- cards, blocked row, parent link, Subtask count
- [ ] `e2e/tasks.spec.ts` -- add a Subtask, add a dependency and see Blocked, finish the blocker's removal, dismiss refused with links; a holder who is not the owner cannot add
- [ ] `docs/ki-logg.md` -- entry

**Acceptance Criteria:**
- Given local Supabase, when `supabase test db`, `pnpm lint`, `pnpm format:check` and `pnpm test` run, then all pass.
- Given the generated types, then `database.ts` shows the new column, table and functions and no hand edit.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Layer | Verdict | Route | Evidence |
|---------|-------|---------|-------|----------|
| `blocks_count` counts Done and obsolete dependents | blind, edge | medium | patch | The view counts every active dependent, so a blocker shows "Blocks N tasks" for work that is finished and waits for nothing. |
| Parent/dependency checks read lifecycle before any lock | blind, edge | medium | patch | A concurrent dismiss can commit between the check and the write, leaving an active Subtask or dependent under a dismissed Task; two concurrent parent updates can also nest two levels. Take the Event advisory lock first in `tasks_check_parent`, `tasks_check_dependency` and the dismiss path. |
| Race e2e hardcodes the container name and relies on 600 ms sleeps | blind, edge | medium | patch | It fails on another project id and can pass or fail without proving the lock. Find the container by prefix and hold the first transaction open with `pg_sleep`. |
| No test that a Done or dismissed waiting Task shows no "Waits for" | gap | medium | patch | Dropping `status !== "done"` from either page passes every test. |
| Restore failure toast has no test; 22023 on restore maps to the generic message | gap, edge | medium | patch | Reverting `restore-button.tsx` to the old translator breaks the toast unnoticed; the user restoring under a dismissed parent sees "invalid input". |
| `hasLinks` text says "finish those first" and is shared with the move refusal | blind | low | patch | Finishing a Subtask does not unblock the dismiss (spec: active means lifecycle). Reword neutrally: dismiss or unlink them. |
| Done Subtasks and dependents still block a dismiss | blind, edge | low | rejected | The spec and `epics.md` say "active"; a finished child is dismissed first. |
| Restoring a Task leaves an active Task depending on a dismissed one | blind, edge | low | rejected | A dismissed Task never blocks (spec), so the stale edge has no effect. |
| Dependency between a parent and its own Subtask | edge | low | rejected | Allowed by the spec; the blocked state ends when the other Task is done. |
| Null `p_depends_on_id` gives 23502 and the generic message | edge | low | rejected | No caller sends null; the Zod schema requires a uuid. |
| Owner removes a dismissed Task's dependency | edge | low | rejected | "Rows stay" means no automatic removal; the owner may still unlink. |
| Hard delete of a parent with Subtasks fails the FK | edge | low | rejected | No user or job hard-deletes a Task; an Event delete cascades all rows. |
| `canLink` / stale candidate / blank blocker title | edge | low | rejected | The database refuses the call and the toast shows; no data is wrong. |
| `tasks_promote_subtask` repeat skips `tasks_check_expected` | edge | low | rejected | Idempotent by design, as the spec says for a repeat. |
| Race test is not in pgTAP | edge | low | rejected | pgTAP runs in one transaction; the spec allows this fallback. |
| `tasks_move_to_role` has no action or UI | blind | low | rejected | The spec says function only. |
| `roleId` sent from the client; Subtasks date-only; form reset effect; className space; peers load; process notes | blind | low | rejected | Cosmetic or stated in the spec; no harm named. The epic text itself records the no-rollup simplification, so no course correction. |
| More tests (task_state RLS, three blockers, remove on a read-only Event) | blind | low | rejected | The view's RLS is covered since Story 4.1; the rest are variations of covered rules. |
| Subtasks hidden from their owner's list | blind | low | defer | The spec hides Subtasks at top level; Story 4.9 (*My tasks*) lists a person's own Tasks including Subtasks. |

## Design Notes

- Dependents block only while open, so `blocked` is computed in the view and never stored (AD-13, epic context).
- Pass `updated_at` back as the raw string, as in Story 4.2.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass
- `supabase gen types typescript --local > src/types/database.ts` -- expected: diff shows only the new column, table and functions
- `pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e` -- expected: pass
