---
title: '2.4: All events shows my events'
type: 'feature'
created: '2026-10-19'
status: 'done'
route: 'dispatch'
baseline_commit: '405814335f96734ec6bd3eeb5aaa9fe2d4667cf2'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** *All events* is a plain list of draft links, so an Organizer cannot see all their Events by date, tell past or cancelled ones apart, or open an Event's home (GitHub issue #47).

**Approach:** Replace the list with Event cards in an upcoming group and a *Past events* group, make *Create new event* a card, add an interim Event home at `/events/[id]` with an event group in the sidebar, and add a nullable `cancelled_at` column so the Cancelled state exists before Story 2.7 writes it.

## Boundaries & Constraints

**Always:**
- Card: name (or "New event"), date · "Organizer", and an empty `aria-hidden` 40px slot on the right reserved for the count circle. The whole card is one link whose accessible name is its visible text in order. Draft cards add "Draft · continue setup".
- Date is shown in the Event's `time_zone`, in the UI locale, as weekday, day, short month and year. No date means none is shown.
- Past = `cancelled_at` set, or the Event's end `< now()`, where the end is `ends_at`, or `starts_at` + 24 hours when `ends_at` is null (duration "Not sure yet"; decided at review). An Event in progress is upcoming. Upcoming sorts by `starts_at` ascending with undated last; past sorts descending.
- Link target: a draft that is not cancelled → `setupPath(id)`, also when past; everything else → `/events/[id]`. Only those draft cards say "continue setup" (decided at review: a draft with a mistyped past date must stay fixable).
- The *Create new event* card is the last item of the upcoming group, same size as a card, `primary-soft` with a 2.5px `primary` border and a centred `plus`. It stays a submit button named "Create new event". With no Events the page shows "Let's plan something." and that card only.
- *Past events* is a native `<details>` with summary "Past events (N)" below the upcoming group, rendered only when N > 0. Cancelled cards show `StatusLabel` `cancelled` (`CalendarX`, muted tone, icon and word).
- Interim home `/events/[id]`: `h1` with the name, the date, and `StatusLabel`-style word Draft or Published (Cancelled when set). Title "Overview – {Event} – Arrangly".
- Sidebar: when `useParams().eventId` exists, `AppNav` shows an event group above *All events*: "Overview" (`/events/[id]`) and "Questionnaire" (`setupPath`). The nav label is unchanged.
- Read-only: the setup page redirects a published past Event or a cancelled Event to its home; drafts stay editable. The database enforces read-only in Story 2.7.
- `app/events/[eventId]/not-found.tsx` shows "You don't have access to this part of the event." for another user's Event and for an unknown or malformed id on both home and setup, with no Event data.
- Migration adds `events.cancelled_at timestamptz` (nullable), grants nothing new, and replaces `events_create` so a blank draft also requires `cancelled_at is null`.
- Loading shows a `Skeleton` in the final shape (h1 line and three card blocks); a failed load shows the existing *Retry* card. All strings in `messages/nb.json` and `messages/en.json`.

