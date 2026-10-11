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

## Epic 4: Tasks and decisions

The Team can run the work: create, delegate, accept and update Tasks with Subtasks, dependencies and Problems, see their own Tasks, send options for a decision, and have follow-up and obsolete Tasks follow from the outcome.

**Epic-wide conventions (apply to every story below):**

- Every `tasks_*` function parses its input with Zod in the Server Action first, returns `{ ok, data } | { ok, error }`, and takes `expected_updated_at`; a mismatch returns `concurrent_edit`, shown as the UX-DR24 concurrent-edit toast (AD-17).
- Every mutation is idempotent. A repeated call with the same intent changes nothing, writes no second history row and emits no second notification (NFR7).
- Every `tasks_*` function calls `tasks_assert_writable(event_id)` (story 4.1) and refuses on a cancelled or ended Event.
- No notification is emitted while the Event is a draft. Notification kinds used here are `task_assigned`, `decision_requested`, `decision_resolved` and `problem_reported`; payloads hold ids and i18n keys only (NFR7, NFR2).
- Derived state lives in one `security_invoker` view, `task_state`, which each story extends with `CREATE OR REPLACE VIEW`; nothing derived is stored (AD-3, Task state).
- Task text, notes and Problem notes are never sent to AI, logged or placed in a notification payload in this epic (AD-11).

### Story 4.1: Tasks table and Role-scoped access

As an Organizer,
I want Tasks stored so each person can read only what their Role allows,
So that the Team's work is trustworthy and nobody sees what is not theirs.

**Acceptance Criteria:**

