---
title: 'Story 7.8: Delete guest data'
type: 'feature'
created: '2026-11-10'
status: 'done'
baseline_revision: 'aed920f74c8e4dce2c6bf2714be33a081696ca3e'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-5-guest-dashboard.md'
warnings: ['oversized']
deferred:
  - summary: >-
      A user who is both a Guest and a Role-holder of only one Event, and has never chosen a password, stays in auth.users after events_delete.
    evidence: |-
      events_delete runs the guest loop while role_members still exist, so guests_is_guest_only is false and the user is kept; the Event delete then cascades the Role away. Invited Role-holders were left behind the same way before this story. Fixing it needs an owner decision on who owns that cleanup.
    location: >-
      supabase/migrations/20261110130000_guests_delete_guest_data.sql
    severity: low
  - summary: >-
      The Privacy notice still says Delete my data removes food, hotel and requests, which Core does not collect, and the dialog does not say the account is deleted and the Guest signed out.
    evidence: |-
      privacy.deletion.body comes from Epic 1 and names Target data. The dialog lists name, email, answer, plus-one and other needs. Planning documents own the wording.
    location: >-
      messages/en.json
    severity: low
  - summary: >-
      The user-row lock that stops two concurrent deletions leaving an orphan user is not tested with two connections.
    evidence: |-
      pgTAP runs in one transaction, so every call is sequential; removing the `for update` on auth.users passes all tests. A race test needs two sessions.
    location: >-
      supabase/migrations/20261110130000_guests_delete_guest_data.sql:23
    severity: low
---

<intent-contract>

## Intent

**Problem:** A Guest cannot delete what Arrangly holds about them, and the Organizer's removal of a guest (`guests_remove`) and deletion of an Event (`events_delete`) leave the guest's auth user and tokens behind. Both functions carry a comment that waits for Epic 7.

**Approach:** One mutation function, `guests_delete_guest_data(guest_id)`, removes a guest's row, contact, RSVP and guest tokens in one transaction and deletes the auth user in SQL when the person is guest-only and a Guest of no other Event. *Delete my data* on the Guest Dashboard calls it through a Server Action; `guests_remove` and `events_delete` route through the same function.

## Boundaries & Constraints

**Always:**
- `public.guests_delete_guest_data(p_guest_id uuid)` is `security definer`, `search_path = ''`, revoked from `public` and `anon`, granted to `authenticated` (AD-5 mutation function). It authorises with `is_guest_self(p_guest_id)` or `is_organizer(<the guest row's event_id>)`. An unknown, already deleted or someone else's guest id changes nothing and raises no error. Its result tells the caller three things apart: data deleted, data deleted and the auth user with it, nothing to delete.
- One transaction: lock the guest row, delete the guest's `invite_tokens` rows of kind `guest` for that Event and user, delete the `guests` row (contact and RSVP go by cascade), then delete the `auth.users` row only if `guests_is_guest_only(user)` and the user has no `guests` row in any other Event. Serialise two deletions of the same user (lock the auth user row before that check) so neither leaves an orphan user. No secret key, no Admin API.
- Purge hooks: none of `tasks_purge_guest`, `notifications_purge_user_event`, `ai_purge_user` exists in Core and no AI usage table exists yet. The function calls the hooks that exist (none today) and marks, in one comment, the place where Epic 6 and Epic 8 add theirs with `create or replace`. Hooks stay revoked from `authenticated`.
- A Guest may delete in any Event state, including cancelled and ended. `guests_remove` keeps its own Organizer and read-only checks and then calls the function instead of its own `delete`. `events_delete` calls it for every guest of the Event before deleting the Event, in the same transaction. `events_cancel` is unchanged: a cancelled Event keeps its guests so they can read the cancellation.
- Server Action `deleteMyData({ eventId })` in `src/modules/guests`: Zod first, `getClaims()`, find the guest id from `guests` where `event_id` and `user_id = claims.sub` under the user's session (never from input), call the function, return the project `Result`. When the auth user was deleted, clear the session cookies. Logs carry only Event id, user id and error code.
- Guest Dashboard (`app/rsvp/[eventId]`): *Delete my data* is shown whenever the dashboard is shown, including the cancelled and ended views. It opens a confirmation dialog (existing `Dialog`) that names the Event and says what is removed (name, email, answer, plus-one, other needs) and that it cannot be undone. On success the page shows "Your data has been deleted." with focus on the `h1` and no further actions. When there was nothing left to delete it shows "Your data is already deleted." A press after the session is gone shows the already-deleted text only when the server can prove this browser deleted the data (for example a short-lived `httpOnly` marker set by the first deletion); an expired session without that proof gets the existing no-session text. Failure keeps the dialog open with a *Retry*-able error. 44px targets, works at 375px and 320 CSS px, warm voice.
- Privacy notice gains one sentence: text a team member wrote about a Guest in a Task is not found by *Delete my data*; ask the Organizer.
- pgTAP proves each row of the matrix, plus: every foreign key in `public` that references `public.guests` or `auth.users` is `CASCADE` or `SET NULL` (query `pg_constraint`, no `NO ACTION`, no `RESTRICT`).
- All copy in `messages/en.json` and `messages/nb.json` (natural Bokmål), key parity kept. Regenerate `src/types/database.ts`; never hand-edit it.

