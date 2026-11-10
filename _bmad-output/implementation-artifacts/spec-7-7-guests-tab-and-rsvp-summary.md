---
title: 'Story 7.7: Guests tab and RSVP summary'
type: 'feature'
created: '2026-11-10'
status: 'done'
baseline_revision: 'bc3ed57980798926dce41f71ada4629df6996a46'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-5-guest-dashboard.md'
warnings: ['oversized']
deferred:
  - summary: >-
      A joined holder of the active Guests Role can still read guests and rsvps of a cancelled Event through the API, although the Event row and its pages are hidden from them.
    evidence: |-
      guests_select_guests_role and rsvps_select_guests_role do not look at events.cancelled_at, while events_select_member hides a cancelled Event from holders. The story does not say whether a holder keeps read access after cancellation; narrowing it needs a policy change and an owner decision.
    location: >-
      supabase/migrations/20261110120000_guests_role_read.sql
    severity: low
  - summary: >-
      The Guests tab and the Dashboard RSVP summary read at most 1000 guests (the API row cap), so both undercount silently past that.
    evidence: |-
      guest-list.tsx and on-track.tsx read rows and count on the client; max_rows is 1000 in supabase/config.toml. Both carry a shortcut comment. An exact summary needs a SQL aggregate.
    location: >-
      app/events/[eventId]/on-track.tsx
    severity: low
---

<intent-contract>

## Intent

**Problem:** The Guests tab is a flat Organizer-only list: no summary of who is coming, no filter, every row rendered at once, and a holder of the Guests Role cannot see it at all. The Dashboard's *On track* still says "N guests added" instead of the RSVP state.

**Approach:** One migration lets a joined holder of the **active** Guests Role read `guests` and `rsvps` (never `guest_contacts`). The Guests tab gains four summary tiles that filter the list, the first 100 rows with *Show more*, and a read-only view for that holder. *On track* shows the RSVP summary as a pie chart with a table to viewers who may read RSVPs, and the questionnaire's expected guest count to other Role-holders.

## Boundaries & Constraints

