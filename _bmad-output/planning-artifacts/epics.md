---
stepsCompleted: [1, 2]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-Arrangly-2026-09-22/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/EXPERIENCE.md
  - _bmad-output/planning-artifacts/briefs/brief-Arrangly-2026-09-20/brief.md
  - _bmad-output/planning-artifacts/briefs/brief-Arrangly-2026-09-20/addendum.md
---

# Arrangly - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Arrangly, decomposing the requirements from the PRD, UX Design and Architecture into implementable stories. Scope is the **Core** tier (PRD §6.1); Target and Stretch items are not planned here. PRD §3 glossary terms are used verbatim. FR numbers match the PRD (FR1 = FR-1).

## Requirements Inventory

### Functional Requirements

FR1: Any Organizer or Role-holder can create an account and log in with email and password, Google or GitHub. A verified Google/GitHub email that already has an account opens that same account; new accounts need a unique verified email and a password meeting a minimum strength policy; a logged-in user lands on a dashboard listing their events; a Role-holder is invited by a unique invite link that pre-fills name and email.

FR2: When an Event is created, Arrangly activates a relevant subset of Roles from the Branch Pool based on event type and description; the Organizer can add or remove active Roles. Only the Organizer can assign, change or revoke a Role-holder's Role. A Role-holder can see and act only on what their Role permits, enforced server-side. Revoking a Role immediately removes access. Several Role-holders can share a Role. The Organizer sets exactly one Role lead per Role; only the Role lead and the Organizer can delegate that Role's Tasks.

FR3: A Guest is identified by a Magic Link matched to the invited email, with no login and no PIN. After RSVP, a Guest without an Arrangly account is offered an optional account (password, Google or GitHub) or *Not now*. A Guest who declines can always get a fresh Magic Link by entering their email. An invalid or expired link explains itself and offers a fresh one.

FR4: A guided, branching questionnaire (event type, guest count, duration, venue known, RSVP wanted and due date, guest-list method) produces structured Event fields. Each Event has an Event language (nb or en) defaulting to the Organizer's interface language. The RSVP due date is editable in Event settings. Skipping a question that matters yields a Proposed Task rather than a silent gap.

FR5: The Organizer adds Guests by shareable invite link or by entering name and email manually. Manually added Guests receive an individual Magic Link by email when the Event is published. An invite-link Guest is unidentified until they open the link and confirm their name. (Bulk import is Target.)

FR6: The Organizer writes a free-text Event description; Arrangly proposes an initial set of Tasks under the activated Roles, including Subtasks. No suggested Task becomes active without explicit per-Task confirmation. Each suggestion belongs to exactly one active Role and can be recategorised. Questionnaire gaps and Task status notes can also yield Proposed Tasks under the same confirmation rule.

FR7: A Task has exactly one owner (person or Role), a deadline, a status, optional dependencies and an optional parent Task, always within the same Role. A blocked Task is visually distinguishable from an unblocked one on Dashboard and Timeline. Delegating reassigns without losing history, and the new owner must accept. A Subtask cannot move to another Role without being promoted first. A Task carries optional guest-program fields: *show on guest program*, a guest-facing label and a time of day.

FR8: Task status is Not started, In progress, Waiting on external or Done, each with an optional note. Blocked (incomplete dependency) and Overdue (past deadline, not Done) are computed, never set by hand. The owner can raise a Problem flag with a note, shown to the Organizer and Role lead until resolved and visually distinct from Blocked. Status changes are timestamped.

FR9: A Role-holder sees their assigned Tasks with scope, deadline, dependencies, parent/Subtasks and status in one view, plus who else is on the Team. A new Task must be explicitly accepted; until then the Organizer sees "Not yet accepted", and after 48 hours it joins the Organizer's needs-attention list. A first-time Role-holder understands what is expected within about a minute.

FR10: A Task can be routed to a specific person as a Decision Task (options + context). The recipient's response is recorded and can spawn a new Task in the same action. A Decision Task shows distinctly as "needs your decision".

FR11: A Task explicitly tied to one not-yet-chosen option of an open Decision Task is automatically marked obsolete when the decision resolves against that option. Obsolete Tasks are visually distinct and never deleted. Reversing a decision re-runs the spawn/obsolete logic idempotently.

FR12: Every Task row shows whether it is delegated (a person owns it) or pending (owned by a Role with no person), independent of completion status. The Organizer can filter *My tasks* to pending Tasks. A delegated Task also shows Not yet accepted / Accepted as a separate signal.

FR13: A Role-holder can add several named candidate options (name, type, notes) to a Task and submit them as a Decision Task. Entry is manual; no automatic capacity or geo filtering in Core.

FR14: From a Task, a Role-holder can request an AI-drafted message (e.g. vendor outreach) pre-filled with Event date, guest count and occasion, handed off to their own mail client. Arrangly never sends it.

FR15: A Guest opening their Magic Link is greeted by name and asked yes/no, then (if yes) plus-one, allergies and food preferences, hotel need and a freeform "other needs" field. Declining skips the follow-ups. A submitted RSVP is visible to the Organizer and relevant Role in the same session. A Guest can change their answer at any time, including after the due date.

FR16: A freeform need from the RSVP, or a request sent later from the Guest Dashboard, becomes a Proposed Task on the Dashboard of the owning Role (Arrangly ✦ suggests the Role; when unsure it goes to the Organizer, who can re-route). Completing the resulting Task writes a Guest-visible result automatically. A request can receive exactly one in-app reply from the Organizer or a holder of the owning Role, with a notification. RSVP, allergy or hotel changes after the RSVP due date notify the owning Roles and create no Proposed Task; before the due date they just update the Guests tab.

FR17: From the guest list, the Organizer can trigger a reminder email to a non-responding Guest or a filtered set, on demand only. No automatic time-based send in Core.

FR18: A Guest sees their own RSVP (with *Change my answer*), information resolved on their behalf, their requests with replies, a *Send a request* action and a link to the Landing page. A Guest with an account also sees their upcoming Events. A Guest without an account reaches the same information via their Magic Link at any time.

FR19: A single Organizer Dashboard shows what is done, overdue, blocked, flagged with a Problem, not yet accepted, and needs a decision or delegation, plus a Guests tab aggregating RSVP status and compiled allergy/hotel data routed to the relevant Role. The Organizer can state the Event's status from the Dashboard alone.

FR20: A Timeline renders each active Role as one swimlane (a Role is a Line of Effort), ordered by dependency with ties broken by deadline, with Subtasks nested in their parent and Decision Task points visible before resolution. Core is a static, server-computed, read-only render that scrolls horizontally; clicking a Task opens it.

FR21: The Organizer, or a Role-holder scoped to their Role(s), can push a one-way announcement to a person, a Role, the whole Team or a custom group. Announcements form a flat feed with no threading or read receipts. The sender can switch on *Ask for volunteers*, adding a one-tap *I can help* response (withdrawable); the sender sees responders in order and can assign any of them to a Task in one step.

FR22: Each Event has a Landing page with About, Program (the Run of Show), Location, Menu and practical info. The Program is built only from Tasks with *show on guest program* on, using guest label and time of day. On first open, Arrangly ✦ drafts the About text in the Event's language; the Organizer can edit, rewrite with a tone hint or write it manually. Guests see only the last published version; edits after publishing stay hidden until the Organizer publishes the update. Before first publish, Guests see RSVP and Guest Dashboard only. If AI drafting fails or hits the cap, the editor opens empty with a short explanation.

FR23: Each user chooses per channel how Arrangly reaches them: in-app (always on), email and web push (requested only when switched on). Notifications fire for a new Task assigned, a new decision request, a decision result, a Problem reported, a post-due-date RSVP change, an announcement and a reply to a Guest request. Notifications are sent immediately; one user action produces at most one notification per recipient. SMS is shown only as a disabled "coming later" option.

### NonFunctional Requirements

NFR1 (SM-2, FR2): RBAC holds under test. No user can act outside their Role's granted access, and every rule is enforced in the database (RLS, column grants, SQL functions), never only in the UI. Source: PRD §7 SM-2, AD-3, AD-19.

NFR2 (PRD §4.9, AD-11): GDPR baseline. All data stored and processed in the EU (Supabase `eu-north-1`, Vercel `arn1`); a Guest gives explicit consent before entering allergy or food data; health data is never sent to AI; Guest personal data is deleted automatically 15 days after the Event ends, keeping anonymous counts only; a Guest can *Delete my data* at any time; a privacy notice lists the processors (Supabase, Vercel, Anthropic, Google). Allergy, food and hotel data never appear in prompts, notification payloads or logs.

NFR3 (PRD §4.9, AD-14): The whole product, including AI-drafted text and emails, is available in Norwegian Bokmål and English. Language follows device/browser, falls back to English and can be overridden in settings. Norwegian strings are written natively. All UI text lives in `messages/nb.json` and `messages/en.json`.

