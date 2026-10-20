---
title: '2.8: Description and publish to the team'
type: 'feature'
created: '2026-10-19'
baseline_revision: 'd47b6fa69d7d8d36617ba1bced868c114d0cb8c7'
status: 'done'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** An Organizer can answer the questionnaire but cannot name or describe the Event, and nothing can publish it, so every Event stays a draft (FR4, GitHub issue #55).

**Approach:** Add wizard step 3 (*Name and description*), an `events_publish` mutation function, and a publish banner with a confirmation dialog on the Event home that lists what is missing when the draft is incomplete.

## Boundaries & Constraints

**Always:**
- New column `events.description text`, CHECK 1–2000 characters after trim when set. Migration grants `update (name, description)` (name was already granted) so step 3 writes both with one direct update under the existing `events_update` policy (AD-19). Blank input is stored as null.
- `events_publish(p_event_id uuid)` is an AD-2 mutation function (`security definer`, `search_path = ''`, granted to `authenticated`, revoked from `public`/`anon`), authorises with `is_organizer` (else `42501`), never takes a user id, locks the row, refuses a cancelled Event with `55000`, and sets `published_at = now()` only where it is null, so a second call changes nothing. An incomplete draft is refused by the existing `events_publishable` CHECK (`23514`).
- One TS helper `missingForPublish(event)` in `src/modules/events/list.ts` returns the missing keys in order (`name`, `starts_at`, `ends_at`, `time_zone`, `language`); the home page and the action both use it.
- Server Actions `saveDescription` and `publishEvent` parse with Zod first and return the Result shape. `saveDescription` maps an update that matched no row to forbidden. `publishEvent` maps `42501` → forbidden, `55000` → read-only, `23514` → `incomplete` with one field per missing key (re-read from the row). Success redirects: step 3 → Event home; publish → Event home with `?published=1`, which shows "Your event is published. Guests aren't invited yet." (`role="status"`).
- Step 1's *Next* now opens step 3 (`/events/{id}/setup/description`); the `/events?saved=1` status and its string go. Step 3 shows "Step 3 of 6", *Back* to step 1 and *Next*, focus on `h1`, inline errors with `aria-invalid`/`aria-describedby`. A cancelled or ended published Event redirects to its home, as step 1 does.
- Event home, unpublished: banner "Only your team can see this event. Publish to send invitations." with *Publish*, which opens a Base UI dialog (title, description, focus trap, Escape, *Not yet* close). Complete draft → plain copy that promises no Guest invitation and a *Publish* confirm disabled while pending. Incomplete → the dialog lists exactly what is missing and has no confirm. The banner is gone once published.
- All strings in `messages/nb.json` and `messages/en.json`. Logs carry only event id and user id.

**Never:**
- No notifications, email or invitation (Core sends none). No wizard steps 2, 4, 5 or 6 (2.9, Epics 4 and 3). No unpublish. No new trigger: the 2.7 read-only trigger already refuses edits to cancelled Events.
- No edit of earlier migrations, `_bmad/` or planning documents. No hand edit of `src/types/database.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Save step 3 | A, draft, name "Lucas 40", description text | saved; reopening step 3 shows both | No error expected |
| Blank fields | name "  ", description "" | both null | No error expected |
| Too long | description 2001 chars | inline field error, nothing saved | `invalid_input` |
| Publish | A, complete draft | `published_at` set; home shows status, no banner | No error expected |
| Double publish | second call | `published_at` unchanged | No error expected |
| Incomplete | A, draft without name and end | refused; dialog lists "name" and "end time" | `23514` → `incomplete` |
| Cancelled | A, cancelled Event | refused; description update refused too | `55000` |
| Not Organizer | B calls `events_publish` or updates description | refused / no row | `42501` / forbidden |
| Anonymous | anon calls `events_publish` | denied | `42501` |
| Edit published | A, published future Event, settings save | saved | No error expected |

</intent-contract>

## Code Map

- `supabase/migrations/20261018120000_events.sql` -- `events_publishable` CHECK (the publish rule), `grant update (name)`, `events_update` policy, `is_organizer`.
- `supabase/migrations/20261019210000_events_cancel_delete.sql` -- latest function pattern (`events_cancel`: organizer check, `for update`, 55000) and the read-only trigger that already covers publish and the description update.
- `supabase/tests/events_cancel_delete.test.sql` -- claims/role pattern, `throws_ok`, function attribute and grant checks to mirror. `events_drafts.test.sql` -- blank-draft column list needs `description`.
- `src/modules/events/actions.ts` (+ `actions.test.ts` mocks) -- `cancelEvent`/`refuseEventChange` pattern; `saveQuestionnaire` final `redirect("/events?saved=1")` changes to step 3.
- `src/modules/events/list.ts` (+ `list.test.ts`) -- `isDraft`, `eventPath`; add `missingForPublish`. `save.ts` -- `setupPath`, `callSafely`.
- `app/events/[eventId]/setup/page.tsx`, `setup/form.tsx` -- step 1 page/form pattern (caption, `Field`, `Failure`, Back/Next, read-only redirect).
- `app/events/[eventId]/settings/event-actions.tsx` -- Base UI dialog markup to mirror for the publish dialog.
- `app/events/[eventId]/page.tsx` -- Event home: add banner, dialog, `published` status. `app/events/page.tsx` -- drop `saved`.
- `e2e/support.ts` (`seed`, `answerStep1`, `signedIn`, `psql`); `e2e/events-drafts.spec.ts`, `events-questionnaire.spec.ts`, `roles.spec.ts`, `settings.spec.ts` expect `/events?saved=1` and must follow the new step 3 URL.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/20261019230000_events_description_publish.sql` -- description column + CHECK + grant, `events_publish` -- FR4, AD-2, AD-19.
- `supabase/tests/events_publish.test.sql` -- matrix rows the database decides, function attributes, grants; `events_drafts.test.sql` column list -- AD-16.
- `src/types/database.ts` -- regenerate.
- `src/modules/events/list.ts` + `list.test.ts` -- `missingForPublish`.
- `src/modules/events/actions.ts` + `actions.test.ts` -- `saveDescription`, `publishEvent`, step 1 redirect.
- `app/events/[eventId]/setup/description/page.tsx` + `form.tsx` -- step 3.
- `app/events/[eventId]/publish-dialog.tsx`, `app/events/[eventId]/page.tsx` -- banner, dialog, status; `app/events/page.tsx` -- drop `saved`.
- `messages/nb.json`, `messages/en.json` -- step 3, banner, dialog, missing items, status, errors; drop `events.saved`.
- `e2e/publish.spec.ts` -- step 3 save and reopen, incomplete list, publish once with double click, banner gone, published settings edit; update the four specs and the `seed` comment.
- `docs/ki-logg.md` -- Story 2.8 entry.

**Acceptance Criteria:**
- Given wizard step 3, when I write a name and a description and choose *Next*, then they are saved and step 3 shows them when reopened.
- Given a complete draft, when I choose *Publish* on the Event home and confirm (also with a double click), then `published_at` is set once, the status copy promises no invitation, and the banner is gone.
- Given a draft missing required fields, when I open *Publish*, then the dialog lists exactly what is missing.
- Given the change, when `supabase test db`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e` and `.githooks/test.sh` run, then they pass.

## Spec Change Log

## Review Triage Log

### 2026-10-19 — Review pass
- verdicts: 34 findings — high 0, medium 0, low 24, false 10, maybe-false 0
- findings:
  - `[low]` `[patch]` (blind 1) the `events_publish` comment claims the read-only trigger refuses an ended Event, but an ended draft publishes — comment corrected; no guard (see edge 1).
  - `[low]` `[patch]` (blind 2) the `events_create` rewrite's `description is null` is untested — pgTAP case: a description-only draft is not reused.
  - `[false]` `[reject]` (blind 3) a start after the end passes `missingForPublish` and fails with no list — `events_starts_before_ends` (2.6) refuses that row whenever both are set, so it cannot exist.
  - `[low]` `[patch]` (blind 4) the incomplete message points to settings while the name lives on step 3; no links per item — message reworded to "Some required details are missing."; per-item links rejected (adds surface, the list is short).
  - `[false]` `[reject]` (blind 5) the banner promises invitations the dialog denies — the banner text is mandated verbatim by the AC (UX-DR8).
  - `[low]` `[patch]` (blind 6) clearing a published Event's name on step 3 gives a generic error with no field marked — 23514 now maps to a `name` field error ("A published event needs a name."), with Vitest.
  - `[low]` `[patch]` (blind 7) a failed publish result survives closing and reopening the dialog — action state moved into a `PublishForm` inside `Dialog.Popup`, which unmounts on close.
  - `[low]` `[patch]` (blind 8) the description textarea has no `maxLength` — added `maxLength={2000}`; e2e asserts the attribute, Vitest keeps the server limit.
  - `[low]` `[reject]` (blind 9) Zod counts UTF-16 and trims Unicode whitespace while the CHECK counts code points — rare, same trade-off rejected in 2.7; aligning adds code.
  - `[false]` `[reject]` (blind 10) the dialog casts `fields` keys without checking — the only producer is `publishEvent`, which builds them from `missingForPublish`.
  - `[low]` `[reject]` (blind 11) `useSaveFeedback` lives in the step-1 route file — moving it to `save.ts` would pull a client hook into a module the `"use server"` actions import; the cross-route import is the smaller cost.
  - `[false]` `[reject]` (blind 12) ki-logg review line, types and spec missing from the diff — the log is finalised here; types are regenerated and diff-checked; the spec is the claims file by design.
  - `[low]` `[patch]` (intent 1) the function's refusal reaching the screen is tested only with a mocked RPC — grouped with verification 3; new e2e drives a real 23514 into the dialog.
  - `[false]` `[reject]` (intent 2) "exactly what is missing" fails when start ≥ end — same refutation as blind 3.
  - `[false]` `[reject]` (intent 3) Role-holders are not proven refused — no `role_members` table exists until Epic 3; the stranger and anon denies are the AD-16 pair.
  - `[low]` `[reject]` (intent 4) "publishes once" is proven only in pgTAP — the e2e double click plus the SQL single-write test cover the two layers that decide it.
  - `[low]` `[reject]` (intent 5) step 3 is reachable later only via step 1's Next — the sidebar's *Event setup* reaches it without data loss; a direct link waits for the full wizard.
  - `[low]` `[reject]` (intent 6) editing the description after publish has no e2e — same direct update as a draft, covered by pgTAP and the publish/settings e2e.
  - `[low]` `[patch]` (intent 7) the cancelled/ended UI side of step 3 is untested — grouped with verification 2.
  - `[false]` `[reject]` (intent 8) the banner belongs on the Epic 5 Dashboard — the epic context puts it on the interim Event home until then.
  - `[false]` `[reject]` (intent 9) name on step 3, the `events_create` rewrite and the removed `saved` status go beyond the AC — each is required for the AC to be reachable or keep earlier behaviour correct (Design Notes).
  - `[false]` `[reject]` (intent 10) ki-logg and reflection note — finalised here; the reflection entry is offered in the hand-over.
  - `[low]` `[patch]` (verification 1) the description-only blank-draft rule is never exercised — same patch as blind 2.
  - `[low]` `[patch]` (verification 2) step 3's read-only redirect is untested — `events-list.spec.ts` now opens `/setup/description` for the ended and the cancelled Event.
  - `[low]` `[patch]` (verification 3) the stale-tab dialog path is untested — `publish.spec.ts` clears `ends_at` after load and asserts the dialog lists "End time" with no confirm.
  - `[false]` `[reject]` (verification other) ki-logg review line — finalised here.
  - `[low]` `[reject]` (edge 1) an ended draft publishes and turns read-only at once — the Organizer can still delete it; a guard adds a branch for a rare path. Comment fixed under blind 1. Named in residual risks.
  - `[low]` `[patch]` (edge 2) cleared published name gives no field error — same patch as blind 6.
  - `[low]` `[reject]` (edge 3) a NUL character makes every Retry fail — typing or pasting U+0000 is very unlikely; the guard adds a refinement on both fields.
  - `[low]` `[reject]` (edge 4) a stale `missing` prop hides Publish after another tab completes the draft — a reload shows it; rare.
  - `[low]` `[patch]` (edge 5) stale publish state after reopening — same patch as blind 7.
  - `[low]` `[reject]` (edge 6) a failed re-read after 23514 is ignored — the user still gets the plain incomplete message; adding a branch buys nothing visible.
  - `[low]` `[reject]` (edge 7) `?published=1` shows the status again on reload — same pattern as `?deleted=` accepted in 2.7.
  - `[low]` `[patch]` (edge 8) the `setupPath` comment promises 2.8 opens the first incomplete step — comment reworded.

## Design Notes

No story names where the Event name is typed, yet publish requires it and only `update (name)` exists. Step 3 is where the Organizer describes the Event, so the name sits there with the description; this is a reflection-note candidate. Wizard step 6 is not built: until Epics 3–4 add steps 4–5, step 3's *Next* goes to the Event home, whose banner is the publish entry point the AC names. The CHECK, not the function, decides completeness, so there is one rule; `missingForPublish` mirrors it only to word the list.

## Verification

**Commands:**
- `supabase db reset` -- expected: all migrations apply
- `supabase test db` -- expected: all pgTAP pass
- `supabase gen types --local --lang typescript | diff - src/types/database.ts` -- expected: no diff
- `pnpm lint && pnpm format:check && pnpm test && .githooks/test.sh` -- expected: exit 0
- `pnpm test:e2e` -- expected: all pass

## Auto Run Result

**Summary:** An Organizer names and describes the Event on wizard step 3 (`/events/{id}/setup/description`, description 1–2000 characters, blank stored as null) and publishes it from a banner on the Event home. `events_publish` is the AD-2 mutation function: Organizer only, refuses a cancelled Event (`55000`), sets `published_at` once; the `events_publishable` CHECK refuses an incomplete draft and the dialog lists exactly the missing fields. Step 1's *Next* now opens step 3.

**Files changed:**
- `supabase/migrations/20261019230000_events_description_publish.sql` -- description column + grant, `events_create` blank-draft check, `events_publish`.
- `supabase/tests/events_publish.test.sql` -- 19 assertions; `events_drafts.test.sql` -- description-only draft not reused; four older tests -- grant list includes `description`.
- `src/types/database.ts` -- regenerated.
- `src/modules/events/list.ts`, `list.test.ts` -- `missingForPublish`.
- `src/modules/events/actions.ts`, `actions.test.ts` -- `saveDescription`, `publishEvent`, step 1 redirect.
- `src/modules/events/save.ts` -- `setupPath` comment.
- `app/events/[eventId]/setup/description/page.tsx`, `form.tsx` -- step 3; `setup/form.tsx` -- shared `useSaveFeedback`.
- `app/events/[eventId]/publish-dialog.tsx`, `page.tsx` -- banner, dialog, published status; `app/events/page.tsx` -- `saved` status removed.
- `messages/en.json`, `messages/nb.json` -- strings.
- `e2e/publish.spec.ts` -- new; `events-drafts`, `events-questionnaire`, `roles`, `settings`, `events-list` specs and `support.ts` -- new step 3 URL, step 3 read-only redirect.
- `docs/ki-logg.md` -- Story 2.8 entry.

**Review findings:** 34 rows — 14 rows in 9 patched entries (all low), 0 deferred, 20 rejected (low 10, false 10). Every rejected finding and its reason is in the Review Triage Log above.

**Follow-up review recommended:** false. No high or medium entry was patched (patched by verdict: low 9).

**Verification:** `supabase db reset` applied all migrations; `supabase test db` passed 222 tests in 10 files; regenerated types match; `pnpm lint` and `pnpm format:check` clean; `pnpm test` passed 237; `.githooks/test.sh` passed 26 of 26; `pnpm test:e2e` passed 68 of 68.

**Residual risks:** a draft whose end has passed can still be published and is then read-only (delete remains). Name on step 3 is a planning gap no story settled (reflection-note candidate). A draft card still opens step 1, and wizard steps 2, 4, 5 and 6 do not exist yet, so step 3's *Next* lands on the Event home. Role-holder denial of `events_publish` can only be tested once Epic 3 adds `role_members`.
