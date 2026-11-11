---
title: 'Story 7.10: Guest flow check'
type: 'feature'
created: '2026-11-11'
status: 'done'
baseline_revision: 'a607e4419f9a3523a645328a42a1b6cdea8d4f22'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-8-delete-guest-data.md'
warnings: ['oversized']
deferred: []
---

<intent-contract>

## Intent

**Problem:** The flagship Event in `supabase/seed.sql` holds no guests, so nothing proves the Guest side end to end (SM-4, UJ-3 Core path) or that guest data stays inside the Roles that own it (NFR1, SM-2). No test fails if a deny rule, the token rules or the deletion counts break.

**Approach:** Seed 80 fictional guests in every Core state and an active Guests Role with one holder, then add pgTAP tests against the seed, a Playwright Guest path at 375px, a second test for an expired link, and Role-visibility tests with a leak check for "other needs". No application code changes unless a test finds a defect.

## Boundaries & Constraints

**Always:**
- Seed (AD-15): the flagship Event `f1a90000-…-e1` gets 80 guests with fictional names and `@example.com` emails, every id starting `f1a90000-` so the seed's first statement removes them on re-run (extend its `delete from auth.users` pattern to cover guest users; Event delete cascades the rest). States and counts: not invited 15 (no user, no token), link copied 15 (guest-only user, one active guest token, never opened), opened 10 (same plus `first_opened_at`), coming without plus-one 20, coming with plus-one 12, not coming 8. The 40 answered guests have a guest-only user, an active token, `first_opened_at` and an `rsvps` row. Not answered = 40; coming = 32; headcount = 44. At least three coming guests carry an `other_needs` text without health details; one of them uses the marker string `Seed-needs: parking near the door` for the leak test. A deleted guest has no row, so "deleted" is proven by the deletion tests below, not by a seeded row. Guest users have no password, no identity, no Role (guest-only per `guests_is_guest_only`). Set the Event's questionnaire guest count to 80 if the column exists, so other Roles see the expected-count line. Tokens come from the existing system functions (the seed runs as postgres); never insert a token hash by hand. No real person, address or phone number.
- The Guests Role (`…-b5`) becomes active with one joined holder `demo.guests@example.com` (name `Gwen Guests`, password `abcdefg1`, same pattern as the other seeded users). Update every existing flagship assertion this changes (active Role count, Role lists, Timeline lanes, Dashboard) so it states the new truth; never loosen a check to make it pass.
- pgTAP (`supabase/tests/flagship_seed.test.sql` or a new `flagship_guests.test.sql`, run by the existing `supabase test db` in CI): the seeded counts per state; no email outside `example.com`; the Organizer reads 80 guests and 40 RSVPs and 80 contacts; Gwen reads 80 guests and 40 RSVPs and zero `guest_contacts`; the Venue holder reads zero guests, RSVPs and contacts; anon is denied; a seeded Guest reads only their own guest and RSVP row; a direct insert, update or delete on `guests` and `rsvps` as a Guest, holder and Organizer is denied (42501); one active guest token per tokened guest. Deletion counts: inside the test's transaction, `guests_delete_guest_data` for one answered seeded guest as that Guest removes exactly their guest, contact, RSVP and token rows and their auth user, changes nothing for the other 79, and a second call changes nothing.
- Playwright, 375px, no account created (count `auth.users` rows with a password before and after): a seeded link-copied Guest opens their personal link (obtained from the seeded token the way the Organizer's *Copy link* builds it), presses *Continue*, answers yes with a plus-one and a line under other needs, sees the confirmation, reopens the Dashboard, changes the answer, deletes their data, and the Organizer's Guests tab then lists 79 guests. A second test revokes a seeded Guest's link through *New link* as the Organizer and opens the old link in a clean browser: the expired page appears, with the Organizer's name and without the Event's name.
- Playwright visibility, same Event: the Organizer and Gwen see names, RSVP state, plus-ones and other needs; only the Organizer sees an email anywhere (Gwen's tab and pages contain no `@example.com` of a guest); the Dashboard *On track* summary of both shows invited 80, coming 32, not coming 8, not answered 40 and headcount 44 (read from the table, not the pie); the Venue holder has no Guests nav item, gets the no-access page on the Guests URL, and sees the expected-count line. A leak assertion visits every page the Venue holder and the Food holder can open in the Event (Dashboard, Tasks, My tasks, Timeline, Team, Settings and each seeded Task) and asserts the marker string is absent from the HTML and the visible text.
- The new tests must not race `e2e/flagship.spec.ts`: both reseed the flagship Event, so extend that file's serial describe, or make the configuration run these files one at a time, and show it with a full default-config run. Reseed in `beforeAll` and keep tests independent: each picks its own seeded guest, and the deleting test uses one no other test reads.
- Coverage statement: `epics.md` is a planning document and is not edited. The epic summary the story asks for goes into this spec's `## Auto Run Result` and the PR body: FR3 (personal link), FR5, FR15 without consent and food, FR18 and FR19 (Guests) covered; FR15's food, allergy and hotel part deferred to Target 2; the shared link (7.2) and optional account (7.6) to Target 3; FR17 (*Remind*) to Target 3; plus the carry-forwards listed under "Carry-forwards from Epic 7" in `epics.md`.
- Server logs and test output carry no guest email or other-needs text beyond what the fixtures hold.

**Never:**
- No application code, policy, migration or function change unless a new test exposes a defect; then stop at the smallest fix and record it in `## Auto Run Result`. No new table or column. No secret key in tests beyond what `e2e/support.ts` already does. No AI, no email, no Target story behaviour. No edits to `_bmad/`, planning artifacts or `docs/` except `docs/ki-logg.md`. Do not run the seed against the cloud project.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seed loads | `supabase db reset`, then re-run seed | 80 guests per the state counts; second run identical | none |
| Guest path | seeded link-copied Guest | answer, change, delete with no new password user | none |
| Expired link | *New link*, then old link in clean browser | expired page, Organizer named, Event not named | none |
| Organizer / Gwen | open Guests tab and Dashboard | same names and counts; email only for Organizer | none |
| Other Role | Venue holder | no nav item, no-access page, expected count only | none |
| Leak check | marker string, Venue and Food holders | absent from every page | assertion fails if present |
| Deny rules | Guest, holder, anon direct writes and cross reads | zero rows or 42501 | none |
| Delete in pgTAP | one answered Guest deletes | exactly their rows and user gone; 79 stay | second call no change |

</intent-contract>

## Code Map

- `supabase/seed.sql` -- the flagship seed (79 lines): users `…-a1..a4`, Event `…-e1`, Roles `…-b1..b6` (`guests` = `…-b5`, now inactive), members, Tasks. The first statement deletes users `like 'f1a90000-0000-4000-8000-0000000000a_'`; widen it for guest users. Seed runs as postgres.
- `supabase/migrations/20261107120000_guest_links.sql` -- `guests_is_guest_only`, `invite_tokens_guest_link(event, user, renew)` (system function, returns the token), `guests.user_id`/`first_opened_at`; `20261108120000_guests_rsvp.sql` -- `rsvps` columns and CHECKs; `20261110130000_guests_delete_guest_data.sql` -- the deletion function; `20261020090000_guests.sql` -- `guests`, `guest_contacts`.
- `supabase/tests/flagship_seed.test.sql` (plan 14; counts Roles and Tasks), `guest_links.test.sql`, `guests_rsvp.test.sql`, `guests_delete_guest_data.test.sql`, `guests_role_read.test.sql` -- patterns for actors via `set local role` and `request.jwt.claims`.
- `e2e/flagship.spec.ts` -- serial, reseeds twice in `beforeAll` via `reseedFlagship` (`e2e/support.ts`), logs in with `abcdefg1`; asserts Roles, lanes and Dashboard counts the new Role may change. `e2e/rsvp.spec.ts:1-46` -- `invite`, `guestAt` (phone-width browser, per-test IP header), the Guest path steps and texts. `e2e/holder-view.spec.ts`, `e2e/guests.spec.ts`, `e2e/guest-link.spec.ts` -- Guests tab, nav and expired-link assertions to copy.
- `src/modules/guests/link.ts`, `copyGuestLink` in `src/modules/guests/link-actions.ts` -- how a personal link URL is built from the token. `app/rsvp/[eventId]/*`, `app/invite/*` -- the Guest pages. `app/events/[eventId]/on-track.tsx`, `rsvp-pie.tsx`, `guests/*` -- the summary table and the Guests tab.
- `playwright.config.ts` -- workers and parallelism; decide the no-race rule from it. `.github/workflows/ci.yml` -- confirms pgTAP, Vitest and Playwright run in CI.
- Read AD-3, AD-5, AD-15, AD-16 in `_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md` before writing SQL.

## Tasks & Acceptance

**Execution:**
- `supabase/seed.sql` -- 80 guests, guest users, tokens, first-opened times, RSVPs, the active Guests Role with Gwen; re-runnable -- AD-15.
- `supabase/tests/flagship_seed.test.sql` and `flagship_guests.test.sql` -- seed counts, deny rules, visibility per actor, deletion counts, no real email; fix the counts the Guests Role changes -- AD-16.
- `e2e/flagship.spec.ts` (or `e2e/guest-flow.spec.ts` plus the serial rule) -- Guest path at 375px, expired link, Role visibility and summary counts, leak check; fix assertions the new Role changes.
- `playwright.config.ts` -- only if needed so reseeding specs do not run concurrently.
- `docs/ki-logg.md` -- the story's entry in the existing format, verdict left for the owner.

**Acceptance Criteria:**
- Given `supabase/seed.sql`, when it is loaded twice, then the flagship Event holds 80 fictional guests in the stated state counts, nothing names a real person, and pgTAP asserts it in CI.
- Given the seeded Event, when the Playwright Guest path runs at 375px, then a Guest answers, changes the answer and deletes their data with no account created, and a link replaced by *New link* shows the expired page.
- Given the same Event, when the Organizer, the Guests-Role holder and another Role's holder are signed in, then each sees only the guest fields their Role owns, nobody but the Organizer sees an email, the summary matches the seeded counts, and a test fails if the marker "other needs" string appears outside the Guest, Organizer and Guests-Role views.
- Given a broken deny rule, token rule or deletion count, when CI runs, then a pgTAP, Vitest or Playwright test fails, with no AI and no application email involved.

## Spec Change Log

## Review Triage Log

### 2026-11-11 — Review pass
- verdicts: 32 findings — high 0, medium 7, low 19, false 6, maybe-false 0 (blind, edge, gap and intent layers)
- findings:
  - `[low]` `[patch]` (blind) the AI log entry has `Review: NIL` — filled in at finalize.
  - `[low]` `[reject]` (blind) the spec hardcodes `http://localhost:3000` — 25 places in `e2e/` already do, and the config has one project.
  - `[low]` `[reject]` (blind) clipboard permissions in the shared `beforeEach` — the *New link* test makes the app write to the clipboard; the project runs Chromium only.
  - `[false]` `[reject]` (blind) `linkOf` may change token state — `invite_tokens_guest_link` returns the active token when one exists, so a repeat call changes nothing.
  - `[medium]` `[patch]` (blind) the leak check covers only the Venue and Food holders and one marker — extended to Gwen and to every seeded other-needs text (0f2d027).
  - `[low]` `[patch]` (blind) pgTAP is brittle (hard-coded numbers, unscoped contact count, `like` without wildcard) — `like` replaced by `=` (1550057); the numbers are the seed's contract and other tests roll back, so the rest stays.
  - `[low]` `[reject]` (blind) the tests depend on shared mutable state and order — the describe is serial and the deleting test is last, with a comment; a retry reruns the describe from its `beforeAll` reseed.
  - `[low]` `[reject]` (blind) the seed edits are weaker than their comments — the Event cascades from the Organizer user (`events.organizer_id` is `ON DELETE CASCADE`); the metadata update and missing cancelled-state guests are cosmetic or outside the story's states.
  - `[low]` `[patch]` (blind) gaps in the Guest path test (old link, contact list, one overflow check) — dead-link and contact checks added (0f2d027); one overflow check stays, the RSVP steps are covered at 320px by `e2e/rsvp.spec.ts`.
  - `[medium]` `[patch]` (edge) `passwordUsers()` counts only `seed.guest.%` users — replaced by checks on the guest's own row (0f2d027).
  - `[medium]` `[patch]` (edge) claim: "count all auth.users rows" — same fix.
  - `[medium]` `[patch]` (edge) claim: no guest email on Gwen's pages — asserted on every path for Gwen (0f2d027).
  - `[low]` `[reject]` (edge) `linkOf` hardcodes the origin — same as the blind row.
  - `[low]` `[reject]` (edge) `taskIds()` expects 13 — the count guards against an empty loop; a seed change should fail loudly.
  - `[false]` `[reject]` (edge) `finish()` is called as `anon` — `flagship_seed.test.sql` ends the same way and passes.
  - `[low]` `[reject]` (edge) `test_denied` hides the denying layer — a limit of what the test proves, not a bug; both layers raise 42501.
  - `[low]` `[reject]` (edge) the seed deletes every `f1a90000-%` user — that prefix is the flagship's by AD-15, and other fixtures use other prefixes.
  - `[low]` `[reject]` (edge) the temp table has no `on commit drop` — each seed run is a new session, so a failed run leaves nothing.
  - `[low]` `[reject]` (edge) the deleting test must run last — same as the blind row.
  - `[medium]` `[patch]` (gap) the no-account assertion cannot see a new account — same fix as the edge rows (0f2d027).
  - `[low]` `[patch]` (gap) the seed comment says guest users are like `copyGuestLink`'s, which get a random password — comment reworded (e049212).
  - `[low]` `[reject]` (gap) `test_denied` covers privilege and RLS alike — same as the edge row.
  - `[low]` `[reject]` (gap) the deletion tests rely on order and rollback — pgTAP rolls back by design; the e2e is serial.
  - `[medium]` `[patch]` (intent) the sweep checks one marker on two Roles' pages — extended (0f2d027).
  - `[false]` `[reject]` (intent) "deleted" is not a seeded state — a deleted guest has no row; the pgTAP deletion test and the e2e cover it (Design Notes).
  - `[false]` `[reject]` (intent) the Guest Dashboard may be another surface — it is `/rsvp/<event>` (Story 7.5).
  - `[false]` `[reject]` (intent) no Vitest test — the story accepts a pgTAP, Vitest or Playwright test; the checks are in pgTAP and Playwright.
  - `[low]` `[reject]` (intent) CI loading the seed is not shown in the diff — `supabase start` loads it and `flagship_seed.test.sql` already relies on that.
  - `[low]` `[reject]` (intent) the FR coverage listing is not in the diff — it is written in `## Auto Run Result` and the PR body; `epics.md` is a planning document.
  - `[low]` `[reject]` (intent) no automated check that no name is a real person — emails are asserted to end in `example.com`; a name cannot be tested for being real.
  - `[false]` `[reject]` (intent) only two non-Guests Role holders and no headcount for the Venue holder — the story asks for another Role's holder to see only the fields their Role owns; the Venue and Food holders are checked and see no guest figure.
  - `[medium]` `[patch]` (intent) the sweep misses arbitrary other-needs strings — same fix as the leak-check row.

## Design Notes

- "Deleted" is a state of absence: the seed cannot hold it, so the pgTAP deletion test and the e2e delete cover it; the 80 count includes only living guests.
- Activating the Guests Role is the smallest way to give the visibility test a real holder on the same Event, at the cost of touching existing flagship assertions. The alternative, activating the Role inside the test, would leave the seeded Event unable to demo the Guests Role.
- Work on the current branch in small one-concern commits `7.10: <what and why>` (at least four words after the prefix) with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; never push; never skip hooks; pnpm only. Do not commit this spec file. Run Playwright in the foreground with `--workers=1`; `next dev` rewrites AGENTS.md during e2e, so `git checkout AGENTS.md` before committing.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP pass
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test` -- expected: pass
- `pnpm test:e2e` -- expected: the whole suite passes serially; also run the new and flagship specs once with the default worker count to show they do not race