NFR4 (PRD §4.9, AD-9): AI cost control. Every AI call goes through a gateway with a per-feature hard cap and a USD 5/month ceiling; fixture mode is the default outside production and always used in tests and previews; hitting a cap never produces an error page and each feature has a defined fallback.

NFR5 (PRD §5): Web only, not a native app. The Guest side must be usable at 375px width in current mobile Safari and Chrome; the Organizer works mainly on desktop Safari/Chrome/Edge.

NFR6 (EXPERIENCE.md): WCAG 2.2 AA on every surface, including reflow at 320 CSS px / 400% zoom with no two-way scrolling, keyboard support, visible focus ring, status never conveyed by colour alone, and live-region rules.

NFR7 (FR23, AD-7): Notifications are immediate with no time-based grouping; at most one notification per recipient per user action; payloads hold IDs and i18n keys only.

NFR8 (AD-8, AD-10): Email delivery is paced (at most 20 per minute and 400 per day); rows over the cap stay queued and are shown to the Organizer as "x queued"; delivery retries up to 5 attempts, then is marked failed.

NFR9 (AD-16, SM-1): Quality gates. Every RLS policy, grant and SQL function has a pgTAP test proving one allow and one deny; Vitest covers branching TS logic; Playwright covers UJ-1, UJ-2, UJ-3 and the Google account-upgrade flow with AI in fixture mode; all three run in GitHub Actions against local Supabase on every push.

NFR10 (AD-21, AD-4): Abuse resistance on public endpoints: rate limits of 5 per minute per IP, 3 per hour per email or token and 10 guest requests per Guest per day; 256-bit invite tokens stored hashed, compared in constant time, revocable.

NFR11 (SM-1): The flagship scenario (40th birthday, 80 guests: venue, dinner, speeches, quiz, DJ) runs end to end across Organizer, Role-holder and Guest personas in a deployed app by the launch date, 2026-12-20.

NFR12 (SM-3, SM-4, SM-5): Usability targets. A first-time Role-holder finds their Tasks and understands what is expected within about a minute; a Guest can RSVP, add a plus-one and register allergies without creating an account; the Organizer can state the Event's status from the Dashboard alone.

NFR13 (PRD §6.1, FR8): Release scope fallback. Status changes are timestamped (FR8), and if Core slips the cut order is web push, then the *I can help* volunteer response, then the AI-drafted About. Each cut must leave its FR working.

NFR14 (AD-20): Environment isolation. Vercel previews are protected and receive only the publishable key; AI runs in fixture mode and delivery happens only from production.

NFR15 (AD-15, Operations): The cloud database changes only through migrations deployed from `main` by CI; the demo project must be opened the day before grading (the free plan pauses after 7 idle days); a weekly `pg_dump` is kept as a private artifact.

NFR16 (EXPERIENCE.md): Interaction quality. Undo toasts (10 s) instead of "Are you sure?" except for irreversible or outward actions; optimistic updates for status changes and ✓/✕; 150–250 ms motion with `prefers-reduced-motion` honoured; tap targets ≥ 44×44px on phone.

### Additional Requirements

Starter and tooling

- Scaffold with `create-next-app` 16.3 (App Router, TypeScript 5.9, Tailwind 4.3), then shadcn/ui + Lucide via the shadcn CLI. This is Epic 1, Story 1.
- Use pnpm only; add `"packageManager": "pnpm@<version>"` and `engines` to `package.json`. Record the verified test commands (pgTAP `supabase test db`, Vitest, Playwright) in AGENTS.md (currently TODOs).
- Pinned stack: @supabase/supabase-js 2.117, @supabase/ssr 0.12, Supabase CLI 2.119, next-intl 4.14, zod 4.6, @anthropic-ai/sdk 0.131, nodemailer 10, web-push 3.6.7, Vitest 5, Playwright 1.63.
- Source layout: `app/` with `(team)/`, `(guest)/`, `privacy/`, `api/notifications/deliver`, `api/invite/[token]`; `proxy.ts`; `src/modules/{events,tasks,guests,notifications,ai}` each with `actions.ts`, `queries.ts`, `schemas.ts`; `src/types/database.ts` (generated); `messages/`; `public/sw.js`; `supabase/{config.toml,migrations,tests,fixtures/ai,seed.sql}`; `e2e/`; `vercel.json` with `regions: ["arn1"]`.

Data and security architecture

