---
title: 'Story 7.3: RSVP: yes or no, plus-one and other needs'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: '18e591785201f0e448cc5b2f8adcefb813c877a0'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-1-personal-guest-link.md'
warnings: ['oversized']
deferred:
  - 'events_select_guest exposes the whole Event row to its Guests (as Role-holders already get); AD-3 says own rows only. Consider a narrower guest view via bmad-correct-course.'
---

<intent-contract>

## Intent

**Problem:** A signed-in Guest has nowhere to say whether they come, bring a plus-one, or mention other needs, and the Organizer cannot see an answer. There is no `rsvps` table, no writer and no RSVP page.

**Approach:** `rsvps` (one row per guest) written only by the definer function `guests_submit_rsvp(event_id, answers, expected_updated_at)`, which derives the Guest from `auth.uid()` and the Event. A guest-only page `/rsvp/[eventId]` asks one question per screen (Yes/No, plus-one, other needs) and confirms. The Guests tab shows "Coming" / "Not coming" and the answer text to the Organizer.

## Boundaries & Constraints

**Always:**
- `rsvps`: `guest_id` unique (`ON DELETE CASCADE`), also `event_id` (cascade; set by the function, lets policies use `is_organizer`), `attending`, `plus_one`, `plus_one_name`, `other_needs` (text, `''` = none), `answered_at` (first answer, never changes), `updated_at`. CHECK: when `attending` is false, `plus_one` is false and both texts are `''`; a name needs `plus_one`; lengths 80 / 500.
- `authenticated` gets `SELECT` only (AD-19); policy `rsvps_select`: `is_organizer(event_id) or is_guest_self(guest_id)`. No Role-holder policy here (Story 7.7 owns it, as `guests_select` is Organizer-only today).
- `guests_submit_rsvp` (AD-5 mutation function: `security definer`, `search_path = ''`, revoke from `public, anon`, grant `authenticated`) takes no guest or user id: it selects the caller's `guests` row `for update` by `event_id = p_event_id and user_id = auth.uid()`. No such row, anonymous caller, other Event, Role-holder, removed guest, unknown Event, or an unpublished Event: the one exception `42501` with one fixed message (reveals nothing). Only after that: cancelled or ended Event (same rule as `guests_add`) is `55000`.
- Answers (jsonb `{attending, plus_one, plus_one_name, other_needs}`) are validated in SQL too: boolean types, text trimmed, 80 / 500 code points, control characters rejected (all but LF in `other_needs`) -> `22023`. `attending = false` normalises plus-one and texts to empty/false in the same statement (a *No* after a *Yes* clears them; Story 7.4's food/hotel rows are not built, do not invent them).
- Concurrency (AD-17): under the row lock, no row + `expected` null -> insert; row exists and answers equal the stored ones -> change nothing (no `updated_at` bump), return it; else `expected` must equal `updated_at` or `40001 concurrent_edit`; no row but `expected` set -> `40001`. `updated_at` uses `clock_timestamp()`. The function returns the row's `updated_at`; the client keeps it as an unparsed string.
- Guests (not only team) read their Event: add policy `events_select_guest` (`is_guest_of(id)` or an inline `guests.user_id = (select auth.uid())` subquery, whichever does not recurse; published Events, cancelled ones included) so the page shows name, date, time zone, due date, cancellation note. Record in Design Notes that this exposes the Event row to its Guests (as Role-holders already get), and add a deferred item suggesting a narrower guest view via `bmad-correct-course` (AD-3 says "own rows only").
- Server Action `submitRsvp`: Zod parse first, `getClaims()`, then `rpc('guests_submit_rsvp')` under the user's session; returns `Result` with next-intl keys, never throws; logs carry Event id, user id and code only, never answers. Zod: trim, name <= 80 and other needs <= 500 counted in code points, control characters rejected, the same schema module drives client inline errors (`aria-invalid`, `aria-describedby`).
- Page `/rsvp/[eventId]` (server component reading under the user's session): one question per screen, `fieldset` + `h1` question with focus on each step, *Back* on every step after the first (nothing precedes step 1), progress "Question N of M" where M = 1 after *No*, 3 otherwise (steps: attending, plus-one, other needs); step 1 shows the greeting by name, Event name, date in the Event's time zone, and "Reply by {date}" from `rsvp_due_date` (a local date; omit if null). The due date is soft: nothing blocks a late answer.
- Submit: *No* submits at step 1 -> "Thanks for letting us know, {name}."; *Yes* submits on the last step -> "You're on the list, {name}! We'll send the details closer to the day." An answered guest opening the page sees that confirmation with *Change my answer* (reopens the flow prefilled); no Guest Dashboard (Story 7.5). Cancelled / ended Event: read-only text ("This event has been cancelled." plus note / "Thanks for coming!"), answers shown, no change button. No session: ask to open the personal link again (no email field).
- Failure keeps input on screen with *Retry*; `concurrent_edit` shows "Your answer was changed on another device. See changes." with a button that reloads the server state; nothing is queued offline. The plain text renders escaped everywhere (a stored `<script>` does nothing); `other_needs` keeps line breaks via CSS only.
- `/rsvp/:path*` sends `Cache-Control: no-store` and `Referrer-Policy: no-referrer`; no third-party scripts. `/invite` for the token's own signed-in session redirects to `/rsvp/{event_id}`.
- Guests tab: `coming` / `notComing` status labels (status vocabulary, icon + word) replace link labels once answered; plus-one name and other needs show as plain text. Another request after the Guest submits shows it (dynamic page, no polling).
- All copy in `messages/nb.json` and `messages/en.json` (nb written as natural Bokmål); `docs/` untouched except `docs/ki-logg.md`.

**Never:**
- No direct INSERT/UPDATE/DELETE grant on `rsvps`; no id of a guest or user taken from the client; no Role-holder policy; no food, allergy, hotel, consent or Guest Dashboard code; no notification or email on a late answer (Core); no logging of answers; no edits to `_bmad/`, planning artifacts, `src/types/database.ts` by hand (regenerate), or the cloud project.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First Yes | guest, no row, expected null, `{attending, plus_one:true, name, needs}` | one row, `answered_at` = `updated_at`, returns `updated_at` | none |
| Double submit / two tabs | same answers again, stale or null expected | still one row, nothing changed, same `updated_at` | none |
| Change | row exists, expected = row `updated_at`, new answers | row updated, `answered_at` kept, `updated_at` advances | none |
| Stale change | expected differs, answers differ | nothing written | `40001` -> `concurrent_edit` copy |
| Yes then No | row with plus-one, `attending=false` | plus-one false, texts `''`, same transaction | none |
| Another Guest's id | answers carry another `guest_id` | ignored; only the caller's own row can change | none |
| Denied callers | other Event's Guest, Role-holder, anon, removed Guest, unknown Event | refused `42501`, same message | generic forbidden copy |
| Cancelled / ended | valid guest | no write | `55000` -> read-only page |
| Bad text | 81-char name, 501-char needs, control char, `<script>` | over bound / control char rejected; `<script>` stored and rendered as text | inline field error |
| Late answer | after `rsvp_due_date` | accepted, nothing blocks | none |

</intent-contract>

## Code Map

- `supabase/migrations/20261107120000_guest_links.sql` -- `guests.user_id`, `guests_select_self`, `is_guest_of`/`is_guest_self`, `guests_copy_link` (P0002/55000/42501 pattern, read-only rule); read-only, reuse.
- `supabase/migrations/20261103120000_tasks.sql:93-105` -- `tasks_check_expected` / `concurrent_edit` `40001` pattern (AD-17) to mirror; `src/modules/tasks/actions.ts:23` maps `40001` to a `concurrent` Result.
- `supabase/migrations/20261020090000_guests.sql` -- `guests_add` read-only rule, grants/RLS style; `20261018120000_events.sql` -- `events_select`, `is_organizer`; `20261030120000_holder_scoped_view.sql` -- `events_select_member` (recursion notes).
- `supabase/tests/guest_links.test.sql` -- pgTAP structure to copy (helpers for users/events/guests); it asserts "a guest reads no Event row": update that assertion for the new policy, do not delete it.
- `src/modules/guests/schemas.ts` -- `controls` regex and Zod reason-key style to reuse; `src/modules/guests/actions.ts` -- `caller`/`refuseGuest` Result style; `src/lib/result.ts` -- `Result`, `refuse`, `fieldErrors`.
- `src/modules/guests/link.ts` (`firstName`, `readGuestLink`), `link-actions.ts` (`openGuestLink` ends `redirect("/invite")`), `app/invite/page.tsx` `GuestView` (signed-in branch) and `guest-flow.tsx` -- hand-off from the link to `/rsvp/{event_id}` (`preview.event_id`).
- `app/events/[eventId]/guests/guest-list.tsx`, `guest-rows.tsx` (`Guest.link`, `StatusLabel`), `src/lib/status.ts`, `src/components/status-label.tsx`, `src/components/form.tsx` (`Field`, `Failure`, `buttonClass`, `inputClass`) -- Guests tab labels and form pieces.
- `next.config.ts` -- headers (`noReferrer` for `/invite`); add `/rsvp/:path*`. `src/i18n/request.ts` locale resolution (guest UI language by setting/browser/en).
- `e2e/guest-link.spec.ts`, `e2e/support.ts` (`seed`, `psql`, `confirmed`, `signedIn`) -- e2e fixtures; `e2e/guests.spec.ts` labels. Node: `node_modules/next/dist/docs/` before writing Next code.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/20261108120000_guests_rsvp.sql` -- `rsvps` table, CHECKs, RLS + SELECT-only grant, `rsvps_select`, `events_select_guest`, `guests_submit_rsvp` -- guests-owned write path (AD-2, AD-5, AD-19). Then `supabase gen types` -> `src/types/database.ts`.
- `supabase/tests/guests_rsvp.test.sql` -- allow + deny for: policy (own row, other guest, other Event, Organizer, Role-holder), no direct INSERT/UPDATE/DELETE (guest and Organizer), CHECKs, FK cascade, function (first answer, idempotent repeat unchanged, change, stale 40001, Yes->No clearing, another guest's id ignored, the five denied callers with one identical message, cancelled/ended 55000, text bounds/controls 22023, execute grants), `events_select_guest` allow/deny.
- `src/modules/guests/rsvp-schemas.ts` (+ `.test.ts`) -- Zod: trim, code-point bounds 80/500, control characters rejected, `<script>` kept verbatim, steps/progress helper.
- `src/modules/guests/rsvp-actions.ts` (+ `.test.ts`) -- `submitRsvp`: Zod first, claims, rpc, error-code mapping (42501 forbidden, 55000 read_only, 40001 concurrent, 22023/23514 invalid, else unavailable), no answers in logs.
- `app/rsvp/[eventId]/page.tsx`, `rsvp-flow.tsx` -- server load (guest row, Event, rsvp under RLS; due date, time-zone date) and the client flow described above; `app/invite/page.tsx` -- redirect for the own session; `next.config.ts` headers.
- `app/events/[eventId]/guests/guest-list.tsx`, `guest-rows.tsx`, `src/lib/status.ts`, `src/lib/status.test.ts` -- Coming / Not coming labels and answer text.
- `messages/en.json`, `messages/nb.json` -- all copy (`rsvp.*`, `status.coming`, `status.notComing`).
- `e2e/rsvp.spec.ts` -- guest at 375px: link -> Continue -> Yes -> plus-one -> needs -> confirmation; No path; change; Organizer sees "Coming" on the Guests tab; stored `<script>` text rendered inert; cancelled Event read-only. Adjust `e2e/guest-link.spec.ts` where `/invite` now redirects.

**Acceptance Criteria:**
- Given an unanswered Guest session, when `/rsvp/{event}` opens, then the greeting, Event name, date and "Reply by {date}" in the Event's time zone appear with "Question 1 of 3", the question is the focused `h1` of a `fieldset`, and each step shows a correct "Question N of M".
- Given No then Submit, when it saves, then follow-ups are skipped and "Thanks for letting us know, {name}." shows; a later Yes with a plus-one then a No leaves plus-one false and texts empty.
- Given a double submit, when run twice, then one row and no second change; a stale `expected_updated_at` with different answers returns `concurrent_edit` with the exact copy.
- Given a direct `INSERT`/`UPDATE` on `rsvps` as `authenticated`, then it is denied; the five denied callers get one identical refusal.
- Given a Yes saved, when the Organizer opens the Guests tab, then the row reads "Coming" with the plus-one and needs as plain text.

## Spec Change Log

## Review Triage Log

### 2026-11-07 — Review pass
- verdicts: 24 rows — high 0, medium 7, low 14, false 3, maybe-false 0 (blind 15, edge 12, gap 4, intent 5 descriptive notes folded into rows)
- findings:
  - `[medium]` `[patch]` (blind, edge) an invalid plus-one name passes step 2 and fails at step 3 where its error is not shown — validate at step 2, jump to the step holding the error.
  - `[medium]` `[patch]` (edge) stale hidden text rejects a valid No before the clearing transform — preprocess blanks texts when not attending.
  - `[medium]` `[patch]` (blind, edge) read_only mid-form leaves an editable form — router.refresh shows the closed view.
  - `[low]` `[patch]` (edge) Retry clickable while pending — disabled while pending.
  - `[low]` `[patch]` (edge) v_now taken before the row lock — taken after.
  - `[medium]` `[patch]` (edge) an Organizer email change keeps the previous holder's rsvp for the new invitee — guests_update deletes it.
  - `[medium]` `[patch]` (implementer note) events_select_guest lists guest-only Events in the viewer's All-events list — list and counts filtered; Vitest/e2e added.
  - `[medium]` `[patch]` (gap) no test for no-row + non-null expected — pgTAP added.
  - `[low]` `[patch]` (gap) ended-Event page and unnamed plus-one display untested — e2e added.
  - `[medium]` `[defer]` (blind, edge, intent) events_select_guest exposes the whole Event row to its Guests, against AD-3 "own rows only" — the AC needs a guest read path and the planning documents name none; the owner decides a narrower guest view via bmad-correct-course (precedent: the 7.1 deferred high).
  - `[low]` `[defer]` (edge) Remove then Undo deletes the guest's rsvp (restore re-inserts the guest) — Story 7.8 reshapes removal through guests_delete_guest_data.
  - `[low]` `[reject]` (edge) invalid time_zone makes Intl throw — the Event settings validate and the publish CHECK requires it.
  - `[low]` `[reject]` (edge) expectedUpdatedAt not a timestamp maps to unavailable — only a hand-forged call reaches it; strict ISO parsing would reject Postgres' own format.
  - `[low]` `[reject]` (edge, blind) no purge hook for rsvps — the FK cascade is pgTAP-tested; guests_delete_guest_data is Story 7.8.
  - `[low]` `[reject]` (blind) rsvp_wanted not checked — neither AC nor spec makes it a gate; a link holder may still answer.
  - `[low]` `[reject]` (blind) focus not moved on validation errors, progress not a live region — inline errors with aria-invalid/aria-describedby meet the AC; extra announcements add branching.
  - `[low]` `[reject]` (blind) duplicated i18n keys, shadowed `key`, nested ternary, limits in four places, unused exports — cosmetic.
  - `[low]` `[reject]` (blind) /invite dead end without event_id — a valid guest preview always carries event_id.
  - `[low]` `[reject]` (blind) ki-logg entry and spec housekeeping — finalised at PR time, not code.
  - `[false]` `[reject]` (blind) free-text needs only protected by a hint — the AC prescribes the hint and plain-text storage; Core never interprets it.
  - `[low]` `[reject]` (blind, gap) no-store header and Retry path not e2e-asserted — the dev server overrides no-store; Retry is covered by the Vitest mapping; verify against a production build.
  - `[low]` `[reject]` (blind) Norwegian locale, late answer e2e — copy parity is tested; the late answer is a no-op rule in SQL.
  - `[false]` `[reject]` (intent) Dashboard link missing — Story 7.5 builds the Dashboard; the page's Change my answer meets the No AC until then.
  - `[false]` `[reject]` (intent) Reply-by formatted in UTC — the due date is a local date, shifted by no zone.
  - `[low]` `[reject]` (intent) food/hotel clearing and "of 4" progress — Story 7.4 not built.

## Design Notes

- Guest lookup `where g.event_id = p_event_id and g.user_id = auth.uid()` is the derivation; `auth.uid()` null matches nothing, so anonymous and unknown Event end identically at `42501`. Check order: guest -> published -> read-only, so read-only is only ever told to a real Guest.
- Idempotence compares normalised answers with `is not distinct from` after the lock; the CHECK is the last line of defence.
- LF is allowed in `other_needs` only (a multi-line textarea); other control characters and U+2028/2029 are rejected in both fields. `\r\n` is normalised to `\n` before counting.
- `events_select_guest` is a deliberate widening, not in the planning documents: Guests must read name/date/time zone/due date and Story 7.5 needs the same. If the recursion check fails with the helper, use an inline subquery on `guests.user_id`.
- `events_select_guest` exposes the Event row to its Guests, as Role-holders already get; the policy and the guests table did not recurse in pgTAP or e2e with the inline subquery.
- Work on the current branch in small one-concern commits `7.3: <what and why>` with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; never push; never skip hooks; pnpm only.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- all pgTAP pass
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test` -- pass
- `pnpm test:e2e e2e/rsvp.spec.ts e2e/guest-link.spec.ts e2e/invite-join.spec.ts e2e/guests.spec.ts` -- pass (run serially if parallel runs time out)

## Auto Run Result

Status: done

**Summary:** `rsvps` (SELECT-only, one row per guest) is written only by `guests_submit_rsvp`, which derives the Guest from `auth.uid()` and the Event, refuses every non-Guest with one `42501`, treats cancelled/ended as `55000`, is idempotent and returns `concurrent_edit` on a stale token. `/rsvp/[eventId]` asks one question per screen and confirms; the Guests tab shows Coming / Not coming with plain-text answers; `/invite` hands the guest's session on to the RSVP.

**Files:** `supabase/migrations/20261108120000_guests_rsvp.sql`, `supabase/tests/guests_rsvp.test.sql`, `src/types/database.ts` (regenerated), `src/modules/guests/rsvp-schemas.ts`, `rsvp-actions.ts` (+ tests), `app/rsvp/[eventId]/{page,rsvp-flow}.tsx`, `app/invite/page.tsx`, `app/events/page.tsx` and `app/events/[eventId]/load-event.ts` (guest-only Events kept out of team surfaces), Guests tab files, `src/lib/status.ts`, `next.config.ts`, `messages/*.json`, `e2e/rsvp.spec.ts`, `e2e/guest-link.spec.ts`, `docs/ki-logg.md`.

**Review:** 24 rows. Patched: 9 (invisible step-3 name error, stale hidden text after No, read-only mid-form, Retry while pending, timestamp taken before the lock, rsvp surviving an email change, guest-only Events in All events, missing pgTAP branch, ended page and unnamed plus-one e2e). Deferred: 2 (events_select_guest widening, Undo loses rsvp). Rejected: 13 with reasons in the log. A further hardening came from the implementer's note: `loadEvent` now 404s guest-only viewers.

**Follow-up review:** recommended (true): the AD-3 widening is unresolved by design and patches touched a security-definer function (`guests_update`) after the first pass.

**Verification:** lint, format:check, tsc pass; Vitest 496/496; `supabase db reset` + `supabase test db` 1115/1115; Playwright serial 32/32 (rsvp, guest-link, invite-join, guests, team-invite, team-revoke).

**Residual risks:** `Cache-Control: no-store` not asserted (dev server overrides; check a production build); events_select_guest exposure; `guests_update` was replaced wholesale in a new migration; keep-alive of the deferred 7.1 password takeover applies to RSVP sessions too.
