---
title: '2.6: Event settings: dates, RSVP due date and language'
type: 'feature'
created: '2026-10-19'
status: 'done'
baseline_revision: 'c160a399b3a8dc341e07b7447002609f3f3e822d'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** After the questionnaire an Organizer cannot change when an Event starts or ends, its time zone, its RSVP due date or its language without redoing setup, and no single database function owns the schedule that Epic 4's deadlines will depend on (FR4, GitHub issue #51).

**Approach:** Add one mutation function `events_update_schedule` that validates and saves the schedule columns and is the only writer of them (the questionnaire save delegates to it), plus an *Event settings* page with a form for start, end, time zone, RSVP due date and language.

## Boundaries & Constraints

**Always:**
- `events_update_schedule(p_event_id, p_starts_local timestamp, p_ends_local timestamp, p_time_zone text, p_rsvp_due_date date, p_language text)` is an AD-2 mutation function (`security definer`, `search_path = ''`, granted to `authenticated`, revoked from `public`/`anon`). It authorises with `is_organizer`, interprets the local times in `p_time_zone`, and writes `starts_at`, `ends_at`, `time_zone`, `rsvp_due_date` and `language`. Nulls are allowed, because a draft may be incomplete.
- When start and end are both set, it sets `duration_minutes` to the difference, so the questionnaire shows the same length. It removes the `starts_at`, `duration` and `rsvp_due_date` keys from `unknown_answers` for every value it sets.
- A comment in the function marks it as the single place where Epic 4 recalculates resolved deadlines when `starts_at` changes. Until Tasks exist, nothing else happens there.
- `events_save_questionnaire` keeps its signature and behaviour, but writes the schedule columns only by calling `events_update_schedule`.
- New CHECK `starts_at < ends_at` whenever both are set. The existing CHECK keeps the RSVP due date on or before the start's local day, and the existing duration CHECK caps the length at 14 days.
- `authenticated` gets no new column grant; a direct UPDATE of a schedule column is denied.
- *Event settings* at `/events/[id]/settings`, in the sidebar event group, with `h1` "Event settings" and title "Event settings – {Event} – Arrangly". The form is prefilled in the Event's time zone. It asks for start and end (`datetime-local`), time zone, language (nb/en) and, only when RSVP is wanted, the reply-by date. Start, end, time zone and language are required.
- Zod checks the same rules first. Errors are inline with `aria-invalid` and `aria-describedby`, focus goes to the first error, and a success shows "Settings saved." (`role="status"`). The fields are disabled for a published past Event or a cancelled one.
- Changing the Event language never changes the Organizer's interface language (AD-14). Nothing stores a copy of `ends_at`; later jobs read it at run time.
- All strings in `messages/nb.json` and `messages/en.json`.

**Never:**
- No Roles, cancel or delete in settings (2.5, 2.7), no Tasks or deadline recalculation (Epic 4), no Guest-facing text. No database read-only enforcement (2.7).
- No edit of earlier migrations, `_bmad/` or planning documents. No hand edit of `src/types/database.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Save | Organizer moves start and end | both saved; duration updated | No error expected |
| Time zone change | same local times, new zone | instants follow the new zone's wall clock | No error expected |
| End before start | end ≤ start | rejected inline and by CHECK | `23514` / field error |
| Too long | end more than 14 days after start | rejected | `23514` / field error |
| Late due date | reply-by after the start's local day | rejected | `23514` / field error |
| Unknown answers | draft with "Not sure yet" start | start set, `starts_at` key removed | No error expected |
| Language | Event language set to nb | Event saved as nb; the UI stays in the Organizer's language | No error expected |
| Not Organizer | B calls the function | refused | `42501` |
| Direct write | UPDATE of a schedule column as authenticated | denied | `42501` |
| Questionnaire | step 1 saved | same result as before; schedule written through the function | No error expected |

</intent-contract>

## Code Map

- `supabase/migrations/20261019170000_roles.sql` -- latest `events_save_questionnaire` (13 args, Roles defaults). Replace with `create or replace` (same signature) so its schedule writes become a call to `events_update_schedule`. Keep the existing `ends_at` rule (kept when start and duration are unchanged).
- `supabase/migrations/20261019120000_events_questionnaire.sql` -- CHECKs `events_rsvp_due_by_start`, `events_rsvp_due_needs_rsvp`, `events_unknown_answers_unanswered`, and the `duration_minutes` 1–20160 check.
- `supabase/tests/events_questionnaire.test.sql`, `roles.test.sql` -- must keep passing; claims and role pattern for the new `events_schedule.test.sql`.
- `src/modules/events/schemas.ts` -- `timeZoneNames`, `eventLanguages`, `isLocalDateTime`, `toLocalInput`, `MAX_DURATION_MINUTES`; add a `scheduleSchema` beside `questionnaireSchema`.
- `src/modules/events/actions.ts` + `actions.test.ts` -- `saveQuestionnaire` pattern (Zod, `getClaims`, error mapping 42501 / 23514 / class 22). Add `updateSchedule`.
- `app/events/[eventId]/setup/form.tsx` -- `Field`, `FieldError`, `inputClass`, `buttonClass`, focus-first-error. Move `Field` to `src/components/form.tsx` if the settings form needs it.
- `app/events/[eventId]/team/page.tsx` -- loader, title and read-only pattern (`isDraft`, `isPast`). `src/components/app-nav.tsx` -- event group.
- `e2e/support.ts` -- `answerStep1`, `psql`; `e2e/roles.spec.ts` -- `seed` and `signedIn` pattern.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/<ts>_events_update_schedule.sql` -- CHECK, `events_update_schedule`, questionnaire delegation -- FR4, AD-2, AD-19.
- `supabase/tests/events_schedule.test.sql` -- every matrix row the database decides, plus function attributes and grants -- AD-16.
- `src/types/database.ts` -- regenerate -- AD-15.
- `src/modules/events/schemas.ts` + `schemas.test.ts` -- `scheduleSchema` -- Vitest for each rule.
- `src/modules/events/actions.ts` + `actions.test.ts` -- `updateSchedule` -- Vitest for args, error mapping, signed-out redirect.
- `app/events/[eventId]/settings/page.tsx`, `form.tsx` -- *Event settings*.
- `src/components/app-nav.tsx` -- *Event settings* in the event group.
- `messages/nb.json`, `messages/en.json` -- page, labels, errors and status.
- `e2e/settings.spec.ts` -- save and reload, inline error with focus, language keeps the UI language, read-only, no access.
- `docs/ki-logg.md` -- Story 2.6 entry.