- AD-1 module ownership: only the owning module writes its tables; cross-module writes call the owner's SQL function along an allowed arrow in the module graph. Five modules: events, tasks, guests, notifications, ai.
- AD-2 two mutation paths: direct edits only on granted columns; everything else is one Postgres function called from a Server Action (`tasks_set_status`, `tasks_delegate`, `tasks_accept`, `tasks_resolve_decision`, `tasks_propose`, `tasks_confirm_proposed`, `guests_submit_rsvp`, `guests_submit_request`, `guests_reply_request`, `guests_publish_landing`, `guests_delete_guest_data`, `events_set_role_lead`, `events_revoke_role`). `tasks_resolve_decision` locks the Decision Task `FOR UPDATE`; follow-up Tasks record `spawned_by_option_id`.
- AD-3 RLS: every table has RLS; policies use only `events.organizer_id`, `role_members`, `tasks.owner_user_id`, `guests.user_id` through the helpers `is_organizer`, `holds_role`, `is_guest_of`, `is_guest_self`; never email matching; views are `security_invoker`; Guests see only their own rows plus the latest published `landing_snapshots`; `guest_food` and `guest_hotel` are readable only by the Organizer, the Guest and holders of the owning Role.
- AD-19 database as boundary: `authenticated` gets SELECT per RLS and `UPDATE (col,…)` only on listed direct-edit columns; all other INSERT/UPDATE/DELETE revoked; invariants as constraints or triggers (one lead per Role via partial unique index, dependencies and parents in the same Role via trigger, consent CHECK on food data, Role deactivation as `roles.active=false`, never a delete).
- AD-4 one invite system: table `invite_tokens` with `kind ∈ {guest, role_holder, shared_event}`, one exchange route `app/api/invite/[token]`; a guest-only user gets a session, anyone else is sent to sign-in; invitees are passwordless Supabase Auth users; adding a password, identity or Role revokes that user's guest tokens in the same transaction; fresh-link responses are identical whether or not the email exists; Supabase's own magic links are never used for invites.
- AD-5 elevated privilege: `SUPABASE_SECRET_KEY` only in the invite exchange, invitee creation, notification delivery and auth-user deletion, never in a client component; `security definer` only for `notifications_emit`, `ai_reserve`, `guests_delete_guest_data` and its purge hooks, the retention job and token exchange, each with `search_path = ''`, `REVOKE EXECUTE … FROM public, anon, authenticated` and a pgTAP test.
- AD-6 providers: email+password, Google and GitHub through Supabase Auth; automatic linking on verified email; `updateUser` to add a password; `linkIdentity` with manual linking enabled in `config.toml` and the cloud project; never derive providers from `raw_app_meta_data`; Playwright test for Guest-to-account upgrade with Google.
- AD-7/AD-8 outbox: `notifications_emit(event_id, kind, subject_ref, recipients[])` is the only writer to notification tables; recipient specs `user, role, role_lead, organizer, team, group, guest, data_owner`; rows unique on `(txid, recipient_id)` with merged `kinds[]`; a trigger on `notification_outbox` calls `net.http_post` to `/api/notifications/deliver` (URL and `DELIVERY_SECRET` from Vault); the route requires `Authorization: Bearer`, claims rows with `claimed_until`, tracks `email_sent_at` and `push_sent_at` per channel, deletes push subscriptions on 404/410, and a pg_cron job retries; Realtime publication contains only `notifications` and `announcements`; announcements require a confirmation dialog.
- AD-9 AI gateway: only `src/modules/ai` imports `@anthropic-ai/sdk`; `ai_reserve(feature, event_id)` reserves before each call. Feature keys and caps: `task-list` 3 per Event (Organizer); `status-note` 20 per Event per day (Task owner); `draft-email` 20 per user per day (Task owner); `route-request` 1 per request (system); `landing-about:draft` 1 and `:rewrite` 5 per Event (Organizer). Worst-case cost is reserved then settled; Server Actions calling AI export `maxDuration = 60` and treat timeouts as `unavailable`; fixtures in `supabase/fixtures/ai`; `AI_LIVE=1` and production required for live calls.
- AD-10 email: every app email is an outbox row sent by nodemailer over SMTP (personal Gmail with app password for v1, raising the Supabase Auth email rate limit from 30 per hour); provider switch (Resend) is configuration only; Supabase Auth's own emails are the only exception.
- AD-11 GDPR mechanics: `guests_delete_guest_data(guest_id)` calls purge hooks `tasks_purge_guest`, `notifications_purge_user_event`, `ai_purge_user` in one transaction; every FK to `guests`, `guest_requests` or `auth.users` is `ON DELETE SET NULL` or `CASCADE` (pgTAP asserts no `NO ACTION`); the auth user is deleted only if guest-only and a guest of no other Event; a pg_cron job runs the deletion 15 days after `events.ends_at` after writing anonymised counts to `event_guest_stats`, idempotent and catching up after pauses; static privacy page; `proxy.ts` never reads personal data.
- AD-12 Landing page snapshot: the Organizer edits `landing_pages`; `guests_publish_landing` copies into an immutable `landing_snapshots` row and builds the Program from Tasks with *show on guest program* on, using only guest label and time of day.
- AD-13 Timeline computed per request by one TS function (topological sort per lane, ties by deadline, Subtasks nested); no table stores order.
- AD-14 next-intl without locale in URLs; UI language from setting, then browser, then `en`; Guest-facing text uses `events.language`.
- AD-15 migrations: every schema, policy, grant, function, trigger and cron change is a file in `supabase/migrations`; the cloud receives it only from `main` through CI `supabase db push`; `supabase gen types` regenerates `src/types/database.ts` after each migration; one `supabase/seed.sql` owns the flagship 40th-birthday scenario.
- AD-16 test ownership: pgTAP for RLS/grants/functions (including a denied direct PostgREST write), Vitest for TS logic (AI reservation and settling, Timeline sort, email pacing), Playwright for UJ-1/2/3 and the Google upgrade; CI on every push against local Supabase in Docker.
- AD-17 every Server Action and route handler parses input with Zod first; Server Actions return `{ ok: true, data } | { ok: false, error: { code, message } }` with `message` a next-intl key and never throw to the client.
- AD-18 Proposed Tasks live in `tasks` with `lifecycle ∈ {proposed, active, dismissed}` and `source ∈ {ai_description, questionnaire_gap, status_note, guest_need, guest_request}`; only `tasks_propose` creates them; every Task has a required `role_id` and an optional `owner_user_id` (NULL means Role-owned/pending); `events_set_role_lead` calls `tasks_assign_role_owned_to_lead`; `events_revoke_role` calls `tasks_release_owner`; `guests_submit_request` commits the request with its Proposed Task routed to the Organizer, then `route-request` may only re-route; `tasks_set_status(done)` on a Task with `source_guest_request_id` calls `guests_publish_result`; one reply per request enforced by a unique constraint.
- AD-20 preview isolation and AD-21 Postgres-backed rate limiter (see NFR10, NFR14).
- Conventions: tables and columns `snake_case` plural; SQL functions `module_verb_noun`; TS files `kebab-case`, components `PascalCase`; keys `uuid`; timestamps `timestamptz` UTC; `events.starts_at`, `ends_at`, `time_zone`, `language` required; a deadline is a `date` in the Event's time zone, overdue after 23:59:59 local; "N days before the event" is stored resolved and recalculated when `starts_at` changes; guest-program time is a local time in the Event's time zone.
- Task state: stored `lifecycle`, `status ∈ {not_started, in_progress, waiting_external, done}`, `accepted_at`, `obsolete`, open Problem; `blocked`, `overdue` and `stale_unaccepted` (48 h) are derived in a `security_invoker` view and never stored.
- Guest-data ownership convention: allergies and food belong to Food & Beverage; hotel to Travel & Logistics; RSVP and requests to Guests; the Organizer owns them when that Role is inactive.
- Server auth: `proxy.ts` refreshes the session only (`@supabase/ssr`); server code uses `auth.getClaims()`, never `getSession()`.
- Env: Zod-validated at startup; client `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`; production-only server `SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `SMTP_*`, `VAPID_PRIVATE_KEY`, `DELIVERY_SECRET`, `AI_LIVE`; CI `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`; Vault holds the deliver URL and `DELIVERY_SECRET`.
- Logging: server logs carry event id and user id only, never names, health data or prompt bodies.
- Core entities: events, roles, role_members, invite_tokens, event_guest_stats, tasks, task_dependencies, decision_options, problems, status_history, guests, rsvps, guest_food, guest_hotel, guest_requests, guest_results, landing_pages, landing_snapshots, notification_outbox, notifications, announcements, announcement_groups, announcement_group_members, volunteer_offers, channel_prefs, push_subscriptions, ai_usage. Exact columns and indexes are fixed by each module's first story.
- Repository policy (AGENTS.md): work on `feat/…` or `fix/…` branches and open PRs, never commit to `main`; keep the `Co-Authored-By` trailer; never hand-edit `src/types/database.ts`.

### UX Design Requirements

UX-DR1: Implement the design tokens from DESIGN.md as shadcn theme variables in light ("Warm Sky") and dark ("Clear Sky") modes: background, card, sidebar, foreground, muted-foreground, border (decorative only), input (control boundaries), ring, primary and primary-soft, destructive, status-done/waiting/overdue/decision/obsolete, blocked-row, at-risk, badge; with Light/Dark/System appearance defaulting to System.

UX-DR2: Apply the typography system: system font stack replacing shadcn's sans, role tokens (large-title 34/26px, headline 17, body 16/15, subhead 13, section-label 13 uppercase via CSS only, caption 12), shipped as rem.

UX-DR3: Apply the two density modes (Airy on desktop, Balanced on phone) and the rounded scale (sm 8, md 12, lg 16, full, 10px Timeline bars), the 240px sidebar and 960px content width, 16px phone gutters, and the wrap rules below 360px (no fixed-width buttons, labels wrap before truncating).

UX-DR4: Build the status vocabulary once: each status has fixed colour, Lucide icon and word in nb and en (Needs your decision, Overdue N days, Problem reported, Waiting on {party}, Waits for {task}, Not yet accepted, In progress, Done, Obsolete, N at risk, new-item badge). Red means act, grey means wait, purple means decide; Blocked is never red; status is never colour-only.

UX-DR5: Build the responsive Sidebar: event group (Dashboard, My tasks, Guests, Timeline, Team & Roles, Announcements, Landing page, Event settings, All events) in a labelled `nav`; items outside the viewer's Role are not rendered; active item with tint, weight and leading bar plus `aria-current="page"`; My tasks badge = New + Urgent; below 1024px a right-hand `Sheet` opened by a top-right menu button placed after the `h1`, with focus trap, Esc/navigation close and focus return.

UX-DR6: Build the All events home with Event cards (one link with a full accessible name; count circle = Open, badge = New, urgent and at-risk states with "N overdue / N need you / N at risk"; guest-only cards show RSVP state), a Create-new-event card always last, "Draft · continue setup" cards, a Past events group, and the warm "Let's plan something." empty state.

UX-DR7: Build the six-step Create event wizard (Questionnaire → Guests → Description → Review ✦ → Team → Publish) with step captions, Back/Next on every step, "Not sure yet" skips that produce ✦ Proposed Tasks, inline validation of pasted guest rows, per-Role grouped review rows with ✓/✕/edit, auto-saved draft event, and a Publish confirmation ending in "Invitations are on their way to N guests."

UX-DR8: Build the Dashboard with fixed sections Needs you (decisions → Problems → ✦ Proposed Tasks → overdue → not yet accepted), At risk (waiting → blocked) and On track (per-Role summary and guest numbers), soonest deadline first, empty sections collapsing to a quiet line, section `h2` with count pills, a *Show dismissed (n)* link with *Restore*, and the "Only your team can see this event" publish banner.

UX-DR9: Build the Proposed Task row (✦) with source attribution ("From caterer note · Catering · Peter · due Wed 14 Oct"), inline title editing, ✓/✕ with 44px hit areas, Undo toasts, and the specified focus management after the row leaves or is restored.

UX-DR10: Build the Decision card (the only lifted element per screen, always first in Needs you, never auto-dismissed) and the Decision page (radio group of option cards with a selected `circle-check` and 2px purple border, *Confirm decision*, inline *+ Add follow-up task*, *Change decision* re-running idempotently).

UX-DR11: Build the Task row (status icon, title, status word, owner or "Not delegated", "Blocks N tasks", blocked tint with "Waits for: {blocker}", obsolete strikethrough behind *Show obsolete (n)*, Problem flag with note excerpt) used everywhere Tasks are listed, with the whole row opening Task detail.

UX-DR12: Build Task create/edit (Title, Role, Owner, Deadline as date or "N days before the event", Description, same-Role Parent, Depends on, "Only if option … is chosen"), the *Create task* shortcut on a status note, and the Delegate picker (`Command` of the Role's people, Organizer can pick anyone, "Invite pending" entries, history preserved, new owner must Accept).

UX-DR13: Build the full-page Task detail: back control returning to scroll position, Accept banner, grouped metadata card, status control (segmented on desktop, full-width `Select` on phone) with note, Help card (✦ *Draft email*, *Add options → Send for decision*), Guest program card (Organizer), Problem reporting and *Resolve problem*, history with *Remove*, and a sticky bottom action bar on phone with safe-area inset.

UX-DR14: Build ✦ Draft email (review, then *Open in mail app* via `mailto:`, copy "Draft ready. It opens in your own mail app, and Arrangly never sends it for you.") and Options entry (named options with type and notes).

UX-DR15: Build the Timeline: sticky Role column with holders and lead marked, 112px lanes, 24px-per-day axis with Monday week labels, Task bars styled per status, nested Subtasks, decision diamonds (filled open, outline resolved), today line, event-day column, 48px edge fade, `role="region"` with `tabindex="0"`, labelled lane lists, Task links with full accessible names, and a List view toggle that is the phone default.

UX-DR16: Build the Guests tab with summary tiles as toggle buttons (`aria-pressed`, announcing "Showing 16 pending guests"), guest rows with food/allergy/request bullets only for fields the viewer's Role may see, multi-select *Remind* with a confirmation dialog, and the "No guests match this filter." empty state.

UX-DR17: Build Team & Roles (activate Roles, assign/revoke with confirmation, set Role lead, "Invite sent · not joined yet" with *Resend invite*) and Event settings (dates, RSVP due date, Roles on/off, language, cancel/delete event with confirmation).

UX-DR18: Build Announcements: flat feed, composer with recipient picker scoped by Role, *Ask for volunteers* switch, a confirmation on *Send*, the *I can help* / "You offered to help" / *Withdraw* response, and the sender's responder list with *Assign to task* opening Delegate prefilled.

UX-DR19: Build the Landing page editor (✦ About drafted on first open, *Rewrite* with tone hint, *Write it myself*, Program drafted from guest-program Tasks, Location, Menu, Practical info, *Preview as guest*, *Publish*, "Unpublished changes" banner with *Publish update*) and the Guest-facing Landing page (hero plus About, Program, Location, Menu, Practical info; readable after the event; "The program will appear here closer to the day." before first publish).

UX-DR20: Build the Guest RSVP flow: one question per screen as a `fieldset` with the question as `h1` and focus moving there each step; progress "Question 2 of 4" counting only applicable steps; Back always available; *No* ends warmly ("Thanks for letting us know, Chris."); allergies as checkboxes plus "Other"; an unticked consent checkbox that enables food fields and may be skipped; inline errors with `aria-invalid` and `aria-describedby`; warm confirmation ("You're on the list, Chris!").

UX-DR21: Build the Guest Dashboard (My RSVP with *Change*, Resolved for you, My requests with reply or "Waiting for an answer", *Send a request* as a sticky phone bar, *Delete my data* with confirmation), the shared-invite name+email form, the Account offer card (password, Google, GitHub or *Not now*), and the expired-link screen ("This link has expired. We can send you a fresh one.").

UX-DR22: Build Profile & Settings (name, email, password, connected Google/GitHub, Appearance, Language, Notification preferences per channel with In-app locked on, Push asking permission only when switched on, "Blocked in browser settings" instructions, iOS *Add to Home Screen* explanation, SMS disabled "Coming later") and a Privacy notice page linked from every footer and the consent text.

UX-DR23: Implement the Interaction Primitives: Undo toasts (10 s, pausing on hover/focus, F6 or Alt+T to reach), timeless restore paths for every undoable action, confirmation dialogs only for Publish, Send announcement, Remind guests, Revoke role and Cancel/Delete event, optimistic updates reverted with a toast on failure, no drag and drop, no hover-only affordances, no infinite scroll.

UX-DR24: Implement the State Patterns table: Skeletons in final layout shape, load-failed inline card with *Retry* (`role="alert"`), the empty states for every list, the waiting-on-AI progress line with "Taking longer than usual" after 20 s, AI failed/cap-reached fallback copy, permission-denied page, role-revoked toast with redirect, concurrent-edit toast, offline notice with queued status changes, save-failed toast, event cancelled and event-date-passed states, and auth error messages.

UX-DR25: Implement the accessibility floor: Skip-to-content link, `nav`/`main`/`header` landmarks, `document.title` "{Surface} – {Event} – Arrangly" and focus to the `h1` on every route/step, visible focus ring everywhere (with `scroll-padding-bottom` for sticky bars), `role="status"`/`role="alert"` live regions, `lang` on `<html>` updated on override, localised accessible names for icon-only buttons, `<time datetime>` for dates, and the measured contrast pairs (do not lighten ⚠ pairs).

UX-DR26: Follow the Voice and Tone rules: quiet and plain on working surfaces, warm at human moments and across the Guest side; names rather than roles; verb buttons (Decide, Accept, Delegate, Publish, Send a request, I can help, Report a problem); no emojis in interface strings; Norwegian written natively; ✦ marks all AI output.

UX-DR27: Build the Guest-side layout: single scroll with no sidebar, Zola-style Landing page, a person who is both Guest and Role-holder in the same Event gets one event card that opens the team experience with a "Your invitation" card until answered.

### FR Coverage Map

FR1: Epic 1 - Account creation and login (email, Google, GitHub); Epic 3 - Role-holder invite link and account creation
FR2: Epic 2 - Role activation from the Branch Pool and adjusting active Roles; Epic 3 - assign, Role lead, revoke, RBAC enforced in the database
FR3: Epic 7 - Guest identity by Magic Link, optional account, fresh-link request
FR4: Epic 2 - Branching event-creation questionnaire, Event language, RSVP due date
FR5: Epic 2 - Guest list entry by hand; Epic 7 - sending Magic Links at publish, shared-link flow
FR6: Epic 6 - AI task suggestion from the event description, status-note proposals
FR7: Epic 4 - Task with owner, deadline, status, dependencies, parent, guest-program fields
FR8: Epic 4 - Status model, computed Blocked/Overdue, Problem flag, timestamps
FR9: Epic 4 - Role-holder task view, Accept step, 48-hour stale rule
FR10: Epic 4 - Decision Tasks that spawn follow-up Tasks
FR11: Epic 4 - Obsolete-marking of option-tied Tasks, idempotent reversal
FR12: Epic 4 - Delegation tracker and *Not delegated* filter
FR13: Epic 4 - Manual option entry on a Task
FR14: Epic 6 - AI-drafted external email handed to the user's mail client
FR15: Epic 7 - Guest RSVP flow with consent for food data
FR16: Epic 8 - Guest needs and requests as Proposed Tasks, one reply, results on the Guest Dashboard, late-change notifications
FR17: Epic 7 - Manual guest reminder
FR18: Epic 7 - Guest Dashboard
FR19: Epic 5 - Organizer Dashboard (Needs you, At risk, On track); Epic 7 - Guests tab
FR20: Epic 5 - Timeline with one swimlane per Role
FR21: Epic 10 - Announcements, volunteers (*I can help*)
FR22: Epic 9 - Landing page, Run of Show, AI-drafted About, publish snapshot
FR23: Epic 10 - Notification channels and preferences (in-app, email, web push); the outbox foundation lands in Epic 3

## Epic List

### Epic 1: Account and app shell

People can create an account, log in with email, Google or GitHub, see their events on *All events*, and set their profile, language and appearance, in an app that already has the design system, localisation, accessibility floor and CI the rest of the build relies on.

**FRs covered:** FR1

### Epic 2: Event and guest list

An Organizer can create an Event through the guided questionnaire, have Roles activated from the Branch Pool for its type, adjust them, keep the Event's settings, add guests by hand and publish the Event to the team, all with a draft that is never lost.

**FRs covered:** FR2 (activation), FR4, FR5 (entry)

### Epic 3: Team and email

An Organizer can invite Role-holders by email, assign them to Roles, set a Role lead and change or revoke a Role, and every invitee joins through a secure invite link. The outbox that carries all of Arrangly's email, reliably and at a safe pace, is built here.

**FRs covered:** FR2 (assign, lead, revoke), FR1 (Role-holder invite)

### Epic 4: Tasks and decisions

The Team can run the work: create, delegate, accept and update Tasks with Subtasks, dependencies and Problems, see their own Tasks, send options for a decision, and have follow-up and obsolete Tasks follow from the outcome.

**FRs covered:** FR7, FR8, FR9, FR10, FR11, FR12, FR13

### Epic 5: Dashboard and Timeline

An Organizer, or any Role-holder within their scope, can see the state of the Event at a glance (what needs them, what is at risk, what is on track) and read the Event as one swimlane per Role on the Timeline.

**FRs covered:** FR19 (team), FR20

### Epic 6: AI assistant

An Organizer gets a first set of Proposed Tasks from a one-sentence description, a Task owner gets Proposed Tasks from status notes and drafted outreach emails, and every AI call stays inside its cap with a fallback.

**FRs covered:** FR6, FR14

### Epic 7: Guests: invitation, RSVP and Guest Dashboard

A Guest opens a personal link, answers the RSVP without an account, and finds their answers and information on a Guest Dashboard. The Organizer sees RSVPs, food and hotel data on the Guests tab, can remind non-responders, and Guest data is deleted on request or 15 days after the Event.

**FRs covered:** FR3, FR5 (sending), FR15, FR17, FR18, FR19 (Guests)

### Epic 8: Guest requests and resolved needs

A Guest can describe a need or send a request at any time, and it reaches the Role that owns it as a Proposed Task. The Guest gets one reply, sees the result when the Task is done, and owning Roles are notified of late changes.

**FRs covered:** FR16

### Epic 9: Landing page and Run of Show

An Organizer drafts, edits and publishes the Event's Landing page, with an AI-drafted About and a Program built from the Tasks marked for guests. Guests see only the published version.

**FRs covered:** FR22

### Epic 10: Announcements and notification channels

An Organizer or Role-holder can send one-way announcements, optionally asking for volunteers, and every user chooses how they are reached: in-app, email or web push.

**FRs covered:** FR21, FR23

### Epic 11: Ready for launch

The product runs in production with its own environment, secrets and email provider, has a backup routine, the flagship 40th-birthday scenario seeded, and all three journeys passing end to end in a production smoke test.

**FRs covered:** none new; closes SM-1 and NFR9

## Epic 1: Account and app shell

People can create an account, log in with email, Google or GitHub, see their events on *All events*, and set their profile, language and appearance, in an app that already has the design system, localisation, accessibility floor and CI the rest of the build relies on.

### Story 1.1: App runs locally on the pinned stack

As a developer,
I want the app scaffolded and running locally with the pinned stack,
So that every later story builds on the same foundation.

**Acceptance Criteria:**

**Given** a fresh clone with Docker running
**When** I run `pnpm install`, `pnpm dev` and `supabase start`
**Then** the Next.js 16.3 App Router app (TypeScript 5.9, Tailwind 4.3, shadcn/ui, Lucide) serves a placeholder page against local Supabase
**And** `supabase/` contains `config.toml` (manual identity linking enabled), `migrations/`, `tests/`, `fixtures/ai/` and `seed.sql`, and `src/modules/{events,tasks,guests,notifications,ai}` exist as empty module folders.

**Given** `package.json`
**When** someone runs `npm install` or `yarn install`
**Then** Corepack rejects it because `packageManager` pins pnpm, and `engines` declares the Node version
**And** the matching TODO lines in AGENTS.md are replaced with the real values.

**Given** a required environment variable is missing or uses a legacy name (`ANON_KEY`, `SERVICE_ROLE_KEY`)
**When** the app starts
**Then** Zod validation fails and names the variable
**And** only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` are readable on the client.

