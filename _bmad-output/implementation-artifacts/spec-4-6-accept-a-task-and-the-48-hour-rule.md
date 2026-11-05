---
title: 'Accept a Task and the 48-hour rule'
type: 'feature'
created: '2026-11-05'
status: 'done'
baseline_commit: '3b26fe1a6b0a247d0c2a254166610f794f4ef769'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-5-delegate-a-task.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 4.5 counts every delegation as accepted, so the Organizer cannot tell a Task someone has taken from one nobody has seen, and a Task left unaccepted never surfaces.

**Approach:** One migration adds `tasks_accept`, changes `tasks_delegate` to clear `accepted_at`, and extends `task_state` with `accepted` and `stale_unaccepted`. The Task detail page gets an *Accept* banner for the owner; every row and the detail page show "Delegated to {name}" and a separate accepted signal. pgTAP, Vitest and one Playwright flow prove it.

## Boundaries & Constraints

**Always:**
- `tasks_accept(p_task_id, p_expected) returns timestamptz`: `security definer`, `search_path = ''`, granted to `authenticated`. Only the Task's current `owner_user_id = auth.uid()` may call it; everyone else gets `42501`, including the lead, the Organizer, a former owner after re-delegation and anyone on a Role-owned Task. Already accepted: return the current `updated_at`, write nothing (idempotent, checked before `tasks_check_expected`). Otherwise `tasks_assert_writable`, `tasks_check_expected`, the Task must be `active`, not `obsolete`, not `done` (else `22023`), then set `accepted_at = now()` and write one `accepted` log row (`from_user` null, `to_user` and `by_user` the caller).
- `tasks_delegate` is replaced (`create or replace`, same signature and grants): `accepted_at` is `now()` only when the new owner is the caller, else null; a self-delegation also writes an `accepted` row. Delegating to the current owner still writes nothing and does not restart the clock.
- `task_state` is extended at the end with `accepted` (owner set and `accepted_at` set) and `stale_unaccepted` (`delegated_at < now() - interval '48 hours'`, `accepted_at` null, `active`, not `obsolete`, not `done`). Exactly 48 hours is not stale. Both feed Story 4.9's filter and Epic 5's needs-attention list.
- The detail page shows an *Accept* banner to the owner while `accepted_at` is null, the Task is `active`, not `obsolete`, not `done` and the Event is writable. The call chains on `updated_at`; a stale one shows the shared concurrent-edit toast, any other failure `saveFailedToast`. A double click accepts once.
- Every Task row and the detail page show "Delegated to {name}" or "Not delegated", and beside it "Not yet accepted" or "Accepted" with icon and word (new `accepted` entry in the single status vocabulary). The owner shows as "You" or "Organizer" where no Team row names them. Only the Organizer additionally sees "Not yet accepted · {N} days" on a stale Task, N counted from `delegated_at`.
- Server Action `acceptTask` parses with Zod first and returns `Result`. No names or notes in log lines (AD-11). `database.ts` is regenerated, never hand-edited. The migration is timestamped after `20261104130000`. All text in `nb.json` and `en.json`.

