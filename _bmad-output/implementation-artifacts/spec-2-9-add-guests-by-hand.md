---
title: '2.9: Add guests by hand'
type: 'feature'
created: '2026-10-20'
baseline_revision: 'a01c01175003bbc0a8796d5eac1387bdbc8a23a2'
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

**Problem:** An Event has no guest list. The Organizer cannot add guests, so there is nothing to invite once Epic 7 arrives (FR-5, GitHub issue #57).

**Approach:** Add the guests module's first tables, `guests` (name) and `guest_contacts` (email), with Organizer-only RLS. Add one mutation function `guests_add` that inserts a batch atomically, and a paste-or-type form on wizard step 2 and on a new *Guests* page, which reports how many rows were added and which failed and why.

## Boundaries & Constraints

**Always:**
- Migration `guests` table: `id uuid pk default gen_random_uuid()`, `event_id uuid not null references events on delete cascade`, `name text not null`, `created_at timestamptz not null default now()`, `unique (id, event_id)`. CHECK: `char_length(btrim(name)) between 1 and 200` and no control characters (`name !~ '[[:cntrl:]]'`).
- Migration `guest_contacts` table: `guest_id uuid primary key`, `event_id uuid not null references events on delete cascade`, `email text not null`, a composite FK `(guest_id, event_id) references guests (id, event_id) on delete cascade` so a contact can never point at another Event's guest. Unique index on `(event_id, lower(email))`. CHECK: length ≤ 254, contains `@`, no control characters.
- RLS on both tables. Select policies use `is_organizer(event_id)` (`is_organizer` reads `events`, so there is no recursion). `revoke all … from public, anon, authenticated`, then `grant select … to authenticated`. No direct-edit columns (AD-19); Story 2.10 adds edits.
- `guests_add(p_event_id uuid, p_rows jsonb) returns text[]` is an AD-2/AD-5 mutation function (`security definer`, `search_path = ''`, granted to `authenticated`, revoked from `public`/`anon`). Steps, in order:
  - authorise with `is_organizer`, else `42501`;
  - refuse more than 200 rows with `22023`;
  - lock the Event row `for update`;
  - refuse a cancelled Event, or a published one that has ended, with `55000`, using the same rule as `events_refuse_read_only`;
  - insert each `{name, email}` (trimmed) as a guest and its contact inside a per-row `exception when unique_violation` block;
  - return the emails skipped as already on the list.
  A row that breaks a CHECK aborts the batch with `23514`.
- `events_create` is redefined so a draft that has guests is not blank: add `and not exists (select 1 from public.guests g where g.event_id = e.id)`. Copy the 2.8 body and add only that line.
- `src/modules/guests/schemas.ts` holds a pure `parseGuestRows(text)`:
  - one guest per line; split lines on `\r\n|\n|\r` and skip blank lines;
  - a line is `Name <email>` or a name and an email split at the last tab, comma or semicolon;
  - each row is checked with Zod: name 1–200 chars after trim, email `z.email()` ≤ 254, and no control or line-separator characters in either (`[\u0000-\u001F\u007F-\u009F  ]`);
  - duplicates are compared by lower-cased email, within the input and against a passed set of existing emails;
  - at most `MAX_GUEST_ROWS = 200` rows per submission, with a code comment saying so; the extra rows fail with the reason `tooMany`;
  - it returns `{ valid: {name, email}[], failed: {line, reason}[] }`, where `reason` is a next-intl key.
- `src/modules/guests/actions.ts` `addGuests(prev, formData)` does the following:
  - Zod first: `eventId` uuid, `rows` string ≤ 100 000 chars;
  - redirect to login without claims;
  - read existing emails from `guest_contacts` (RLS);
  - parse, then call `guests_add` with the valid rows;
  - error mapping: `42501` → forbidden, `55000` → read-only, `23514`/`22023` → invalid input, anything else → unavailable;
  - a returned skipped email counts as a duplicate failure;
  - success returns `{ ok: true, data: { added, failed } }` and revalidates the Event's pages;
  - failure logs carry only `eventId`, `userId` and the error code, never a name or an email.
- UI, shared by both routes:
  - a textarea with a format hint and the 200-row limit. After submit it shows "N guests added" (`role="status"`) and lists each failed line with its reason. The textarea keeps only the failed lines, and `aria-invalid`/`aria-describedby` point to the list, with focus on the textarea. The submit button is disabled while pending. Retry uses `useSaveFeedback`.
  - the guest list shows the count and, per guest, the name, email and the label "Not invited yet" (`StatusLabel`, text not colour), oldest first, readable at 320px.
  - the empty state reads "No guests yet. Add them by name and email." and offers no invite link (Epic 7).
- Wizard step 2 at `/events/{id}/setup/guests` shows "Step 2 of 6", focus on `h1`, *Back* to step 1 and *Next* to step 3. Step 1's *Next* opens step 2, and step 3's *Back* opens step 2. A cancelled or ended published Event redirects to its home, as steps 1 and 3 do.
- The *Guests* page at `/events/{id}/guests` is added to the sidebar's event group. On a read-only Event it shows the list and a read-only note, with no form.
- All strings go in `messages/nb.json` and `messages/en.json`.

**Never:**
- No invitation, invite link, email, magic link or RSVP (Epic 7). No edit or removal of guests (2.10). No file import (Target).
- No `user_id`/`identified` columns yet (Epic 7 adds them with its policies). No Role-holder access (Epic 3).
- No guest name or email in logs, URLs or error messages sent to the client.
- No edit of earlier migrations, `_bmad/` or planning documents. No hand edit of `src/types/database.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Add | A pastes `Ann Berg, ann@x.no` and `Bo\tbo@x.no` | 2 added, both listed "Not invited yet" | No error expected |
| Angle form | `Cia Dahl <CIA@x.no>` | added, name "Cia Dahl" | No error expected |
| Bad email | `Dan, dan@` | row failed "invalid email", others added | per-row reason |
| Dup in input | `ann@x.no` and `ANN@x.no` | first added, second failed "duplicate" | per-row reason |
| Dup vs list | email already on the Event | failed "already on the list" | per-row reason |
| Race | two tabs add the same email | one row; the other skipped, reported duplicate | unique index |
| Control char | `Ann\tBerg\tann@x.no` (tab inside the name), or a NUL | row failed "invalid characters" | per-row reason |
| Direct call | `guests_add` with a name containing `E'\n'` | refused | `23514` |
| Too many | 201 rows | first 200 processed, row 201 failed "too many" | per-row reason |
| Not Organizer | B calls `guests_add` or selects A's guests/contacts | refused / no rows | `42501` / empty |
| Anonymous | anon calls `guests_add` or selects | denied | `42501` / permission denied |
| Cancelled | A adds to a cancelled Event | refused | `55000` → read-only |
| Delete Event | A deletes the Event | guests and contacts gone | cascade |

</intent-contract>

## Code Map

- `supabase/migrations/20261019230000_events_description_publish.sql` -- latest `events_create` body to copy, plus the mutation-function pattern (`is_organizer`, `for update`, revoke/grant lines).
- `supabase/migrations/20261019210000_events_cancel_delete.sql` -- `events_refuse_read_only` rule (cancelled, or published and `ends_at < now()`). Its trigger reads `old`, so it cannot guard INSERT. `guests_add` checks the same rule itself.
- `supabase/migrations/20261019170000_roles.sql` -- table, RLS, revoke/grant and policy pattern for an Organizer-only table.
- `supabase/tests/events_publish.test.sql` -- claims/role switching, `throws_ok`, attribute and grant checks to mirror. `events_cancel_delete.test.sql:54-62` -- the FK-to-events cascade check picks up the new tables automatically. `events_drafts.test.sql` -- add the "draft with guests is not reused" case.
- `src/modules/events/actions.ts:70` -- step 1 redirect changes to `/setup/guests`. `refuseEventChange` shows the mapping style. `actions.test.ts:62` expects the old URL.
- `src/modules/events/save.ts` -- `callSafely`, `setupPath`. `src/lib/result.ts` -- `refuse`, `fieldErrors`, `Result`.
- `app/events/[eventId]/setup/description/page.tsx`, `form.tsx` -- step page/form pattern (caption, `Field`, `Failure`, read-only redirect, Back/Next). Change its *Back* to step 2. `setup/form.tsx:95` `useSaveFeedback`.
- `app/events/[eventId]/team/page.tsx` -- non-wizard Event page pattern (metadata, `loadEvent`, read-only flag). `app/events/[eventId]/load-event.ts`.
- `src/components/app-nav.tsx:54-67` -- event group links; add *Guests*. `src/components/status-label.tsx`, `src/components/form.tsx`.
- `e2e/support.ts` (`signedIn`, `answerStep1`, `seed`, `psql`). `e2e/events-list.spec.ts:128` and any spec that walks step 1 → step 3 must follow step 2.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/20261020090000_guests.sql` -- tables, constraints, RLS, grants, `guests_add`, `events_create` blank-draft line -- FR-5, AD-1, AD-2, AD-3, AD-19, C4.
- `supabase/tests/guests.test.sql` -- matrix rows the database decides (allow and deny per policy and function, unique race, CHECKs, read-only, composite FK, cascade), attributes, grants. `events_drafts.test.sql` -- draft with guests is not reused -- AD-16.
- `src/types/database.ts` -- regenerate.
- `src/modules/guests/schemas.ts` + `schemas.test.ts` -- `parseGuestRows`, `MAX_GUEST_ROWS`, covering every matrix parse row.
- `src/modules/guests/actions.ts` + `actions.test.ts` -- `addGuests` with mocked Supabase: success, partial failure, skipped duplicate, error mapping, and a log with no name or email.
- `app/events/[eventId]/guests/add-guests-form.tsx`, `guest-list.tsx`, `page.tsx` -- shared form and list, and the Guests page.
- `app/events/[eventId]/setup/guests/page.tsx` -- step 2.
- `src/modules/events/actions.ts` (+ test), `app/events/[eventId]/setup/description/form.tsx`, `src/components/app-nav.tsx` -- step links and the sidebar entry.
- `messages/nb.json`, `messages/en.json` -- strings.
- `e2e/guests.spec.ts` -- paste mixed rows on step 2 (added count, failed list, "Not invited yet"), reopen to see the list, Guests page via the sidebar, duplicate against the list, empty state, cancelled Event has no form. Update the specs that expect step 3 right after step 1.
- `docs/ki-logg.md` -- Story 2.9 entry.

**Acceptance Criteria:**
- Given wizard step 2 or the Guests page, when I paste rows of names and emails and submit, then valid rows are added, and I see how many were added and which lines failed and why.
- Given added guests, when I reopen step 2 or the Guests page, then each guest is listed with "Not invited yet", and with no guests the empty state offers adding by hand.
- Given step 1, when I choose *Next*, then step 2 opens, and step 2's *Next* opens step 3.
- Given the change, when `supabase test db`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e` and `.githooks/test.sh` run, then they pass.

## Spec Change Log

## Review Triage Log

### 2026-10-20 — Review pass
- verdicts: 25 findings — high 0, medium 0, low 18, false 6, maybe-false 1
- findings:
  - `[low]` `[patch]` (blind 1) `guests` has no index on `event_id`, so the list, the `events_create` check and the cascade scan the table — index `(event_id, created_at)` added.
  - `[low]` `[patch]` (blind 2) one batch shares `created_at`, so a paste is listed alphabetically, not as typed — default changed to `clock_timestamp()`.
  - `[low]` `[reject]` (blind 3) a trailing tab or a third spreadsheet column fails the row — users copy two columns; the failed line is shown with its reason and can be fixed; handling it adds parsing branches.
  - `[low]` `[patch]` (blind 4) `"Berg, Ann" <ann@x.no>` keeps its quotes in the name — the angle form strips one pair of surrounding quotes, with a Vitest case.
  - `[low]` `[patch]` (blind 5) the 200-row bound is hard-coded in two messages per language — both now take `{max}` from `MAX_GUEST_ROWS`.
  - `[false]` `[reject]` (blind 6) `errors.tooLong` names the wrong limit — 200 valid lines are at most 200 × 456 characters, under 100 000, so text over the cap always means more than the allowed amount of guests or junk.
  - `[false]` `[reject]` (blind 7) UI and database disagree for a published Event with no `ends_at` — the `events_publishable` CHECK requires `ends_at` on every published Event.
  - `[low]` `[patch]` (blind 8) pgTAP lacks the allow side of the read-only rule and the non-array `p_rows` branch — grouped with verification 1; cases added for a past draft, a published future Event and `'{}'` (22023).
  - `[low]` `[patch]` (blind 9) the cancelled-Event e2e never shows a guest listed — the test seeds a guest and asserts it.
  - `[false]` `[reject]` (blind 10) regenerated types are not in the diff — they were excluded from the review diff only; `supabase gen types … | diff` is clean.
  - `[low]` `[patch]` (blind 11) the status region stays silent when two results read the same — the text is cleared while pending.
  - `[maybe-false]` `[reject]` (blind 12) a row Zod accepts but a CHECK refuses aborts the batch with a generic message — Zod rejects every C0/C1 control and trims more than `btrim`, so no such row was found; settling it needs a character whose `[[:cntrl:]]` class differs in the database locale. Low even if true.
  - `[false]` `[reject]` (blind 13) the ki-logg entry is incomplete — finalised in this run before the PR.
  - `[low]` `[reject]` (edge 1) a lost response followed by Retry reports added guests as "Already on the list" — the guests are listed right below, nothing is lost, and idempotent retries need a submission id.
  - `[low]` `[patch]` (edge 2) a read-only Event with no guests says "Add them by name and email." with no form — `GuestList` takes `readOnly` and says "No guests." there.
  - `[low]` `[reject]` (edge 3) thousands of lines past 200 come back as `tooMany` rows — keeping every line in the textarea is what lets the user add the rest; collapsing them would drop input.
  - `[low]` `[reject]` (edge 4) a crafted POST without `rows` shows an untranslated Zod message — only a hand-made request reaches it.
  - `[low]` `[reject]` (edge 5) an Event deleted between the organizer check and the lock gives 23503 → unavailable — a race of milliseconds with a generic but harmless message.
  - `[low]` `[patch]` (verification 1) a past draft accepting guests is untested — same patch as blind 8.
  - `[low]` `[patch]` (verification 2) "oldest first" is never asserted — e2e adds a second batch whose name sorts first and asserts the order.
  - `[low]` `[patch]` (verification 3) the add form's Retry is untested — e2e submits offline, sees *Retry*, and adds once back online.
  - `[false]` `[reject]` (intent 1) "validated inline" may mean live checks before submit — the project uses "inline" for errors at the field after submit (EXPERIENCE.md forms rule, step 1 and 3), and the AC's third clause has the Server Action decide.
  - `[low]` `[reject]` (intent 2) the empty state is text, not an action — the add form sits on the same surface above it, so adding by hand is offered; a second button would duplicate it.
  - `[false]` `[reject]` (intent 3) the upper bound is documented only in code and UI — the AC asks that the user sees it; the hint states it and the spec records it.
  - `[low]` `[reject]` (intent 4) anon denial on `guest_contacts` unconfirmed — `guests.test.sql` asserts anon has no SELECT on either table; the separate `throws_ok` covers `guests` only, which adds nothing over the privilege check.

## Design Notes

The input is one textarea parsed on the server, because that is the trust boundary and a spreadsheet paste arrives as tab-separated lines. Line breaks separate rows, so a name with a line break can only come from a direct call, where the CHECK refuses it. Controls inside a line (a tab in the name, NUL) fail the row in Zod. The function locks the Event row, so concurrent adds to one Event run one at a time. The unique index still backs that, and a lost race comes back as a skipped email instead of an error. "Not invited yet" is a constant until Epic 7 adds invitations.

## Verification

**Commands:**
- `supabase db reset` -- expected: all migrations apply
- `supabase test db` -- expected: all pgTAP pass
- `supabase gen types --local --lang typescript | diff - src/types/database.ts` -- expected: no diff
- `pnpm lint && pnpm format:check && pnpm test && .githooks/test.sh` -- expected: exit 0
- `pnpm test:e2e` -- expected: all pass

## Auto Run Result

**Summary:** An Organizer adds guests by pasting or typing rows of name and email on wizard step 2 (`/events/{id}/setup/guests`) or the new *Guests* page (`/events/{id}/guests`, in the sidebar). Names live in `guests`, emails in `guest_contacts`, both Organizer-only under RLS with no direct writes. `guests_add` adds a batch atomically, refuses read-only Events (`55000`), more than 200 rows (`22023`) and CHECK-breaking rows (`23514`), and returns emails a concurrent tab added first. `parseGuestRows` validates each line on the server and the form reports how many were added and which lines failed and why; each guest shows "Not invited yet".

**Files changed:**
- `supabase/migrations/20261020090000_guests.sql` -- tables, composite FK, unique email index, `(event_id, created_at)` index, RLS, grants, `guests_add`, `events_create` blank-draft line.
- `supabase/tests/guests.test.sql` -- 33 assertions; `events_drafts.test.sql` -- a draft with guests is not reused.
- `src/types/database.ts` -- regenerated.
- `src/modules/guests/schemas.ts`, `schemas.test.ts` -- `parseGuestRows`, `MAX_GUEST_ROWS`.
- `src/modules/guests/actions.ts`, `actions.test.ts` -- `addGuests`, error mapping, id-only logs.
- `app/events/[eventId]/guests/add-guests-form.tsx`, `guest-list.tsx`, `page.tsx` -- shared form and list, Guests page.
- `app/events/[eventId]/setup/guests/page.tsx` -- step 2; `setup/description/form.tsx` -- Back to step 2; `setup/form.tsx` -- `useSaveFeedback` takes any Result.
- `src/modules/events/actions.ts`, `actions.test.ts` -- step 1 opens step 2.
- `src/components/app-nav.tsx` -- *Guests* in the event group; `src/lib/status.ts` -- `notInvited` status.
- `messages/en.json`, `messages/nb.json` -- strings.
- `e2e/guests.spec.ts` -- new; `events-drafts`, `events-list`, `events-questionnaire`, `publish`, `roles`, `settings` specs -- follow step 2.
- `docs/ki-logg.md` -- Story 2.9 entry.

**Review findings:** 25 rows — 12 rows in 10 patched entries (all low), 0 deferred, 13 rejected (low 6, false 6, maybe-false 1). Every rejected finding and its reason is in the Review Triage Log above.

**Follow-up review recommended:** false. No high or medium entry was patched (patched by verdict: low 10).

**Verification:** `supabase db reset` applied all migrations; `supabase test db` passed 256 tests in 11 files; regenerated types match; `pnpm lint` and `pnpm format:check` clean; `pnpm test` passed 265; `.githooks/test.sh` passed 26 of 26; `pnpm test:e2e` passed 73 of 73.

**Residual risks:** a Retry after a lost response reports already-added guests as "Already on the list" (they are listed below). A third spreadsheet column or a trailing tab fails the row with a reason instead of being ignored. The read-only empty text ("No guests.") has no test. Role-holder access to guests waits for Epic 3's `role_members`; invitations and the invite-link empty-state option wait for Epic 7.