**Given** any client component
**When** it imports `SUPABASE_SECRET_KEY` or the env module's server section
**Then** lint fails (AD-5)
**And** `vercel.json` sets `regions: ["arn1"]` (AD-11).

### Story 1.2: Design system and language foundation

As any user,
I want the app to look and read as Arrangly designs it, in my language,
So that every screen feels consistent from the first one.

**Acceptance Criteria:**

**Given** the app renders in light or dark mode
**When** I inspect the theme
**Then** shadcn variables carry the DESIGN.md values ("Warm Sky" light, "Clear Sky" dark), with `border` decorative only, `input` for control boundaries and `ring` for focus (UX-DR1)
**And** appearance follows `prefers-color-scheme` by default.

**Given** the type and density tokens
**When** pages render at desktop and phone widths
**Then** the system font stack, the role sizes (large-title, headline, body, subhead, section-label, caption) in rem, the Airy and Balanced densities and the radius scale apply, and wrap rules hold at 320px (UX-DR2, UX-DR3, NFR5).

**Given** a browser language of Norwegian, English or anything else
**When** I open the app
**Then** next-intl (no locale in URLs) renders `nb` for Norwegian and `en` otherwise, with all strings coming from `messages/nb.json` and `messages/en.json` (AD-14, NFR3)
**And** a Vitest test fails if the two files have different keys.