**Never:**
- No counts, badges, urgent or at-risk states, Role or Guest cards (Epics 3–5). No publish banner or *Publish* (2.8), no cancel or delete function (2.7), no Event name in the nav label, no separate past-events route.
- No edit of earlier migrations, `_bmad/` or planning documents. No hand edit of `src/types/database.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| No Events | Organizer with no rows | "Let's plan something." + Create card only | N/A |
| Mixed | draft undated, published next month, published last year, cancelled future | upcoming: next month, undated draft, Create card; past: cancelled, last year | N/A |
| In progress | `starts_at` past, `ends_at` future; or `ends_at` null and `starts_at` under 24 hours ago | upcoming | N/A |
| Published | published Event | not shown as "Draft"; card opens home showing "Published" | N/A |
| Foreign or unknown id | `/events/[id]` or `/setup` of another user, or `abc` | no-access message, no data | `notFound()` |
| Past draft | unpublished, date passed | past group, card says "Draft · continue setup" and opens setup | N/A |
| Past published | published, date passed | past group, opens home; setup redirects home | N/A |
| Direct write | `update events set cancelled_at` as authenticated | denied | `42501` |

</frozen-after-approval>

## Code Map

- `app/events/page.tsx` -- current draft list (to replace). Keep the `getClaims` redirect, `?saved=1` status line and RLS-only query; select `id, name, starts_at, ends_at, time_zone, published_at, cancelled_at`.
- `app/events/create-event-button.tsx` -- restyle as the Create card; keep the form, `useActionState(createEvent)` and `Failure`. Existing e2e use `getByRole("button", { name: "Create new event" })`.
- `app/events/loading.tsx`, `app/events/error.tsx` -- loading shape to update; error stays.
- `app/events/[eventId]/setup/page.tsx` -- `loadEvent` (uuid check, `maybeSingle`, `notFound`) to move into a shared `app/events/[eventId]/load-event.ts` reused by home and setup.
- `src/components/app-nav.tsx` -- `NavLink` and the "event group of later epics" slot comment.
- `src/lib/status.ts` + `status.test.ts` -- the test requires an nb and en `status.*` word per entry.
- `src/modules/events/save.ts` -- `setupPath`.
- `supabase/migrations/20261019130000_events_create_reuses_blank_draft.sql` -- body to copy into the new `create or replace` with `cancelled_at is null` added. `supabase/tests/events_drafts.test.sql:12-19` -- column list to extend with `cancelled_at`.
- `supabase/tests/events.test.sql` -- claims, role and "only name is updatable" pattern (that test stays true).
- `e2e/oauth.spec.ts:22-30` -- psql via `docker exec supabase_db_Arrangly`; move to `e2e/support.ts` to seed Events. `e2e/shell.spec.ts` -- nb empty-state and phone-menu tests to keep passing.
- `messages/*.json` `events.empty.hint` -- drop (no longer shown); `events.draft.*` -- reuse for draft cards.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/<ts>_events_cancelled_at.sql` -- add column, replace `events_create` -- Cancelled state, blank-draft guard.
- [x] `supabase/tests/events_cancelled.test.sql`, `supabase/tests/events_drafts.test.sql` -- nullable column, Organizer reads it, B does not see the row, direct update denied, cancelled blank row not reused; column list -- AD-16.
- [x] `src/types/database.ts` -- regenerate -- AD-15.
- [x] `src/modules/events/list.ts` + `list.test.ts` -- pure `groupEvents(rows, now)` returning upcoming and past with link target -- Vitest for every matrix row on grouping and order.
- [x] `app/events/page.tsx`, `event-card.tsx`, `create-event-button.tsx`, `loading.tsx` -- cards, groups, Create card, skeleton.
- [x] `app/events/[eventId]/load-event.ts`, `page.tsx`, `not-found.tsx`, `setup/page.tsx` -- interim home, no-access page, past redirect.
- [x] `src/components/app-nav.tsx` -- event group.
- [x] `src/lib/status.ts` -- `cancelled`.
- [x] `messages/nb.json`, `messages/en.json` -- new strings, drop `events.empty.hint`.
- [x] `e2e/support.ts`, `e2e/oauth.spec.ts`, `e2e/events-list.spec.ts` -- seed helper; order and Create-last, empty state, published not a draft, past and Cancelled, home, no access, phone Sheet closes and focuses `h1` moving Overview → Questionnaire.
- [x] `docs/ki-logg.md` -- Story 2.4 entry.

**Acceptance Criteria:**
- Given cards on *All events*, when read by a screen reader, then each card is one link named by its visible text and status is never colour alone.
- Given the change, when `supabase test db`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e` and `.githooks/test.sh` run, then they pass.

## Implementation Notes

- Implemented in this session without an implementation subagent; the three review layers ran as subagents.
- `isDraft` (uncancelled and unpublished) decides the link target, the "continue setup" line and the setup guard; `isPast` adds 24 hours to `starts_at` when `ends_at` is null.
- The query orders by `created_at` desc and `groupEvents` sorts stably, so ties keep newest-created first.
- A `loading.tsx` under `[eventId]` was dropped: its fallback has no `h1`, so `RouteFocus` lost focus between Overview and Questionnaire (the Story 1.2 deferred gap).
- `<summary>` keeps its default display so the disclosure marker stays; the inner list has a margin rather than flex `gap` on `<details>`.
- The 2.2 e2e for a foreign Event now expects the no-access message instead of the generic 404 text.
- `next dev` rewrites `AGENTS.md` during e2e; it was restored before each commit.

## Spec Change Log

- 2026-10-19, review pass 1 (intent_gap, owner answered): edge 2 showed a draft with a mistyped past date stayed read-only, and edge 1 that an Event with no `ends_at` became past at its start. Amended in the frozen block: uncancelled drafts always open setup and stay editable, and with no `ends_at` an Event runs 24 hours from its start. Avoids a draft that cannot be fixed and an Event locked while it happens. KEEP: grouping as one pure function, `not-found.tsx` for every foreign or malformed id, the Create card staying a button, psql seeding in e2e. Code was amended in place rather than re-derived, since only `isPast`, the link rule and the setup guard changed.

## Review Triage Log

### 2026-10-19 — Review pass 1
- verdicts: 25 findings (blind 12, edge 7, gap 3 plus 3 duplicates) grouped into 17 entries — 2 intent_gap (owner decided, frozen block amended), 7 patch, 8 rejected.
- findings:
  - `[medium]` `[intent_gap]` (edge 2) the questionnaire accepts a past start date (no past check in `schemas.ts`), and the frozen matrix row "Past draft" sends its setup home, so a draft with a mistyped year is read-only with no way to fix the date until 2.6/2.7.
  - `[low]` `[intent_gap]` (edge 1, blind 5) duration "Not sure yet" leaves `ends_at` null, so the frozen rule `coalesce(ends_at, starts_at) < now()` moves an Event to Past and locks setup the moment it starts, although the intent says an Event in progress is upcoming.
  - `[low]` `[patch]` (gap 1) no test that a past draft's card omits "Draft · continue setup".
  - `[low]` `[patch]` (gap 2) no test that a cancelled Event's home shows "Cancelled" and not "Published".
  - `[low]` `[patch]` (gap 3) no test that an undated past Event sorts last in Past events.
  - `[low]` `[patch]` (edge 4, blind 4) the query dropped `order(created_at)`, so equal or missing `starts_at` reorder between loads — order by `created_at` desc before the stable sort.
  - `[low]` `[reject]` (blind 3) `/events/[id]` falls back to the All events card-grid skeleton on first entry — a home-shaped `loading.tsx` was tried and removed: its fallback has no `h1`, so moving between Overview and Questionnaire lost the `h1` focus (phone e2e failed, passed twice without it). That is the `RouteFocus`/Suspense gap already in `deferred-work.md` (Story 1.2).
  - `[low]` `[patch]` (blind 6) nothing proves the date uses the Event's time zone — a Vitest case near midnight.
  - `[low]` `[patch]` (blind 11) spacing in `<details>` relies on flex `gap`, which older engines ignore on `<details>` — margin on the inner list.
  - `[low]` `[patch]` (blind 12) the `seed()` comment says every value is a literal from the file, but `unique()` emails are generated — reword.
  - `[false]` `[reject]` (blind 1) missing `docs/ki-logg.md` entry — an open task, written after review.
  - `[low]` `[reject]` (edge 6, blind 2) the event group shows on the no-access page — its links carry only the id from the URL, and hiding it needs Event data in the root-layout nav, which the frozen decision 6 rules out.
  - `[low]` `[reject]` (edge 7, blind 9) *Questionnaire* stays in the nav for past Events and redirects home — the recorded implementation of decision 7; the nav has no Event state.
  - `[low]` `[reject]` (edge 3, blind 8) a stale save still writes to a past or cancelled Event — the frozen intent leaves database read-only to Story 2.7.
  - `[low]` `[reject]` (edge 5) more than 1000 Events per Organizer truncates the list — not reachable in normal use.
  - `[false]` `[reject]` (blind 7) draft cards opening setup contradict `epics.md` — Story 2.3's AC and EXPERIENCE.md both say the draft card reopens the wizard, and the owner chose it (decision 4).
  - `[low]` `[reject]` (blind 10) Draft/Published are plain words, not `StatusLabel` — they are words, not colour-coded statuses, and the status vocabulary (UX-DR4) does not list them.

### 2026-10-19 — Review pass 2
- verdicts: 16 findings (blind 10, edge 5, gap 1) grouped into 14 entries — 6 patched (all low), 8 rejected (carried 3, false 1, low 4).
- findings:
  - `[low]` `[patch]` (blind 1, edge 3) `loadEvent` ignored the query error, so a failed load showed "no access" for the Organizer's own Event — it now throws, and `app/events/error.tsx` shows *Retry*.
  - `[low]` `[patch]` (blind 3) Safari drops the list role from a `ul` with no list style — `role="list"` on both card lists.
  - `[low]` `[patch]` (blind 4) the pgTAP "another user cannot write cancelled_at" failed on the missing column grant before RLS, duplicating the Organizer case — removed.
  - `[low]` `[patch]` (blind 7) the Create card looked unchanged while pending — `disabled:opacity-60`.
  - `[low]` `[patch]` (gap 1) no test pinned newest-created-first order for undated drafts — e2e seeds two.
  - `[low]` `[patch]` (blind 10) no test that a cancelled draft's setup redirects home — added to the read-only e2e.
  - carried `[low]` `[reject]` (edge 1) a stale save writes to a read-only Event — pass 1: database read-only is Story 2.7.
  - carried `[low]` `[reject]` (edge 4) more than 1000 Events — pass 1.
  - carried `[low]` `[reject]` (edge 5) event group on the no-access page — pass 1.
  - `[low]` `[reject]` (edge 2, blind 5) a zone Postgres accepts but ICU rejects crashes date formatting — reachable only by the Organizer's own direct RPC past the Zod list.
  - `[low]` `[reject]` (blind 2) the home does not say a past Event is read-only — a new UI state the intent does not ask for.
  - `[low]` `[reject]` (blind 6) the no-access page has no link back — the sidebar and the phone menu both carry *All events*.
  - `[low]` `[reject]` (blind 9) `EventCard` names both a type and the component — cosmetic; the alias is local to one file.
  - `[false]` `[reject]` (blind 8) missing `docs/ki-logg.md` entry — written at hand-over.

## Design Notes

`events_create` must keep returning only a truly blank draft, and 2.3's pgTAP guard fails on any new column, so the column change and the function change ship in one migration. Grouping is a pure function so the date rules are tested without a browser; e2e seeds published, past and cancelled rows through psql because the app cannot make them before 2.7 and 2.8.

## Verification

**Commands:**
- `supabase db reset` -- expected: all migrations apply
- `supabase test db` -- expected: all pgTAP pass
- `supabase gen types --local --lang typescript | diff - src/types/database.ts` -- expected: no diff
- `pnpm lint && pnpm format:check && pnpm test && .githooks/test.sh` -- expected: exit 0
- `pnpm test:e2e` -- expected: all pass
