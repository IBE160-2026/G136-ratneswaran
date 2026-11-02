---
title: 'Story 3.9: Change or revoke a Role'
type: 'feature'
created: '2026-10-28'
status: 'done'
route: 'dispatch'
baseline_commit: '497be8fc7b2ca03af9d247859d26ad337354e8ed'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Organizer can invite people to a Role (3.6) and name its lead (3.8), but cannot take a person off a Role. Access can only be removed by the pending-row "Correct email" side effect.

**Approach:** A mutation function `events_revoke_role` deletes one `role_members` row, revokes its open invitation links and logs `revoked`. Team & Roles gets *Revoke* on each person row behind a confirmation dialog (UX-DR23). "Change a Role" is a revoke plus the existing invite form, so no separate function is built.

## Boundaries & Constraints

**Always:**
- `events_revoke_role(p_member_id uuid) returns void`: `security definer`, `search_path = ''`, executable by `authenticated` only (revoked from `public, anon`). It reads the row's Event and Role itself and authorises with `is_organizer`, never from a caller-supplied user id. An unknown row id looks the same as another Organizer's row (42501). A Role-holder revoking or assigning themselves is denied the same way.
- It locks the row (`for update`), refuses a cancelled or ended Event (55000, as `events_invite_to_role`), deletes the row, sets `revoked_at` on that person's open `role_holder` links for that Role, and appends one `role_membership_log` row: `action = 'revoked'`, `user_id` = the person, `actor_id = auth.uid()`.
- A switched-off Role can still be revoked. Other Role rows of the same person are untouched, and other holders of the Role keep theirs.
- The lead flag lives on the deleted row, so a revoked lead leaves the Role with no lead in the same transaction. The Team page shows "No lead yet" (3.8).
- The function carries a prose comment marking where Epic 4 adds `tasks_release_owner(role_id, user_id)` (AD-18). No commented-out code.
- RLS gives the access effect: `role_members_select` and `events_select_member` read `role_members`, so a person with no joined row no longer reads the Event or the Role's rows and the Event leaves *All events*. pgTAP proves it.
- Server Action `revokeRole({ eventId, memberId })`: Zod-parsed, returns `Result`, messages are next-intl keys in `messages/{en,nb}.json`, logs hold ids only.

**Decision (owner, 2026-10-28):** the role-revoked toast and redirect (UX-DR24) move to Story 3.10, which builds the holder's surfaces and the record, Organizer-name source and landing page they need. Until then a revoked person reaches the existing no-access page.

**Never:** a direct-write grant on `role_members`; a new log action (`revoked` exists); the Role-holder's own view (3.10); Task release (Epic 4); an Undo for Revoke (UX-DR23 asks for a dialog instead).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Revoke joined holder | Organizer, confirmed | row gone, links revoked, one `revoked` log, person's other Roles kept | — |
| Revoke pending invitee | row with `joined_at` null | same; the old link no longer works | — |
| Revoke the lead | row has `is_lead` | row gone; Role has no lead | — |
| Shared Role | two holders, one revoked | the other keeps access | — |
| Not Organizer | holder (self or other), stranger, anon | nothing changes | 42501 → `events.team.revoke.errors.forbidden`; anon has no execute |
| Unknown or stale row | id gone (double click, second tab) | nothing changes | 42501 → `…errors.unavailable` |
| Read-only Event | cancelled or ended | nothing changes; button hidden | 55000 → `events.settings.errors.readOnly` |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261026120000_role_members.sql` -- tables, `events_invite_to_role` (lines 143–179: Organizer/unknown-row refusal, read-only check, token revoke + `revoked` log on Correct email are the patterns to copy). `role_members` has no update or delete grant. Keep it that way.
- `supabase/migrations/20261028120000_role_lead.sql` -- `events_set_role_lead`: row locking and Epic 4 comment style.
- `supabase/tests/role_lead.test.sql`, `role_members.test.sql` -- pgTAP fixture style.
- `src/modules/events/actions.ts:184` -- `setRoleLead`: action pattern (Zod, `getClaims`, error-code mapping, `revalidatePath`).
- `app/events/[eventId]/team/people-list.tsx` -- `PersonRow`: add *Revoke* (not read-only, any Role state).
- `app/events/[eventId]/settings/event-actions.tsx` -- `Dialog` from `@base-ui/react/dialog`: the confirmation pattern and destructive button classes.
- `app/events/[eventId]/team/page.tsx` -- already lists members and history; "Access removed" label exists (`team.history.actions.revoked`).
- `e2e/team-lead.spec.ts`, `e2e/support.ts` -- seeding with psql and signed-in helpers.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20261029120000_revoke_role.sql` -- `events_revoke_role` as specified.
- [x] `supabase/tests/revoke_role.test.sql` -- attributes; every matrix row; revoked holder reads no `roles`, `role_members` or Event rows; Event absent from their list query; revoked lead leaves no lead; a person with a second Role keeps it; a holder revoking themselves is denied.
- [x] `src/types/database.ts` -- regenerate with `supabase gen types`.
- [x] `src/modules/events/actions.ts` + `actions.test.ts` -- `revokeRole`: rpc arguments, code mapping, invalid input.
- [x] `app/events/[eventId]/team/people-list.tsx` -- *Revoke* behind a `Dialog` ("Remove {name} from {role}?"), failure shown with `role="alert"`.
- [x] `messages/en.json`, `messages/nb.json` -- `events.team.revoke.*`.
- [x] `e2e/team-revoke.spec.ts` -- revoke a pending member and the lead; row and badge go, "No lead yet", Access history entry; cancel keeps the row; read-only hides the button.