**Given** any route
**When** it loads
**Then** `<html lang>` matches the language, a localised "Skip to content" link is the first focusable element, landmarks `header`, `nav` and `main` exist, `document.title` follows "{Surface} – {Event} – Arrangly", and focus moves to the `h1` (UX-DR25)
**And** `prefers-reduced-motion` reduces motion to cross-fades.

**Given** the status vocabulary
**When** a status label renders
**Then** each state shows its fixed colour, Lucide icon and localised word, never colour alone (UX-DR4)
**And** Blocked is never red.

### Story 1.3: Quality gates run on every push

As the developer,
I want pgTAP, Vitest and Playwright running in CI against local Supabase,
So that later stories can prove their rules from the first migration.

**Acceptance Criteria:**

**Given** a push to any branch
**When** GitHub Actions runs
**Then** it starts local Supabase in Docker and runs `supabase test db`, Vitest and Playwright, each with one sample test, and the check fails if any layer fails (AD-16, NFR9)
**And** the workflow never holds cloud credentials on branch runs.

**Given** a migration that changes the schema
**When** CI regenerates types with `supabase gen types`
**Then** it fails if `src/types/database.ts` differs from the committed file (AD-15).

**Given** a merge to `main`
**When** CI runs the deploy job
**Then** `supabase db push` is the only path migrations reach the cloud project, using `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` and `SUPABASE_PROJECT_ID`
**And** the job is configured but needs the owner to add those secrets.

**Given** Playwright runs
**When** AI-touching code executes
**Then** it uses fixtures because `AI_LIVE` is unset (AD-9)
**And** the verified test commands replace the matching TODO in AGENTS.md.

### Story 1.4: Create an account with email

As a new Organizer or Role-holder,
I want to create an account with my email and a password,
So that I can start using Arrangly.

**Acceptance Criteria:**

**Given** the sign-up form
**When** I submit a valid email and a password meeting the strength policy
**Then** an account is created and I see "Check your inbox to verify your email."
**And** I cannot log in until the email is verified (FR1).

**Given** a weak password or a malformed email
**When** I submit
**Then** an inline rule list or error shows with `aria-invalid` and `aria-describedby`, and focus goes to the first error (UX-DR25)
**And** the Server Action parses input with Zod first and returns `{ ok, data }` or `{ ok: false, error: { code, message } }` with a next-intl key (AD-17).

**Given** an email that already has an account
**When** I submit the sign-up form
**Then** the response is identical to a new sign-up, so existence is not revealed (AD-4).

**Given** more than 5 sign-ups per minute from one IP, or 3 per hour for one email
**When** the next request arrives
**Then** it is refused with a friendly message (AD-21, NFR10)
**And** a pgTAP test proves one allowed and one denied call of the limiter.

**Given** any request
**When** `proxy.ts` runs
**Then** it only refreshes the session cookie and reads no personal data, and server code reads the user with `auth.getClaims()`, never `getSession()`.

### Story 1.5: Log in, log out and reset password

As a returning user,
I want to log in, log out and reset a forgotten password,
So that I get back to my events safely.

**Acceptance Criteria:**

**Given** a verified account
**When** I log in with the right credentials
**Then** I land on *All events* (FR1).

**Given** wrong credentials, or an unverified email
**When** I submit
**Then** I see "Email or password doesn't match." or "Check your inbox to verify your email." with *Resend* (UX State Patterns).

**Given** I am logged out and open a team route
**When** the page loads
**Then** I am redirected to log in and returned to that route afterwards, accepting only relative return paths.

**Given** I choose *Forgot password*
**When** I enter my email
**Then** the response is identical whether or not the account exists, and the reset link sets a new password under the same strength policy
**And** locally the email arrives in Supabase's mail catcher.

**Given** I am logged in
**When** I choose *Log out*
**Then** the session ends and protected routes redirect to log in.

### Story 1.6: Sign in with Google or GitHub

As a user,
I want to continue with Google or GitHub,
So that I don't need another password.

**Acceptance Criteria:**

**Given** the log-in and sign-up screens
**When** I choose *Continue with Google* or *Continue with GitHub*
**Then** a new account is created if none exists and I land on *All events* (FR1, AD-6).

**Given** the provider reports a verified email that already has an Arrangly account
**When** I sign in
**Then** that same account opens, with no duplicate user.

**Given** the provider reports an unverified email, or I cancel at the provider
**When** I return to the app
**Then** no linking happens and a clear message explains what to do.

**Given** local and CI environments
**When** this story is done
**Then** a documented way to test OAuth sign-in and linking automatically (mock provider or equivalent) exists, which Epic 7's guest-upgrade test reuses.

### Story 1.7: App shell and *All events*

As a logged-in user,
I want a consistent shell with my events home,
So that I always know where I am and how to get around.

**Acceptance Criteria:**

**Given** a logged-in desktop session (≥ 1024px)
**When** a page loads
**Then** a left sidebar in a labelled `nav` shows *All events* and the profile at the bottom, with `aria-current="page"` on the active item and room for the event group added by later epics (UX-DR5).

**Given** a viewport under 1024px
**When** I tap the top-right menu button, placed after the `h1` in DOM order
**Then** the sidebar opens as a right-hand `Sheet` that traps focus, closes on `Esc` or navigation, and returns focus to the button.

**Given** a user with no events
**When** *All events* loads
**Then** it shows the warm "Let's plan something." empty state in the user's language (UX-DR6)
**And** the Create-new-event card is added by Epic 2, not shown here.

