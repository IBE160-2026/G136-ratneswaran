---
title: '2.2: Questionnaire with structured answers'
type: 'feature'
created: '2026-10-19'
status: 'in-review'
route: 'dispatch'
baseline_commit: '55e8646f12dfa5348f7ff56546340d66031d491b'
warnings: ['oversized']
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** An Event has only a name and nullable schedule columns, and nothing lets the Organizer say what kind of Event it is. Later stories (Roles, Proposed Tasks, guest list) need those answers as structured data, with "Not sure yet" kept distinct from "never asked" (GitHub issue #43).

**Approach:** One migration adds the answer columns, their CHECKs and the AD-2 function `events_save_questionnaire`. A Zod schema and Server Action in `src/modules/events` call it from wizard step 1 at `app/events/[eventId]/setup`. A pgTAP file and Vitest tests prove the rules. Shared form helpers are extracted first (Epic 1 retrospective A4).

## Boundaries & Constraints

**Always:**
- Answers are columns on `events`: `event_type` (`birthday|wedding|party|seminar|other`), `guest_count` (1–100000), `duration_minutes` (1–20160), `venue_known`, `rsvp_wanted`, `rsvp_due_date` (date), `guest_list_method` (`invite_link|manual`), plus the existing `starts_at`, `ends_at`, `time_zone`, `language`.
- "Not sure yet" is the question's key in `unknown_answers text[] not null default '{}'`, with its value column null. A null value with no key means never asked. A CHECK limits the keys to the questions above and rejects a key whose value is set (AD-19).
- `rsvp_due_date` needs `rsvp_wanted = true` and is at most the local date of `starts_at` in `time_zone`, both by CHECK. The Zod schema states the same rules and the same limits.
- `events_save_questionnaire(p_event_id, …)` is the only writer of these columns: `security definer`, `search_path = ''`, `revoke … from public, anon`, `grant … to authenticated`. It raises `42501` unless `is_organizer(p_event_id)`, locks the row, rejects a `time_zone` missing from `pg_timezone_names` (`22023`), reads `starts_at` as a local time in that zone and sets `ends_at = starts_at + duration` or null. It writes only the questionnaire columns.
- `authenticated` keeps `UPDATE (name)` and nothing more. The Server Action parses with Zod first and returns `Result` with next-intl keys. Inline errors use `aria-invalid` and `aria-describedby`, and focus goes to the first error.
- Step 1 is one page with every question. The RSVP due-date field shows only when RSVP is "yes".
- Until Stories 2.3/2.4 and 2.9 exist, `/events` gets a plain *Create new event* button that calls `events_create` and opens step 1, and *Next* saves and returns to `/events`. Stories 2.3 and 2.4 replace the button, and 2.3 adds the double-click guard.
- Event `language` defaults to the resolved interface language and is changeable. All strings go in `messages/nb.json` and `messages/en.json`. Step 1 shows "Step 1 of 6", *Back* and *Next*, and focus moves to the `h1`.

**Never:**
- No Tasks, Roles, `roles` table, guests, description, publish, cancel or `events_update_schedule` (2.5–2.10).
- No direct `UPDATE` grant for new columns. No hand edit of `src/types/database.ts`, earlier migrations, `_bmad/` or planning documents.
- No allergy, food or hotel data anywhere. No AI call.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Full answers | all questions answered | columns saved, `ends_at` = start + duration, `unknown_answers` empty | none |
| Not sure yet | guest count marked unknown | `guest_count` null, `'guest_count'` in `unknown_answers` | none |
| RSVP no | `rsvp_wanted = false` | no due-date question, `rsvp_due_date` null | a due date sent anyway is rejected by Zod and CHECK |
| Due after start | `rsvp_due_date` later than the event's local date | rejected | inline error, focus to field. `23514` in DB |
| Bad count | guest count `0`, `2.5`, `-1` | rejected | inline error. `23514` in DB |
| Value and unknown | `guest_count = 5` and key `guest_count` | rejected | `23514` |
| Other user | B calls the function for A's Event | nothing written | `42501` |
| Bad time zone | `time_zone = 'Mars/Base'` | rejected | `22023` |
| Re-edit | Organizer reopens step 1 | saved answers and unknown choices shown, editable | none |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261018120000_events.sql` -- the `events` table, `is_organizer`, `events_create`. Mirror its style (lower-case SQL, `revoke all` then grant, short AD comment). The `events_publishable` CHECK and the select/update policies stay untouched.
- `supabase/tests/events.test.sql` -- pgTAP pattern: temp `created` table, `set local role authenticated`, `request.jwt.claims`, `throws_ok(…, '42501', null, …)`. The new file `events_questionnaire.test.sql` copies it. This file's "UPDATE columns are exactly `{name}`" test must still pass.
- `src/types/database.ts` -- regenerate with `supabase gen types --local --lang typescript`. CI diffs it.
- `src/modules/auth/schemas.ts` -- `Result<T>` type with `fields`. `src/modules/auth/actions.ts` -- `refuse`, `fieldErrors` helpers (private, not exported) and the `useActionState` Server Action shape (`updateName`). Do not import across modules (AD-1): move `refuse`/`fieldErrors` to `src/lib/` or duplicate the two lines.
- `app/profile/forms.tsx` -- source of `inputClass`, `buttonClass`, `Failure`, `FieldError` and the focus-on-first-error `useEffect`. Also duplicated as `inputClass` in `app/login/form.tsx` and `app/signup/form.tsx`.
- `app/events/page.tsx` -- empty state, gets the plain *Create new event* button. `src/i18n/locale.ts` -- `resolveLocale` gives the default Event language. `src/components/route-focus.tsx` -- focus to `h1`. `src/lib/feedback.ts` -- `saveFailedToast`.
- `messages/{nb,en}.json` -- add `events.wizard.*`. Keep both files in step.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/form.tsx` -- extract `inputClass`, `buttonClass`, `Failure`, `FieldError` from `app/profile/forms.tsx`; use them in `profile`, `login` and `signup` forms -- retrospective A4, no behaviour change. The password-rules list stays where it is (no Epic 2 form uses it).
- [x] `supabase/migrations/20261019120000_events_questionnaire.sql` -- columns, CHECKs, `events_save_questionnaire` and its grants -- AD-2, AD-19.
- [x] `supabase/tests/events_questionnaire.test.sql` -- allow and deny for every I/O row, plus: update-column set still `{name}`, direct write of a new column denied, function attributes (definer, empty `search_path`, not executable by anon), `rsvp_due_date` CHECK, unknown-key CHECK -- AD-16.
- [x] `src/types/database.ts` -- regenerate -- AD-15.
- [x] `src/modules/events/schemas.ts` + `schemas.test.ts` -- Zod questionnaire schema with the DB limits and the branching rule -- AD-17.
- [x] `src/modules/events/actions.ts` + `actions.test.ts` -- `saveQuestionnaire` (Zod, then the RPC, mapping `42501` and `23514` to keys); `createEvent` (calls `events_create`, redirects to step 1) -- AD-2.
- [x] `app/events/[eventId]/setup/{page,form}.tsx` -- step 1 as one form, with prefilled answers, "Step 1 of 6", *Back*/*Next*, inline errors, `saveFailedToast` on failure -- UX-DR7, UX-DR25.
- [x] `app/events/page.tsx` -- add the *Create new event* button (form with the `createEvent` action) -- entry point until 2.4.
- [x] `messages/nb.json`, `messages/en.json` -- all wizard strings and error keys.
- [ ] `docs/ki-logg.md` -- Story 2.2 entry; offer a `docs/refleksjonsnotater.md` entry for the `unknown_answers` choice (append-only).

**Acceptance Criteria:**
- Given the migration, when `supabase test db` runs, then every new and existing pgTAP test passes.
- Given a signed-in Organizer, when they answer step 1 and continue, then each answer is stored in its own column, `ends_at` is derived and no Task exists.
- Given "RSVP wanted: no", when the form renders, then no due-date question shows.
- Given invalid input, when they continue, then Zod and the CHECK both refuse and focus lands on the first error.
- Given the change, when `pnpm lint`, `pnpm format:check`, `pnpm test` and `.githooks/test.sh` run, then they pass.

## Implementation Notes

- `Result`, `refuse` and `fieldErrors` moved to `src/lib/result.ts` (they were private to the auth module), so the events module does not import from auth.
- The generated RPC types make every argument non-null, so `saveQuestionnaire` casts the argument object once, with a comment. "Not sure yet" is stored as null.
- The form submits through `onSubmit` and `startTransition` instead of `<form action>`, because React resets an uncontrolled form after an action and the inputs would lose their values on a validation error.
- Radio groups are `fieldset role="radiogroup"` with `aria-invalid`, since `aria-invalid` is not valid on a radio input. Focus goes to the first `[aria-invalid="true"]`.
- Added `e2e/events-questionnaire.spec.ts` (answer, inline errors with focus, reload shows answers, 320px, another user gets no form). It was not in the task list.
- `next dev` rewrote `AGENTS.md` while the dev server ran. That change was reverted and is not part of the story.
- `e2e/shell.spec.ts` "phone menu follows the h1" failed once in the full run and passes alone, with and without this change.

## Spec Change Log

## Review Triage Log

### 2026-10-19 — Review pass
- verdicts: 27 findings (blind 12, edge 12, gap 3) — high 0, medium 1, low 7, false 6, rejected-low 13. `[patch]` 8, `[reject]` 19.
- findings:
  - `[medium]` `[patch]` (blind 2, edge 8) re-saving step 1 overwrote `ends_at` with start plus duration, or with null, so a later `events_update_schedule` (2.6) edit would be lost — the function keeps `ends_at` while start and duration are unchanged. pgTAP covers kept, recomputed and null.
  - `[low]` `[patch]` (blind 4, edge 2) Zod used `Intl` to accept time zones, which takes lowercase names the database rejects, and the form list lacked UTC — Zod and the form now share `timeZoneNames()`; a Vitest case rejects `europe/oslo`.
  - `[low]` `[patch]` (edge 1) `generateMetadata` ran `loadEvent` before the login redirect, so a signed-out visitor saw 404 — it returns a plain title without a session. An e2e test proves the redirect.
  - `[low]` `[patch]` (edge 3, 4, gap 2) data errors of class 22 (e.g. `22008`) were shown as a transient failure with a futile Retry — mapped to `invalid_input`; table rows for `22023` and `22008` added.
  - `[low]` `[patch]` (edge 6) an expired session sent the user to `/events`, not back to the Event — the redirect keeps the Event path.
  - `[low]` `[patch]` (edge 10) 100 minutes prefilled as `1.6666666666666667` — rounded to two decimals, which round-trips every whole minute.
  - `[low]` `[patch]` (blind 10) `loadEvent` ran twice per request — wrapped in `cache()`.
  - `[medium]` `[patch]` (gap 1) reload verified only some answers — e2e now asserts duration, time zone, language, guest-list method and an "unknown" checkbox round trip. Also added a Vitest case for RSVP "not sure yet" (blind 11) and a not-found text check in the foreign-Event e2e (gap other).
  - `[patch]` (blind 1) ki-logg entry missing — entry added.
  - `[false]` `[reject]` (blind 1) types not regenerated — `database.ts` was excluded from the review diff; `supabase gen types | diff` shows no diff.
  - `[false]` `[reject]` (blind 3) language not validated in the database — `events.language` already has `check (language in ('nb','en'))` from 2.1.
  - `[false]` `[reject]` (blind 12) other importers of `Result` — `tsc` passes and grep finds none.
  - `[false]` `[reject]` (edge 7) a direct caller can null answers without an unknown key — null with no key means never asked, which the spec allows.
  - `[false]` `[reject]` (edge 11) focus does not reach the h1 — measured: the Event is reached through a full page load, where focus starts at the skip link by design (UX-DR25), and `RouteFocus` covers client navigation.
  - `[false]` `[reject]` (edge 12) the retry toast fires only for `unavailable` — intended: other codes are not transient and show inline.
  - `[low]` `[reject]` (blind 5) a time in the spring-forward gap shifts silently — a once-a-year hour, and the fix adds a round-trip branch.
  - `[low]` `[reject]` (blind 6, edge 5) a tampered `eventId` shows no message — unreachable from the UI.
  - `[low]` `[reject]` (blind 7) ticking "Not sure yet" ignores a typed value — the checkbox sits next to the field and the choice is visible.
  - `[low]` `[reject]` (blind 8) the caption says 6 steps while Next returns to All events, and `?saved=1` persists — Open Question 2 settled this for now.
  - `[low]` `[reject]` (blind 9, edge 9) redundant radiogroup role, missing checkbox association, `eslint-disable` and focus on the alert — cosmetic; a fix adds state or markup.
  - `[low]` `[reject]` (blind 11) no pgTAP for a null event id, and nothing on old rows — `is_organizer(null)` is false so it raises `42501`; the new columns only add constraints to rows that satisfy them.
  - `[low]` `[reject]` (gap 2) retry toast has no test — needs a harness that forces an action failure; three lines of wiring.

## Design Notes

`unknown_answers` is one array rather than a status column per question, so Epic 4's `tasks_propose_gaps` reads a single field and `guest_count` can stay an integer. The cost is the CHECK that keeps a key and its value from coexisting.

`duration_minutes` records the answer. `ends_at` is derived by the function on save. Story 2.6 later owns `ends_at` through `events_update_schedule`, so after 2.6 the two can differ and `ends_at` is the truth.

`rsvp_due_date` is a `date`, not a `timestamptz`, because the Organizer picks a day, not an instant. The CHECK compares it with `(starts_at at time zone time_zone)::date`, so the day is the Event's local day.

## Verification

**Commands:**
- `supabase start` -- expected: local stack up (needs Docker)
- `supabase db reset` -- expected: all migrations apply cleanly
- `supabase test db` -- expected: all pgTAP files pass
- `supabase gen types --local --lang typescript | diff - src/types/database.ts` -- expected: no diff
- `pnpm lint && pnpm format:check && pnpm test && .githooks/test.sh` -- expected: exit 0

**Manual checks (if no CLI):**
- In the browser at 320px and desktop: answer step 1, reload and see the answers, mark one "Not sure yet", enter a bad count and a late RSVP date and see inline errors with focus on the first one.
