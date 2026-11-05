---
title: 'Role lead and revoke hooks'
type: 'feature'
created: '2026-11-05'
status: 'done'
baseline_commit: '1272ac2029d0cd91ebe2dcfb544124bbe4b5b592'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-6-accept-a-task-and-the-48-hour-rule.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Setting a Role lead leaves the Role's unowned Tasks unowned, and revoking a holder leaves their Tasks owned by someone who no longer belongs to the Role, who still reads them through `owner_user_id` (S2).

**Approach:** One migration adds two system functions, `tasks_assign_role_owned_to_lead` and `tasks_release_owner`, and replaces `events_set_role_lead` and `events_revoke_role` (same signatures and grants) with bodies that call them in the same transaction. The "Epic 4 adds" notes are not carried into the new bodies. pgTAP proves the moves and the loss of access.

## Boundaries & Constraints

**Always:**
- Both hooks are `security definer`, `search_path = ''`, `REVOKE EXECUTE … FROM public, anon, authenticated`; only the two events functions call them (AD-1, AD-5). The caller is never passed as a user id: the actor is `auth.uid()`, the lead and the revoked user come from the `role_members` row.
- `tasks_assign_role_owned_to_lead(p_role_id)`: every `active`, non-`obsolete`, non-`done` Task of the Role with `owner_user_id` null gets `owner_user_id` = the new lead, `delegated_at = now()`, `accepted_at` null, and one `delegated` log row (`from_user` null, `to_user` the lead, `by_user` the actor). Tasks owned by anyone, the previous lead included, are not moved. A pending (not yet joined) lead receives them too, as the Organizer may already delegate to a pending member. It emits exactly one `task_assigned` to the lead through `notifications_emit` (subject the Role id) when at least one Task moved and the Event is published; none otherwise.
- `events_set_role_lead` calls it only after a real change to a new lead. Setting the same lead again, or clearing the lead, returns early and calls nothing, so a repeat moves nothing and emits nothing.
- `tasks_release_owner(p_role_id, p_user_id)`: every Task of that Role owned by the user, whatever its status or lifecycle, gets `owner_user_id`, `delegated_at` and `accepted_at` set to null, with one `released` log row (`from_user` the user, `to_user` null, `by_user` the actor). If the user then holds no `role_members` row in the Event, every Task in the Event they own is released the same way. This second step is skipped when the user is the Event's `organizer_id`.
- `events_revoke_role` calls it after deleting the row. A revoked lead's Tasks are released by the same call; the lead flag goes with the row (Story 3.9).
- After a revoke, the user reads no Task of the Event through `tasks_select` and every `tasks_*` write is denied with `42501`, including a Task they owned in another Role. Non-Organizer calls to `events_set_role_lead` and `events_revoke_role` are still denied with `42501`, and calling either hook as `authenticated` fails.
- `database.ts` is regenerated, never hand-edited. The migration is timestamped after `20261105120000`. Old migrations are not edited; the replaced bodies drop the notes.