**Given** any page
**When** I scroll to the footer
**Then** a *Privacy notice* link opens a static page, in nb and en, listing the processors (Supabase, Vercel, Anthropic, Google), what is stored and the 15-day Guest-data retention (UX-DR22, NFR2).

### Story 1.8: Feedback and state primitives

As any user,
I want clear feedback for loading, failures and reversible actions,
So that I trust what the app is doing.

**Acceptance Criteria:**

**Given** an undoable action raises a toast
**When** it appears
**Then** it lasts 10 seconds, pauses on hover or focus, is announced as `polite`, and can be reached with F6 or Alt+T (UX-DR23).

**Given** a page is loading data
**When** it first renders
**Then** a `Skeleton` in the final layout shape shows, not a full-page spinner (UX-DR24).

**Given** a load fails
**When** the error appears
**Then** an inline card with `role="alert"` says "Couldn't load this. Check your connection and try again." with *Retry*, and cached content stays visible.

**Given** the browser goes offline, or a save fails
**When** it happens
**Then** a single `role="alert"` says "You're offline. Changes will save when you're back." or a toast says "Couldn't save. Trying again." and the input is kept with *Retry*
**And** motion is 150–250 ms ease-out and honours `prefers-reduced-motion`.

### Story 1.9: Profile and settings

As a user,
I want to manage my name, sign-in methods, language and appearance,
So that the app suits me.

**Acceptance Criteria:**

**Given** *Profile & Settings*
**When** I change my display name
**Then** it is saved in Supabase Auth user metadata and shown across the app.

**Given** I am signed in with email
**When** I change my email or password
**Then** the change goes through `updateUser`, an email change requires verification, and the new password follows the same strength policy.

**Given** *Connected accounts*
**When** I choose *Connect Google* or *Connect GitHub*
**Then** `linkIdentity` links it, and the list of connected providers is read from the user's identities, never from `raw_app_meta_data` (AD-6)
**And** a password can be added for an account created through a provider.

**Given** *Language* and *Appearance*
**When** I choose nb, en or Auto, and Light, Dark or System
**Then** the choice applies immediately, `lang` updates, options are written in their own language, and it persists across sessions (AD-14).

**Given** notification preferences
**When** this story is done
**Then** they are not shown yet, because Epic 10 adds them.


## Epic 2: Event and guest list

An Organizer can create an Event through the guided questionnaire, have Roles activated from the Branch Pool for its type, adjust them, keep the Event's settings, add guests by hand and publish the Event to the team, all with a draft that is never lost.

### Story 2.1: Events table and Organizer-only access

As an Organizer,
I want my Event stored so only I can see and change it,
So that nobody else can read or alter my plans.

**Acceptance Criteria:**

**Given** a logged-in user starting a new Event
**When** the app calls `events_create` under their session
**Then** a draft Event row exists with `organizer_id = auth.uid()` and the client cannot supply `organizer_id` (AD-2, AD-19)
**And** exactly one Organizer exists per Event.

**Given** RLS on `events`
**When** the Organizer, another logged-in user and an anonymous caller each read the row
**Then** only the Organizer sees it (AD-3, NFR1)
**And** a pgTAP test proves one allowed and one denied case, including a denied direct PostgREST `INSERT` and a denied `UPDATE` of `organizer_id`.

**Given** the migration
**When** it is applied
**Then** `authenticated` has `UPDATE` only on the columns listed as direct-edit, and every other change goes through a function (AD-19)
**And** a CHECK constraint requires `name`, `starts_at`, `ends_at`, `time_zone` and `language` and `starts_at < ends_at` before an Event can be published, so a draft may be incomplete.

**Given** the helper `is_organizer(event_id)`
**When** policies use it
**Then** it is `STABLE`, sets `search_path = ''`, and a pgTAP test covers true and false (AD-3)
**And** `src/types/database.ts` is regenerated and the events module is the only writer (AD-1, AD-15).

### Story 2.2: Questionnaire with structured answers

As an Organizer,
I want to answer a short, branching questionnaire,
So that Arrangly knows what kind of Event this is.

**Acceptance Criteria:**

**Given** wizard step 1
**When** I answer event type, date and time with time zone, guest count, duration, venue known, RSVP wanted with due date and guest-list method
**Then** each answer is saved as a structured column, not free text (FR4)
**And** date and time are asked because `starts_at` is required.

**Given** I answered "RSVP wanted: no"
**When** the next question loads
**Then** the due-date question is skipped (branching).

**Given** any question
**When** I choose "Not sure yet"
**Then** the answer is stored as an explicit `unknown`, distinct from never asked, so Epic 4 can propose a Task for it
**And** this story creates no Tasks.

**Given** invalid input (guest count not a positive integer, RSVP due date after `starts_at`)
**When** I continue
**Then** Zod and a database CHECK both reject it, the error is inline with `aria-invalid` and `aria-describedby`, and focus goes to the first error (AD-17, AD-19)
**And** the Event language defaults to my interface language and can be changed (FR4).

**Given** the wizard
**When** it renders
**Then** it shows "Step 1 of 6", has *Back* and *Next*, moves focus to the `h1` per step, and every answer stays editable later (UX-DR7, UX-DR25)
**And** a pgTAP test proves another user cannot write answers to my Event.

### Story 2.3: Draft that is never lost

As an Organizer,
I want my progress saved as I go,
So that closing the browser doesn't cost me the setup.

**Acceptance Criteria:**

**Given** I leave the wizard partway
**When** I open *All events*
**Then** a card reads "Draft · continue setup" and reopens the last incomplete step (UX-DR7).

**Given** two browser tabs editing different steps of the same draft
**When** both save
**Then** each save updates only its own step's columns, so neither overwrites the other's answers.

**Given** I double-click *Create new event*
**When** the requests arrive
**Then** exactly one draft exists.

**Given** a save fails or I go offline
**When** the failure occurs
**Then** a toast says "Couldn't save. Trying again.", my input stays in the form and *Retry* is offered (UX-DR24).

**Given** a draft
**When** anyone but its Organizer queries it
**Then** it is invisible (pgTAP), and it cannot be published while required fields are missing (2.1 CHECK).

### Story 2.4: *All events* shows my events

As an Organizer,
I want my events as cards on *All events*,
So that I can open any of them from one place.

**Acceptance Criteria:**

**Given** I organize events
**When** *All events* loads
**Then** each Event is one card showing name, date and "Organizer", one link with a full accessible name, sorted by date, opening the Event's interim home (UX-DR6)
**And** counts, badges and urgent/at-risk states are not shown yet, because they need Tasks (Epic 4–5), but the layout reserves them.

**Given** the list
**When** it renders
**Then** the *Create new event* card is always last, and with no events it is the only card under "Let's plan something." (replacing the Epic 1 empty state).

**Given** an Event whose date has passed or that is cancelled
**When** the list renders
**Then** past events sit under "Past events", read-only, and cancelled ones show "Cancelled" with an icon and the word.

**Given** the interim Event home
**When** I open it
**Then** it shows name, date, Draft or Published, and a sidebar event group with the items that exist so far, while Epic 5's Dashboard later replaces it as the landing page
**And** opening another user's Event by URL shows "You don't have access to this part of the event." and no data (UX-DR24).

**Given** loading and failure
**When** the list loads
**Then** a final-shape `Skeleton` shows, and a failure shows the *Retry* card.

### Story 2.5: Roles from the Branch Pool

As an Organizer,
I want the right Roles activated for my Event type, and the ability to adjust them,
So that the work is grouped the way the Event needs.

**Acceptance Criteria:**

**Given** the Branch Pool
**When** it is defined
**Then** it has stable keys (`venue`, `guests`, `food_beverage`, `entertainment`, `travel_logistics` and others for other types) with localised names, because guest-data ownership refers to them (FR2, Conventions)
**And** the mapping from event type to default active Roles lives in one place with a Vitest test (a birthday activates five Roles, a seminar does not activate Entertainment).

**Given** an Event with a type
**When** `events_create` or the type answer runs
**Then** a `roles` row exists for every pool Role with `active` set by the mapping.

**Given** the Roles page
**When** I switch a Role on or off
**Then** a function sets `roles.active`, and a Role is never deleted (AD-19)
**And** pgTAP proves a non-Organizer cannot toggle it and a direct `DELETE` is denied.

**Given** I changed the Event type after adjusting Roles
**When** the type changes
**Then** Arrangly only suggests changes and never silently deactivates a Role I toggled.

**Given** an inactive Role
**When** later epics read it
**Then** its rows are kept and `roles.active` is the single source for "owning Role inactive, so the Organizer owns it".

### Story 2.6: Event settings: dates, RSVP due date and language

As an Organizer,
I want to change my Event's dates, RSVP due date and language,
So that plans can change without starting over.

**Acceptance Criteria:**

