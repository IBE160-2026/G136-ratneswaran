---
title: '2.3: Draft that is never lost'
type: 'feature'
created: '2026-10-19'
status: 'in-review'
route: 'dispatch'
baseline_commit: '4ded4a00f9955b35de79f7b038c2f05a804db513'
warnings: ['oversized']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Leaving the wizard partway, a double click on *Create new event*, a second browser tab or a failed save can each cost the Organizer their setup, and *All events* shows no way back to a draft (GitHub issue #45).

**Approach:** `events_create` returns the Organizer's existing blank draft instead of inserting another, under an advisory lock. `/events` lists the Organizer's drafts as "Draft · continue setup" links. A failed or offline save in step 1 keeps the input, shows the save-failed toast with *Retry* and retries when the browser is back online.

## Boundaries & Constraints

**Always:**
- A blank draft is an unpublished Event of the caller with `name`, every questionnaire column and `ends_at` null and `unknown_answers = '{}'`. `events_create` takes `pg_advisory_xact_lock` on the caller's id first, so two simultaneous calls end with one row. Its signature and grants stay as in 2.1.
- Step saves touch only their own columns. `events_save_questionnaire` writes nothing but the questionnaire columns, so a save from another tab never changes `name` and the reverse. pgTAP proves both ways.
- A draft is readable by its Organizer only (2.1 RLS) and cannot be published while a required field is missing (2.1 CHECK). pgTAP re-proves both on a draft made by `events_create`.
- The draft link goes to the Event's `/events/[id]/setup`. Only step 1 exists, so that is the first incomplete step. One function names the path so Stories 2.8 and 2.9 extend it.
- On a thrown or failed save the form keeps its values and shows `feedback.saveFailed` with *Retry*. The browser's `online` event retries once with the last submitted data. A redirect is never treated as a failure.
- All strings go in `messages/nb.json` and `messages/en.json`.

**Never:**
- No full *All events* cards, sorting, past or cancelled sections, counts or the interim Event home (Story 2.4), no `roles`, publish, cancel or delete (2.5–2.8).
- No new column. No partial or lenient save of unanswered fields, and nothing is saved on *Back* or when the tab hides: a step saves when the Organizer presses *Next*, so answers typed in an unfinished step are lost on close (decided).
- No edit of earlier migrations, of `_bmad/` or of the planning documents. No hand edit of `src/types/database.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First create | no draft | new row, its id | none |
| Double click | second call while the first draft is blank | the same id, one row | none |
| Answered draft | step 1 saved, then create | a new row | none |
| Other user | B calls create while A has a blank draft | B gets their own row, never A's id | none |
| Two tabs | tab 1 saves step 1, tab 2 renames | both changes kept | none |
| Foreign draft | B reads or saves A's draft | 0 rows / refused | `42501` on save |
| Publish draft | `published_at` set with a missing field | rejected | `23514` |
| Leave partway | blank or answered draft | listed as "Draft · continue setup" with a link to its setup | none |
| Save fails | server error or offline | input kept, toast with *Retry* | toast, no navigation |
| Back online | offline failure, then `online` | one automatic retry with the last data | toast again if it fails |
| Redirect | a successful save | navigates to `/events?saved=1`, no error toast | none |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261018120000_events.sql` -- `events_create` to replace (`create or replace`, same signature). Keep `revoke … from public, anon` and the grant to `authenticated`. `supabase/migrations/20261019120000_events_questionnaire.sql` -- the column list that defines "blank".
- `supabase/tests/events.test.sql` -- 2.1 tests call `events_create()` and insert its id into a temp table. They must still pass. New `events_drafts.test.sql` copies its claims and role pattern.
- `app/events/page.tsx`, `loading.tsx`, `error.tsx` -- list drafts here with `createClient()`. RLS limits the rows, so only `published_at is null` is needed. `loading.tsx` keeps the final shape. `error.tsx` already gives the Retry card on a failed load.
- `app/events/create-event-button.tsx` -- stays. Double click now ends on one draft because the server returns the same id.
- `app/events/[eventId]/setup/form.tsx` -- the `submit`, `lastData`, `saveFailedToast` and `useActionState(saveQuestionnaire)` wiring. A thrown error from the action (offline) currently reaches the error boundary and drops the input. `src/lib/feedback.ts` -- `saveFailedToast`. `src/components/offline-notice.tsx` -- reads `navigator.onLine`.
- `src/modules/events/actions.ts` -- `saveQuestionnaire` and `createEvent`, untouched. A new `src/modules/events/save.ts` holds the wrapper and `setupPath`.
- `e2e/events-questionnaire.spec.ts` and `e2e/support.ts` -- login and event helpers to reuse. Playwright `context.setOffline` drives the offline case.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20261019130000_events_create_reuses_blank_draft.sql` -- replace `events_create` to lock, return the caller's newest blank draft or insert -- double-click idempotency, AD-2.
- [x] `supabase/tests/events_drafts.test.sql` -- allow and deny for every I/O row the database decides: reuse, new row after answers, other user, two-tab columns both ways, foreign read and save, publish CHECK, lock taken (`pg_advisory_xact_lock` visible in `pg_locks` after the call) -- AD-16.
- [x] `src/modules/events/save.ts` + `save.test.ts` -- `callSafely(action)` turns a thrown error into the `unavailable` refusal and rethrows a redirect; `setupPath(eventId)` -- Vitest for both.
- [x] `app/events/[eventId]/setup/form.tsx` -- wrap the action with `callSafely`, retry once on `online` -- keeps input after a network failure.
- [x] `app/events/page.tsx` -- list the Organizer's drafts as links to `setupPath`, reading "Draft · continue setup" with the Event name or "New event" -- UX-DR7.
- [x] `messages/nb.json`, `messages/en.json` -- draft list strings.
- [x] `e2e/events-drafts.spec.ts` -- double click ends on one draft link, the link reopens the saved answers, offline *Next* keeps the input and shows the toast, going online saves.
- [x] `src/types/database.ts` -- regenerate -- AD-15.
- [ ] `docs/ki-logg.md` -- Story 2.3 entry.

**Acceptance Criteria:**
- Given a draft, when the Organizer opens *All events*, then a link reads "Draft · continue setup" and opens its setup page.
- Given two requests to create an Event, when both finish, then one draft exists and both got its id.
- Given two tabs saving different columns, when both save, then neither overwrote the other.
- Given a failed or offline save, when it fails, then the form keeps its values, the toast offers *Retry*, and *Retry* or coming back online saves.
- Given the change, when `supabase test db`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e` and `.githooks/test.sh` run, then they pass.

## Implementation Notes

- `events_create` kept its signature, so `src/types/database.ts` did not change and 2.1's tests pass untouched.
- A failed save also removes its toast when the next attempt starts or the page unmounts, because the toast has no duration and would otherwise outlive a successful retry.
- `callSafely` treats any error with a `NEXT_` digest as framework control flow and rethrows it.
- The draft list is a plain list of links on `/events`; Story 2.4 replaces it with cards.
- Playwright's `setOffline(false)` fires the `online` event, so the automatic retry is covered end to end.

## Spec Change Log

## Review Triage Log

## Design Notes

Reusing a blank draft rather than adding an idempotency key keeps the signature and 2.1's tests. A user who really wants a second blank Event gets the first one back, which is harmless because it is empty. The advisory lock is per user, so it never blocks anyone else.

Only step 1 exists, so every draft opens at step 1. `setupPath` is the single place the later steps change.

## Verification

**Commands:**
- `supabase db reset` -- expected: all migrations apply cleanly
- `supabase test db` -- expected: all pgTAP files pass
- `supabase gen types --local --lang typescript | diff - src/types/database.ts` -- expected: no diff
- `pnpm lint && pnpm format:check && pnpm test && .githooks/test.sh` -- expected: exit 0
- `pnpm test:e2e` -- expected: all pass

**Manual checks (if no CLI):**
- Double click *Create new event*, then open *All events*: one draft link. Go offline in dev tools, press *Next*: the toast appears and the fields keep their values. Go online: the answers save.
