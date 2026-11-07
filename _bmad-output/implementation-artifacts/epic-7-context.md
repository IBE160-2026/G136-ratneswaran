# Epic 7 Context: Guests: invitation, RSVP and Guest Dashboard

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A Guest opens a personal link the Organizer copied and shared, answers the RSVP without creating an account, and finds their answer on a Guest Dashboard where they can change it or delete their data. The Organizer (and holders of the Guests Role) see RSVP state and other needs on the Guests tab and the Dashboard summary. This completes the Guest side of Core (UJ-3 Core path, SM-4) with no application email, while keeping guest data private by database rules, not UI hiding.

## Stories

- Story 7.1: Personal guest link (Core)
- Story 7.2: Shared Event link with email code (Target 3, not built in Core)
- Story 7.3: RSVP: yes or no, plus-one and other needs (Core)
- Story 7.4: Allergies, food and hotel with consent (Target 2, not built in Core)
- Story 7.5: Guest Dashboard (Core)
- Story 7.6: Optional account for a Guest (Target 3, not built in Core)
- Story 7.7: Guests tab and RSVP summary (Core)
- Story 7.8: Delete guest data (Core)
- Story 7.9: Automatic deletion 15 days after the Event (Target 2, not built in Core)
- Story 7.10: Guest flow check (Core)

Build order for Core: 7.1, 7.3, 7.5, 7.7, 7.8, 7.10. Skip Target stories; show no placeholders for their features (food/hotel, shared link, account offer, *Remind*, requests, results, Landing page).

## Requirements & Constraints