**Always:**
- RLS is the boundary (AD-3, AD-16). `guests` and `rsvps` each get a select policy for a joined holder of the Event's `guests` Role while `roles.active` is true, built on `public.holds_role(role_id)`, never an email match. The existing Organizer and guest-self policies stay. `guest_contacts` stays Organizer-only. An inactive Guests Role means only the Organizer reads. pgTAP proves one allow and one deny per actor (see matrix).
- No write path changes: every guest mutation function keeps `is_organizer`. The Guests-Role holder's tab is read-only: names, state, plus-one, "other needs"; no email, no add form, no Share / Edit / Remove.
- Tiles: Guests, Coming, Not coming, Not answered, each a `button` with `aria-pressed` and its count. *Guests* means no filter. Pressing a tile filters the list and a polite live region announces it ("Showing 16 guests who have not answered"). Not answered = every guest without an RSVP row (not invited, link copied, opened). Counts come from all loaded rows, not the visible 100.
- List: the server loads all guests in a fixed number of queries regardless of count (today's two for the Organizer; one for the holder, who must not query `guest_contacts`). The client renders the first 100 of the filtered rows and a *Show more* button adds 100 more; no infinite scroll, no polling. Row states and the Organizer's actions (Stories 7.1, 2.10) stay as they are. Reflows at 320 CSS px.
- Empty list keeps today's `guests.list.empty` / `emptyReadOnly` text. A filter with no match shows "No guests match this filter." and a *Clear filter* button.
- RSVP summary maths is one pure function in `src/modules/guests` used by both the tiles and *On track*: `invited` (all guests), `coming`, `notComing`, `notAnswered`, `headcount` = coming + their plus-ones. A plus-one on a not-attending row is never counted. Vitest covers zero guests, all answered, and a plus-one on a *No*.
- *On track*: a viewer who may read RSVPs (Organizer, or holder of the active Guests Role) gets the summary in place of "N guests added": an inline-SVG pie (no chart dependency) with `role="img"` and an accessible name stating the four numbers, a table with the same numbers in text (never colour alone; slices also differ by pattern or are labelled), and the headcount including plus-ones. Zero guests renders no pie, only the text. Any other Role-holder sees one line with `events.guest_count` from the questionnaire (nothing when it is null), never a figure computed from guest rows.
- Navigation shows *Guests* to the Organizer and to a holder of the active Guests Role; the page gate matches, and everyone else keeps the no-access page.
- "Other needs" renders as plain text and never enters a URL, log or error. All copy in `messages/en.json` and `messages/nb.json` (natural Bokmål), key parity kept. Quiet team-side voice.
- Regenerate `src/types/database.ts` with `supabase gen types` after the migration; never hand-edit it.

**Never:**
- No *Remind*, no unanswered-request tile, no shared invite link or its empty-state action, no food / hotel fields or the Food & Beverage and Travel & Logistics views (Target 2/3: no placeholder). No Realtime or polling. No chart library. No secret key. No new table or column. No change to `guest_contacts`. No *Delete my data* (Story 7.8). No edits to `_bmad/`, planning artifacts or `docs/` except `docs/ki-logg.md`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Organizer opens tab | 5 guests: 2 coming (1 plus-one), 1 not coming, 2 no answer | tiles 5 / 2 / 1 / 2; rows with state and actions | none |
| Filter | press *Not answered* | 2 rows, `aria-pressed="true"`, announcement | none |
| Filter, no match | press *Not coming* with none | "No guests match this filter." + *Clear filter* | none |
| 500 guests | load | fixed query count, 100 rows, *Show more* adds 100 | none |
| Guests-Role holder, Role active | reads `guests`, `rsvps` | rows returned; tab read-only, no email | none |
| Same holder | `select email from guest_contacts` | zero rows | none |
| Guests Role inactive | holder reads | zero rows; no nav item; no-access page | none |
| Holder of another Role | reads `guests`, `rsvps`, `guest_contacts` | zero rows; Dashboard shows expected count only | none |
| Other Event's Organizer / anon | reads `rsvps` | zero rows / denied | none |
| Guest | reads `rsvps` | own row only | none |
| Summary maths | plus-one flag on a *No* | headcount unchanged | none |
| Guest answers, Organizer reloads | new `rsvps` row | row state and tiles updated, no polling | none |
| Load failure | query error | Retry card | *Retry* re-renders |

</intent-contract>

## Code Map

- `supabase/migrations/20261020090000_guests.sql:38-41` -- `guests_select`, `guest_contacts_select` (Organizer). `20261107120000_guest_links.sql:12` -- `guests_select_self`. `20261108120000_guests_rsvp.sql:33` -- `rsvps_select` (`is_organizer(event_id) or is_guest_self(guest_id)`; `rsvps.event_id` exists).
- `supabase/migrations/20261030120000_holder_scoped_view.sql` -- `holds_role(role_id)` (joined member, security invoker) and `roles_select` (Organizer or team member), so a policy on `guests`/`rsvps` may read `public.roles` (`event_id`, `key = 'guests'`, `active`) without recursion. Read AD-3, AD-5, AD-16 in the architecture spine before writing SQL.
- `supabase/tests/holder_scoped_view.test.sql:21,79` -- asserts "a holder of a Role reads no guests row" with a Guests-Role member seeded: now true only for another Role; adjust. `supabase/tests/guests_rsvp.test.sql`, `guests.test.sql` -- patterns for actors and `plan()` counts. New policies belong in a new test file.
- `app/events/[eventId]/guests/page.tsx` -- `organizerOnly` gate, `AddGuestsForm`, `GuestList links`. `guest-list.tsx` -- the two queries and the row mapping (`link` state). `guest-rows.tsx` -- client list (`Guest` type, `readOnly`, `links`, optimistic remove); tiles, filter, live region and *Show more* live here.
- `app/events/[eventId]/load-event.ts` -- `organizerOnly`, `loadEvent` (holder check on `role_members`).
- `app/events/[eventId]/on-track.tsx:33-43,102` -- Organizer-only guest count and `dashboard.guestsAdded`; `tasks/load-listed.ts` already returns `roles` and `memberRoleIds` for the viewer.
- `app/layout.tsx` (builds `organizedEventIds`), `src/components/app-nav.tsx:79-93`, `mobile-menu.tsx` -- the Guests nav item is Organizer-only today.
- `src/components/status-label.tsx`, `src/lib/status.ts:39-44`, `messages/*.json` `status.*`, `guests.list.*`, `dashboard.guestsAdded` -- existing copy and states.
- `app/events/[eventId]/my-tasks/loading.tsx` + `error.tsx`, `src/components/load-error.tsx` -- Retry / skeleton pattern if the tab lacks one.
- `e2e/guests.spec.ts`, `e2e/holder-view.spec.ts:44-47` (asserts no Guests link and no-access for a Guests-Role holder: now the opposite for that Role), `e2e/dashboard.spec.ts`, `e2e/support.ts`.
- `node_modules/next/dist/docs/` -- read the relevant guide before using a Next API you have not used in this repo.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/<timestamp>_guests_role_read.sql` -- select policies on `guests` and `rsvps` for a joined holder of the active Guests Role -- PRD §4.9, AD-3.
- `supabase/tests/guests_role_read.test.sql` -- allow and deny for Organizer, Guests-Role holder (active, inactive, not joined), other-Role holder, other Event's Organizer, Guest, anon on `guests`, `rsvps` and `guest_contacts.email`; fix `holder_scoped_view.test.sql` -- AD-16.
- `src/types/database.ts` -- regenerate.
- `src/modules/guests/summary.ts` + `summary.test.ts` -- the pure summary function and its three required cases.
- `app/events/[eventId]/guests/{page,guest-list,guest-rows}.tsx`, `load-event.ts` -- gate for Organizer or active Guests-Role holder, holder query without contacts, tiles, filter, announcement, *Show more*, no-match state.
- `app/events/[eventId]/on-track.tsx` (+ a small pie component beside it) -- RSVP summary with pie and table, or the expected count -- UX-DR8.
- `app/layout.tsx`, `src/components/app-nav.tsx`, `mobile-menu.tsx` -- Guests nav item for the active Guests-Role holder.
- `messages/en.json`, `messages/nb.json` -- tile labels, announcements, no-match, *Clear filter*, *Show more*, summary table, pie label, expected count; drop `dashboard.guestsAdded` if unused.
- `e2e/guests.spec.ts`, `e2e/holder-view.spec.ts`, `e2e/dashboard.spec.ts` -- tiles filter and announce; *Show more* past 100 rows; Guests-Role holder sees the read-only tab without emails; other-Role holder gets no nav item, no-access page and the expected count; Dashboard pie's accessible name and table; a guest's answer shows after reload. Include a 320px-wide check of the tab.
- `docs/ki-logg.md` -- the story's entry in the existing format, verdict left for the owner.

**Acceptance Criteria:**
- Given the Organizer on the Guests tab, when a tile is pressed, then the list shows only matching guests, the tile reports `aria-pressed="true"` and the filter is announced.
- Given a joined holder of the active Guests Role, when they open the tab, then they see every guest's name, state, plus-one and other needs, and no email is rendered or returned by the database.
- Given a holder of any other Role, when they query or open the tab, then the database returns no guest, RSVP or contact row, the page is the no-access page, and the Dashboard shows only the expected guest count.
- Given a viewer who may read RSVPs, when the Dashboard loads, then *On track* shows invited, coming, not coming, not answered and the headcount with plus-ones as a pie with an accessible name and a table.
- Given 500 guests, when the tab loads, then the query count is the same as for 5 and 100 rows render with *Show more*.

## Spec Change Log

## Review Triage Log

### 2026-11-10 — Review pass
- verdicts: 20 findings — high 0, medium 1, low 13, false 6, maybe-false 0 (gap, blind, edge and intent layers; reviewers ran on Sonnet 5.5 by the owner's instruction)
- findings:
  - `[medium]` `[patch]` (gap) no test of focus after removing a guest under a filter; reverting `visible` to `shown` passed every test — the tiles e2e removes a row under "Not answered" and asserts the neighbour's Edit has focus (9d145b7).
  - `[low]` `[reject]` (gap) the page gate for an invited, not-joined Guests-Role member has no page test — RLS returns nothing to them (pgTAP proves it); only the gate's presentation could regress.
  - `[false]` `[reject]` (blind) the holder can read `other_needs` — the story grants the Guests Role "other needs"; the On track comment is about that query, which reads no text.
  - `[false]` `[reject]` (blind) an empty list shows the filter message — `guest-rows.tsx:123` returns the empty text before the section renders.
  - `[low]` `[patch]` (blind) the Dashboard summary undercounts past 1000 guests with no note — `shortcut:` comment added (21ba0cd); the exact aggregate is deferred.
  - `[low]` `[reject]` (blind) "Invited" counts guests not yet invited — the story names the figure "invited" for the Dashboard and "Guests" for the tile; every listed guest is counted.
  - `[false]` `[reject]` (blind) filtering depends on a display string — `link` is a typed union set on the server from `rsvps.attending`, not a label; no caller can diverge.
  - `[low]` `[reject]` (blind) pgTAP lacks an insert denial, a left-the-Role case and other guests' `other_needs` — each new policy has an allow and a deny (AD-16); writes are unchanged and covered by their own files.
  - `[low]` `[reject]` (blind) an extra layout query that throws on failure — same failure mode as the `organized` query two lines above it; folding the two adds a join for one saved round trip.
  - `[low]` `[reject]` (blind) pie pattern ids are global, swatches depend on the pie, patterns rotate with the group — one pie per page, swatches render only with it, a rotated diagonal is still a diagonal.
  - `[low]` `[reject]` (blind) tile names read "Guests 5", *Show more* and a removal under a filter are not announced, 320px checked only before filtering — the count is the tile's content; announcing every list change adds state for little gain.
  - `[low]` `[patch]` (blind) the AI log said the review was not done; nb wording of two keys; no reflection note — log updated at finalize; the wording is understandable Bokmål; a reflection entry is offered to the owner, not written unasked.
  - `[low]` `[patch]` (edge) Dashboard figures truncated at 1000 rows — same root cause as the blind row above, same patch.
  - `[low]` `[reject]` (edge) tiles undercount past 1000 with no warning — the comment states the limit; a warning needs a count query.
  - `[low]` `[reject]` (edge) the layout query takes down the shell on failure — same as the blind row above.
  - `[low]` `[patch]` (edge) an open edit form stays alive, hidden, when a tile filters its row out — `press` closes the edit (90d1c5a).
  - `[low]` `[reject]` (edge) focus goes to the `h1` when the last filtered row is removed — the existing fallback; the list then shows the no-match text.
  - `[false]` `[reject]` (intent) no server paging — the story asks for a fixed number of queries and the first 100 rows rendered, which is what the client window does.
  - `[false]` `[reject]` (intent) the email denial is proven by counts, not a permission error — RLS denial is zero rows; `count(email)` is a `select email`.
  - `[false]` `[reject]` (intent) no test of the no-match text — the tiles e2e asserts "No guests match this filter." and *Clear filter*.

## Design Notes

- The holder policy inlines `exists (select 1 from public.roles r where r.event_id = <table>.event_id and r.key = 'guests' and r.active and public.holds_role(r.id))`, or wraps exactly that in one security-invoker helper if both policies would otherwise duplicate it; either way authorisation comes from `holds_role`.
- "Share an invite link" in the epic's empty-state copy is the shared Event link of Story 7.2 (Target 3). The epic context forbids placeholders for Target features, so the Core empty state keeps the add-by-hand text only.
- The holder view is read-only because the story grants it "see", and the actions of 7.1 / 2.10 authorise with `is_organizer`.
- All rows are loaded and sliced on the client: `shortcut: loads every guest, fine to a few thousand rows; page on the server when lists outgrow that`.
- Work on the current branch in small one-concern commits `7.7: <what and why>` (at least four words after the prefix) with the trailer `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`; never push; never skip hooks; pnpm only.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP pass (local Supabase running)
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test` -- expected: pass
- `pnpm test:e2e e2e/guests.spec.ts e2e/holder-view.spec.ts e2e/dashboard.spec.ts e2e/rsvp.spec.ts` -- expected: pass (serially if parallel runs time out)

## Auto Run Result

Status: done

**Summary:** A joined holder of the active Guests Role reads `guests` and `rsvps` (never `guest_contacts`) through two new select policies. The Guests tab has four `aria-pressed` tiles that filter and announce, the first 100 rows with *Show more*, a no-match state, and a read-only view without emails for that holder. *On track* shows the RSVP summary as an inline-SVG pie with a table and the headcount with plus-ones; other Role-holders see only the questionnaire's expected count.

**Files:** `supabase/migrations/20261110120000_guests_role_read.sql` (policies), `supabase/tests/guests_role_read.test.sql` + `holder_scoped_view.test.sql` (pgTAP), `src/modules/guests/{summary,summary.test,access}.ts` (maths, gate), `app/events/[eventId]/guests/{page,guest-list,guest-rows}.tsx` (tab), `app/events/[eventId]/{on-track,rsvp-pie}.tsx` (Dashboard), `app/layout.tsx`, `src/components/{app-nav,mobile-menu}.tsx` (nav), `messages/*.json`, `e2e/{guests,holder-view,dashboard,rsvp}.spec.ts`, `docs/ki-logg.md`. `src/types/database.ts` regenerated with no diff.

**Review:** 20 findings. Patched: 4 rows in 3 fixes (one medium, three low). Deferred: 2 (holder read of a cancelled Event; 1000-row cap). Rejected: 13 with reasons in the log, 6 of them false.

**Follow-up review:** not recommended; one medium patch, no high.

**Verification:** after `supabase db reset`: `supabase test db` 1145/1145; lint, format:check, tsc pass; Vitest 500/500; Playwright serial 33/33 (guests, holder-view, dashboard, rsvp), rerun after the patches.

**Residual risks:** the pie has not been looked at in a browser in light and dark theme; the fixed query count is by construction, not measured; a Role switched on or off reaches the sidebar only on a full page load; the build agent was launched detached and paused once on a usage limit.