**Given** *Event settings*
**When** I change `starts_at`, `ends_at`, `time_zone`, the RSVP due date or the Event language
**Then** one function `events_update_schedule` validates and saves them, only for the Organizer (FR4)
**And** `starts_at < ends_at` and RSVP due date ≤ `starts_at` are enforced by CHECK.

**Given** a changed `starts_at`
**When** the function commits
**Then** it is the single place where dependent resolved deadlines will be recalculated, and until Tasks exist (Epic 4) there are none to change
**And** a code comment names this so Epic 4 hooks it.

**Given** `ends_at` moves
**When** it is saved
**Then** later jobs read it at run time (retention after 15 days, invite validity), so nothing is cached with the old value.

**Given** I change the Event language
**When** it saves
**Then** only future Guest-facing text uses it, and my own interface language is unchanged (AD-14).

**Given** a non-Organizer
**When** they call the function or write the columns directly
**Then** it is denied (pgTAP).

### Story 2.7: Cancel or delete an Event

As an Organizer,
I want to cancel or delete an Event,
So that I can handle plans that fall through.

**Acceptance Criteria:**

**Given** a published Event
**When** I choose *Cancel event* and confirm with an optional note
**Then** `cancelled_at` and the note are saved, the Event becomes read-only, and it appears under Past events as "Cancelled" (UX State Patterns)
**And** a confirmation dialog is used because the action is outward-facing (UX-DR23).

**Given** any Event
**When** I choose *Delete event* and type the Event's name to confirm
**Then** `events_delete` removes it and everything under it, because every foreign key to `events` is `ON DELETE CASCADE` (AD-11)
**And** a pgTAP test enumerates all foreign keys to `events` and fails if any is `NO ACTION`, so later epics cannot forget.

**Given** a draft
**When** I discard it
**Then** it uses the same function without the typed confirmation.

**Given** a non-Organizer
**When** they attempt either action
**Then** it is denied (pgTAP)
**And** deletion goes through one function so Epic 7 can add the purge of Guest data and auth users to it.

### Story 2.8: Description and publish to the team

As an Organizer,
I want to describe my Event and publish it,
So that the Event becomes real for my team.

**Acceptance Criteria:**

**Given** wizard step 3
**When** I write a free-text description of up to a bounded length
**Then** it is saved and can be edited later.

**Given** a complete draft
**When** I choose *Publish* and confirm
**Then** `events_publish` sets `published_at` once, idempotently, so a double click publishes once (UX-DR23)
**And** the dialog and the result use plain copy that does not promise Guest invitations yet.

**Given** a draft with missing required fields
**When** I try to publish
**Then** the function refuses and the screen lists exactly what is missing.

**Given** an unpublished Event
**When** I open its home
**Then** a banner says "Only your team can see this event. Publish to send invitations." with *Publish*, and it disappears after publishing (UX-DR8).

**Given** a published Event
**When** I edit settings
**Then** edits are allowed, and a cancelled Event cannot be published or edited
**And** pgTAP proves only the Organizer can call `events_publish`.

### Story 2.9: Add guests by hand

As an Organizer,
I want to add guests by name and email,
So that my guest list exists before invitations go out.

**Acceptance Criteria:**

**Given** the Guests step and page
**When** I paste or type rows of name and email
**Then** each row is validated inline for email format and duplicates within the input and against the Event's list, case-insensitively (FR5, UX-DR7)
**And** the database holds a unique `(event_id, lower(email))` constraint, so a race cannot create duplicates.

**Given** a name or email containing a line break or other control character
**When** I submit
**Then** that row is rejected, which blocks email header injection once Guest email exists.

**Given** a very long paste
**When** the Server Action parses it with Zod
**Then** a documented upper bound per submission applies and the user sees how many rows were added and which failed.

**Given** the `guests` table, owned by the guests module
**When** the Organizer, another user and an anonymous caller read it
**Then** only the Organizer sees rows (pgTAP allow and deny, AD-3)
**And** server logs carry the Event id and user id, never names or email addresses (Conventions).

**Given** added guests
**When** I view the list
**Then** each shows "Not invited yet", and the empty state offers adding by hand (the invite-link option arrives with Epic 7).

### Story 2.10: Edit and remove guests

As an Organizer,
I want to correct or remove a guest,
So that the list stays accurate.

**Acceptance Criteria:**

**Given** a guest in my list
**When** I edit their name or email
**Then** the same validation and uniqueness rules apply, and only the Organizer can write those columns (AD-19)
**And** a pgTAP test proves another user cannot.

**Given** a guest
**When** I choose *Remove*
**Then** the guest disappears with an *Undo* toast, and *Undo* restores the same details (UX-DR23).

**Given** the list
**When** it has many rows
**Then** the guest count is shown and the list is readable at 320px.

**Given** later epics
**When** a guest has an RSVP or an auth user
**Then** removal there goes through `guests_delete_guest_data`, which Epic 7 puts in place, and this story notes that handoff in code.


## Epic 3: Team and email

An Organizer can invite Role-holders by email, assign them to Roles, set a Role lead and change or revoke a Role, and every invitee joins through a secure invite link. The outbox that carries all of Arrangly's email, reliably and at a safe pace, is built here.

### Story 3.1: Outbox and `notifications_emit`

As an Organizer,
I want Arrangly's messages recorded in the same moment as the action that causes them,
So that nothing is lost and nothing is sent for something that didn't happen.

**Acceptance Criteria:**

**Given** a producer function in a transaction
**When** it calls `notifications_emit(event_id, kind, subject_ref, recipients)`
**Then** rows are written to `notification_outbox` and `notifications` in that transaction, and a rollback leaves nothing (AD-7)
**And** the function is `security definer` with `search_path = ''` and `REVOKE EXECUTE … FROM public, anon, authenticated`, with a pgTAP test showing a direct PostgREST call is denied and a call from another SQL function works (AD-5).

**Given** the notification tables
**When** an `authenticated` user tries `INSERT`, `UPDATE` or `DELETE`
**Then** it is denied (AD-7, AD-19, pgTAP).

**Given** recipient specs `user(id)` and `organizer(event)` (more are added with their producers)
**When** the sender is among the recipients
**Then** the sender is excluded and an unknown spec is rejected.

**Given** two `emit` calls for the same recipient in one transaction
**When** they commit
**Then** one row exists with `kinds[]` merged, unique on `(txid, recipient_id)`, and notifications from different transactions are never grouped or delayed (FR23, NFR7).

**Given** any row
**When** it is stored
**Then** it holds ids and an i18n key only, never names, email addresses or health data (NFR2)
**And** it records an `origin` (`production`, `preview` or `local`) supplied by the calling server code, so non-production rows can never be delivered (AD-20).

### Story 3.2: Delivery route and trigger

As an Organizer,
I want queued messages picked up and delivered exactly once at a time,
So that email goes out without Server Actions sending it.

**Acceptance Criteria:**

**Given** a row is inserted into `notification_outbox`
**When** the trigger fires
**Then** `net.http_post` with `timeout_milliseconds = 5000` posts only the row id to `/api/notifications/deliver`, reading the URL and `DELIVERY_SECRET` from Vault, never hard-coded in a migration (AD-8, AD-15).

**Given** a request to the route
**When** `Authorization: Bearer <DELIVERY_SECRET>` is missing or wrong
**Then** it is rejected before anything else runs, compared in constant time, with identical responses for every wrong secret
**And** a Vitest test covers missing, wrong and correct secrets.

**Given** two simultaneous posts for the same row
**When** both try to claim it
**Then** exactly one proceeds, using `UPDATE … SET claimed_until = now() + '2 min', attempts = attempts + 1 WHERE id = $1 AND (claimed_until IS NULL OR claimed_until < now()) RETURNING *`.

**Given** a request body
**When** it contains anything beyond the row id
**Then** it is ignored, and message content is built from the database at send time.

**Given** a row whose `origin` is not `production`
**When** the route handles it
**Then** it is marked `suppressed` with a reason and nothing leaves the system (AD-20)
**And** `SUPABASE_SECRET_KEY` is used only here for reading the recipient's address (AD-5).

**Given** local development and CI
**When** the trigger posts
**Then** a documented, tested mechanism makes the route reachable from the database container (`host.docker.internal` locally, the CI equivalent on GitHub Actions)
**And** logs carry only row and Event ids.

### Story 3.3: Email in the recipient's language

As a recipient,
I want Arrangly's email in my own language,
So that I understand it and can trust it.

**Acceptance Criteria:**

**Given** a claimed row
**When** the route sends
**Then** nodemailer sends over SMTP using environment configuration (Gmail app password in production, a local mail catcher otherwise), in the recipient's saved language, else the Event language, else English (AD-10, AD-14)
**And** templates have an HTML and a plain-text part.

**Given** any user-supplied string in a message
**When** the template renders
**Then** it is escaped, and links are built only from stored ids and tokens.

**Given** SMTP accepts the message
**When** the route continues
**Then** `email_sent_at` is written immediately, and a retry sends only channels still missing (AD-8)
**And** delivery is at-least-once: a crash between acceptance and the write can duplicate a message, which is accepted and documented.