**Acceptance Criteria:**
- Given *Event settings* for my Event, when I change start, end, time zone, reply-by date and language and save, then reopening the page shows the new values in the Event's time zone and the questionnaire shows the matching duration.
- Given the change, when `supabase test db`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e` and `.githooks/test.sh` run, then they pass.

## Spec Change Log

## Review Triage Log

### 2026-10-19 — Review pass
- verdicts: 26 findings — high 0, medium 0, low 19, false 7, maybe-false 0
- findings:
  - `[low]` `[reject]` (blind 1) read-only is enforced only in the browser; `updateSchedule` accepts a POST for a past or cancelled Event — the intent excludes database read-only until Story 2.7.
  - `[low]` `[reject]` (blind 2) duration has two writers and the questionnaire's keep-the-end branch can store an end that differs from start + duration — reachable only from rows that were inconsistent before (the pgTAP fixture sets one up by hand); app flows keep them in step. The fragile regex in the single-writer test is cosmetic.
  - `[low]` `[patch]` (blind 3, edge 5) a stored zone missing from `timeZoneNames()` makes the select fall back to UTC and a save moves the Event — the stored zone is always offered.
  - `[low]` `[reject]` (blind 4) no Retry toast on a failed settings save — the inline alert keeps the input and Save can be pressed again; the toast and auto-retry would add wiring the intent does not ask for.
  - `[low]` `[reject]` (blind 5) wall-clock Zod versus instant CHECK across a daylight-saving change, and skipped-hour starts — needs an end in a one-hour window twice a year; the database still decides correctly.
  - `[low]` `[patch]` (blind 6, gap 1) no test that a past draft stays editable in settings — e2e seeds a past draft and asserts the fields are enabled.
  - `[low]` `[patch]` (blind 7) "Settings saved." mounted with its text is often not announced — the status region is always mounted and its text changes.
  - `[low]` `[patch]` (blind 8) the language hint and the read-only notice are not linked to their controls — added to `aria-describedby`.
  - `[low]` `[patch]` (blind 9) clearing start or end through the RPC kept the old duration — the function writes `v_duration`, and pgTAP checks the cleared row.
  - `[low]` `[reject]` (blind 10) an undated draft cannot change only its language in settings — the spec requires start and end there; changing that edits the spec.
  - `[false]` `[reject]` (blind 11) process records unfinished — the AI log, triage log and PR are written at finalisation; the reflection-note offer goes in the hand-over.
  - `[low]` `[reject]` (edge 1) the questionnaire's local round trip of the end can shift an hour in the repeated fall-back hour — same one-hour window as blind 5.
  - `[low]` `[reject]` (edge 2) an unchanged save of an instant in the repeated hour moves it an hour — same window.
  - `[low]` `[reject]` (edge 3) a CHECK that only the database sees gives a generic error with no field — only the stale-RSVP and daylight-saving cases reach it; mapping constraint names adds branches for rare paths.
  - `[low]` `[reject]` (edge 4) a stale tab or crafted POST changes a read-only Event — database read-only is Story 2.7.
  - `[false]` `[reject]` (intent A) the questionnaire rewrite goes beyond the epic — the AC's "single place where deadlines are recalculated" holds only if the questionnaire's start goes through the function.
  - `[false]` `[reject]` (intent B) the due-date CHECK compares the start's local day, not the instant — that is the 2.2 rule for a date-only field; the epic's "≤ starts_at" is met at day granularity.
  - `[low]` `[reject]` (intent C) the Epic 4 hook comment sits before the UPDATE and runs on every call — Epic 4 places its code; the comment marks the function, which is what the AC asks.
  - `[low]` `[reject]` (intent C) a missing Event language is prefilled from the UI locale — the same default the questionnaire uses (2.2 AC).
  - `[low]` `[patch]` (intent D) direct column writes were tested as the Organizer only — pgTAP adds B's denied UPDATE.
  - `[low]` `[reject]` (intent E) read-only exists only in the UI — the intent leaves database enforcement to 2.7.
  - `[low]` `[reject]` (intent F) no test drives a database-only rejection through the action — same rare paths as edge 3.
  - `[false]` `[reject]` (intent G) `Field`, `DEFAULT_TIME_ZONE`, `signedIn` and `seed` moved — reuse the Code Map called for, no behaviour change.
  - `[false]` `[reject]` (intent H) commits, PR and PR comments missing — produced at finalisation and hand-over.
  - `[false]` `[reject]` (intent C) Guest-facing language and `ends_at` jobs untested — no Guest surface or job exists yet; the AC is met by not caching.
  - `[false]` `[reject]` (intent C) the language check runs in one direction only — the setting is stored per Event and never read by the UI locale code, so the other direction exercises the same path.

## Design Notes

The questionnaire already writes the start, so "single place" only holds if it goes through the new function. Delegating the schedule columns keeps one writer, the Epic 4 hook in one function, and the 2.2 behaviour unchanged. Duration and end are two views of one fact, so the function keeps `duration_minutes` in step with the end, and the existing 14-day duration CHECK bounds settings too.

## Verification

**Commands:**
- `supabase db reset` -- expected: all migrations apply
- `supabase test db` -- expected: all pgTAP pass
- `supabase gen types --local --lang typescript | diff - src/types/database.ts` -- expected: no diff
- `pnpm lint && pnpm format:check && pnpm test && .githooks/test.sh` -- expected: exit 0
- `pnpm test:e2e` -- expected: all pass (one run; repeated runs within 5 minutes hit local Auth's sign-up limit)

## Auto Run Result

**Summary:** One mutation function, `events_update_schedule`, validates and writes the start, end, time zone, RSVP due date and language. It is the only writer of those columns, because the questionnaire save now delegates to it, and it carries the Epic 4 deadline hook comment. A new CHECK keeps the start before the end. *Event settings* at `/events/[id]/settings` edits them with inline validation and is in the sidebar event group.

**Files changed:**
- `supabase/migrations/20261019190000_events_update_schedule.sql` -- CHECK, `events_update_schedule`, questionnaire delegation.
- `supabase/tests/events_schedule.test.sql` -- 28 pgTAP assertions for the function, grants, CHECKs and both users.
- `src/types/database.ts` -- regenerated.
- `src/modules/events/schemas.ts`, `schemas.test.ts` -- `scheduleSchema`, `scheduleFromForm`, `DEFAULT_TIME_ZONE`.
- `src/modules/events/actions.ts`, `actions.test.ts` -- `updateSchedule`.
- `app/events/[eventId]/settings/page.tsx`, `form.tsx` -- the page and form.
- `app/events/[eventId]/setup/form.tsx`, `src/components/form.tsx` -- `Field` moved for reuse.
- `src/components/app-nav.tsx` -- *Event settings* link.
- `messages/en.json`, `messages/nb.json` -- settings strings.
- `e2e/settings.spec.ts`, `e2e/support.ts`, `e2e/roles.spec.ts` -- settings e2e; `signedIn` and `seed` shared.
- `docs/ki-logg.md` -- Story 2.6 entry.

**Review findings:** 26 findings — 6 patched (all low), 0 deferred, 20 rejected (low 13, false 7). Every rejected finding and its reason is in the Review Triage Log above.

**Follow-up review recommended:** false. No high or medium entry was patched (patched by verdict: low 6).

**Verification:** `supabase db reset` applied all migrations; `supabase test db` passed 167 tests in 8 files; the regenerated types match; `pnpm lint`, `tsc --noEmit` and `pnpm format:check` are clean; `pnpm test` passed 201 tests; `.githooks/test.sh` passed 26 of 26; `pnpm test:e2e` passed 61 of 61 after the patches. An earlier e2e run failed 7 tests while it overlapped the patch work; no Auth rate limit was logged.

**Residual risks:** read-only for past or cancelled Events is UI-only until Story 2.7. In the repeated hour on the night the clocks go back, a local time is ambiguous and can move by an hour. A database-only rejection shows a generic form error. An undated draft must set start and end to save its language in settings.