**Given** the migration
**When** it is applied
**Then** `tasks` exists with `event_id` (`ON DELETE CASCADE`), required `role_id`, `title`, `description`, `deadline` (a `date` in the Event's time zone), `owner_user_id` (nullable, `ON DELETE SET NULL`), `lifecycle ∈ {proposed, active, dismissed}`, `status ∈ {not_started, in_progress, waiting_external, done}`, `accepted_at`, `delegated_at`, `obsolete`, `confirmed_at`, `created_by` and `updated_at` (AD-18, Conventions)
**And** later stories add their own columns and tables (`task_dependencies`, `status_history`, `problems`, `decision_options`) in their own migrations, so no story creates structure it does not use.

**Given** a CHECK constraint
**When** a row has `lifecycle = 'active'` and no `deadline`
**Then** it is rejected, while a `proposed` row may lack a deadline (FR7)
**And** a pgTAP test proves both cases.

**Given** RLS on `tasks`
**When** the Organizer, a holder of the Task's Role, the Task's owner, a holder of a different Role, a Guest-only user and an anonymous caller each read it
**Then** only the first three see it (AD-3, NFR1)
**And** a Task whose Role has `roles.active = false` is visible to the Organizer only, and reactivating the Role restores access (Story 2.5: the Organizer owns an inactive Role's work).

**Given** a Task in a draft Event
**When** anyone but the Organizer reads it
**Then** it is invisible.

**Given** the grants
**When** an `authenticated` user writes through PostgREST
**Then** `INSERT` and `DELETE` are denied, and `UPDATE` is allowed only on the columns this epic lists as direct-edit (`title`, `description`, and the guest-program fields added by Story 4.2)
**And** a pgTAP test proves a denied direct `UPDATE` for each of `status`, `owner_user_id`, `accepted_at`, `delegated_at`, `role_id`, `lifecycle`, `obsolete` and `event_id` (S3, AD-19).

**Given** `tasks_assert_writable(event_id)` and the `expected_updated_at` check
**When** a later `tasks_*` function calls them
**Then** the first refuses on a cancelled or ended Event and the second returns `concurrent_edit` on a stale value
**And** pgTAP covers allow and deny for both.

**Given** the view `task_state`
**When** it is created
**Then** it is `security_invoker` and exposes `is_delegated` and `is_pending` (an owner exists or not), independent of status (FR12)
**And** a pgTAP test proves a user sees through the view only the rows RLS allows.

**Given** how `tasks_*` functions write to tables that `authenticated` cannot write
**When** this story is built
**Then** it states and tests the single privilege model every `tasks_*` function uses, and its pgTAP tests show a direct PostgREST call is denied while the function succeeds
**And** this is an open point against AD-2 and AD-5 (`security definer` is allowed only for the listed functions) that is settled with `bmad-correct-course` before this story is built, as it is for every module's first story.

**Given** the generated types
**When** the migration lands
**Then** `src/types/database.ts` is regenerated and the tasks module is the only writer (AD-1, AD-15).

### Story 4.2: Create, edit and open a Task

As an Organizer or Role lead,
I want to create and edit Tasks with a deadline,
So that the work in my Role is written down with an owner-ready scope.

**Acceptance Criteria:**

**Given** Organizer or a Role lead
**When** I save a new Task through `tasks_create`
**Then** it is created `active` and `not_started`, Role-owned (`owner_user_id` NULL, so "pending"), with a required title and deadline
**And** the client supplies the Task id, so a double submit creates one Task
**And** this function is an addition to the AD-2 list, recorded in this story and offered as an entry for `docs/refleksjonsnotater.md`, because direct `INSERT` stays revoked (AD-2, AD-19).

**Given** a Role-holder who is not the lead, or a holder of another Role
**When** they call `tasks_create` for the Role
**Then** it is denied, as it is for an inactive Role or a cancelled Event (pgTAP, FR2).

**Given** the deadline field
**When** I choose a date or "N days before the event"
**Then** the resolved date is stored in `deadline` and N in `days_before`, and a past date is accepted and shows *Overdue* straight away
**And** a Zod schema and a CHECK reject N below 0 or above a bounded maximum, with the error inline and focus on the first error (UX-DR12, AD-17).

**Given** an Event whose `starts_at` changes in `events_update_schedule`
**When** it commits
**Then** it calls `tasks_recalculate_deadlines(event_id)`, which recomputes only Tasks with `days_before` set, leaves fixed dates alone, and is idempotent (Story 2.6 hook; AD-1 allows `events → tasks`)
**And** pgTAP proves the recalculation, a fixed date left untouched, and a second run changing nothing, and no notification is emitted for it.

**Given** the edit form
**When** I change title, description or the guest-program fields (*show on guest program*, guest-facing label, local time of day; Organizer only, label required when on)
**Then** title, description and those fields are direct edits on granted columns, and the deadline goes through `tasks_set_deadline` (FR7, AD-19)
**And** a non-Organizer cannot change the guest-program fields (pgTAP).

**Given** a Task I created by mistake
**When** I choose *Remove task*
**Then** `tasks_dismiss` sets `lifecycle = 'dismissed'` with an Undo toast and a timeless *Restore* under *Show dismissed (n)*, and is refused while the Task has active Subtasks or dependents (UX-DR23)
**And** nothing is ever hard-deleted by a user.

**Given** any Task list
**When** a Task row renders
**Then** it follows UX-DR11 (status icon, title, status word, owner or "Not delegated"), and the whole row opens the Task detail page (UX-DR13)
**And** the detail page has a back control returning to the scroll position, a grouped metadata card and a sticky bottom action bar on phone with safe-area inset, and the later stories add their cards to it.

**Given** a Task I cannot see
**When** I open its URL
**Then** I get "You don't have access to this part of the event." and no data (UX-DR24).

### Story 4.3: Subtasks and dependencies

As a Role-holder,
I want to break a Task into Subtasks and say what it waits for,
So that the order of work is clear and blocked work is visible.

**Acceptance Criteria:**

**Given** a Task
**When** I add a Subtask
**Then** the Subtask's `parent_task_id` points to a Task in the same Role and Event, a Subtask cannot itself have a Subtask (one level), and a holder of the Role may add Subtasks to a Task they own while the lead and Organizer may add to any (FR7)
**And** a trigger and pgTAP prove a parent in another Role, a nested Subtask and a Subtask of a non-active Task are all rejected.

**Given** a Subtask
**When** someone tries to move it to another Role
**Then** it is refused until it is promoted to a top-level Task with `tasks_promote_subtask`, and `tasks_move_to_role` (Organizer only) refuses any Task that has Subtasks, dependencies or dependents, and resets the owner, `delegated_at` and `accepted_at` when it succeeds (FR7, AD-19)
**And** pgTAP proves the denied moves.

**Given** `task_dependencies`
**When** I add "Depends on"
**Then** both Tasks are in the same Role and Event, both are `active`, the Task is not its own dependency, and the pair is unique (AD-19)
**And** a trigger rejects any cycle by walking the graph under a per-Event advisory lock, and an integration test with two connections inserting A→B and B→A at once shows exactly one succeeds.

**Given** the view `task_state`
**When** it is extended
**Then** `blocked` is true when any dependency is `active`, not `obsolete` and not `done`, and `blocked_by` names the first blocker with a count of the rest
**And** an obsolete, dismissed or proposed Task never blocks anything (F4), and a Task with no remaining open dependency is unblocked at once.

**Given** a blocked Task row
**When** it renders
**Then** it has the blocked tint, a Lucide icon and the words "Waits for: {blocker}", never red and never colour alone, and the blocker shows "Blocks N tasks" (UX-DR4, UX-DR11)
**And** Blocked is visually distinct from a Problem (FR7, FR8).

**Given** a parent Task
**When** its Subtasks change
**Then** there is no automatic status rollup in Core, and the parent can be marked Done with open Subtasks, which is noted in this story as a deliberate simplification.

**Given** a non-member or a holder of another Role
**When** they add or remove a dependency or Subtask
**Then** it is denied (pgTAP, NFR1).

### Story 4.4: Status, notes and *Overdue*

As a Task owner,
I want to set a Task's status with an optional note,
So that the Organizer can see where things stand without asking.

**Acceptance Criteria:**

**Given** `status_history`
**When** the migration is applied
**Then** it holds `task_id` (`ON DELETE CASCADE`), `changed_by` (`ON DELETE SET NULL`), `from_status`, `to_status`, `note`, `note_removed_at` and a server-set `created_at`, is append-only for users, and a trigger blocks any update except clearing `note` (S8, FR8)
**And** pgTAP proves a direct `INSERT`, `UPDATE` and `DELETE` are denied.

**Given** the owner, the Role lead or the Organizer
**When** they call `tasks_set_status(task, status, note, expected_updated_at)`
**Then** the status changes, a history row is written with a server timestamp and the optional note, and a repeat of the same status without a new note writes nothing
**And** a holder who does not own the Task, and every holder of another Role, are denied (pgTAP).

**Given** a delegated Task the owner has not yet accepted
**When** the owner tries to change its status
**Then** the call is refused with "Accept this task first", while the lead and the Organizer may still change it
**And** until Story 4.6 only Role-owned Tasks exist, so this rule is exercised by a fixture row.

**Given** the history list
**When** someone chooses *Remove* on a note
**Then** only the note text is cleared and `note_removed_at` is set, the row and its timestamp stay, and only the note's author or the Organizer may do it (S8).

**Given** the view `task_state`
**When** it is extended
**Then** `overdue` is true when `now() at time zone events.time_zone` is later than the end of `deadline`, for an `active`, non-`obsolete`, non-`done` Task, and the row shows "Overdue N days" with icon and word (FR8, UX-DR4)
**And** pgTAP tests the boundary at 23:59:59 and 00:00:00 local time, and across a daylight-saving change.

**Given** the status control
**When** I change status
**Then** it is a segmented control on desktop and a full-width `Select` on phone, updates optimistically, and reverts with a toast if the call fails (UX-DR13, NFR16)
**And** the Status words and icons come from the single status vocabulary (UX-DR4).

**Given** I am offline or the save fails
**When** I change status
**Then** the UI reverts, a toast says the change could not be saved and offers *Retry*, and no offline queue exists in Core (UX-DR24)
**And** two people changing the same Task at once get `concurrent_edit` for the second, not a silent overwrite.

### Story 4.5: Delegate a Task

As a Role lead or Organizer,
I want to hand a Task to a person,
So that someone specific is responsible for it.

**Acceptance Criteria:**

**Given** `task_assignment_log`
**When** the migration is applied
**Then** it is append-only and records `task_id` (`ON DELETE CASCADE`), `from_user`, `to_user` (both `ON DELETE SET NULL`), `by_user`, `kind ∈ {delegated, accepted, released}` and a server `created_at`, so delegation never loses history (FR7)
**And** pgTAP proves direct writes are denied.

**Given** an `active` Task
**When** the Role lead or the Organizer calls `tasks_delegate(task, new_owner, expected_updated_at)`
**Then** `owner_user_id` and `delegated_at = now()` are set, `accepted_at` is cleared, and a `delegated` log row is written
**And** only the Organizer and that Role's lead may do it, and a non-lead holder, a holder of another Role and a Task's own owner (unless lead) are denied (FR2, pgTAP).

**Given** the target person
**When** the lead delegates
**Then** the target must hold that Role, and when the Organizer delegates the target may be anyone on the Event's Team, including a pending invitee marked "Invite pending"
**And** a user outside the Event, or one with no Role and no Organizer status, is refused (S4, pgTAP).

**Given** I delegate a Task to myself
**When** it commits
**Then** it is accepted at once, no notification is emitted, and no Accept step is asked of me.

**Given** a delegation to someone else in a published Event
**When** it commits
**Then** `notifications_emit` queues one `task_assigned` to the new owner in the same transaction, excluding the sender, and none is emitted in a draft Event (FR23, S7)
**And** a double click delegates once and notifies once.

**Given** a Task that is `done`, `obsolete` or not `active`
**When** I try to delegate it
**Then** it is refused.

**Given** the Delegate picker
**When** I open it
**Then** it is a `Command` list of the people I may choose, with "Invite pending" entries labelled, keyboard operable, with the 44px hit areas, and the Task detail history shows who held the Task before (UX-DR12)
**And** a Playwright check covers lead delegating to a holder.

### Story 4.6: Accept a Task and the 48-hour rule

As a Role-holder,
I want to accept a Task handed to me,
So that the Organizer knows I have seen it and will do it.

**Acceptance Criteria:**

**Given** a delegated Task I own
**When** I choose *Accept* on the detail page banner
**Then** `tasks_accept` sets `accepted_at`, writes an `accepted` log row, and the Organizer's view changes from "Not yet accepted" to "Accepted" (FR9, UJ-2)
**And** the call is idempotent.

**Given** a user who is not the Task's owner
**When** they call `tasks_accept`, including the Role lead, the Organizer, a former owner after re-delegation, and anyone on a Role-owned Task
**Then** it is denied (pgTAP, S5).

**Given** the view `task_state`
**When** it is extended
**Then** `stale_unaccepted` is true when `delegated_at` is more than 48 hours ago and `accepted_at` is NULL, for an `active`, non-`done`, non-`obsolete` Task
**And** pgTAP tests the boundary just before and after 48 hours and that a re-delegation restarts the clock.

**Given** every Task row
**When** it renders
**Then** it shows "Delegated to {name}" or "Not delegated" independent of status, and a separate "Not yet accepted" or "Accepted" signal, with icon and word (FR12, UX-DR4)
**And** the view exposes both signals for the filter in Story 4.9.

**Given** a Task that is stale
**When** the Organizer opens it
**Then** "Not yet accepted · {N} days" is shown, and listing it in the Organizer's needs-attention list is done by Epic 5, which reads `stale_unaccepted`
**And** there is no *Decline* in Core, because FR9 defines none; an owner who cannot take it raises a Problem or asks the lead to reassign.

### Story 4.7: Role lead and revoke hooks

As an Organizer,
I want changing a Role lead or revoking a holder to move their Tasks safely,
So that no Task is left with someone who no longer has access and no Role's work is left unowned by accident.

**Acceptance Criteria:**

**Given** `events_set_role_lead` from Story 3.8
**When** it commits
**Then** it calls `tasks_assign_role_owned_to_lead(role_id)` in the same transaction, which assigns every Role-owned, `active`, non-`done`, non-`obsolete` Task of that Role to the new lead with `delegated_at = now()` and `accepted_at` cleared, and logs each as `delegated` (AD-18)
**And** it emits exactly one `task_assigned` to the lead however many Tasks moved, none in a draft, and Tasks already owned by a person are not moved, including the previous lead's.

**Given** `events_revoke_role` from Story 3.9
**When** it commits
**Then** it calls `tasks_release_owner(role_id, user_id)` in the same transaction, which returns every Task of that Role owned by the user to Role-owned, clears `delegated_at` and `accepted_at`, and logs `released`
**And** if the user then holds no Role in the Event, every Task in the Event they own is released too, so an owner can never keep access through `owner_user_id` alone (S2).

**Given** a revoked holder who owned Tasks
**When** they read or write any Task in the Event
**Then** nothing is returned and writes are denied, including a Task they owned in another Role (pgTAP, NFR1).

**Given** a revoked Role lead
**When** the revoke commits
**Then** the Tasks they owned are Role-owned and the lead flag is cleared in the same transaction (Story 3.9).

**Given** `events_set_role_lead` and `events_revoke_role`
**When** a non-Organizer calls them
**Then** it is still denied, and the `tasks_*` hooks are not callable by `authenticated` and are reachable only from those two functions along the allowed module arrow (AD-1, AD-5)
**And** this story removes the "added by Epic 4" notes left in Stories 3.8 and 3.9.

### Story 4.8: Problem flag

As a Task owner,
I want to flag that something has gone wrong with a note,
So that the Organizer and my lead know before it becomes a surprise.

**Acceptance Criteria:**

**Given** `problems`
**When** the migration is applied
**Then** it holds `task_id` (`ON DELETE CASCADE`), `raised_by` and `resolved_by` (`ON DELETE SET NULL`), a required bounded `note`, `raised_at`, `resolved_at` and `resolution_note`, with a partial unique index allowing one open Problem per Task (FR8)
**And** direct writes by `authenticated` are denied (pgTAP).

**Given** the Task's owner, the Role lead or the Organizer
**When** they call `tasks_report_problem(task, note)`
**Then** an open Problem exists, a second call on a Task that already has one returns the existing Problem, and it applies to a Task in any status, including `done`
**And** a non-member, a holder of another Role and a call on an `obsolete`, `proposed` or `dismissed` Task are denied (pgTAP).

**Given** a Problem is raised in a published Event
**When** it commits
**Then** `notifications_emit` queues one `problem_reported` to the Organizer and the Role lead, merged into one when they are the same person and excluding the reporter, and none in a draft (FR23, NFR7)
**And** the payload holds ids only, never the note.

**Given** an open Problem
**When** a Task row renders
**Then** it shows "Problem reported" with a flag icon and a note excerpt, visually distinct from Blocked and never colour alone, and the view exposes `has_problem` (FR8, UX-DR4, UX-DR11)
**And** a Problem on a Task that later becomes `obsolete` stops counting in `has_problem`.

**Given** an open Problem
**When** the owner, the lead or the Organizer chooses *Resolve problem* with an optional note
**Then** `tasks_resolve_problem` closes it, records who and when, and a repeat call changes nothing
**And** raised and resolved Problems appear in the Task's history.

**Given** a Problem note
**When** it is stored or logged
**Then** it is never sent to AI, never written to a log line and never put in a notification payload (AD-11).

### Story 4.9: *My tasks*

As a Role-holder,
I want one place that lists my Tasks and who else is on the Team,
So that I understand what is expected of me within about a minute.

**Acceptance Criteria:**

**Given** a Role-holder or Organizer
**When** I open *My tasks*
**Then** I see the Tasks I own in one view with scope, deadline, dependencies, parent and Subtasks and status, "New" Tasks (not yet accepted) first, then by soonest deadline, plus a short list of who else is on the Team and who leads each Role (FR9, UX-DR11)
**And** obsolete Tasks sit behind *Show obsolete (n)* and dismissed Tasks are not listed.

**Given** the *Not delegated* filter
**When** I switch it on
**Then** it is a toggle button with `aria-pressed` that announces "Showing N pending Tasks", and for the Organizer it lists the pending Tasks of every Role, while a holder sees pending Tasks of their own Roles only (FR12)
**And** it uses `is_pending` from `task_state` and no new query rules.

**Given** the sidebar item *My tasks*
**When** it renders
**Then** its badge counts New (owned and not yet accepted) plus Urgent (owned and overdue or with an open Problem), each Task once, with an accessible name that says what the number means (UX-DR5).

**Given** a joined Role-holder who is not the Organizer
**When** they open the Event
**Then** *My tasks* is their landing page until Epic 5's Dashboard replaces it, and the sidebar shows only what their Role can reach (Story 3.10)
**And** a Playwright check covers join → open Event → see the assigned Task → Accept (UJ-1, Role-holder part).

**Given** the view `task_state`
**When** this story is built
**Then** a pgTAP test asserts it exposes every flag Epic 5 needs: `blocked`, `overdue`, `stale_unaccepted`, `is_delegated`, `is_pending`, `has_problem` and `obsolete`, so the Dashboard and Timeline add no stored state (P2)
**And** a holder of another Role sees none of my Tasks through it.

**Given** loading, failure and no Tasks
**When** the page renders
**Then** it shows a final-shape `Skeleton`, a *Retry* card on failure, and a quiet empty state; it is usable at 375px and at 320 CSS px reflow, with focus moved to the `h1` (UX-DR24, UX-DR25, NFR6, NFR12).

### Story 4.10: Options on a Task and sending for decision

As a Role-holder,
I want to list candidate options on a Task and send them to a named person to decide,
So that choices such as the venue reach the right person with the context they need.

**Acceptance Criteria:**

**Given** `decision_options`
**When** the migration is applied
**Then** it holds `task_id` (`ON DELETE CASCADE`), `name`, `type`, `notes`, `position` and `sent_at`, and a Task may have up to a bounded number of options (FR13)
**And** direct writes are denied, and `tasks_save_options` replaces the option set only while nothing has been sent.

**Given** the owner, the Role lead or the Organizer
**When** I add named options with type and notes and choose *Send for decision*
**Then** at least two options are required, and an option name is unique within the Task
**And** the Zod schema and a CHECK reject fewer, blank or over-long input, with errors inline (UX-DR14, AD-17).

**Given** *Send for decision* with a recipient and a short context
**When** `tasks_send_for_decision` commits
**Then** a Decision Task (`kind = 'decision'`) is created in the same Role with `owner_user_id` set to the recipient, so the recipient needs no extra policy input (S1, AD-3), the options are marked sent and become immutable, and the source Task gets a dependency on the Decision Task and so shows "Waits for: {Decision Task}"
**And** only one open Decision Task may exist per source Task, enforced by a partial unique index.

**Given** the recipient
**When** it is validated
**Then** it must be the Organizer or a member of the Event's Team, and not the sender, and anyone else is refused (pgTAP).

**Given** a sent Decision Task in a published Event
**When** it commits
**Then** one `decision_requested` is emitted to the recipient in the same transaction, none in a draft
**And** the recipient sees the options through the Decision Task even if they hold no Role in the source Task's Role, and a holder of a third Role sees neither (pgTAP, NFR1).

**Given** a Decision Task
**When** it renders anywhere
**Then** it shows "Needs your decision" for its recipient, with the purple icon and word, never colour alone (FR10, UX-DR4)
**And** it cannot be delegated, cannot be set `done` through `tasks_set_status`, and has no Subtasks, because only Story 4.11 resolves it.

**Given** a Decision Task whose owner is revoked
**When** `tasks_release_owner` runs
**Then** it reassigns the Decision Task to the Organizer instead of leaving it Role-owned, so a decision is never left without a person (F11)
**And** this story extends the Story 4.7 function and adds that case to its pgTAP test.

### Story 4.11: Decide and spawn follow-up Tasks

As the person asked to decide,
I want to choose an option and create the next Task in the same step,
So that the decision turns into work immediately.

**Acceptance Criteria:**

**Given** the Decision page
**When** I open it
**Then** it shows a radio group of option cards with a `circle-check` and a 2px purple border on the selected one, *Confirm decision*, and an inline *+ Add follow-up task*, with a visible focus ring and 44px hit areas (UX-DR10)
**And** the recipient and the Organizer are the only people who can open the action; anyone else sees the options read-only if they can see the Task.

**Given** `tasks_resolve_decision(decision_task, option, follow_ups, expected_updated_at)`
**When** it runs
**Then** it locks the Decision Task `FOR UPDATE`, records the chosen option, who decided and when, sets the Decision Task `done` with a history row, and creates each follow-up as an `active` Task with `spawned_by_option_id` and a client-supplied `spawn_key`, all in one transaction (AD-2, FR10)
**And** a unique `(spawned_by_option_id, spawn_key)` makes a repeat call create nothing new (F8).

**Given** a follow-up Task
**When** it is created by the decision
**Then** it needs a title and deadline, defaults to the source Task's Role (an active Role of the Event), is Role-owned, and at most a bounded number can be created per decision
**And** the recipient may create it even though they are not the Role's lead, because it is part of this one action and is recorded in the history as spawned by the decision.

**Given** the source Task depends on the Decision Task
**When** the decision commits
**Then** the source Task is unblocked and its owner (or the Role lead if it is Role-owned) and the person who sent it for decision each get one `decision_resolved`, merged into one when the same person, excluding the decider
**And** no notification is sent in a draft.

**Given** the recipient and the Organizer resolve at the same moment, or a double click
**When** both calls arrive
**Then** the second waits on the lock and returns the already-recorded result, or `already_resolved` when it names a different option, and an integration test with two connections proves one outcome
**And** changing a made decision is done by Story 4.12, not here.

**Given** a non-recipient and non-Organizer
**When** they call the function, including the source Task's owner and the Role lead
**Then** it is denied (pgTAP, AD-2).

**Given** the flagship venue scenario
**When** `seed.sql` is loaded
**Then** it holds the Role-holder who adds three venues, the Organizer who decides and the booking follow-up
**And** a Playwright test covers UJ-2 end to end: Accept → add three options → send → decide with a follow-up → the source Task unblocks, with AI in fixture mode (NFR9, P1).

### Story 4.12: Option-tied Tasks become obsolete, and decisions can change

As an Organizer,
I want work prepared for an option that was not chosen to step aside without being lost,
So that nobody keeps working on a path we dropped, and I can change my mind.

**Acceptance Criteria:**

**Given** the Task form
**When** I choose "Only if option … is chosen"
**Then** only options of an open Decision Task I can see are offered, and `only_if_option_id` is saved on the Task (UX-DR12, FR11)
**And** the foreign key is `ON DELETE CASCADE`, options cannot be deleted by users, and a pgTAP test shows deleting the Event still succeeds.

**Given** `tasks_resolve_decision` from Story 4.11
**When** it resolves an option
**Then** every active Task tied to a different option of that Decision Task is set `obsolete = true`, every Task tied to the chosen option stays active, and nothing is deleted (FR11)
**And** an obsolete Task no longer blocks anything, counts as overdue or as an open Problem (F4).

**Given** a decision already made
**When** the Organizer or the recipient chooses *Change decision* and confirms a new option
**Then** the same function re-runs under the lock: Tasks tied to the new option and follow-ups spawned by it are re-activated, those tied to or spawned by the old option are made obsolete, and previously spawned follow-ups are re-used by their `spawn_key` rather than duplicated (FR11, F8)
**And** running the same change twice leaves identical state and row counts, proven by pgTAP.

**Given** an obsoleted Task that already has work in it
**When** it becomes obsolete
**Then** it keeps its status and history, its owner gets one `decision_resolved` merged with the person's other notices, and it can come back if the decision flips again (F9)
**And** pgTAP proves a direct `DELETE` and a direct `obsolete` update are denied.

**Given** an obsolete Task
**When** it renders
**Then** it has strikethrough, an icon and the word "Obsolete" behind *Show obsolete (n)*, and is excluded from the *My tasks* badge, with the data exposed for Epic 5's Dashboard and Timeline (UX-DR4, UX-DR11)
**And** attempts to change the status, delegate or tie it while obsolete are refused until it is re-activated.

**Given** a non-recipient and non-Organizer
**When** they change a decision
**Then** it is denied (pgTAP).

### Story 4.13: Proposed Tasks from questionnaire gaps

As an Organizer,
I want a skipped question that matters to become a Proposed Task,
So that an unknown never turns into a silent gap.

**Acceptance Criteria:**

**Given** the Event's `unknown` answers from Story 2.2
**When** I open the wizard's *Review ✦* step or publish
**Then** a Server Action in the tasks module calls `tasks_propose_gaps(event_id)`, which reads the answers (`tasks → events` is an allowed arrow) and creates one Proposed Task per unknown, with `lifecycle = 'proposed'` and `source = 'questionnaire_gap'` (FR4, FR6, AD-18)
**And** `tasks_propose` is the only function that creates a Proposed Task, and it is not callable by `authenticated`.

**Given** the question-to-Role mapping
**When** it is defined
**Then** it lives in one place with a Vitest test (venue unknown → `venue`, guest count or guest-list method → `guests`, and so on), each with a suggested deadline "N days before the event"
**And** a gap whose Role is inactive stays visible to the Organizer under that Role (Story 2.5).

**Given** the function runs again
**When** the same unknown is still open
**Then** nothing is duplicated, because rows are unique on `(event_id, source, gap_key)`, and an answered question dismisses its still-`proposed` Task while leaving confirmed ones alone (idempotent)
**And** two simultaneous runs create one row.

**Given** a Proposed Task
**When** anyone reads it
**Then** only the Organizer and holders of its Role see it, and it takes no part in `blocked`, `overdue`, counts, dependencies or the Timeline (AD-3, FR6)
**And** pgTAP proves a holder of another Role and a Guest cannot read it and `authenticated` cannot call `tasks_propose`.

**Given** a Proposed Task row
**When** it renders
**Then** it is marked ✦, attributes its source in words ("From questionnaire · Venue · due {date}") and carries no AI text, since this story does not call AI (UX-DR9, UX-DR26).

### Story 4.14: Review Proposed Tasks

As an Organizer,
I want to confirm, edit or dismiss each Proposed Task,
So that no suggestion becomes work unless I say so.

**Acceptance Criteria:**

**Given** the *Review ✦* wizard step and *My tasks*
**When** Proposed Tasks exist
**Then** they are grouped per Role with ✓, ✕ and edit on each row, 44px hit areas, an editable title inline, and "Nothing to review" when there are none (UX-DR7, UX-DR9)
**And** a later epic adds AI-sourced rows to the same step without changing it.

**Given** a Proposed Task
**When** the Organizer or its Role lead chooses ✓
**Then** `tasks_confirm_proposed` sets `lifecycle = 'active'` and `confirmed_at`, requires a deadline (the suggested one or one I enter) and rejects the call inline otherwise, and no notification is emitted because FR23 names none
**And** a double click, or two people confirming at once, confirms once and the second sees "Already confirmed".

**Given** ✕
**When** I dismiss a Proposed Task
**Then** `tasks_dismiss` sets `lifecycle = 'dismissed'` with a 10-second Undo toast, and *Show dismissed (n)* with *Restore* is available at any time and returns it to `proposed` if it was never confirmed (UX-DR23, UX-DR8)
**And** focus moves to the next row or the group heading after a row leaves and returns to the restored row, announced through a `role="status"` region (UX-DR9, UX-DR25).

**Given** a holder who is neither the Organizer nor the Role lead
**When** they confirm or dismiss
**Then** it is denied, and confirming a dismissed Task requires restoring it first (pgTAP).

**Given** a confirmed Task
**When** I look at it
**Then** it is an ordinary Role-owned Task that can be delegated, edited and given Subtasks, and nothing remembers it was proposed except its `source` shown in the history
**And** the epic summary lists FR7–FR13 covered and the open items carried forward.

### Carry-forwards from Epic 4

- Epic 5: read `task_state` (`blocked`, `overdue`, `stale_unaccepted`, `is_delegated`, `is_pending`, `has_problem`, `obsolete`) and Proposed Tasks for *Needs you*; the needs-attention list uses `stale_unaccepted`; decision cards come from open Decision Tasks owned by the viewer.
- Epic 6: AI-sourced Proposed Tasks call `tasks_propose` and reuse the *Review ✦* step; `status-note` must skip Tasks and notes that came from guest needs, and no allergy, food or hotel text may reach a prompt (AD-11).
- Epic 8: add `source_guest_request_id` to `tasks` with its `ON DELETE SET NULL`, route `tasks_set_status(done)` to `guests_publish_result`, and add `tasks_purge_guest`.
- Epic 7: Event deletion and guest removal keep going through `guests_delete_guest_data`; every FK added here is `ON DELETE CASCADE` or `SET NULL`.
- Open against AD-2 and AD-5: how `tasks_*` functions write tables `authenticated` cannot write, and whether `tasks_create` joins the AD-2 list; settle with `bmad-correct-course` before Story 4.1 is built.

## Epic 5: Dashboard and Timeline

An Organizer, or any Role-holder within their scope, can see the state of the Event at a glance (what needs them, what is at risk, what is on track) and read the Event as one swimlane per Role on the Timeline.

**Epic-wide conventions (apply to every story below):**

- Everything is read through `task_state` and the Event's Roles under the viewer's own session and RLS; no story in this epic uses `SUPABASE_SECRET_KEY`, adds a stored column for order or state, or adds a table (AD-3, AD-13).
- A Role-holder never receives Task data from a Role they do not hold. Every lane of an active Role is shown to everyone on the Team with the Role's name, holders (with "Invite pending" marked) and lead, which is already visible on Team & Roles (Story 3.10); a lane the viewer cannot read shows "Tasks in {Role} are visible to its team." and nothing else.
- Dates and "today" are computed on the server in the Event's time zone, never from the viewer's browser clock (Conventions).
- Obsolete and dismissed Tasks are hidden by default; obsolete ones appear only behind *Show obsolete (n)*, and Proposed Tasks never count as Tasks in any total, lane or bar (Stories 4.12–4.14).
- Status is never colour alone: each state keeps its icon and word from the single vocabulary (UX-DR4); every screen works at 375px, at 320 CSS px reflow, with a final-shape `Skeleton`, a *Retry* card on failure and a visible focus ring (UX-DR24, UX-DR25, NFR5, NFR6).
- Guest-facing numbers (RSVP status, the pie chart) are Epic 7; this epic reserves the place and shows only what exists.

### Story 5.1: Dashboard sections and scope

As an Organizer or Role-holder,
I want the Event's Tasks sorted by what needs me,
So that I do not have to read every Task to know what to do next.

**Acceptance Criteria:**

**Given** the Tasks the viewer can read
**When** `classifyDashboard(tasks, viewer)` runs
**Then** it returns the three sections in the fixed order *Needs you*, *At risk* and *On track*, and each Task appears in exactly one, the highest one that matches, with its secondary flags (blocked, waiting, Problem) kept on the row, so the section counts add up with no double counting (UX-DR8)
**And** a Vitest test covers a Task that is at once overdue, blocked and has a Problem, and shows it once under *Needs you*.

**Given** the viewer is the Organizer
**When** the sections are built
**Then** *Needs you* holds, in this order, open Decision Tasks they own, open Problems in any Role, Proposed Tasks in any Role, overdue Tasks in any Role, and Tasks not accepted for more than 48 hours (`stale_unaccepted`), each group by soonest deadline, then title (FR19, FR8, FR9)
**And** open Decision Tasks owned by someone else appear under *At risk* as "Waiting on {name}", not as an action.

**Given** the viewer is a Role lead
**When** the sections are built
**Then** the same rules apply to their own Role only for Problems, Proposed Tasks, overdue and stale Tasks, plus everything they own personally
**And** a plain holder sees only Tasks they own, and a Task owned by someone else is never in their *Needs you* (FR2).

**Given** any owner, including a holder
**When** a Task is delegated to them and not yet accepted
**Then** it shows under their own *Needs you* straight away as "Not yet accepted", so a first-time Role-holder meets their Task first (UJ-1, NFR12).

**Given** *At risk*
**When** it is built
**Then** it holds waiting-on-external Tasks first, then blocked Tasks, each by soonest deadline, and *On track* holds the remaining active Tasks summarised per Role (done, open, overdue) rather than listed
**And** Tasks in an inactive Role are counted for the Organizer only, and never listed under a holder (Story 4.1).

**Given** the viewer's session
**When** pgTAP queries `task_state`
**Then** a holder of one Role, a holder of another Role, a Guest-only user and an anonymous caller each receive only the rows RLS allows, and none receives a Proposed Task they may not see (NFR1)
**And** the function is pure, takes the viewer's id and Role leads as input, and is the only place the section rules live.

### Story 5.2: Dashboard: Needs you

As an Organizer or Role-holder,
I want the Dashboard to open on what needs me, with each item one step from action,
So that I can clear what is mine in a minute.

**Acceptance Criteria:**

**Given** an Event
**When** I open it
**Then** the Dashboard is the Event's landing page, replacing the interim home of Story 2.4 and *My tasks* as the landing page for the Organizer, and it is the sidebar item *Dashboard* with `aria-current="page"` (UX-DR5, UX-DR8)
**And** a viewer with no access, including a Guest-only user, sees "You don't have access to this part of the event." and no data (UX-DR24).

**Given** *Needs you* has items
**When** it renders
**Then** the section is an `h2` with a count pill, an open Decision Task is shown first as the Decision card, the only lifted element on the screen, with *Decide* opening the Decision page (UX-DR10), and Problems, ✦ Proposed Tasks, overdue and not-yet-accepted rows follow in the order of Story 5.1
**And** each row is the Task row of UX-DR11 and opens Task detail, and a Proposed Task row has ✓ and ✕ from Story 4.14 working in place.

**Given** a Problem row
**When** it renders
**Then** it shows a flag icon, the words "Problem reported" and a note excerpt, visibly different from the grey Blocked state (UX-DR4)
**And** an overdue row says "Overdue N days" with icon and word.

**Given** nothing needs the viewer
**When** the section renders
**Then** it collapses to one quiet line, "Nothing needs you right now.", and is not hidden.

**Given** a row that changes while the page is open
**When** I act on a row that has moved (for example, someone else already resolved it)
**Then** the action returns `concurrent_edit`, a toast says so and the page refreshes to the new state, and no action runs twice on a double click (UX-DR24, Story 4.1)
**And** after any action the page revalidates so counts and sections match the database.

**Given** the page loads
**When** data is pending or fails
**Then** a `Skeleton` in the final layout shape is shown, and a failure shows the *Retry* card with `role="alert"` (UX-DR24)
**And** `document.title` is "Dashboard – {Event} – Arrangly" and focus moves to the `h1` (UX-DR25).

### Story 5.3: Dashboard: At risk and On track

As an Organizer,
I want to see what is slipping and how each area is going,
So that I can state the Event's status without asking anyone.

**Acceptance Criteria:**

**Given** *At risk* has items
**When** it renders
**Then** each waiting row shows "Waiting on external" with the note excerpt and each blocked row shows "Waits for: {blocker}" with the Blocked tint, never red and never colour alone, soonest deadline first (UX-DR4, UX-DR8)
**And** the section shows a count pill "N at risk" and collapses to a quiet line when empty.

**Given** *On track*
**When** it renders
**Then** it shows one summary row per active Role with counts for done, open and overdue, the Role lead and holders, and a link into that Role's Tasks, plus the number of Guests added so far (FR19)
**And** a Role whose Tasks the viewer cannot read still shows its name, holders, lead and counts that RLS allows, and never a count that would reveal its Tasks, so a holder of another Role sees "Tasks in {Role} are visible to its team."

**Given** the place reserved for guest numbers
**When** the Dashboard renders before Epic 7 exists
**Then** it shows "N guests added" with no RSVP split, no chart and no empty placeholder, and Epic 7 replaces the line with the RSVP summary and pie chart (carry-forward)
**And** no Guest names or food data are read by this page (NFR2).

**Given** the Organizer
**When** they read the Dashboard alone
**Then** they can state how many Tasks are done, overdue, blocked, flagged with a Problem, not yet accepted and waiting on a decision, which is checked against SM-5 in Story 5.9 (FR19).

**Given** Tasks in an inactive Role
**When** the Organizer views *On track*
**Then** a line "N tasks belong to inactive Roles" links to Team & Roles, and a holder never sees it (Story 2.5).

**Given** a cancelled, past or draft Event
**When** the Dashboard opens
**Then** a cancelled Event is read-only with "Event cancelled", a past Event shows its last state read-only, and a draft shows the publish banner of Story 5.4, with no section left blank without an explanation (UX-DR24).

### Story 5.4: Dashboard housekeeping

As an Organizer,
I want the publish banner, dismissed suggestions and a Role-holder landing in one place,
So that the Dashboard is complete for every kind of visitor.

**Acceptance Criteria:**

**Given** an unpublished Event
**When** the Organizer opens the Dashboard
**Then** the top banner reads "Only your team can see this event. Publish to send invitations." with *Publish*, and it disappears after publishing (UX-DR8, Story 2.8)
**And** the *Publish* button reuses the existing confirmation and idempotent `events_publish`.

**Given** dismissed Proposed Tasks
**When** I choose *Show dismissed (n)* under *Needs you*
**Then** they list with *Restore*, which returns each one to `proposed` through the Story 4.14 function with an Undo toast, and focus moves to the restored row's ✓ (UX-DR8, UX-DR9)
**And** the link is absent when none are dismissed.

**Given** a joined Role-holder who is not the Organizer
**When** they open the Event
**Then** the Dashboard is their landing page with their own Tasks at the top of *Needs you*, replacing *My tasks* as the landing page from Story 4.9, and *My tasks* stays in the sidebar (UX-DR5)
**And** a Playwright check covers join → Dashboard → their Task is first → Accept (UJ-1, Role-holder part).

**Given** a person who is both Guest and Role-holder in the same Event
**When** they open the Event
**Then** one card opens the Dashboard, and a "Your invitation" card appears at the top until they answer, shown once Epic 7 provides it (UX-DR27)
**And** this story only reserves the slot.

**Given** a revoked Role-holder or a cancelled Event
**When** they use the Dashboard
**Then** the role-revoked `role="alert"` toast and redirect of Story 3.9 still apply, and a cancelled Event offers no *Publish* or action buttons.

### Story 5.5: Event cards show state

As an Organizer or Role-holder,
I want my events on *All events* to show what is open and what is urgent,
So that I can see which event needs me before I open it.

**Acceptance Criteria:**

**Given** *All events*
**When** it loads
**Then** one grouped query over `task_state` returns, for every Event the viewer can see, the viewer's Open count (their own open Tasks), New count (owned and not yet accepted, as in Story 4.9, so it does not clear on opening, which departs from the UX text and is recorded here), overdue count, and the number of decisions addressed to them, with an index on `(event_id, owner_user_id)` so the page makes one query, not one per card (UX-DR6)
**And** a Vitest or SQL test with 50 events asserts the query count stays constant.

**Given** a card
**When** it renders
**Then** the count circle is Open, the badge is New, and when Urgent is above zero it shows the urgent state with "N overdue" or "N need you", otherwise when At risk is above zero it shows the at-risk state with "N at risk" (UX-DR6)
**And** the card remains one link whose accessible name includes name, date, role, open, overdue and new counts, for example "Lucas's 40th, Sat 24 Oct, Organizer, 3 open tasks, 1 overdue, 1 new task".

**Given** a cancelled or past Event
**When** its card renders
**Then** it shows no counts, only "Cancelled" or its place under *Past events* (Story 2.4).

**Given** a guest-only card
**When** it renders
**Then** it keeps the RSVP state from Epic 7, and this story changes nothing for it
**And** a viewer sees counts only for Tasks RLS lets them read (pgTAP).

**Given** a viewer with no events
**When** the page loads
**Then** the "Let's plan something." empty state is unchanged.

### Story 5.6: Timeline computation

As a Team member,
I want the Timeline computed from the current Tasks every time it is opened,
So that it always matches the plan and never shows a stale order.

**Acceptance Criteria:**

**Given** `computeTimeline(roles, tasks, event, today)`
**When** it runs
**Then** it returns one lane per active Role, sorts each lane topologically by dependency, breaks ties by deadline, then `created_at`, then id so repeated calls give the same order, and nests each Subtask inside its parent (AD-13, FR20)
**And** no table or column stores the order, and a pgTAP test shows no such column exists.

**Given** a lane
**When** a Task's bar is computed
**Then** it ends at the Task's deadline and starts at the latest deadline among its dependencies, or at its `created_at` date when it has none, with at least one day of width and a one-day marker on the deadline when the start would come after the end (T1)
**And** a Task with a Decision Task point is shown as a point before the decision is made, filled while open and outline once resolved (UX-DR15).

**Given** the lane list
**When** the Event has two active Roles with no Tasks and one inactive Role with Tasks
**Then** exactly two lanes are returned, each tagged empty, and the Tasks of the inactive Role are counted separately for a quiet "N tasks belong to inactive Roles" line shown to the Organizer only (FR20)
**And** a Vitest test asserts lane count equals active Role count in every case.

**Given** a lane the viewer cannot read
**When** the function receives only the Roles' public details
**Then** it returns that lane with its Role name, holders and lead and no Task data, and a test proves no Task title, deadline or id from another Role is present in the result.

**Given** a dependency cycle, which Story 4.3 makes impossible
**When** the function meets one anyway
**Then** it falls back to deadline order for that lane, terminates, and logs only the Event and Role ids
**And** a Vitest test forces a cycle and asserts it terminates.

**Given** obsolete Tasks
**When** the caller does not ask for them
**Then** they are omitted, and with the option they appear marked obsolete, never removed from the data, and dismissed and Proposed Tasks never appear (FR11)
**And** a Vitest test covers 300 Tasks across 12 Roles in one pass, and the data is loaded in two queries, one for Roles and one for Tasks and their dependencies, with no per-Task query.

**Given** the axis
**When** the range is computed
**Then** it runs from the earliest bar start to the later of the latest deadline and the Event's end, in the Event's time zone, so a two-year-ahead Event and Tasks after the Event are both reachable
**And** "today" is the Event-zone date, tested around midnight and a daylight-saving change.

### Story 5.7: Timeline: swimlane view

As a Team member,
I want the Event drawn as one lane per Role,
So that I can see the order of work and where it will clash.

**Acceptance Criteria:**

**Given** *Timeline* in the sidebar
**When** I open it on desktop
**Then** the page shows a sticky Role column with the Role name, holders (with "Invite pending" marked) and lead, 112px lanes, a 24px-per-day axis with Monday week labels, Task bars styled per status with icon and word, a today line and an Event-day column, with a 48px edge fade where it scrolls (UX-DR15)
**And** weeks across a year boundary and both locales are labelled correctly, tested with Vitest.

**Given** a lane of a Role I do not hold
**When** it renders
**Then** the Role column is shown in full and the lane body says "Tasks in {Role} are visible to its team.", with no bars and no counts
**And** the same lane shows its bars to the Organizer and to its own holders.

**Given** a Task bar
**When** I click or press Enter on it
**Then** the Task detail opens, and long titles are truncated in the bar while the link keeps the full name "{title}, {dates}, {status}, waits for {x}" (UX-DR15, UX-DR25)
**And** blocked Tasks are visibly different from unblocked ones, nested Subtasks sit inside their parent's position, and obsolete Tasks are hidden unless *Show obsolete (n)* is on, kept in the URL so it survives a reload.

**Given** the scroll area
**When** a keyboard or screen-reader user reaches it
**Then** it is `role="region"` with `aria-label="Timeline"` and `tabindex="0"`, each lane is a labelled list in order, and focus on a Task scrolls it into view
**And** the page is read-only, with no drag and drop and no hover-only affordance (UX-DR15, UX-DR23).

**Given** a Timeline with many days
**When** it spans two years
**Then** it scrolls horizontally without breaking layout and a *Jump to today* control is available
**And** a Playwright check opens the flagship Timeline and clicks a Task.

**Given** loading, failure and no Tasks
**When** the page renders
**Then** it shows a final-shape `Skeleton`, a *Retry* card on failure and "The timeline fills in as tasks are added." with *New task* for those who may create one (UX-DR24)
**And** a cancelled or past Event still renders read-only.

### Story 5.8: Timeline: List view

As a Team member on a phone,
I want the same plan as a plain list,
So that I can read it on a small screen and with assistive technology.

**Acceptance Criteria:**

**Given** the view toggle
**When** I choose *List*
**Then** the same data from `computeTimeline` is shown as grouped task rows, one group per active Role, in the same order, nested Subtasks under their parent, and the toggle state is part of the URL (UX-DR15)
**And** it is the default below 768px and remains available on desktop.

**Given** a phone at 375px and 320 CSS px reflow
**When** the List view renders
**Then** there is no horizontal scrolling, long titles wrap, tap targets are at least 44×44px and every Task row opens its detail (NFR5, NFR6, UX-DR3)
**And** this meets WCAG 1.4.10 for the Timeline as a whole.

**Given** each Role group
**When** it renders
**Then** it has a heading, the lead and holders, and an empty group says "No tasks in this Role yet", with a group for a Role the viewer cannot read saying "Tasks in {Role} are visible to its team." and nothing more
**And** Decision points are listed with "Needs a decision" or "Decided" as words plus icon.

**Given** a status or Role is conveyed
**When** the row renders
**Then** it uses icon and word, never colour alone, and screen readers hear the same "{title}, {dates}, {status}, waits for {x}" name as in the lane view (UX-DR4, UX-DR25).

**Given** the Organizer
**When** Tasks belong to an inactive Role
**Then** a line says how many with a link to Team & Roles, and a holder never sees it.

### Story 5.9: Flagship check

As the Organizer of the flagship event,
I want the whole Dashboard and Timeline proven on the 40th-birthday scenario,
So that I know I can state its status without asking anyone.

**Acceptance Criteria:**

**Given** `supabase/seed.sql`
**When** it is loaded
**Then** it holds the flagship Event with its Roles, a Task graph covering done, overdue, blocked, waiting, a Problem (the bar-staff case), a not-yet-accepted Task, an open Decision Task and a Proposed Task, and nothing in it names a real person (AD-15)
**And** pgTAP runs against it in CI.

**Given** the seeded Event
**When** a Playwright test signs in as the Organizer
**Then** the Dashboard shows each state in the right section, a Decision card first, and the Organizer can read the counts of done, overdue, blocked, Problem, not accepted and awaiting decision without opening a Task (UJ-1, SM-5)
**And** it also opens the Timeline, finds one lane per active Role, and opens a Task from a bar.

**Given** the same Event
**When** a Role-holder signs in
**Then** the Dashboard shows their Tasks first, their Role's lane with bars, every other lane without Task data, and Playwright asserts no other Role's Task title appears anywhere on the page (NFR1, UJ-1)
**And** the first-time Role-holder path is timed in a manual script and noted against SM-3 and NFR12.

**Given** CI
**When** a change breaks a section rule, the lane count or the no-leak check
**Then** the Vitest, pgTAP or Playwright test fails, with AI in fixture mode (NFR9)
**And** the epic summary lists FR19 (team) and FR20 covered and the carry-forwards below.

### Carry-forwards from Epic 5

- Epic 7: replace "N guests added" on *On track* with the RSVP summary (invited, accepted, declined, not answered) as a pie chart with an accompanying table (never colour alone, WCAG), and add the "Your invitation" card for a Guest who is also a Role-holder; the Guests tab remains Epic 7.
- Epic 7 and 8: guest-card state on *All events* stays Epic 7; nothing in Epic 5 reads Guest data.
- Epic 10: notification links and badges must open the Dashboard or the relevant Task.
- Epic 11: the flagship seed and the Dashboard/Timeline Playwright tests are part of the launch run; a performance check with 300 Tasks is recorded.
- Out of this epic, noted for later: letting every Role-holder read other Roles' Tasks, which the Organizer asked about and which would change FR2, NFR1 and AD-3, is a `bmad-correct-course` item, not a story here.