**Never:**
- No UI, no Server Action, no new notification kind, no change to `tasks_delegate`, `tasks_accept`, `tasks_set_status` or `task_state`. No log line or payload with names or Task text (AD-11). Do not edit `_bmad/` or planning documents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New lead | Role has open Role-owned Tasks, Event published | Those Tasks owned by the lead, unaccepted, `delegated` rows, one `task_assigned` | N/A |
| Mixed Role | Also Tasks owned by a person, `done`, `obsolete`, `dismissed` or `proposed` | Only the open Role-owned ones move | N/A |
| Lead replaced | Previous lead owns Tasks | Their Tasks stay with them | N/A |
| Repeat or clear | Same lead again, or null member | No call, nothing moves, no notification | N/A |
| Draft Event | Lead set | Tasks move, no notification | N/A |
| Revoke holder | Owns Tasks in this Role, holds another Role | This Role's Tasks released, `released` rows; the other Role's stay | N/A |
| Revoke last Role | Owns Tasks in several Roles | All their Tasks in the Event released | N/A |
| Revoked reads | Former holder or lead | Sees no Task of the Event; writes denied | `42501` |
| Non-Organizer | Lead or holder calls either function | Denied | `42501` |
| Hook called directly | `authenticated` calls a hook | Denied | `42501` |
| Read-only Event | Cancelled or ended | Both functions refuse as before | `55000` |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261028120000_role_lead.sql`, `20261029120000_revoke_role.sql` -- bodies to copy into `create or replace`; the note lines sit where the calls go. Do not edit these files.
- `supabase/migrations/20261105120000_tasks_accept.sql`, `20261104130000_tasks_delegate.sql` -- `task_assignment_log` (kinds `delegated`, `accepted`, `released` exist), the `notifications_emit` stub and `recipient_spec`, the `array[row('user', id)::public.recipient_spec]` call shape.
- `supabase/migrations/20261103120000_tasks.sql` -- `tasks_select` (owner reads while published and the Role is active); triggers `tasks_read_only`, `tasks_touch`, and `tasks_guest_program_organizer` fire on update, so check the hooks pass them.
- `supabase/tests/role_lead.test.sql`, `revoke_role.test.sql`, `tasks_accept.test.sql` -- fixtures to copy. New `supabase/tests/tasks_role_hooks.test.sql`.
- `docs/ki-logg.md` -- entry in the existing format.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<ts>_tasks_role_hooks.sql` -- two hooks, replaced `events_set_role_lead` and `events_revoke_role` -- one file (AD-15)
- [x] `supabase/tests/tasks_role_hooks.test.sql` -- every Matrix row, one allow and one deny per function and grant, revoked-reader and write-denied checks, the lead flag cleared on revoke
- [x] `src/types/database.ts` -- regenerate with `supabase gen types`
- [x] `docs/ki-logg.md` -- entry

**Acceptance Criteria:**
- Given local Supabase, when `supabase db reset && supabase test db`, `pnpm lint`, `pnpm format:check` and `pnpm test` run, then all pass, including the existing `role_lead` and `revoke_role` tests.
- Given the generated types, then `database.ts` shows the two hooks and no hand edit.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Layer | Verdict | Route | Evidence |
|---------|-------|---------|-------|----------|
| No test for a new lead on a published Event with nothing to move | blind | medium | patch | Emitting when zero Tasks moved would pass every test; case added. |
| Organizer revoked from the Role holding their own Task is untested | blind | medium | patch | Only the Event-wide skip was proven; role-level release for the Organizer now tested. |
| Second notification asserted by count only | blind | low | patch | Now compares kind, subject and recipient. |
| ki-logg lacks review trail and the link to the Story 4.6 deferral | blind | low | patch | Entry extended. |
| Released Tasks stay unowned in a Role that has a lead | edge | low | rejected | AD-18 and the story say they return to the Role; the Organizer or lead delegates. |
| Release clears `accepted_at` on done Tasks | edge | low | rejected | The story says every Task owned by the user, whatever its status; access must go (S2). |
| Pending lead or member with null `user_id` is rejected or skipped | edge | false | rejected | `role_members.user_id` is `not null`; the `v_lead is null` test is the pre-existing 3.8 body. |
| Write denial after revoke runs on an already released Task | edge, gap | low | rejected | The `tasks_select` count pins the release; denial there follows from no Team row. |
| Clear case does not isolate the hook | edge | low | rejected | A clear returns before the call; repeat and clear assert nothing moved. |
| Status mismatch between spec and sprint-status | blind | false | rejected | Sprint status is set to review at the end, as in 4.6. |
| Min vurdering is NIL | blind | false | rejected | Owner's field, same as neighbouring entries. |
| Test depends on the stub signature | blind | low | rejected | Signature matches; Story 3.1 changing it should fail this test loudly. |
| Silent release, no notification | blind | low | rejected | Spec Never: no new notification kind. |
| Replaced bodies may have drifted | blind | false | rejected | Diffed against the 3.8 and 3.9 migrations: only the note lines changed; no later migration touches them. |
| Set-lead only tested on one Role | gap | false | rejected | Reviewer found no path that differs by Role. |

## Design Notes

Why the Organizer skip: an Organizer who is also revoked from a Role they held keeps full access through `is_organizer`, so releasing their Tasks Event-wide would surprise them and protect nothing.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass
- `supabase gen types typescript --local > src/types/database.ts` -- expected: diff shows only the two new functions
- `pnpm lint && pnpm format:check && pnpm test` -- expected: pass