- Core sends no application email. Links are shown to the Organizer to share; Guests get no email from Arrangly or Supabase Auth. Expired/invalid link copy has no email field or fresh-link form in Core.
- RSVP: yes/no, at most one plus-one (optional name up to 80 chars), free-text "other needs" up to 500 chars with the hint not to write health details, stored as written and never interpreted. A *No* deletes the plus-one in the same transaction. The RSVP due date is soft: late answers and changes are accepted.
- Core collects no health data (no allergies, food or hotel). "Other needs" text never goes into a prompt, notification payload, log line, URL, query string, analytics call or error message. Server logs carry only Event id and user id.
- Guest pages load no third-party scripts and send `Cache-Control: no-store` and `Referrer-Policy: no-referrer`.
- Event states for Guests: cancelled shows "This event has been cancelled." with the Organizer's note, read-only; ended shows "Thanks for coming!", read-only; deleted shows "This event is no longer available." For `guest` tokens this replaces "rejected if cancelled", which stays for `role_holder`. Writes are refused in cancelled/ended Events; *Delete my data* stays available.
- Visibility: the Organizer, holders of the Guests Role and the Guest themselves read RSVPs; holders of other Roles see no guest rows (only the questionnaire's expected guest count). Emails live in the Organizer-only `guest_contacts` table and are never returned to any Role-holder. If the owning Role is inactive, only the Organizer sees those fields.
- Abuse limits on every public route: 5/minute per IP and 3/hour per token or email, through the existing Postgres limiter with its own per-flow buckets.
- Accepted risks (documented, not to be re-solved): a personal link is a bearer credential until *New link*; one guest-only user can be a Guest of several Events, so a leaked link exposes their other Guest rows.
- Seed data names no real person; the flagship Event holds 80 fictional guests in every Core state.

## Technical Decisions

- **Identity:** each invited Guest is a passwordless, guest-only Supabase Auth user, created or found by email with the secret key (invitee creation is one of only three permitted secret-key uses; the invite exchange route is another). Guest-only means no password, no OAuth identity, no `role_members` row, organizes no Event. The guest-only comparison happens once in a function, never in a policy.
- **Tokens:** `invite_tokens` (owned by events) with `kind = guest`; 256-bit random, only SHA-256 stored, constant-time compare, valid until `events.ends_at` read at use, revocable. Concurrent *Copy link* or an existing user yields one user and one active token, never an error. *New link* revokes earlier tokens and ends that user's sessions in one transaction (an issued access token survives up to one hour; say so in a code comment). Supabase magic links are never used.
- **Exchange route `app/api/invite/[token]`:** `GET` creates no session, moves the token to a short-lived `httpOnly` cookie and cleans the URL; *Continue* is a `POST` that issues a session only for guest-only users, otherwise redirects to sign-in with email prefilled, never revealing whether an account exists. All rejections (revoked, unknown, malformed, expired, wrong Event/kind) share one copy without Event or email; only a valid-but-revoked/expired token may name the Organizer.
- **RLS:** every table has RLS. Guest policies use `is_guest_of(event_id)` / `is_guest_self(guest_id)` (`STABLE`, `search_path = ''`, security invoker); policies on `guests` itself compare `guests.user_id` with `(select auth.uid())` directly to avoid recursion. Never match on email.
- **Writes only through functions:** `authenticated` gets `SELECT` as RLS allows and no direct INSERT/UPDATE/DELETE on `rsvps` or `guests`. Mutation functions are `security definer`, `search_path = ''`, granted to `authenticated`, revoked from `public`/`anon`, authorise from `auth.uid()` plus helpers, and never take a guest or user id from the client (they take the Event id and derive the Guest).
- **Schema:** `guests` gains `user_id` (`ON DELETE SET NULL`) and `first_opened_at`. `rsvps`: one row per guest (`guest_id` unique, `ON DELETE CASCADE`), `attending`, `plus_one`, `plus_one_name`, `other_needs`, `answered_at`, `updated_at`, with a CHECK that the text fields are empty when not attending. Every FK to `guests` or `auth.users` is `SET NULL` or `CASCADE`, never `NO ACTION` (pgTAP-asserted).
- **`guests_submit_rsvp(event_id, answers, expected_updated_at)`:** idempotent (double submit gives one row, no change); a stale `expected_updated_at` with differing answers returns `concurrent_edit`.
- **`guests_delete_guest_data`:** a mutation function (no secret key), authorising with `is_guest_self` for the Guest and `is_organizer` for the Organizer. One transaction removes guest row, contact, RSVP, tokens and AI usage link, calls only the purge hooks that exist (hooks stay revoked from `authenticated`), and deletes the auth user in SQL (no Admin API) only if guest-only and a Guest of no other Event. Second call succeeds and changes nothing. Organizer removal (Story 2.10) and Event deletion route through it.
- **Server Actions:** Zod first (trim, bound, reject control characters; render stored text as plain text), return `{ ok, data } | { ok: false, error: { code, message } }` with next-intl keys. Server code uses `auth.getClaims()`. All copy in `messages/nb.json` and `messages/en.json`; guest-facing invitation text uses `events.language`.
- **Guests tab performance:** fixed query count for 500 guests, first 100 rows plus *Show more*; no polling (Realtime is Target 3).
- **Tests:** pgTAP for every policy, grant and function (one allow, one deny, including denied direct PostgREST writes and cross-guest/cross-Event reads); Vitest for each token rejection and the RSVP summary maths; Playwright for the Guest path at 375px. All against local Supabase.

## UX & Interaction Patterns

- Guest side: single scroll, no sidebar, works at 375px and reflows at 320 CSS px, focus to the `h1` on every step, warm voice; quiet voice on the team-side Guests tab. Tap targets at least 44x44px; final-shape `Skeleton`; *Retry* card on failure.
- Invitation landing: "Hi {first name}, this is your invitation to {Event}." with *Continue* and "Not {first name}? Ask {Organizer} for your own link."
- Copy menu on each guest: *Copy link*, *Copy invitation text* (first name, Event name and date, link, in the Event's language), *Copy all links* (one line per guest, max 500, small parallel batches with a progress line, safe to repeat), *New link* with confirmation. Row states: "Not invited yet", "Link copied · not opened", "Opened", "Coming", "Not coming".
- RSVP: one question per screen as a `fieldset` with the question as `h1`, *Back* always, progress "Question 2 of 4" counting only applicable steps; first step shows Event name, date and "Reply by {date}" in the Event's time zone. *No* ends with "Thanks for letting us know, {name}."; *Yes* ends with "You're on the list, {name}! We'll send the details closer to the day." Inline errors with `aria-invalid`/`aria-describedby`. A weak-connection failure keeps input with *Retry*; nothing queued offline.
- Guest Dashboard: Event name, date/time in its time zone, "My RSVP" in words, *Change my answer* (reopens RSVP at the right step, prefilled), *Delete my data* (confirmation dialog stating what is removed and which Event; then "Your data has been deleted." and session ends). No answer yet leads with "Will you be there?". Blocked cookies show "Your browser blocks cookies. Open the link in your usual browser." Expired: "This link has expired. Ask {Organizer} for a new one."
- Guests tab: summary tiles Guests, Coming, Not coming, Not answered as `aria-pressed` toggle buttons that filter and announce ("Showing 16 guests who have not answered"). Empty: "No guests yet. Add them by name and email, or share an invite link."; no match: "No guests match this filter." with *Clear filter*.
- Dashboard *On track*: "N guests added" becomes the RSVP summary (invited, coming, not coming, not answered) as a pie chart with a table, never colour alone, accessible name stating the numbers, plus-ones counted in the headcount.

## Cross-Story Dependencies

- 7.1 (migration, helpers, tokens, exchange route) underpins every other Core story. 7.3 underpins 7.5 and 7.7; 7.8 depends on 7.1 and 7.3 and is reused by Story 2.10 removal and Story 2.7 Event deletion. 7.10 validates all Core stories on the flagship seed in `supabase/seed.sql`.
- Builds on Epic 1 (rate limiter, Privacy notice, state primitives), Story 2.9/2.10 (guests and the `guests`/`guest_contacts` split), Story 2.6 (dates and time zone), Story 3.5 (`invite_tokens`) and Epic 5 (Dashboard *On track* slot).
- Carry-forwards out: Epic 6 adds `ai_purge_user` to `guests_delete_guest_data`; Epic 8 adds `guest_requests`/`guest_results`, Dashboard sections and `tasks_purge_guest` (other-needs text must never reach an AI prompt); Epic 9 adds the Landing page link; Target 3/Epic 10 add *Remind*, emailed links and fresh links; Epic 11 adds a README Guest demo user and manual screen-reader, Safari and in-app-browser checks in `docs/testplan.md`.