**Acceptance Criteria:**
- Given a revoked holder, when they request the Event or its Role's rows, then nothing is returned.
- Given a person with no remaining Role, when they open *All events*, then the Event is gone from their list.
- Given a non-Organizer, when they call `events_revoke_role`, then it is denied (pgTAP).

## Implementation Notes

The function and the action follow `events_invite_to_role` and `setRoleLead`. A row that is gone before the action's pre-check reads as `unavailable`. Review added a joined holder to the pgTAP file, a pending guard on the dialog and focus on the People heading after a revoke.

## Spec Change Log

## Review Triage Log

### 2026-10-28 — Review pass
- verdicts: 20 findings — high 0, medium 3, low 9, false 8, maybe-false 0
- findings:
  - `[medium]` `[patch]` (edge) The "revoked invitee reads nothing" check starts from a pending row that never matched `events_select_member`, so it passes without the revoke — added a joined holder (Finn) who reads the Event before the revoke and nothing after, plus a log count update (plan 29).
  - `[medium]` `[patch]` (edge) No joined holder with a last Role is revoked in pgTAP — same fix as the row above.
  - `[medium]` `[patch]` (edge, blind) The dialog can be dismissed (Escape, backdrop) while the revoke runs, so a failure is never shown — `onOpenChange` ignores closing while pending.
  - `[low]` `[patch]` (blind) After a revoke the row and the dialog's trigger unmount, so focus falls to `body` (WCAG 2.4.3) — focus goes to the People heading, as after Correct email.
  - `[low]` `[reject]` (verification-gap, edge, blind) A revoke racing another tab's between the action's pre-check and the rpc shows "forbidden" instead of "unavailable" — needs two revokes of one row inside a few milliseconds; the fix adds a function-level code or a second error path.
  - `[low]` `[reject]` (edge) A non-Organizer whose pre-check finds no row gets "unavailable" instead of "forbidden" — the UI never offers Revoke to them, and the function still refuses with 42501.
  - `[false]` `[reject]` (edge, blind) `user_id is null` as the "row gone" signal fails for a nullable `user_id` — `role_members.user_id` is `not null` (migration `20261026120000`), so the case cannot occur.
  - `[false]` `[reject]` (edge) The first select is unlocked, so the row can vanish before the second — the second select takes `for update` and a vanished row raises 42501; the unlocked read only supplies the Event id for the Organizer check.
  - `[low]` `[reject]` (edge) A thrown network error from the query or rpc reaches the client — same shape as `setRoleLead` and `inviteToRole`; `callSafely` wraps the call in the client.
  - `[low]` `[reject]` (blind) The row-belongs-to-Event check lives in the action, not the function — the function derives the Event from the row and authorises on it, so a caller cannot reach another Event's row; the action check only keeps the URL honest, as in `inviteToRole`.
  - `[low]` `[reject]` (blind) The read-only rule is repeated a third time — copying keeps `events_invite_to_role` untouched; a shared helper edits 3.6's function.
  - `[low]` `[reject]` (blind) No pgTAP for a consumed token, a token of another kind or a cross-Organizer row — the update clause is copied from Correct email; the cross-Organizer refusal is the stranger case (`is_organizer` false).
  - `[low]` `[reject]` (blind) e2e never signs in as the revoked person or revokes a joined lead — pgTAP proves the read denial for a joined and a pending holder; the e2e covers the Organizer's UI.
  - `[false]` `[reject]` (blind) The copy "any invitation link stops working" overstates — open links are revoked, consumed links are already spent.
  - `[false]` `[reject]` (blind) `events.settings.errors.readOnly` may not resolve through `tRoot` — the root translator takes full keys and the settings tests use the same key.
  - `[false]` `[reject]` (blind) The diff includes a Story 3.8 log, `deferred-work.md` and `sprint-status.yaml` — they are process files for this branch; the log is a prettier fix of an earlier commit.
  - `[false]` `[reject]` (blind) No `docs/ki-logg.md` entry — delivered at PR time.
  - `[low]` `[reject]` (blind) Dialog classes are copied and no shared component exists — `event-actions.tsx` keeps its dialog private too; extraction edits 2.7's file.
  - `[false]` `[reject]` (blind) "Reload the page" in `unavailable` is wrong because `revalidatePath` runs — the message shows when the call failed, so no revalidation ran.
  - `[low]` `[reject]` (blind) The Organizer-also-a-holder case is untested — `events_invite_to_role` returns `self` for the Organizer's own email, so such a row cannot be created.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass
- `pnpm lint && pnpm format:check && pnpm test` -- expected: pass
- `pnpm test:e2e --workers=2` -- expected: team-revoke and existing specs pass