**Never:**
- No *Decline*, no reminder or notification, no revoke hook, no Problem flag, no needs-attention list (Epic 5), no *My tasks* filter (4.9). Do not edit `tasks_set_status` (its `accept_first` rule already exists), `_bmad/` or planning documents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Owner accepts | Delegated, unaccepted, active | `accepted_at` set, one `accepted` row, Organizer sees "Accepted" | N/A |
| Repeat accept | Already accepted | Same `updated_at`, no second row | N/A |
| Non-owner calls | Lead, Organizer, former owner, Role-owned Task | Denied | `42501` |
| Task not open | Done, obsolete, dismissed or proposed | Refused | `22023` |
| Read-only Event | Cancelled or ended | Refused | `55000` |
| Stale edit | Old `updated_at` | Refused, toast | `40001` |
| Delegate to another | New owner is not the caller | `accepted_at` null, clock restarts | N/A |
| Self-delegate | New owner is the caller | Accepted at once, `accepted` row | N/A |
| 48-hour boundary | `delegated_at` 48h and 48h 1s ago | `stale_unaccepted` false, then true | N/A |
| Excluded states | Done, obsolete, dismissed, or accepted | `stale_unaccepted` false | N/A |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261104130000_tasks_delegate.sql` -- `tasks_delegate` body to copy and change; the `task_assignment_log` already allows kind `accepted`. `20261104120000_tasks_status.sql` holds the current `task_state` columns to repeat before the new ones, and the `accept_first` rule (do not edit).
- `supabase/tests/tasks_delegate.test.sql` -- fixtures to copy; its accepted-at checks (lines ~73, ~113) change. New `supabase/tests/tasks_accept.test.sql`.
- `src/modules/tasks/actions.ts`, `schemas.ts` (`lifecycleSchema` has the right shape), `actions.test.ts`.
- `src/lib/status.ts`, `messages/*.json` -- add `status.accepted`; `status.notAccepted` exists.
- `app/events/[eventId]/tasks/page.tsx`, `task-row.tsx` -- list needs Team names and `accepted`.
- `app/events/[eventId]/tasks/[taskId]/page.tsx`, `task-detail.tsx`, new `accept-banner.tsx` -- `waitingForAccept` and `nameOf` exist; follow `delegate-panel.tsx` for the client pattern.
- `e2e/tasks.spec.ts` -- the 4.5 delegation test and `psql` fixtures; `docs/ki-logg.md`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<ts>_tasks_accept.sql` -- `tasks_accept`, replaced `tasks_delegate`, extended `task_state` -- one file (AD-15)
- [x] `supabase/tests/tasks_accept.test.sql`, `tasks_delegate.test.sql` -- one allow and one deny per function, every Matrix row, boundary and re-delegation clock
- [x] `src/types/database.ts` -- regenerate with `supabase gen types`
- [x] `src/modules/tasks/actions.ts`, `actions.test.ts` -- `acceptTask`
- [x] `src/lib/status.ts`, `messages/nb.json`, `messages/en.json`, list page, `task-row.tsx`, detail page, `task-detail.tsx`, `accept-banner.tsx` -- banner, "Delegated to", accepted signal, stale days for the Organizer
- [x] `e2e/tasks.spec.ts` -- lead delegates, holder accepts, Organizer sees "Accepted"; a non-owner sees no banner
- [x] `docs/ki-logg.md` -- entry

**Acceptance Criteria:**
- Given local Supabase, when `supabase db reset && supabase test db`, `pnpm lint`, `pnpm format:check` and `pnpm test` run, then all pass.
- Given the generated types, then `database.ts` shows the new function and view columns and no hand edit.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Layer | Verdict | Route | Evidence |
|---------|-------|---------|-------|----------|
| Accepted signal shows on dismissed, obsolete and proposed rows, and detail disagrees with the row | edge, blind | medium | patch | Row hid it only for `done`; detail never. Both now show it only for an active, non-obsolete, non-done Task. |
| Organizer sees "Not yet accepted" twice on a stale Task | blind | low | patch | Signal and stale span sat side by side; now one signal carries the days. |
| nb reads "Delegert til Du" | blind | medium | patch | The picker label `you` was reused; new `youObject` ("deg"/"you"). |
| Organizer-only stale-days gate has no test | gap | medium | patch | Dropping `organizer &&` keeps every test green; e2e extended for holder and Organizer detail. |
| Delegate to the current owner leaves the clock untouched has no pgTAP | blind | medium | patch | A stated Always rule in the replaced function; test added. |
| Accepting lifts `accept_first` in `tasks_set_status` has no test | gap | low | patch | The story's intent; one pgTAP case added. |
| ki-logg entry has no review trail | blind | low | patch | Review outcome appended. |
| `tasks_accept` authorises on `owner_user_id` alone, so a revoked member who still owns a Task can accept | blind | low | defer | Revoke hook is Story 4.7, which releases owned Tasks; not caused by this story. |
| Two concurrent accepts: the loser gets 40001 | edge, blind | low | rejected | `tasks_check_expected` takes the row lock; the loser sees the toast and the refresh shows Accepted. Same AD-2 order as 4.4 and 4.5. |
| Retry offered for a call that cannot succeed | edge | low | rejected | Same pattern as `delegate-panel`; harm is one more error toast. |
| "You" or "Organizer" before the Team row | edge | false | rejected | The Organizer has no row, and a self row is still "You"; matches the spec. |
| Negative `daysSince` | edge | low | rejected | Stale needs more than 48 hours, so `delegated_at` is never ahead. |
| Self-delegating an owned, unaccepted Task writes nothing | edge | low | rejected | Picker excludes the current owner; the owner uses Accept. |
| Done rows hide the accepted signal | edge, gap | low | rejected | A Task cannot be done without acceptance for owners; consistent with the gating patch. |
| `daysSince` imported from a UI module into server pages | blind | false | rejected | `task-row.tsx` has no `"use client"`. |
| Names unreadable under RLS | blind | false | rejected | `is_team_member` lets joined holders read the Team's rows; pending invitees own no Task. |
| Duplicate `nameOf` logic on list and detail | blind | low | rejected | Two short closures; a helper adds an abstraction nobody asked for. |
| Log rows ordered by `created_at` may tie | gap | false | rejected | `created_at` defaults to `clock_timestamp()`, which advances inside a transaction. |
| Banner stays until revalidation; third click | blind | low | rejected | The server is idempotent and e2e proves one `accepted` row. |
| Accepted vs Godta vocabulary | blind | low | rejected | Status word and button label are different roles. |
| Banner, closed-Task and toast paths lack component tests | blind, gap | low | rejected | The gating is server-side booleans; DB and action tests cover the rules. |

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass
- `supabase gen types typescript --local > src/types/database.ts` -- expected: diff shows only the new function and columns
- `pnpm lint && pnpm format:check && pnpm test && pnpm test:e2e` -- expected: pass