**Given** an SMTP error
**When** it is logged
**Then** recipient addresses are removed from the message first (Conventions).

**Given** Supabase Auth's own emails
**When** the environment is set up
**Then** a checklist covers custom SMTP and the raised Auth rate limit, and those emails stay outside the outbox (AD-10).

### Story 3.4: Retry, pacing and visible queue

As an Organizer,
I want delivery to retry and keep a safe pace,
So that a slow or failing mail provider doesn't lose my invitations.

**Acceptance Criteria:**

**Given** a row whose claim expired with channels still unsent
**When** the `pg_cron` job runs
**Then** it re-posts the row up to 5 attempts and then marks it `failed` (AD-8)
**And** the job is idempotent and catches up after the project has been paused.

**Given** the daily and per-minute limits
**When** more than 20 per minute or 400 per day are due
**Then** the surplus stays queued, drained oldest first across all Events so one large list cannot starve others (NFR8).

**Given** queued or failed rows for an Event
**When** the Organizer opens Team & Roles
**Then** they see "x queued" and, for failures, "Couldn't deliver" without any address in logs.

**Given** three consecutive SMTP failures
**When** the route detects them
**Then** it writes one operator-visible log line (no personal data) so a suspended mail account is noticed
**And** the daily cap leaves documented headroom for Supabase Auth's own email on the same account.

### Story 3.5: Invitation tokens and rules

As an Organizer,
I want invitation links to be unguessable and revocable,
So that only the person I invited can join.

**Acceptance Criteria:**

**Given** the `invite_tokens` table (events module) with `kind ∈ {guest, role_holder, shared_event}`
**When** a token is created
**Then** it is 256-bit random, only its SHA-256 is stored, comparison is constant-time, and the plaintext exists only in the emailed link (AD-4)
**And** `authenticated` has no `SELECT` on the table, proven by pgTAP.

**Given** a token
**When** it is validated
**Then** it is rejected if revoked, consumed (for `role_holder`), expired (`events.ends_at` read at use), for another Event or kind, or if the Event is cancelled or deleted
**And** externally these cases give messages that do not reveal which Events or emails exist.

**Given** the helper `invite_tokens_revoke_for_user(user_id)`
**When** a user is added to a Role
**Then** that user's guest tokens are revoked in the same transaction, and Epic 7 reuses it for added passwords and identities (AD-4).

**Given** public routes that use tokens
**When** limits are exceeded
**Then** 5 per minute per IP and 3 per hour per email or token are refused, reusing the Epic 1 limiter (AD-21)
**And** an Organizer can create at most 30 invitations per day, to stop spam relay (NFR10).

### Story 3.6: Invite someone to a Role

As an Organizer,
I want to invite a person to a Role by email,
So that they can start helping with the Event.

**Acceptance Criteria:**

**Given** Team & Roles
**When** I enter a name and email, pick a Role and confirm the shown address
**Then** a passwordless invitee user is created (secret key, AD-5), a pending membership and a `role_holder` token are created, and an email is queued through `notifications_emit` (FR1, FR2)
**And** only the Organizer can do this, proven by pgTAP.

**Given** the same person is invited again to the same Role
**When** I confirm
**Then** `(role_id, user_id)` stays unique, the old token is revoked and a new link is sent (*Resend*).

**Given** an invitation
**When** I view the list
**Then** it shows "Invite sent · not joined yet" with *Resend*, and "Couldn't deliver" with the option to correct the address and send again.

**Given** a person already holding another Role
**When** I add them to a second Role
**Then** no second account is created and they are added directly.

**Given** my daily cap of 30 invitations is reached
**When** I invite
**Then** I get a clear message instead of an error (NFR10)
**And** the Organizer cannot be assigned as a Role-holder of their own Event by mistake (no-op with a message).

**Given** the access history
**When** an invitation is created
**Then** an append-only row in `role_membership_log` (events module) records Event, Role, person, action `invited` and actor with a timestamp, written only by the function and never by a direct call (AD-19, pgTAP)
**And** the Organizer sees it as "Access history" on Team & Roles, and the log stores user ids only, with `ON DELETE SET NULL` foreign keys (AD-11).

### Story 3.7: Join through the invitation link

As an invited Role-holder,
I want to open my link, verify who I am and join,
So that I can see what is expected of me.

**Acceptance Criteria:**

**Given** I open `/api/invite/[token]`
**When** the request is a `GET`
**Then** no state changes, so email link scanners cannot spend the invitation
**And** the page sets `Referrer-Policy: no-referrer`, loads no third-party assets, and swaps the token for a short-lived `httpOnly` cookie, redirecting to a URL without the token.

**Given** I have no account
**When** I continue
**Then** my name and email are prefilled and locked, a one-time code is sent to that email, and I can only set a password after entering it, even though the token is valid (pre-account-takeover defence)
**And** the account creation form follows the Epic 1 password rules.

**Given** my email already has an account
**When** I follow the link
**Then** I must log in (or use Google or GitHub) first, then join with no second user created.

**Given** I am signed in
**When** the exchange function runs
**Then** the membership attaches only if my verified email equals the invited email, a comparison made once inside that function and never in an RLS policy (AD-3)
**And** the token is consumed, a `joined` row is added to `role_membership_log`, and I land on the Event's interim home.

**Given** a used, revoked or expired link
**When** I open it
**Then** I see "This invite has already been used. Log in instead." or an expiry message with a way to request a fresh link, answered identically whether or not the email exists (AD-4).

**Given** the flow
**When** tests run
**Then** pgTAP proves allow and deny for the exchange function, and a Playwright test covers invite → join (UJ-1, Role-holder part).

### Story 3.8: Role lead

As an Organizer,
I want one lead per Role,
So that each area has a clear person who can delegate within it.

**Acceptance Criteria:**

**Given** a Role with members
**When** I set one as lead through `events_set_role_lead`
**Then** a partial unique index guarantees one lead per Role, and a change swaps the lead in one statement so there is never zero or two (AD-2, AD-19)
**And** a pending invitee can be lead, and the change is written to `role_membership_log`.

**Given** a non-Organizer
**When** they call the function or write the lead flag directly
**Then** it is denied (pgTAP, FR2).

**Given** a Role with no lead
**When** the Organizer opens Team & Roles
**Then** it shows "No lead yet".

**Given** the lead is revoked
**When** the revoke commits
**Then** the Role is left without a lead and the Organizer sees that
**And** the call to `tasks_assign_role_owned_to_lead` is added by Epic 4, and this story notes where.

### Story 3.9: Change or revoke a Role

As an Organizer,
I want to move or remove someone from a Role,
So that access always matches responsibility.

**Acceptance Criteria:**

**Given** a Role-holder
**When** I choose *Revoke* and confirm
**Then** `events_revoke_role` removes the membership and any open invitation token for it, and I am asked first because the action is outward-facing (UX-DR23)
**And** a person with other Roles keeps them, several holders can share a Role, and a `revoked` row is added to `role_membership_log`.

**Given** a revoked holder
**When** their next request arrives
**Then** nothing from that Role is returned, a `role="alert"` toast says "Your access to {Role} was changed by {Organizer}", and they are redirected (FR2, UX-DR24)
**And** pgTAP proves they can no longer read the Role's rows.

**Given** someone with no remaining Role and no Guest link
**When** they open *All events*
**Then** the Event is gone from their list.

**Given** a non-Organizer
**When** they call the function
**Then** it is denied, including a Role-holder trying to revoke or assign themselves (pgTAP)
**And** the call to `tasks_release_owner` is added by Epic 4.

**Given** a revoked Role-holder who held the lead
**When** the revoke commits
**Then** the lead is cleared in the same transaction.

### Story 3.10: The Role-holder's scoped view

As a Role-holder,
I want to see only what my Role allows,
So that I can focus and the Organizer can trust the boundaries.

**Acceptance Criteria:**

**Given** a joined Role-holder
**When** I open *All events*
**Then** the Event shows with my Role label, and Team & Roles shows who is on the Team and who leads each Role (FR9 context)
**And** the sidebar shows only items my Role can reach, and the rest are not rendered (UX-DR5).

**Given** I open an Organizer-only page by URL (Event settings, Guests)
**When** it loads
**Then** I see "You don't have access to this part of the event. Ask {Organizer} if you need it." and no data (UX-DR24)
**And** pgTAP proves a holder of any Role cannot read `guests` rows (other Roles see Guest counts only, AD-3).

**Given** the `holds_role(role_id)` helper
**When** policies use it
**Then** it is `STABLE`, sets `search_path = ''`, and pgTAP covers true and false.

**Given** the Organizer cancels or deletes the Event
**When** the action commits
**Then** a notification to `team(event)` is queued through the outbox, and the Event leaves the Team's lists, a notice the UX spec requires though FR23's list does not name it
**And** a Playwright test covers the team part of UJ-1.
