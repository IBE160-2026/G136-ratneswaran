---
title: 'Story 7.5: Guest Dashboard'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_revision: '7100a1d8fde374e5b87a458decf7c42faf499e85'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-7-3-rsvp-yes-or-no-plus-one-and-other-needs.md'
warnings: ['oversized']
deferred:
  - summary: >-
      Delete my data is in Story 7.5's acceptance text but is built in Story 7.8 with its function, dialog and session end.
    evidence: |-
      The button needs guests_delete_guest_data (7.8 criterion 1); a button without it would be a dead placeholder. Story 7.8 must add it to this page, also for cancelled and ended Events.
    location: >-
      app/rsvp/[eventId]/rsvp-flow.tsx
    severity: medium
  - summary: >-
      A revoked guest link names the Organizer on /rsvp without an Event match, because guests_link_preview returns a null event_id for revoked tokens.
    evidence: |-
      A guest holding a revoked link for Event A who opens /rsvp/<Event B> is told to ask A's Organizer. Needs a migration returning event_id for revoked tokens; the spec forbids a migration here.
    location: >-
      supabase/migrations/20261107120000_guest_links.sql (guests_link_preview)
    severity: low
---

<intent-contract>

## Intent

**Problem:** A Guest who returns finds only the RSVP's end screen: no Event date and time, no "My RSVP" card, no loading or failure state, a vague text when the session is gone, and nothing that explains blocked cookies.

**Approach:** `/rsvp/[eventId]` is the Guest Dashboard: the page Story 7.3 built gains the Event's date and time, a "My RSVP" card with *Change my answer*, a `loading.tsx` skeleton and an `error.tsx` Retry card, an expired-link view for a missing session, and a blocked-cookies notice. No new route, table, function or policy.

## Boundaries & Constraints