**Never:**
- No secret key, no Admin API, no email, no notification. No retention job (Story 7.9), no food / hotel / request data (Target). No new table or column. No change to RLS policies or to `events_cancel`. No purge hook stubs for later epics. No edits to `_bmad/`, planning artifacts or `docs/` except `docs/ki-logg.md`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Guest-only, one Event | Guest calls for own guest id | `guests`, `guest_contacts`, `rsvps`, guest `invite_tokens` rows gone; `auth.users` row gone | none |
| Guest of two Events | same call | only this Event's rows gone; user and the other Event's rows stay | none |
| Guest with password, identity, Role or own Event | same call | this Event's guest data gone; user stays | none |
| Another guest's id | Guest A calls with Guest B's id | nothing changes, no error | none |
| Second call | same id again | nothing changes, "nothing to delete" result | none |
| anon | direct call | denied (42501) | none |
| Organizer removes a guest | `guests_remove` | same deletion, incl. guest-only user | 42501 / 55000 as today |
| Organizer of another Event | calls with this guest's id | nothing changes | none |
| Event deleted | `events_delete` | no `guests`, `rsvps`, `invite_tokens` row of the Event remains; guest-only users gone; a guest of another Event survives | none |
| Cancelled or ended Event | Guest deletes | deleted | none |
| Guest with no link yet (`user_id` null) | Organizer removes | rows gone, no user touched | none |
| Server failure | RPC error | dialog stays, error shown | *Retry* |

</intent-contract>

## Code Map

