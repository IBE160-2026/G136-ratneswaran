---
title: '2.10: Edit and remove guests'
type: 'feature'
created: '2026-10-20'
baseline_revision: 'c49097ae17db4f7786985f4fcfedcf5b3c72841b'
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

**Problem:** A mistyped or cancelled guest cannot be corrected or removed, so the guest list drifts from reality (FR-5, GitHub issue #59).

**Approach:** Add two AD-2 mutation functions, `guests_update` and `guests_remove`. Then add *Edit* and *Remove* to every row of the shared guest list (wizard step 2 and the Guests page): edit opens inline, and remove hides the row at once and shows a 10 s *Undo* toast that adds the same name and email back.

## Boundaries & Constraints

**Always:**
- Migration `guests_update(p_guest_id uuid, p_name text, p_email text) returns void` and `guests_remove(p_guest_id uuid) returns void`. Both are AD-2/AD-5 mutation functions (`security definer`, `search_path = ''`, granted to `authenticated`, revoked from `public`/`anon`). Each one:
  - reads the guest's `event_id` itself and never trusts one from the caller. A missing guest, or a caller who is not `is_organizer` of that Event, gets `42501`;
  - locks the Event row `for update` and refuses a cancelled Event, or a published one that has ended, with `55000` (the same rule as `guests_add`);
  - `guests_update` writes the trimmed name to `guests` and the trimmed email to `guest_contacts` in one transaction. The existing CHECKs refuse bad data (`23514`), and the unique `(event_id, lower(email))` index refuses an email another guest of the Event has (`23505`). Changing only the case of the guest's own email is allowed;
  - `guests_remove` deletes the guest, and its contact goes by cascade. A code comment says: "Epic 7: once a guest has an RSVP or an auth user, removal goes through guests_delete_guest_data."
- No grants change. `authenticated` keeps select only on both tables (AD-19); the functions are the only writers.
- `src/modules/guests/schemas.ts` exports its row schema as `guestSchema` so the edit uses the same validation as adding (name 1–200 after trim, email ≤ 254, no control or line-separator characters).
- `src/modules/guests/actions.ts` gets three Server Actions. Each parses with Zod first, redirects to login without claims, returns the Result shape, and logs only `eventId`, `userId` and the error code:
  - `updateGuest(prev, formData)` takes `eventId`, `guestId`, `name` and `email`. Field errors come from `guestSchema`. `23505` → email field error `guests.add.reasons.alreadyListed`; `42501` → forbidden; `55000` → read-only; `23514` → invalid input; anything else → unavailable.
  - `removeGuest({ eventId, guestId })` maps errors like `updateGuest`.
  - `restoreGuest({ eventId, name, email })` re-adds one row through `guests_add`. A returned skipped email → refuse `duplicate` with message `guests.list.errors.restoreDuplicate`.
  - All three revalidate the Event's pages on success.
- The guest list renders rows through a client component. The server keeps loading the rows.
  - Each row keeps its name, email and "Not invited yet", and gets *Edit* and *Remove* buttons with accessible names that include the guest's name ("Edit Ann Berg").
  - On a read-only Event (the Guests page's `readOnly`) the rows have no buttons.
  - The rows wrap at 320px without horizontal scroll, and the count heading stays.
- **Edit:** the row turns into an inline form with *Name*, *Email*, *Save* and *Cancel*, prefilled, with focus on *Name*.
  - Errors are inline with `aria-invalid`/`aria-describedby`, and focus goes to the first error. *Save* is disabled while pending.
  - After saving or *Cancel*, the row is shown again and focus returns to its *Edit* button.
- **Remove:** there is no dialog (UX-DR23). The row hides at once (optimistic), `removeGuest` runs, and `undoToast` shows "{name} removed." with *Undo*.
  - Focus moves to the next row's *Edit*, else the previous row's, else the count heading or, if the list is now empty, the page `h1`.
  - If the remove fails, the row comes back and an error toast says so.
  - *Undo* calls `restoreGuest` with the same name and email; the restored guest returns at the end of the list. A failed restore shows an error toast.
  - Re-adding by hand through the form is the timeless restore path.
- All strings go in `messages/nb.json` and `messages/en.json`.

**Never:**
- No soft delete, no `removed_at`, no purge job. No confirmation dialog for *Remove*.
- No direct UPDATE or DELETE grants on `guests` or `guest_contacts`.
- No `guests_delete_guest_data` (Epic 7). No invitations, RSVP, bulk edit or bulk remove.
- No guest name or email in logs or URLs.
- No edit of earlier migrations, `_bmad/` or planning documents. No hand edit of `src/types/database.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Edit name | A renames "Ann Berg" to "Ann Dahl" | saved; row shows "Ann Dahl" | No error expected |
| Edit email | A changes `ann@x.no` to `ann.berg@x.no` | saved | No error expected |
| Own email case | A changes `ann@x.no` to `ANN@x.no` | saved | No error expected |
| Taken email | A sets Ann's email to Bo's (any case) | refused, email field "Already on the list." | `23505` → field error |
| Bad input | blank name, `ann@`, or a control character | inline field error, nothing saved | Zod (and `23514` from a direct call) |
| Remove | A removes Ann | row gone, toast "Ann Berg removed." with *Undo*; guest and contact rows deleted | No error expected |
| Undo | A chooses *Undo* within 10 s | Ann back with the same name and email, at the end of the list | No error expected |
| Undo after re-use | the email was added again before *Undo* | error toast, nothing duplicated | `duplicate` |
| Not Organizer | B calls `guests_update` or `guests_remove` on A's guest, or updates/deletes the rows directly | refused | `42501` |
| Anonymous | anon calls either function | denied | `42501` |
| Unknown guest | A calls with a random uuid | refused | `42501` |
| Read-only | A edits or removes a guest of a cancelled or ended published Event | refused; the page shows no buttons | `55000` |
| Many rows | 40 guests at 320px | count shown, no horizontal scroll | No error expected |

</intent-contract>

## Code Map

- `supabase/migrations/20261020090000_guests.sql` -- tables, CHECKs, unique email index, RLS, `guests_add` (the read-only rule and the organizer/lock pattern to mirror).
- `supabase/tests/guests.test.sql` -- seeds, claims/role switching, `throws_ok`, attribute and grant checks; direct INSERT/UPDATE/DELETE denials already exist.
- `src/modules/guests/schemas.ts` -- `rowSchema` (export as `guestSchema`), `controls` regex. `actions.ts` -- `addGuests`, `refuseAdd`, the `fail` logger with ids only; `actions.test.ts` mock pattern.
- `app/events/[eventId]/guests/guest-list.tsx` -- server component that loads guests and contacts (oldest first); split the rows into a client component. `page.tsx` passes `readOnly`, and `setup/guests/page.tsx` renders the list for an editable Event.
- `app/events/[eventId]/guests/add-guests-form.tsx` -- form/error/`callSafely` pattern. `app/events/[eventId]/setup/form.tsx:95` `useSaveFeedback`.
- `src/lib/feedback.ts` -- `undoToast` (10 s, sonner action) and `saveFailedToast`. `src/components/toast-hotkey.tsx` already gives F6/Alt+T.
- `src/components/form.tsx` -- `Field`, `inputClass`, `buttonClass`, `Failure`. `src/components/status-label.tsx`.
- `e2e/guests.spec.ts` -- `addGuest` psql helper, `seed`, `signedIn`, the 320px overflow check.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/20261020120000_guests_update_remove.sql` -- `guests_update`, `guests_remove` -- AD-2, AD-5, AD-19.
- `supabase/tests/guests_update_remove.test.sql` -- matrix rows the database decides (allow and deny per function, unknown guest, own-email case, taken email, CHECKs, read-only, cascade of the contact), attributes, grants -- AD-16.
- `src/types/database.ts` -- regenerate.
- `src/modules/guests/schemas.ts` -- export `guestSchema`.
- `src/modules/guests/actions.ts` + `actions.test.ts` -- `updateGuest`, `removeGuest`, `restoreGuest` with mocked Supabase: success, field errors, error mapping, restore duplicate, id-only logs.
- `app/events/[eventId]/guests/guest-list.tsx`, new `guest-rows.tsx` -- client rows with inline edit, optimistic remove, Undo, focus handling.
- `messages/nb.json`, `messages/en.json` -- strings.
- `e2e/guests.spec.ts` -- edit name and email and reload, taken email shows the field error, remove then *Undo* restores the same details, remove without undo stays gone after reload, read-only Event has no buttons, 40 guests at 320px.
- `docs/ki-logg.md` -- Story 2.10 entry.

**Acceptance Criteria:**
- Given a guest in my list, when I edit their name or email and save, then the change is saved under the same validation and uniqueness rules, and it shows after a reload.
- Given a guest, when I choose *Remove*, then the row disappears with an *Undo* toast, and *Undo* brings back the same name and email.
- Given a long list, when I view it at 320px, then the guest count is shown and the rows are readable without horizontal scroll.
- Given the change, when `supabase test db`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e` and `.githooks/test.sh` run, then they pass.

## Spec Change Log

## Review Triage Log

### 2026-10-20 — Review pass
- verdicts: 26 findings — high 0, medium 0, low 17, false 8, maybe-false 1
- note: the first launch of the blind, edge and verification layers found no diff (Playwright had emptied `test-results/`). Those three reran on a copy under `out/`; the intent layer read the working tree, which held the same changes.
- findings:
  - `[false]` `[reject]` (intent 1) AC1 says "columns", so the change could have been column grants — the spec's Design Notes choose one function because name and email sit in two tables; pgTAP proves B and anon are refused and that no direct write exists.
  - `[low]` `[reject]` (intent 2) Undo brings back a new guest with a new id at the end of the list — name and email, the details the user sees, come back; nothing references a guest before Epic 7 (Design Notes).
  - `[false]` `[reject]` (intent 3) no timeless restore path after the toast — the add form on the same page re-adds a guest at any time, which the spec names as that path.
  - `[false]` `[reject]` (intent 4) the Epic 7 note is in SQL, not the action — the AC asks for a note "in code", and the function is where `guests_delete_guest_data` will replace the delete.
  - `[low]` `[patch]` (blind 1) the `shown.length > 1 ? headingRef` branch is dead and `headingRef` is unused — removed, grouped with edge 1.
  - `[low]` `[reject]` (blind 2) a failed remove offers no Retry — the row comes back with an error toast and *Remove* can be pressed again; a retry loop adds state for a rare offline click.
  - `[low]` `[reject]` (blind 3) a guest removed between the id lookup and the lock makes `guests_update` report success — a race of milliseconds between two tabs; the guard adds a branch to both functions.
  - `[low]` `[reject]` (blind 4) `guests_update` has no Epic 7 note about changing an invited guest's email — Epic 7 decides what an email change means for invitations; a note now guesses at that design.
  - `[low]` `[patch]` (blind 5) read-only cases are asymmetric across the two functions, with no allow case for a published future Event — grouped with verification 1.
  - `[low]` `[reject]` (blind 6) the read-only rule is copied a third time — a shared helper means redefining `guests_add` too; the per-function pgTAP cases added under verification 1 pin every copy.
  - `[low]` `[patch]` (blind 7) Vitest lacks the ids-only log check for remove/restore and malformed-id cases — added.
  - `[low]` `[reject]` (blind 8) no Escape-to-cancel, and opening another row's edit drops unsaved changes — *Cancel* is there; neither is required, and both add handlers.
  - `[low]` `[patch]` (blind 9) the 320px check never opens the edit form — the e2e opens edit on the long-named guest and checks overflow.
  - `[low]` `[reject]` (blind 10) Undo expiry is untested — the 10 s duration lives in the shared `undoToast`; the duplicate-on-Undo part is patched under verification 2.
  - `[false]` `[reject]` (blind 11) the ki-logg entry is incomplete — finalised in this run before the PR.
  - `[false]` `[reject]` (blind 12) types, spec and sprint status are missing from the diff — left out of the review diff on purpose; `supabase gen types … | diff` is clean.
  - `[maybe-false]` `[reject]` (blind 13) `role="alert"` inside sonner may announce twice — the same pattern as `saveFailedToast`; settling it needs a screen-reader run. Low even if true.
  - `[low]` `[patch]` (edge 1) removing a row whose neighbour is open in Edit leaves no focus target — the target falls back to the page `h1` when the neighbour's *Edit* is not mounted.
  - `[low]` `[reject]` (edge 2) same race as blind 3 — same reason.
  - `[false]` `[reject]` (edge 3) a guest without a contact row would lose its email silently — `guests_add` writes both rows in one block and no other writer exists, so such a guest cannot occur.
  - `[low]` `[patch]` (edge 4) a remove refused as forbidden or read-only says "Try again" — the toast now shows the action's message unless the failure is `unavailable`.
  - `[false]` `[reject]` (edge 5) a guest with an empty email cannot be restored — same refutation as edge 3.
  - `[false]` `[reject]` (edge 6) Enter while pending queues a second `updateGuest` — the second call writes the same values, so nothing changes.
  - `[low]` `[patch]` (verification 1) each function's read-only rule is only half tested — pgTAP adds update on the ended Event, remove on the cancelled one, and both allowed on a past draft and a published future Event.
  - `[low]` `[patch]` (verification 2) Undo after the email was added again is untested — e2e re-adds Ann, presses Undo and expects the duplicate message with one Ann; the `removeFailed` toast needs a forced server failure and is left to the Vitest mapping.
  - `[low]` `[patch]` (verification other) dead heading branch — same patch as blind 1.

## Design Notes

The AC names AD-19 column rights, but name and email sit in two tables. Two direct updates could leave half a change behind when the email collides, so one function writes both (AD-2), and no write grant is added. AD-19's "only the Organizer can write" then holds through the function, and pgTAP proves it.

*Remove* is a hard delete, and *Undo* re-adds the same name and email, because `guests_delete_guest_data` (Epic 7) will also delete for real. A soft delete would need a filter on every read and a purge job. The cost is that the restored guest gets a new id and moves to the end of the list. That is acceptable while nothing else points at a guest.

## Verification

**Commands:**
- `supabase db reset` -- expected: all migrations apply
- `supabase test db` -- expected: all pgTAP pass
- `supabase gen types --local --lang typescript | diff - src/types/database.ts` -- expected: no diff
- `pnpm lint && pnpm format:check && pnpm test && .githooks/test.sh` -- expected: exit 0
- `pnpm test:e2e` -- expected: all pass

## Auto Run Result

**Summary:** Every row of the shared guest list (wizard step 2 and the Guests page) has *Edit* and *Remove*. *Edit* opens an inline form that saves name and email together through `guests_update`, using the same Zod rules as adding, the CHECKs and the unique email index (a taken email shows "Already on the list." on the field). *Remove* hides the row at once and calls `guests_remove`, a hard delete with the contact going by cascade. A 10 s *Undo* toast then re-adds the same name and email through `guests_add`. Both functions are Organizer-only, read the Event from the guest row, and refuse read-only Events (`55000`). No write grants were added, and a code comment hands removal to `guests_delete_guest_data` in Epic 7.

**Files changed:**
- `supabase/migrations/20261020120000_guests_update_remove.sql` -- `guests_update`, `guests_remove`.
- `supabase/tests/guests_update_remove.test.sql` -- 34 assertions.
- `src/types/database.ts` -- regenerated.
- `src/modules/guests/schemas.ts` -- `guestSchema` exported.
- `src/modules/guests/actions.ts`, `actions.test.ts` -- `updateGuest`, `removeGuest`, `restoreGuest`, shared `caller` (login check and ids-only logger).
- `app/events/[eventId]/guests/guest-list.tsx`, `guest-rows.tsx` -- server loading, client rows with inline edit, optimistic remove, Undo and focus handling.
- `messages/en.json`, `messages/nb.json` -- strings.
- `e2e/guests.spec.ts` -- edit, taken email, remove with and without Undo, Undo after the email was re-added, read-only without buttons, 40 guests and the edit form at 320px.
- `docs/ki-logg.md` -- Story 2.10 entry.

**Review findings:** 26 rows — 9 rows in 6 patched entries (all low), 0 deferred, 17 rejected (low 8, false 8, maybe-false 1). Every rejected finding and its reason is in the Review Triage Log above.

**Follow-up review recommended:** false. No high or medium entry was patched (patched by verdict: low 6).

**Verification:**
- `supabase db reset` applied all migrations, and `supabase test db` passed 290 tests in 12 files. The regenerated types match.
- `pnpm lint` and `pnpm format:check` were clean, `pnpm test` passed 286, and `.githooks/test.sh` passed 26 of 26.
- `pnpm test:e2e` passed 75 of 76. The one failure was `login.spec.ts` "logged-out /events returns there", which is known to be flaky, and it passed when rerun alone.

**Residual risks:**
- A restored guest gets a new id and moves to the end of the list.
- A guest removed in another tab between the lookup and the lock makes an edit report success with nothing saved.
- The `removeFailed` toast is covered only by the Vitest mapping, not e2e.
- The read-only rule now exists in three functions, pinned by pgTAP per function.
- The review diff must live outside `test-results/`, which Playwright empties.
