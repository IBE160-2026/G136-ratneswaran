---
title: '2.7: Cancel or delete an Event'
type: 'feature'
created: '2026-10-19'
baseline_revision: 'a93a330f78fda3d705577099b914adf59ba55627'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      No notifications_emit stub exists in the migrations, although AGENTS.md describes one until Story 3.1.
    evidence: |-
      grep finds no notifications_emit in supabase/; events_cancel only carries a comment that Epic 3 tells the Team. Pre-existing, not caused by this story.
    location: >-
      supabase/migrations/20261019210000_events_cancel_delete.sql
    severity: low
---

<intent-contract>

## Intent

**Problem:** An Organizer cannot cancel a published Event, delete an Event, or throw away a draft, and a cancelled or ended published Event is read-only only in the UI, so a stale tab or crafted call can still change it (FR4, GitHub issue #53).

**Approach:** Add `events_cancel` and `events_delete` mutation functions, a database guard that makes cancelled and ended published Events read-only, and a section on *Event settings* with *Cancel event*, *Delete event* (typed name) and, for a draft, *Discard draft*, each behind a confirmation dialog.

## Boundaries & Constraints

**Always:**
- New column `events.cancellation_note text`, CHECK 1–500 characters after trim when set. No column grant: only `events_cancel` writes it and `cancelled_at`.
- `events_cancel(p_event_id uuid, p_note text)` and `events_delete(p_event_id uuid)` are AD-2 mutation functions (`security definer`, `search_path = ''`, granted to `authenticated`, revoked from `public`/`anon`), authorise with `is_organizer` (else `42501`) and never take a user id.
- `events_cancel` locks the row, refuses a draft or an already-cancelled Event with `55000`, stores a blank note as null, and sets `cancelled_at = now()`.
- `events_delete` deletes the Event row; cascades remove the rest. A comment marks it as the single place where Epic 7 adds the guest-data and auth-user purge. A draft, a published and a cancelled Event can all be deleted.
- Read-only guard: a `BEFORE UPDATE` trigger on `events` and on `roles` raises `55000` when the Event (old row) is cancelled, or published with `ends_at < now()`. It covers every writer (questionnaire, schedule, Role switch, direct `name` update, a later publish). A past draft stays editable. DELETE is not blocked.
- pgTAP enumerates every foreign key that references `public.events` and fails if any is not `ON DELETE CASCADE`.
- Server Actions `cancelEvent` and `deleteEvent` parse with Zod first and return the Result shape. `deleteEvent` requires the typed name (trimmed, exact match) unless the Event is a draft; a mismatch is a field error. Map `42501` → forbidden and `55000` → read-only messages.
- After cancel: redirect to the Event home, which shows "Cancelled" (icon + word) and the note. After delete or discard: redirect to *All events* with "Event deleted." / "Draft discarded." (`role="status"`).
- *Event settings* shows the section below the schedule form: published, not past → *Cancel event* and *Delete event*; cancelled or ended → *Delete event* only; draft → *Discard draft* only. Dialogs use `@base-ui/react/dialog` (focus trap, Escape, title, description), destructive button styling, and a *Keep event* close button. The delete dialog's confirm stays disabled until the name matches.
- All strings in `messages/nb.json` and `messages/en.json`. Logs carry only event id and user id.

**Never:**
- No notifications or email (Core sends none; Team notice is Epic 3). No guest purge (Epic 7). No un-cancel. No publish (2.8).
- No edit of earlier migrations, `_bmad/` or planning documents. No hand edit of `src/types/database.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cancel | A, published future Event, note "Rain" | `cancelled_at` set, note saved; home shows Cancelled + note; All events lists it under Past events | No error expected |
| Blank note | note "  " | note null | No error expected |
| Cancel draft | A, draft | refused | `55000` |
| Cancel twice | A, cancelled Event | refused | `55000` |
| Edit cancelled | schedule, questionnaire, Role switch, `name` update | refused | `55000` |
| Edit ended published | `events_update_schedule` | refused | `55000` |
| Edit past draft | `events_update_schedule` | saved | No error expected |
| Delete | A, published Event, typed name matches | row and Roles gone; redirect with "Event deleted." | No error expected |
| Wrong name | typed name differs | nothing deleted, inline field error | `invalid_input` |
| Discard draft | A, draft, no name | row gone; "Draft discarded." | No error expected |
| Not Organizer | B calls either function | refused | `42501` |
| Direct DELETE | `delete from events` as authenticated | denied | `42501` |

</intent-contract>

## Code Map

- `supabase/migrations/20261018120000_events.sql` -- events table, `revoke all` + `grant update (name)`, `events_update` policy, `is_organizer`. No DELETE grant exists.
- `supabase/migrations/20261019150000_events_cancelled_at.sql` -- `cancelled_at` already exists, no grant; `events_create` skips cancelled rows.
- `supabase/migrations/20261019170000_roles.sql` -- `roles.event_id ... on delete cascade`; `events_set_role_active` (roles UPDATE). `20261019190000_events_update_schedule.sql` -- latest function pattern (header comment, revoke/grant lines).
- `supabase/tests/events_cancelled.test.sql`, `events_schedule.test.sql` -- claims/role pattern (`set local role authenticated`, `request.jwt.claims`), `throws_ok(..., '42501', ...)`, function attribute checks.
- `src/modules/events/actions.ts` + `actions.test.ts` -- `updateSchedule` pattern: Zod, `getClaims` redirect, error mapping, `revalidatePath("/events", "layout")`; mocks for `createClient`/`getClaims`.
- `src/modules/events/list.ts` -- `isDraft`, `isPast` (cancelled counts as past), `eventPath`.
- `src/lib/result.ts` -- `refuse`, `Result`. `src/modules/events/save.ts` -- `callSafely`.
- `src/components/form.tsx` -- `Field`, `Failure`, `inputClass`, `buttonClass`. `src/components/ui/sheet.tsx` -- base-ui Dialog styling to mirror (backdrop, popup).
- `app/events/[eventId]/settings/page.tsx` -- loads the Event, computes `readOnly`; render the new section after `SettingsForm` (drop the "Story 2.7 enforces" comments here and in `setup/page.tsx`).
- `app/events/[eventId]/page.tsx` -- Event home; add the note under `StatusLabel`.
- `app/events/page.tsx` -- `saved` search param → add `deleted` (`event` | `draft`).
- `e2e/settings.spec.ts`, `e2e/support.ts` -- `seed`, `signedIn`, `psql` helpers.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/<ts>_events_cancel_delete.sql` -- note column + CHECK, read-only trigger function and two triggers, `events_cancel`, `events_delete` -- FR4, AD-2, AD-11, AD-19.
- `supabase/tests/events_cancel_delete.test.sql` -- every matrix row the database decides, function attributes, grants, FK enumeration -- AD-16.
- `src/types/database.ts` -- regenerate.
- `src/modules/events/actions.ts` + `actions.test.ts` -- `cancelEvent`, `deleteEvent` -- Vitest for args, name check, error mapping, redirects.
- `app/events/[eventId]/settings/event-actions.tsx`, `settings/page.tsx` -- the section and dialogs.
- `app/events/[eventId]/page.tsx`, `app/events/page.tsx` -- note on home; deleted status on All events.
- `messages/nb.json`, `messages/en.json` -- labels, dialog text, statuses, errors.
- `e2e/cancel-delete.spec.ts` -- cancel with note, delete with typed name, discard draft.
- `docs/ki-logg.md` -- Story 2.7 entry.

**Acceptance Criteria:**
- Given a published Event, when I cancel it with a note in the dialog, then the Event home shows "Cancelled" and the note, *All events* lists it under Past events as Cancelled, and *Event settings* is read-only.
- Given any Event, when I type its name in the delete dialog and confirm, then it is gone from *All events* and its URL shows the no-access page.
- Given the change, when `supabase test db`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e` and `.githooks/test.sh` run, then they pass.

## Spec Change Log

## Review Triage Log

### 2026-10-19 — Review pass
- verdicts: 29 rows (findings that restate the same defect share a row, their sources in parentheses) — high 0, medium 0, low 19, false 10, maybe-false 0
- findings:
  - `[false]` `[reject]` (blind 1) a published Event with null `ends_at` is never read-only in the database — `events_publishable` requires `ends_at` once `published_at` is set, so that row cannot exist.
  - `[false]` `[reject]` (blind 2) the roles trigger reads events under the caller's RLS and passes when the row is hidden — `roles` has no UPDATE grant; its only writer is the definer function `events_set_role_active`, run as the table owner. Epic 3 writers will also be definer functions.
  - `[low]` `[patch]` (blind 3, edge 7, intent 4) the `deleteEvent` comment claims a client cannot skip the typed name, but the Organizer can call `events_delete` over RPC — comment reworded; the typed name is a confirmation for the Organizer, not a security rule.
  - `[low]` `[reject]` (blind 4, edge 2) a draft published between the action's read and `events_delete` is deleted without the typed name — needs publish (Story 2.8) and a second tab inside one request; the fix adds a parameter to the function.
  - `[low]` `[patch]` (blind 5, verification 1, intent 7) no test that an ended published Event cannot be cancelled, no anon deny on `events_cancel`, no e2e check of the ended Event's section — pgTAP adds both `throws_ok`, settings e2e asserts only *Delete event* shows. Deleting the ended Event or past draft and renaming an ended one exercise the same unconditional delete and trigger already tested, so not added.
  - `[low]` `[patch]` (blind 6) the note textarea has no `maxLength` — added `maxLength={500}`. The emoji count difference (UTF-16 vs code points) and the generic 23514 message are rejected: rare, and the fix adds branches.
  - `[low]` `[patch]` (blind 7, edge 3) reopening the delete dialog keeps the old typed name — `typed` resets when the dialog closes.
  - `[low]` `[reject]` (blind 8, edge 6) the trigger will also refuse future system writers (retention, purge) — no system writer exists yet; Epic 7 decides its bypass when it adds one. Named under residual risks.
  - `[false]` `[reject]` (blind 9) `src/types/database.ts` is missing from the diff and looks hand-edited — left out of the review diff on purpose; `supabase gen types --local` output matches it byte for byte.
  - `[false]` `[reject]` (blind 10, intent 9) the AI log says review not run, no reflection note — written at finalisation; the reflection-note offer goes in the hand-over.
  - `[low]` `[defer]` (blind 11) no `notifications_emit` stub exists, although AGENTS.md describes one — pre-existing; Epic 3 adds the Team notice to `events_cancel`.
  - `[low]` `[reject]` (blind 12) `?deleted=` shows the status again on refresh — same pattern as the existing `?saved=1`; harmless.
  - `[low]` `[patch]` (verification 2) `deleteEvent`'s failed lookup is untested — Vitest case asserts `unavailable` and no RPC.
  - `[low]` `[reject]` (intent 1) the guard covers UPDATE on two tables, not later tables — later modules add their own assert (Epic 4 `tasks_assert_writable`).
  - `[false]` `[reject]` (intent 2) read-only for ended published Events goes beyond AC1 — Story 2.4's AC makes past Events read-only and 2.6 left database enforcement to this story.
  - `[false]` `[reject]` (intent 3) Guest and Team cancelled states not built — Epics 3 and 7 own them.
  - `[false]` `[reject]` (intent 5) the FK test is stricter than "fails on NO ACTION" — the AC states every FK is `ON DELETE CASCADE`; the test enforces that.
  - `[low]` `[reject]` (intent 6) discard lives only on Event settings and the e2e rewrites the URL — settings is in the draft's sidebar; the test route is cosmetic.
  - `[false]` `[reject]` (intent 8) published Events are seeded by SQL — publishing is Story 2.8.
  - `[low]` `[patch]` (edge 1) stale tabs get "try again" for the trigger's 55000 in `updateSchedule`, `saveQuestionnaire`, `setRoleActive` — each maps 55000 to the read-only message, with Vitest.
  - `[low]` `[reject]` (edge 4) NFC vs NFD names never match — same keyboard input on both sides in practice; the dialog shows no match and nothing is lost.
  - `[low]` `[reject]` (edge 5) emoji notes counted differently by Zod and the CHECK — same as blind 6's rejected part.
  - `[false]` `[reject]` (intent, reading B) only the database part — the story has UI ACs (dialog, Past events).
  - `[false]` `[reject]` (intent, reading D) issue/branch process — issue #53 and the branch exist; commit and PR at hand-over.
  - `[low]` `[reject]` (intent, "removes everything" proven only for roles) — roles is the only table referencing events; the FK test covers later ones.
  - `[low]` `[reject]` (intent, typed name enforced client and action only) — grouped with blind 3; the database function trusts the Organizer.
  - `[low]` `[reject]` (intent, note shown only on the Organizer home) — Guest views are Epic 7.
  - `[low]` `[reject]` (intent, Epic 7 hook is a comment) — matches "so Epic 7 can add".
  - `[low]` `[reject]` (intent, cancel path not reachable through the UI until 2.8) — no publish exists yet; seeded state is the only route.

## Design Notes

A trigger instead of a check in each function: it covers all current writers, the direct `name` grant and future ones (publish in 2.8 refuses a cancelled Event for free), with one tested rule. Permission checks run before triggers, so a forbidden write still reports `42501`. The rule mirrors the UI's `!isDraft && isPast`; a published Event always has `ends_at`, so no 24-hour fallback is needed.

## Verification

**Commands:**
- `supabase db reset` -- expected: all migrations apply
- `supabase test db` -- expected: all pgTAP pass
- `supabase gen types --local --lang typescript | diff - src/types/database.ts` -- expected: no diff
- `pnpm lint && pnpm format:check && pnpm test && .githooks/test.sh` -- expected: exit 0
- `pnpm test:e2e` -- expected: all pass

## Auto Run Result

**Summary:** An Organizer can cancel a published Event with an optional note, delete any Event after typing its name, and discard a draft, from a new section on *Event settings* with Base UI confirmation dialogs. `events_cancel` and `events_delete` are the AD-2 mutation functions; `events_delete` is the single place for Epic 7's purge. A `BEFORE UPDATE` trigger on `events` and `roles` makes cancelled and ended published Events read-only for every writer (`55000`), and every action maps that code to a read-only message. pgTAP fails if any foreign key to `events` is not `ON DELETE CASCADE`.

**Files changed:**
- `supabase/migrations/20261019210000_events_cancel_delete.sql` -- note column, read-only trigger, `events_cancel`, `events_delete`.
- `supabase/tests/events_cancel_delete.test.sql` -- 35 pgTAP assertions; `events_drafts.test.sql` -- new column in the blank-draft list.
- `src/types/database.ts` -- regenerated.
- `src/modules/events/actions.ts`, `actions.test.ts` -- `cancelEvent`, `deleteEvent`, 55000 mapping in the older actions.
- `app/events/[eventId]/settings/event-actions.tsx`, `settings/page.tsx` -- the section and dialogs.
- `app/events/[eventId]/page.tsx`, `app/events/page.tsx` -- note on the home; deleted status on All events.
- `app/events/[eventId]/setup/page.tsx`, `team/page.tsx` -- comments updated.
- `messages/en.json`, `messages/nb.json` -- strings.
- `e2e/cancel-delete.spec.ts`, `e2e/settings.spec.ts` -- cancel, delete, discard; ended Event shows only *Delete event*.
- `docs/ki-logg.md` -- Story 2.7 entry.

**Review findings:** 29 rows — 7 patched (all low), 1 deferred (low, pre-existing missing `notifications_emit` stub), 21 rejected (low 11, false 10). Every rejected finding and its reason is in the Review Triage Log above.

**Follow-up review recommended:** false. No high or medium entry was patched (patched by verdict: low 7).

**Verification:** `supabase db reset` applied all migrations; `supabase test db` passed 202 tests in 9 files; regenerated types match; `pnpm lint`, `tsc --noEmit` and `pnpm format:check` are clean; `pnpm test` passed 221; `.githooks/test.sh` passed 26 of 26. The full `pnpm test:e2e` run passed 63 of 64: `login.spec.ts` "logged-out /events returns there after login" failed with an empty email field; it is not touched by this change and passed on rerun together with the cancel/delete and settings specs (11 of 11).

**Residual risks:** the read-only trigger also refuses future system writers (retention, purge), so Epic 7 must add an exemption for its system functions. The typed name is a confirmation in the action and UI only; the Organizer can call `events_delete` directly. A draft published in another tab between the action's read and the delete would be deleted without the typed name once Story 2.8 adds publishing. The cancel path is reachable only for seeded published Events until 2.8.