- `supabase/migrations/20261107120000_guest_links.sql` -- `is_guest_self` (:32), `invite_tokens_revoke_guest` (:83), `guests_is_guest_only` (:146, revoked system function; callable from a definer function), latest `guests_remove` (end of file; replace its `revoke + delete` with the call), `guests_link_preview` (a token without its guest row reads `invalid`).
- `supabase/migrations/20261019210000_events_cancel_delete.sql` -- `events_delete` with the "Epic 7: single place that purges guest data" comment; `create or replace` it in the new migration.
- `supabase/migrations/20261025120000_invite_tokens.sql:12` -- `invite_tokens.user_id` cascades from `auth.users`; `20261108120000_guests_rsvp.sql:17` -- `rsvps` cascades from `guests`; `20261020090000_guests.sql:22` -- `guest_contacts` cascades.
- Read AD-2, AD-3, AD-5, AD-11 in `_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md` before writing SQL.
- `supabase/tests/guest_links.test.sql`, `guests_rsvp.test.sql`, `guests_update_remove.test.sql` (plan 34), `events_cancel_delete.test.sql` (plan 38) -- actor setup patterns; extend or add assertions where `guests_remove` / `events_delete` behaviour changes.
- `app/rsvp/[eventId]/page.tsx` -- loads guest, Event, RSVP under the Guest's session; no-claims branch reads `readGuestLink()`. `rsvp-flow.tsx:73-110` -- the dashboard / closed view where the button belongs.
- `src/modules/guests/rsvp-actions.ts` -- the action pattern to copy (`refuse`, `getClaims`, log shape); `rsvp-actions.test.ts` -- its Vitest mocks.
- `src/components/ui/dialog.tsx` -- house dialog; `src/modules/auth/actions.ts:184` -- `signOut` usage.
- `app/privacy/page.tsx`, `messages/*.json` `privacy.deletion`, `rsvp.*` -- copy.
- `e2e/rsvp.spec.ts`, `e2e/guests.spec.ts`, `e2e/cancel-delete.spec.ts`, `e2e/support.ts` -- Guest path helpers.
- `node_modules/next/dist/docs/` -- read the relevant guide before using a Next API not yet used in this repo (cookies in a Server Action).

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/<timestamp>_guests_delete_guest_data.sql` -- the function with grants; `create or replace` `guests_remove` and `events_delete` to route through it -- AD-5, AD-11.
- `supabase/tests/guests_delete_guest_data.test.sql` -- every matrix row at the database, the grants, and the foreign-key assertion; adjust `guests_update_remove.test.sql` / `events_cancel_delete.test.sql` if their counts change -- AD-16.
- `src/types/database.ts` -- regenerate with `supabase gen types`.
- `src/modules/guests/delete-actions.ts` + `delete-actions.test.ts` -- `deleteMyData`: invalid input, no session, guest id derived from claims, the three results, RPC error, log shape.
- `app/rsvp/[eventId]/rsvp-flow.tsx` (+ a small dialog component beside it if clearer), `page.tsx` -- button, dialog, deleted and already-deleted states.
- `app/privacy/page.tsx`, `messages/en.json`, `messages/nb.json` -- dialog copy, the two end states, the privacy sentence.
- `e2e/rsvp.spec.ts` -- at 375px: a guest-only Guest deletes, sees "Your data has been deleted.", the link no longer opens the dashboard and the Organizer's Guests tab no longer lists them; a second press in another open page shows "Your data is already deleted."; a Guest of a cancelled Event can still delete.
- `docs/ki-logg.md` -- the story's entry in the existing format, verdict left for the owner.

**Acceptance Criteria:**
- Given a Guest on the Guest Dashboard, when they choose *Delete my data* and confirm in a dialog that names the Event and what is removed, then their guest row, contact, RSVP and tokens are gone, the page shows "Your data has been deleted." and, for a guest-only user of this Event alone, the auth user and session are gone.
- Given a Guest who is also a Guest elsewhere or holds an account, a Role or an Event, when they delete, then only this Event's guest data is removed and they can still sign in or open their other Event.
- Given the Organizer removes a guest or deletes the Event, when it commits, then the same function has run for each guest and no guest-only auth user of that Event alone remains.
- Given the function was already run for a guest, when it runs again from either side, then it succeeds without change and an open Guest page shows "Your data is already deleted."

## Spec Change Log

## Review Triage Log

### 2026-11-11 — Review pass
- verdicts: 34 findings — high 0, medium 5, low 27, false 2, maybe-false 0 (blind, edge, gap and intent layers; an earlier interim count of 30 was a miscount)
- findings:
  - `[low]` `[reject]` (blind) the Organizer can bypass the read-only rule by calling `guests_delete_guest_data` directly on a cancelled or ended Event — the story authorises `is_organizer(event_id)` and a Guest may delete in any state; removing data is not a write the read-only rule protects.
  - `[low]` `[defer]` (blind) a pending-password user who is Guest and Role-holder of only that Event survives `events_delete` — Role-holders were left behind the same way before this story; recorded in `deferred`.
  - `[low]` `[reject]` (blind) `events_delete` does not lock the Event row before looping — only the Organizer can call it, so a race needs the Organizer to add a guest while deleting their own Event; the fix adds a lock for a self-inflicted case.
  - `[low]` `[reject]` (blind) the guest row is locked before authorisation — guest ids are unguessable uuids that no other user is shown; the lock lasts one transaction.
  - `[low]` `[patch]` (blind) no-session reuses the RSVP "again to answer" text in the delete dialog — own key `rsvp.delete.errors.noSession` (e05319b).
  - `[low]` `[patch]` (blind) a failure survives closing the dialog — `failed` cleared on close (f847fc1).
  - `[low]` `[defer]` (blind) dialog, privacy notice and effect disagree on what is deleted — the notice text is from Epic 1; recorded in `deferred`.
  - `[low]` `[reject]` (blind) the `guest_deleted` cookie is not disclosed — it is `httpOnly`, strictly necessary, holds an Event id and lasts ten minutes, like the invite cookie.
  - `[low]` `[reject]` (blind) the one-value marker is overwritten by a second delete — it only decides which text a page shows for ten minutes after a delete; the fallback is the existing not-found or invite view.
  - `[medium]` `[patch]` (blind) the server-side marker branches have no test (kept user, reload, 320px) — e2e for a kept user at 320px added (2c60ed9).
  - `[low]` `[patch]` (blind) a failed `signOut` after the commit reports "Nothing was removed" — post-commit steps no longer fail the result (7f144f7).
  - `[low]` `[reject]` (blind) `destructiveClass` is copied a fifth time — extracting it touches four other files for no behaviour change.
  - `[medium]` `[patch]` (edge) Delete my data is missing for a Guest who has not answered — button added on the first question (5f68a2e).
  - `[low]` `[reject]` (edge) Organizer bypass of the read-only rule — same as the first blind row.
  - `[low]` `[patch]` (edge) `signOut` error or throw after the delete — same fix as the blind row (7f144f7).
  - `[low]` `[patch]` (edge) a dropped connection after commit says nothing was removed — text reworded to say the deletion could not be confirmed (7f144f7).
  - `[false]` `[reject]` (edge) the RPC may return null or an unexpected string — the function returns one of three literals by construction and the generated type is `string`; no path returns null without an error.
  - `[low]` `[reject]` (edge) a second kept-user delete overwrites the marker — same as the blind row.
  - `[low]` `[reject]` (edge) `getClaims` null during an Auth outage says to open the link again — an outage and a missing session look the same to the server; the text is correct for the second.
  - `[low]` `[patch]` (edge) stale error after reopening — same fix as the blind row (f847fc1).
  - `[low]` `[reject]` (edge) after ten minutes a left-open page asks for the link again — the marker is a short proof by design; the story's "open pages" are minutes apart.
  - `[medium]` `[patch]` (gap) no test of the kept user's deleted end state — e2e added; it passes with the guest keeping the user (2c60ed9).
  - `[low]` `[defer]` (gap) the user-row lock is not exercised by two connections — recorded in `deferred`.
  - `[low]` `[reject]` (gap) the dropped-connection text is not rendered in a test — copy-only effect on an offline path; the fix is an offline e2e.
  - `[low]` `[defer]` (intent) "the Organizer removes them at the same moment" is tested only in sequence — same root as the lock row; recorded in `deferred`.
  - `[false]` `[reject]` (intent) no AI usage link or purge hook code — the story says "the hooks that exist"; none exists in Core and the comment marks where they go.
  - `[low]` `[reject]` (intent) the foreign-key test looks only at `public` — the `auth` schema's own keys are Supabase's; every key from Arrangly tables is in `public`.
  - `[low]` `[reject]` (intent) the Organizer can call the function on a cancelled Event — same as the first blind row.
  - `[low]` `[reject]` (intent) the log carries a third field, `code` — it is a technical error code and holds no personal data.
  - `[low]` `[defer]` (intent) dialog text versus the Epic 1 privacy text — same root as the blind row; recorded in `deferred`.
  - `[low]` `[patch]` (intent) the privacy notice adds two sentences, the story says one — merged into one (f81a0a3).
  - `[medium]` `[patch]` (intent) the button is missing before the Guest has answered — same fix as the edge row (5f68a2e).
  - `[medium]` `[patch]` (intent) the kept-user end state has only database and mock coverage — same e2e as the gap row (2c60ed9).
  - `[low]` `[reject]` (intent) an Organizer removal while a Guest page is open is untested — without a session and marker the page asks for the link again, which is the existing behaviour for a removed guest.

## Design Notes

- The function takes a guest id (AD-11 names it so, and the Organizer path needs it); the Guest's Server Action still never trusts input for it. Returning a small status (not `void`) is what lets the page tell "deleted" from "already deleted" and lets the action know when to clear cookies.
- Tokens are deleted, not revoked: a revoked row would still hold the user id and outlive the data.
- A kept user (account holder, or Guest of another Event) keeps their session: ending it would log an account holder out of their own Arrangly. "My session ends" applies where the user is deleted.
- Undo after an Organizer's remove (`restoreGuest`) re-adds name and email only; the RSVP has been lost on remove since Story 7.3. With this story a guest-only user is also gone, and *Copy link* creates a new one. Leave Undo as it is.
- Work on the current branch in small one-concern commits `7.8: <what and why>` (at least four words after the prefix) with the trailer `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`; never push; never skip hooks; pnpm only. Do not commit this spec file.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP pass (local Supabase running)
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test` -- expected: pass
- `pnpm test:e2e e2e/rsvp.spec.ts e2e/guests.spec.ts e2e/cancel-delete.spec.ts e2e/guest-link.spec.ts` -- expected: pass (serially if parallel runs time out)