**Always:**
- One page, single scroll, no sidebar, 375px and 320px reflow, tap targets `min-h-touch` (44px). All copy in `messages/en.json` and `messages/nb.json` (natural Bokmål), key parity kept.
- Answered or closed view (Story 7.3's end screen, extended): the Event name with its date **and time** in the Event's time zone (`dateStyle: "long"`, `timeStyle: "short"`, `timeZone` from the Event), then a card (`bg-card rounded-lg border p-4`) titled "My RSVP" with the answers in words and, when the Event is open, *Change my answer* inside it. The `h1` stays as 7.3 made it (confirmation sentence, or the cancelled / ended sentence with the Organizer's note). *Change my answer* reopens the flow at step 1 with the saved answers filled in (Core has one entry point).
- No answer yet: the page leads with "Will you be there?" (the 7.3 flow, unchanged); the saved state is the server's, so leaving and returning loses nothing saved.
- Saving runs `submitRsvp` / `guests_submit_rsvp` unchanged; a change after `rsvp_due_date` works; a change after the Event ended or was cancelled is refused and the page shows the read-only view (already so: keep it, prove it).
- No session on `/rsvp/[eventId]`: read the invite cookie with `readGuestLink()`. Status `valid` -> `redirect("/invite")` (the guest presses *Continue* again). Otherwise show "This link has expired. Ask {organizer} for a new one." when the preview carries `organizer_name` (the token proves membership), else the existing generic `guestLink.invalid` text. No email field, no form. The view never names the Event.
- Blocked cookies: a small client component that, where `navigator.cookieEnabled` is false, shows "Your browser blocks cookies. Open the link in your usual browser." in place of its children (hydration-safe: `useSyncExternalStore`, server snapshot = cookies allowed). Wrap the expired text on `/rsvp/[eventId]` and the invalid-link text on `/invite` (both places a guest lands when the cookie could not be stored). No redirect loop exists or is added.
- `app/rsvp/[eventId]/loading.tsx`: `Skeleton` in the page's final shape (heading line, event line, card). `app/rsvp/[eventId]/error.tsx`: the shared Retry card (`LoadError`, as `app/events/error.tsx` does).
- pgTAP proves a Guest reads only their own `rsvps` row when another Guest of the **same** Event also has one.

**Never:**
- No *Delete my data* button: Story 7.8 owns `guests_delete_guest_data`, its dialog and the button; a dead button is a placeholder. No sections or placeholders for results, requests, the Landing page, food or hotel. No notification on a late change. No migration unless the pgTAP proof finds a real leak. No new route such as `/guest`. No email field or fresh-link form. No edits to `_bmad/`, planning artifacts or `docs/` except `docs/ki-logg.md`. No answers in logs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Answered guest returns | session, saved Yes + plus-one | Event name, date and time, "My RSVP" card in words, *Change my answer* | none |
| Change | *Change my answer*, pick No, send | flow opens at step 1 prefilled; card shows the new answer | none |
| Late change | `rsvp_due_date` in the past | saved as usual | none |
| Cancelled / ended | closed Event, saved answer | closed sentence (+ note), card visible, no *Change my answer* | write refused `read_only` |
| No answer yet | session, no row | "Will you be there?" is the `h1` | none |
| No session, valid cookie token | cookie only | redirect to `/invite` | none |
| No session, revoked token | cookie of a reissued link | "This link has expired. Ask {organizer} for a new one." | none |
| No session, no or unknown token | nothing proves membership | generic expired text, no Organizer, no Event | none |
| Cookies blocked | `navigator.cookieEnabled === false` | the cookies text instead of the expired text | none |
| Load failure | page throws | Retry card | *Retry* re-renders |

</intent-contract>

## Code Map

- `app/rsvp/[eventId]/page.tsx` -- server load under the guest's session; `!claims` branch (line 20) shows `rsvp.noSession` today: replace with the expired view; `format` (line 53) is date-only: add the time for the Event date, keep `replyBy` date-only.
- `app/rsvp/[eventId]/rsvp-flow.tsx` -- lines 73-116 are the answered/closed view to extend (`eventName`, `date` already props; step-1 header uses `eventLine`); `summary.title` is "Your answer" -> "My RSVP".
- `src/modules/guests/link.ts` -- `readGuestLink()` returns `preview.status` and `organizer_name` (set for a revoked token; see `guests_link_preview` in `supabase/migrations/20261107120000_guest_links.sql`). Server only, secret key inside: call it only from the server page.
- `app/invite/page.tsx` -- `GuestView`, `preview.status === "invalid"` branch and the line-57 invalid branch use `GuestEnded`; `app/invite/guest-flow.tsx` -- `GuestEnded` (client; drops the cookie).
- `app/events/error.tsx`, `app/events/[eventId]/my-tasks/loading.tsx` + `error.tsx`, `src/components/load-error.tsx`, `src/components/ui/skeleton.tsx` -- the loading/Retry pattern to reuse.
- `messages/en.json`, `messages/nb.json` -- `rsvp.*`, `guestLink.*`; a parity test exists, run Vitest.
- `supabase/tests/guests_rsvp.test.sql:145,197` -- own-row and other-guest reads; today only one `rsvps` row exists when the guest reads.
- `e2e/rsvp.spec.ts` (`invite`, `guestAt` helpers, cancelled/ended tests), `e2e/guest-link.spec.ts:125` (generic expired text), `e2e/support.ts`.
- `node_modules/next/dist/docs/` -- read the `loading`/`error` file conventions before writing them (Next 16).

## Tasks & Acceptance

**Execution:**
- `app/rsvp/[eventId]/page.tsx` -- date with time for the Event; no-session branch: `readGuestLink()`, redirect on `valid`, else the expired view wrapped in the cookie notice -- FR3, UX-DR21.
- `src/components/cookie-notice.tsx` -- the client component above; use it in `app/rsvp/[eventId]/page.tsx` and around the invalid text in `app/invite/page.tsx` -- blocked cookies explained, not looped.
- `app/rsvp/[eventId]/rsvp-flow.tsx` -- Event line (name, date and time) and the "My RSVP" card with *Change my answer* in the answered/closed view -- FR18.
- `app/rsvp/[eventId]/loading.tsx`, `error.tsx` -- skeleton and Retry card -- UX-DR24.
- `messages/en.json`, `messages/nb.json` -- `rsvp.summary.title` "My RSVP", `rsvp.expired` (with `{organizer}`), `rsvp.cookiesBlocked`; drop `rsvp.noSession` if nothing else reads it (keep `rsvp.errors.noSession`).
- `supabase/tests/guests_rsvp.test.sql` -- a second Guest of the same Event answers; the first reads exactly one row and it is their own; fix the plan count.
- `e2e/rsvp.spec.ts` -- returning guest sees name, date with time, "My RSVP", changes to No and sees it; late change after the due date; cancelled keeps the card without *Change my answer* (extend the existing test); cleared session cookies + kept invite cookie redirect to `/invite`; no cookies at all shows the generic expired text with no textbox; a reissued link (*New link*) shows the Organizer-named text; `navigator.cookieEnabled` overridden to false (`addInitScript`) shows the cookies text. Phone width, as the file already does.
- `docs/ki-logg.md` -- the story's entry in the existing format (prompts, what the AI proposed, left open for the owner's verdict).

**Acceptance Criteria:**
- Given a Guest session with a saved answer, when `/rsvp/{event}` opens at 375px, then the Event name, its date and time in the Event's time zone, "My RSVP" with the answers in words and *Change my answer* show in one column with no sidebar, and no section for results, requests, the Landing page or deletion exists.
- Given the Event is cancelled or ended, when the page opens, then the closed sentence (and note) and the card show and *Change my answer* is absent.
- Given no session, when a guest page opens, then the expired text shows with no email field, naming the Organizer only when the cookie's token proves membership.
- Given a slow or failed load, then a final-shape skeleton or the Retry card shows.

## Spec Change Log

## Review Triage Log

### 2026-11-09 — Review pass
- verdicts: 21 findings — high 0, medium 5, low 14, false 2, maybe-false 0 (blind, edge, gap and intent layers; descriptive intent notes folded into rows)
- findings:
  - `[medium]` `[patch]` (blind, edge, gap) status `unavailable` with no session reads as "expired" — page.tsx throws, so the Retry card shows.
  - `[medium]` `[patch]` (edge, blind, intent) cancelled, ended and Role-invitation (`other_kind`) tokens without a session got the expired text — every status except `invalid` and `revoked` redirects to `/invite`; e2e added for cancelled.
  - `[low]` `[patch]` (edge, blind) the Organizer is named from a token of another Event — naming restricted to `revoked`; the Event match needs a migration, deferred.
  - `[low]` `[defer]` (edge, blind) a revoked preview has a null event_id, so a cross-Event match cannot be made — see the deferred item.
  - `[medium]` `[patch]` (gap) the time assertion passes for any time — e2e pins `America/New_York` and the exact line.
  - `[low]` `[patch]` (blind, gap) `CookieNotice` read the `rsvp` namespace and had no limit comment — key moved to `guestLink`, `shortcut:` comment added.
  - `[low]` `[patch]` (gap) the second `CookieNotice` site on `/invite` is unreachable — removed.
  - `[medium]` `[patch]` (gap) error.tsx never rendered — Vitest added (vitest include widened to `app/**`).
  - `[low]` `[patch]` (blind) the e2e pins the absence of Delete, which 7.8 flips — assertion removed.
  - `[medium]` `[defer]` (blind, intent) Delete my data is in the acceptance text and left to Story 7.8 — carried as a deferred item for 7.8.
  - `[low]` `[reject]` (edge, blind) loading.tsx makes notFound/redirect soft — the guard is RLS and nothing secret is exposed by a 200.
  - `[low]` `[reject]` (edge, blind) one skeleton shape for three outcomes and no aria-busy — a skeleton is a hint; adapting it adds branching.
  - `[low]` `[reject]` (blind) empty Event name leaves a separator — a published Event has a name.
  - `[low]` `[reject]` (blind) valid session of a removed guest gets 404 — Story 7.3 decision, a session proves nothing.
  - `[low]` `[reject]` (blind) wording differs from `/invite` — both texts come from the story.
  - `[low]` `[reject]` (blind) no time zone shown, prop named `date`, "RSVP" title, first-person card title, relative import in error.tsx — cosmetic.
  - `[low]` `[reject]` (blind) role="alert" swap after hydration — edge of a blocked-cookie browser; announcing both is harmless.
  - `[low]` `[reject]` (blind) pgTAP mid-file cleanup, ki-logg placeholders — later counts test the cleanup; the log is finalised at PR time.
  - `[false]` `[reject]` (gap) no test of cookies blocked — e2e overrides `cookieEnabled`, the component's only input.
  - `[false]` `[reject]` (intent) no separate Dashboard route — one route by design; the personal link and `/invite` already end there.
  - `[low]` `[reject]` (intent) always step 1, no 320px or nb e2e, tap targets, no-notification claim — Core has one entry point; the rest is covered by existing checks.

## Design Notes

- The Guest Dashboard is the same route as the RSVP on purpose: the personal link, `/invite` and the 7.3 redirect already end there, and the answered view was a dashboard in all but name. A second route would only add a redirect.
- *Delete my data* is in this story's acceptance text but its function, dialog and "session ends" behaviour are Story 7.8's first criterion. It is left out here and reported to the owner rather than shipped dead.
- "The right step" is step 1 in Core: there is one answer and one button. Target 2 adds per-section entry points with its own steps.
- A signed-in user with no guest row keeps the 404 (7.3): the session proves nothing, so nothing is said.
- Work on the current branch in small one-concern commits `7.5: <what and why>` (at least four words after the prefix) with the trailer `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`; never push; never skip hooks; pnpm only.

## Verification

**Commands:**
- `supabase test db` -- all pgTAP pass (local Supabase running)
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test` -- pass
- `pnpm test:e2e e2e/rsvp.spec.ts e2e/guest-link.spec.ts e2e/invite-join.spec.ts` -- pass (serially if parallel runs time out)

## Auto Run Result

Status: done

**Summary:** `/rsvp/[eventId]` is the Guest Dashboard: the Event line with date and time in its time zone, a "My RSVP" card holding the answers and *Change my answer*, a skeleton and a Retry card, the expired text without a session (naming the Organizer only for a revoked link), and the blocked-cookies text. Sessionless guests whose link `/invite` can serve are sent there.

**Files:** `app/rsvp/[eventId]/{page,rsvp-flow,loading,error,error.test}.tsx`, `app/invite/page.tsx`, `src/components/cookie-notice.tsx`, `messages/*.json`, `supabase/tests/guests_rsvp.test.sql`, `e2e/rsvp.spec.ts`, `vitest.config.ts`, `docs/ki-logg.md`.

**Review:** 21 findings. Patched: 8 (four medium, four low). Deferred: 2 (Delete my data for Story 7.8; Event match for a revoked token). Rejected: 11 with reasons in the log.

**Follow-up review:** not recommended; four medium patches, no high.

**Verification:** lint, format:check, tsc pass; Vitest 497/497; `supabase db reset` + `supabase test db` pass; Playwright serial 32/32 (rsvp, guest-link, invite-join, guests).

**Residual risks:** *Delete my data* is absent until Story 7.8; `navigator.cookieEnabled` catches only a full cookie block; `loading.tsx` streams the page, so a stranger's 404 is a soft 404; one e2e run failed once with a 404 on the Organizer's Guests page and passed on rerun without a code change (cause unfound).