## Auto Run Result

Status: done

**Summary:** `guests_delete_guest_data(guest_id)` removes a guest's row, contact, RSVP and guest tokens in one transaction and deletes the auth user in SQL when it is guest-only and a Guest of no other Event; a second call changes nothing. *Delete my data* on the Guest Dashboard confirms in a dialog that names the Event, then shows "Your data has been deleted." (or "Your data is already deleted."). `guests_remove` and `events_delete` run the same function.

**Files:** `supabase/migrations/20261110130000_guests_delete_guest_data.sql` (function; remove and Event delete routed through it), `supabase/tests/guests_delete_guest_data.test.sql` (pgTAP), `src/modules/guests/{delete-actions,delete-actions.test,deleted}.ts` (action and marker name), `app/rsvp/[eventId]/{delete-my-data,rsvp-flow,page}.tsx` (button, dialog, end states), `app/privacy/page.tsx`, `messages/*.json`, `e2e/rsvp.spec.ts`, `docs/ki-logg.md`, `src/types/database.ts`.

**Review:** 34 findings. Patched: 12 rows in 6 fixes (two medium entries, four low). Deferred: 3 entries (5 rows). Rejected: 17 with reasons in the log, 2 of them false.

**Follow-up review:** recommended. Two medium entries were patched, and the new Delete button on the first question was added after the review passed over it; its interaction with submitting the answer broke one e2e test until it waited for the answer view.

**Verification:** after `supabase db reset`: `supabase test db` 1178/1178; lint, format:check and tsc pass; Vitest 509/509; Playwright serial 37/37 (rsvp, guests, cancel-delete, guest-link). The SQL did not change after the review, so pgTAP was not rerun after the patches.

**Residual risks:** the three deferred items; the concurrency lock is untested with two connections; the build agent was launched detached and paused twice on a usage limit; the dialog and end states have not been looked at in a browser in light and dark theme.
