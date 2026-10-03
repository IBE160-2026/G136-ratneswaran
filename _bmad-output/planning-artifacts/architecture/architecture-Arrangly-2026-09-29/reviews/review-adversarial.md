---
title: Adversarial review — Architecture Spine (Arrangly)
reviewed: ARCHITECTURE-SPINE.md (updated 2026-10-02)
against: prd-Arrangly-2026-09-22/prd.md (FR-1..FR-23, §4.9), ux-Arrangly-2026-09-27/EXPERIENCE.md
date: 2026-10-02
lens: two units one level down, each obeying every AD to the letter, that still build incompatibly
---

# Adversarial review — Architecture Spine

## Verdict

The spine picks the right paradigm (RLS + SQL functions + outbox), but several ADs contradict each other when two agents follow them literally. AD-3's "only inputs" rule leaves Guests unable to read their own data. AD-5's definer whitelist rules out the `emit` that AD-7 needs. The module graph has no edge for the FR-16 guest↔task loop. And the Server Action boundary (AD-2/AD-17) can be skipped by calling PostgREST directly. **Five critical and seven high findings must be closed before epics are written.**

Severity key: **critical** = two compliant units cannot both work, or SM-2/GDPR is broken by design. **high** = divergence is likely and costly to undo. **medium** = divergence is possible and cheap to fix if caught. **low** = nice to pin down.

---

## Critical

### C1. AD-3 forbids the policy every Guest surface needs

- **Units:** *Guests epic, story "Guest Dashboard"* vs *Guests epic, story "RSVP flow"* (or any two guest stories by different agents).
- **ADs:** AD-3, AD-4, AD-5.
- **Collision:** AD-3 says "`role_members` and `events.organizer_id` are the **only** inputs to policies." A Guest holds neither, so no compliant policy can let Chris read his own `guests`/`rsvps`/`guest_requests` row or the latest `landing_snapshots` row. Agent A obeys AD-3 literally and reaches the data through a `security definer` RPC, which breaks AD-5 because guest reads are not on the whitelist. Agent B adds `guests.user_id = auth.uid()`, which breaks AD-3. Each agent will also write its own self-match (`user_id` vs `email = auth.email()`), and the email variant leaks across events once a Guest changes email or is invited under an alias.
- **Fix (tighten AD-3):**
  > Policy inputs are exactly: `events.organizer_id`, `role_members`, and `guests.user_id` (one `guests` row per Event per invited person; `user_id` references `auth.users`). Shared helpers are `is_organizer(event_id)`, `holds_role(role_id)`, `is_guest_of(event_id)` and `is_guest_self(guest_id)`. A Guest may read and write only rows where `is_guest_self(guest_id)`, and read only the latest `landing_snapshots` row of an Event where `is_guest_of(event_id)`. No policy matches on email.

### C2. `emit` cannot be both `security invoker` and correct

- **Units:** *Tasks epic, `tasks_delegate`* (invoker, AD-2) vs *Notifications epic, `notifications_emit`*.
- **ADs:** AD-2, AD-5, AD-7.
- **Collision:** AD-7 says recipients are "resolved inside `emit` from current role membership". AD-2 makes callers `security invoker`. AD-5 allows `security definer` only for token exchange, guest-user creation, delivery and retention. So `emit` runs as the caller:
  - A Guest who changes allergies after the due date (FR-16) cannot read `role_members`, so `emit` resolves **zero recipients** and the notification disappears without any error.
  - The caller needs INSERT on `notification_outbox`/`notifications`. Granting that to `authenticated` lets any logged-in user insert a forged notification for any user through PostgREST.
  - The notifications agent will make `emit` definer and break AD-5. The tasks agent will grant INSERT and break SM-2. Both are "compliant" readings.
- **Fix (amend AD-5 and AD-7):**
  > AD-5: `security definer` is also allowed for `notifications_emit` and for the AD-11 deletion function. Every definer function sets `search_path = ''`, is owned by a dedicated non-superuser role, and is `REVOKE EXECUTE … FROM public, anon, authenticated`. Only other SQL functions may call it (it is not exposed through PostgREST).
  > AD-7: `authenticated` has no INSERT/UPDATE/DELETE on any notifications-module table. `emit` is the only writer.

### C3. The module graph has no path for the FR-16 guest → task → guest loop

- **Units:** *Guests epic, "Send a request / other needs"* vs *Tasks epic, "Confirm Proposed Task / mark Done"*.
- **ADs:** AD-1, AD-2, module graph (guests → events, ai; tasks → events, ai), Task-state convention.
- **Collision:**
  1. A guest need has to become a **Proposed Task** in `tasks`. Guests may not write `tasks` (AD-1) and has no arrow to tasks. Agent A stores the proposal in `guest_requests` (`proposed_title`, `routed_role_id`, `status`). Agent B (FR-6 / status-note / questionnaire proposals) adds `tasks.status = 'proposed'`. The Dashboard's "Proposed Tasks" section then has to UNION two shapes. "Dismissed / Restore" (UX) also gets two implementations.
  2. Completing the Task must write a **Guest-visible result** ("Airport pickup: taxi 16:30"). AD-2 lists "set status" as a single-table direct edit, but for a guest-linked Task, Done touches `tasks` and a guests-owned table. No table owns "resolved for you", and tasks has no arrow to guests.
  3. The Task-state convention has no `proposed`/`dismissed` states.
- **Fix (new AD-18 "Proposed Tasks and guest results"):**
  > Proposed Tasks are rows in `tasks` with `lifecycle ∈ {proposed, active, dismissed}` (separate from `status`), plus `source ∈ {ai_description, questionnaire_gap, status_note, guest_need, guest_request}` and nullable `source_guest_request_id`. Only the tasks module creates them. Other modules call `tasks_propose(...)`. Guests owns `guest_results(guest_id, task_id, body, created_at)`. Setting `status = done` on a Task with `source_guest_request_id` goes through `tasks_set_status` (AD-2 function, never a direct edit). That function calls `guests_publish_result(...)`. Add arrows guests → tasks (`tasks_propose`) and tasks → guests (`guests_publish_result`) to the module graph. A Task's status is always changed through `tasks_set_status`, which also writes `status_history`.

### C4. Server Actions are not the only door: PostgREST bypasses AD-2/AD-17 and column rules

- **Units:** *Tasks epic, "set status" (direct single-table edit, RLS "owner may update own task")* vs *Tasks epic, "delegate" (`tasks_delegate` with Role-lead check, acceptance reset, notify)*.
- **ADs:** AD-2, AD-3, AD-17, FR-2 (only the Role lead / Organizer delegates).
- **Collision:** RLS is row-level. A policy that lets the owner UPDATE their Task row lets them UPDATE **any column**, including `owner_id`, `role_id`, `accepted_at` and `obsolete`. The browser holds the anon key and the user's JWT, so Sheila can call `PATCH /rest/v1/tasks?id=eq.X {owner_id: Kari}` and skip the Role-lead check, the acceptance reset, the notification and Zod (AD-17). Both stories are compliant on their own. Combined, they break SM-2. The same pattern hits `rsvps` (a Guest flips the consent flag off but keeps allergies), `guest_requests` (a Guest writes the one reply), `role_members` (needs a check that the Role's event = the Organizer's event), and `announcements`.
- **Fix (new AD-19 "Database is the boundary"):**
  > The `authenticated` role gets table privileges column by column: `GRANT SELECT` as RLS allows, and `GRANT UPDATE (col, …)` only on the columns that the AD-2 single-table edits list. All other writes are `REVOKE`d and happen only through AD-2 functions. Every business invariant that a direct API call could break is a DB constraint or a function check (one lead per Role: partial unique index; dependency/parent same Role: trigger; consent required for allergy fields: CHECK). Zod (AD-17) is UX validation, not the security boundary. pgTAP tests each direct-PostgREST denial.

### C5. AD-11 deletion collides with other modules' foreign keys and copies of personal data

- **Units:** *Guests epic, retention job / "Delete my data"* vs *Tasks epic (`tasks.source_guest_request_id`, Task titles like "Airport pickup for Chris")* + *Notifications epic (`notifications.recipient_id → auth.users`, outbox payload with guest name/allergy change)* + *AI (`ai_usage.user_id`)*.
- **ADs:** AD-1, AD-5, AD-11.
- **Collision:**
  - FK `ON DELETE` behaviour is undefined. Postgres defaults to `NO ACTION`. One RESTRICT-style FK from tasks/notifications aborts the whole per-Event retention transaction, so **nothing is deleted** and no error reaches anyone.
  - AD-11 deletes rows owned by tasks and notifications, which breaks AD-1 unless each owner exposes a purge function.
  - Personal data survives deletion in `notification_outbox.payload`, `notifications.body`, `status_history` notes, Proposed Task titles and AI fixtures.
  - "Delete my data" runs as the Guest. Deleting `auth.users` needs the service role, which AD-5 does not allow there.
  - "Anonymised counts" has no owning table. "Holds an account" has no definition (password? OAuth identity? any Role on any Event?). "Event's end" has no column.
- **Fix (tighten AD-11):**
  > Deletion is `guests_delete_guest_data(guest_id)` (definer, per AD-5). It calls each owner's purge hook in one transaction: `tasks_purge_guest(guest_id)` (nulls `source_guest_request_id`, replaces the guest name in Task text with "a guest"), `notifications_purge_user_event(user_id, event_id)` (deletes outbox/notification rows for that event and recipient, and any whose payload references the guest), `ai_purge_user(user_id)`. Every FK to `guests`, `guest_requests` or `auth.users` declares `ON DELETE SET NULL` or `CASCADE` explicitly (pgTAP checks no `NO ACTION`). Notification payloads hold IDs and an i18n key, never names or health data. Rendering resolves names at read time. The auth user is deleted only when it has no `role_members` row, organizes no Event, is a Guest of no other Event, and has no password/OAuth identity. `events.ends_at timestamptz` is required. Counts go to `guests.event_guest_stats` (events-owned). Self-delete goes through a Server Action that calls the definer function. The service-role auth delete happens in the same route.

---

## High

### H1. Invite-token exchange turns a forwarded email into a full-account login

- **Units:** *Guests epic, `/api/invite/[token]`* vs *Events epic, Organizer account (FR-1) / Guest "Create account" (FR-3)*.
- **ADs:** AD-4, AD-5, AD-6.
- **Collision:** AD-4 exchanges a long-lived token (valid until the Event ends) for a **normal Supabase session** of "that same user". When the invited email already belongs to an Organizer or Role-holder account, or the Guest later adds a password, a forwarded invite email logs in as the full account for weeks. That account can reach Organizer powers on other Events and every guest's allergy data in Roles it holds. One agent builds the exchange "for any user", another builds "Create account" without revoking tokens. Both comply.
- **Fix (tighten AD-4):**
  > The exchange issues a session only when the user has no password and no OAuth identity and holds no `role_members` row and organizes no Event ("guest-only user"). For any other user it redirects to sign-in with the email pre-filled. Adding a password/identity, or being added to a Role, revokes all that user's `invite_tokens` in the same transaction. Tokens are 256-bit, stored as SHA-256, compared in constant time, rate-limited per IP and per token (see AD-21). Exchange and "send fresh link" responses never reveal whether an email exists.

### H2. Role-holder invite flow is unowned: two token systems, wrong service-role scope

- **Units:** *Events epic, "Team & Roles → invite" (owns `invites`)* vs *Guests epic, invite exchange (owns `invite_tokens`)*.
- **ADs:** AD-1, AD-4, AD-5, FR-1, FR-5.
- **Collision:** FR-1 requires a Role-holder invite link. AD-4 covers only Guests. AD-5's service-role list covers "guest-user creation", not Role-holder creation. Agent A uses `supabase.auth.admin.inviteUserByEmail` (Supabase's own ≤ 1-day link that AD-4 bans for invites, plus service role outside the whitelist). Agent B reuses `invite_tokens`, which is a guests table, from events (breaks AD-1). The FR-5 **shared event link** (one link, many unidentified guests) is a third token type with no owner.
- **Fix (amend AD-4/AD-5 and the ownership table):**
  > One table, `invite_tokens(kind ∈ {guest, role_holder, shared_event}, …)`, owned by **events**. The one exchange route handles all kinds. Role-holder tokens lead to account creation with name/email pre-filled. Shared-event tokens lead to the name+email form, which creates a `guests` row with `identified=false` and emails a per-guest token (no session until that link is opened). AD-5 "guest-user creation" becomes "invitee user creation (any kind)".

### H3. Revoking a Role does not revoke access to Tasks owned by the person; cross-Role assignment breaks AD-3

- **Units:** *Events epic, `events_revoke_role`* vs *Tasks epic, Task RLS*. Also *Notifications epic, "Assign volunteer to task"*.
- **ADs:** AD-3, AD-1, FR-2 ("revoking removes access immediately"; Organizer may delegate outside the Role).
- **Collision:** Under the strict reading of AD-3 (only role membership), Kari the volunteer, delegated by the Organizer outside F&B, **cannot see her own Task**. If the tasks agent adds `owner_id = auth.uid()`, a revoked holder **keeps** access to every Task still assigned to them. The spine allows neither and forbids neither.
- **Fix (tighten AD-3, add to events):**
  > Task visibility = `is_organizer(event) OR holds_role(task.role_id) OR task.owner_user_id = auth.uid()`. `events_revoke_role(role_id, user_id)` calls `tasks_release_owner(role_id, user_id)` in the same transaction, which sets those Tasks to Role-owned (Role lead, or pending), resets acceptance and emits. Add arrow events → tasks for this purpose only.

### H4. Task owner shape and "Role-owned → Role lead" transfer are undefined

- **Units:** *Tasks epic, Task schema* vs *Events epic, "set Role lead"* (UX: wizard Tasks are "owned by their Role until Team is built, then go to the Role lead").
- **ADs:** AD-1, Task-state convention, FR-7, FR-12.
- **Collision:** Agent A models `owner_type + owner_id`. Agent B models `owner_role_id` + nullable `owner_user_id`. FR-12's "pending" then means different things. Setting a lead must move Role-owned Tasks to that lead, but events cannot write tasks and has no arrow. One agent does it with a trigger on `role_members` that writes `tasks` (breaks AD-1). Another computes "effective owner" at read time. The two give different "Not yet accepted" counts.
- **Fix (add to Task-state convention + AD-18):**
  > Every Task has `role_id` (required) and `owner_user_id` (nullable). `owner_user_id IS NULL` = Role-owned = "pending" (FR-12). Role-owned Tasks are **not** auto-assigned. Setting or changing a Role lead calls `tasks_assign_role_owned_to_lead(role_id)`, which assigns every pending, active Task in that Role to the lead and emits one "new task" notification per lead (AD-7 dedup).

### H5. Outbox: webhook and cron retry can both send; partial channel failure resends

- **Units:** *Notifications epic, deliver route* vs *Notifications epic, pg_cron retry*.
- **ADs:** AD-7, AD-8.
- **Collision:** The webhook's call is still in flight (cold start + SMTP, or the route sends mail and then times out before "mark sent"). After 3 minutes the cron re-posts and the email goes out twice. If email succeeds and push fails, a row-level "sent" flag forces both to resend or neither. The deliver route has no stated authentication, so anyone can POST to it, and it runs with the service role.
- **Fix (tighten AD-8):**
  > Delivery claims the row first: `UPDATE notification_outbox SET claimed_until = now() + interval '2 min', attempts = attempts + 1 WHERE id = $1 AND sent_at IS NULL AND (claimed_until IS NULL OR claimed_until < now()) RETURNING *`. No row returned → exit 200. Each channel has its own `email_sent_at` / `push_sent_at`, and a retry sends only channels still null. Cron re-posts only rows whose claim has expired. Email uses `Message-ID = <outbox_id@arrangly>` so retries are recognisable. The webhook and cron send `Authorization: Bearer ${DELIVERY_SECRET}` (stored in Supabase Vault), and the route rejects anything else before touching the service role. Push endpoints returning 404/410 delete the `push_subscriptions` row.

### H6. "At most one notification per recipient per action" has no mechanism, and contradicts FR-23 grouping

- **Units:** *Tasks epic, `tasks_resolve_decision`* (emits "decision result" to the requester and "new task" to the spawned owner, often the same person) vs *Notifications epic, `emit`*.
- **ADs:** AD-7, FR-23 ("several notifications arriving close together are grouped"), UX ("2 new items in Needs you").
- **Collision:** A calls `emit` twice and gets two rows. B expects one `emit` with a list. Nothing makes two calls in one transaction collapse. Separately, AD-7 says "no grouping and no delay". That overrides an FR-23 testable consequence and the UX copy without saying so. PRD Open Question 2 is answered "none" without amending the PRD.
- **Fix (tighten AD-7, flag the PRD):**
  > `emit(event_id, kind, subject_ref, recipients recipient_spec[])`. Rows are unique on `(txid_current(), recipient_id)`. A second `emit` in the same transaction for the same recipient merges into the existing row (`kinds[]` grows, rendered as "2 new items need you"). Cross-action grouping is **not** done. **PRD FR-23's grouping consequence must be amended** to "one notification per recipient per action" (record it in the PRD changelog). Otherwise the spine fails FR-23's acceptance test.

### H7. Recipient resolution is ambiguous across producers

- **Units:** *Guests epic (FR-16 late change → "every holder of the Role(s) that own the changed data")* vs *Notifications epic (FR-21 person / Role / whole team / custom group)* vs *Tasks epic (Problem → Organizer + Role lead)*.
- **ADs:** AD-7, guest-data-ownership convention.
- **Collision:** "Resolved from current role membership" covers only Role targets. Open questions: Does "whole team" include the Organizer, and Guests who hold a Role? Who owns "custom group", and where does it live? When the owning Role is inactive, guests code passes `organizer` while notifications code resolves an empty Role. Does the sender get their own announcement? Is feed visibility the snapshot of recipients at send time (FR-21) or live membership? A user who joins later sees different history depending on which agent built the feed.
- **Fix (add to AD-7):**
  > `recipient_spec` is one of `user(id)`, `role(id)`, `role_lead(id)`, `organizer(event)`, `team(event)` (= organizer ∪ all role_members, deduped), `group(id)`, `guest(guest_id)`, `data_owner(event, field ∈ {allergy, food, hotel, rsvp, request})`. `data_owner` applies the guest-data-ownership convention, including the Organizer fallback. The sender is excluded. Recipients are expanded at send time into `notifications` rows. **The feed is read only from the recipient's own `notifications` rows** (a snapshot, never live membership). `announcement_groups`/`announcement_group_members` are owned by notifications.

---

## Medium

### M1. Column-level guest data with row-level RLS

- **Units:** *Guests epic, `rsvps` schema (allergies, hotel and plus-one columns on one row)* vs *Dashboard Guests tab for a Guests-Role holder*.
- **ADs:** AD-3, guest-data-ownership.
- **Collision:** RLS cannot hide columns. If allergies live on `rsvps`, the Guests-Role holder who may read RSVPs also reads allergies. A Guest who holds the Venue Role reads the guest list at whatever scope the guests agent chose, because the spine never says whether non-owning Role-holders see names/emails.
- **Fix:** Split `guest_food (allergies, food_prefs, consent_at)` and `guest_hotel` into their own tables, each with RLS keyed on the owning Role. State it: "Role-holders outside the Guests, Food & Beverage and Travel & Logistics Roles see Guest count only, never names or emails." Every view over guest data is `security_invoker = true`.

### M2. Derived-state views run as owner by default

- **Units:** *Tasks epic, `task_states` view (blocked/overdue)* vs *any reader*.
- **ADs:** Task-state convention, AD-3.
- **Collision:** Postgres views bypass the caller's RLS unless created `WITH (security_invoker = true)`. One agent writes a plain view and leaks every Event's Tasks. A cross-Role dependency the viewer can't see also makes "blocked" differ between Organizer and Role-holder.
- **Fix:** "All views use `security_invoker = true` (pgTAP asserts it via `pg_class.reloptions`). Dependencies and parents are same-Role (enforced by trigger, including on recategorisation), so blocked is viewer-independent."

### M3. Guest request routing spans an AI call that cannot sit inside the AD-2 transaction

- **Units:** *Guests epic, "Send a request"* vs *AI gateway `route-request`*.
- **ADs:** AD-2, AD-9.
- **Collision:** A model call can't run inside a Postgres function. One agent calls the AI first and then the function, so an AI timeout loses the request. Another inserts and then routes, so a crash leaves a request with no Proposed Task.
- **Fix:** "`guests_submit_request` commits the request **and** its Proposed Task routed to the Organizer in one transaction. AI routing runs afterwards and only re-routes (a single-column update via `tasks_reroute_proposed`). Failure leaves it with the Organizer, which is already the specified fallback."

### M4. AI cap race, unit and abuse

- **Units:** *AI gateway* vs *Tasks/Guests callers*.
- **ADs:** AD-9.
- **Collision:** It is unclear whether the cap increments before the call (a failed call burns cap) or after (a race over the cap). "Per day" has no time zone (Event vs UTC). `landing-about` has two counters in one cap. The USD 5 ceiling is checked after the call, so concurrent calls overshoot. If `ai_usage` is writable by `authenticated`, or the cap function is exposed through PostgREST, any Guest can exhaust the Organizer's `task-list` cap. Feature authorization (only the Organizer may call `task-list` / `landing-about`) has no owner.
- **Fix:** "`ai_reserve(feature, event_id)` is definer, not PostgREST-exposed, checks the caller is authorised for the feature, and inserts a reservation row atomically (`INSERT … SELECT WHERE count < cap`). A failed or unavailable call deletes its reservation. Days are UTC. `landing-about` uses keys `landing-about:draft` and `landing-about:rewrite`. The ceiling check reserves a worst-case cost (max_tokens × price) before the call and settles to actual after."

### M5. Bulk invite sending path unspecified

- **Units:** *Events epic, "Publish event" (sends 80 invites)* vs *Notifications epic, email module*.
- **ADs:** AD-7, AD-10.
- **Collision:** AD-10 says invites go through the email module "in batches". Agent A loops SMTP sends inside the Server Action, which times out on Vercel Hobby. Agent B enqueues to the outbox. Reminders (FR-17) may do either.
- **Fix:** "All application email (invites, reminders, notifications) is an outbox row. Delivery drains at most N per minute and M per day (env-configured under the Gmail cap). Over-cap rows stay queued, and the Organizer sees 'x invites queued'. Supabase Auth emails are the only exception."

### M6. `status_history` is a second table on a "single-table" edit

- **Units:** *Tasks epic, "set status" (AD-2 direct edit)* vs *FR-8 timestamped history*.
- **ADs:** AD-2.
- **Collision:** A direct status edit has to insert history, so it isn't single-table. One agent uses a trigger, another an app insert, another skips it.
- **Fix:** Covered by C3 (`tasks_set_status`). Alternatively state that "history and audit rows are written only by AFTER triggers owned by the same module."

### M7. Decision concurrency and reversal

- **Units:** *Organizer resolving* vs *a second "Change decision"* (two tabs, or Organizer and decision recipient).
- **ADs:** AD-2, FR-11.
- **Collision:** Without a lock, two resolves interleave and both spawn follow-up Tasks. On reversal, nothing defines whether the earlier follow-up is obsoleted (FR-11 says the logic is idempotent).
- **Fix:** "`tasks_resolve_decision` takes `SELECT … FOR UPDATE` on the Decision Task. Follow-up Tasks record `spawned_by_option_id` and are obsoleted or re-activated exactly like option-tied Tasks. Only the decision's named recipient or the Organizer may resolve."

### M8. Realtime scope for "Needs you"

- **Units:** *Dashboard (Needs-you live)* vs *Tasks module tables*.
- **ADs:** AD-8.
- **Collision:** Needs-you is a derived view, and Realtime cannot subscribe to a view. One agent adds `tasks` to the realtime publication, another listens to `notifications`. DELETE events are not RLS-filtered in Supabase Realtime.
- **Fix:** "Realtime publication contains only `notifications` and `announcements`. Needs-you re-fetches its server query when a `notifications` insert for the viewer arrives."

### M9. Time semantics

- **Units:** *Tasks (deadline 'N days before event', overdue)* vs *AD-11 retention* vs *AD-9 daily cap*.
- **Collision:** Is a deadline a date or a timestamptz? Overdue at midnight in which zone? The Event end is not modelled.
- **Fix:** Extend the IDs-and-time convention: "`events.starts_at`, `events.ends_at` (timestamptz) and `events.time_zone` are required. A deadline is a `date` interpreted in the Event time zone and is overdue after 23:59:59 local. Relative deadlines are stored resolved and re-resolved when `starts_at` changes."

---

## Silent dimensions (deployment / ops / security)

### S1 (high). One Supabase project for previews and production

Every branch preview runs unmerged code against the production database. Migrations reach the cloud only from `main`, so a preview that relies on a new migration fails, or worse, writes production data in a different shape. The pg_net webhook has one URL, so outbox rows created from a preview are delivered by production code. Preview URLs are public and hold the service-role key.

**Fix (new AD-20):** "Vercel previews do not get `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` or SMTP credentials, and have Vercel Deployment Protection on. Previews run in fixture mode against the cloud project read-only, or are disabled until a staging project exists. The webhook URL and `DELIVERY_SECRET` are production-only."

### S2 (high). No abuse controls on public endpoints

The invite exchange, "send me a fresh link", the shared-event-link name+email form and guest requests are all unauthenticated or guest-authenticated. A script can exhaust the Gmail daily cap, which stops real invites, enumerate tokens, or create auth users without limit.

**Fix (new AD-21):** "Public routes rate-limit per IP and per email/token with a Postgres-backed counter (no new vendor): 5/min per IP, 3/hour per email. 'Fresh link' always returns the same message. Shared-event-link signups require the emailed link before a session exists."

### S3 (medium). Vercel Hobby limits vs AI latency

A `task-list` Sonnet call can take longer than the default function duration. Nothing sets `maxDuration` or streaming, so agents will diverge between timeouts and ad-hoc fixes.

**Fix:** "AI-calling Server Actions export `maxDuration = 60` and handle timeouts by returning `unavailable` (AD-9 fallback)."

### S4 (medium). Secrets and CI

The spine doesn't name the CI secrets needed for `supabase db push` (`SUPABASE_ACCESS_TOKEN`, DB password), and doesn't say whether CI pgTAP runs against a local Docker stack. It also doesn't define how webhook and cron get their secret (Vault).

**Fix:** List them under the config convention. CI tests run only against local Supabase, never cloud.

### S5 (low). Backups, seed data, pause

The free plan has no PITR. There is no rule for demo seed data, so each epic will seed its own. A paused project stops pg_cron retention.

**Fix:** "One `supabase/seed.sql` owns the flagship 40th-birthday scenario. A weekly `pg_dump` to a private artifact. Retention is idempotent and catches up on resume."

---

## PRD FRs with no governing rule (likely divergence)

| FR | Gap | Closed by |
| --- | --- | --- |
| FR-4 | Draft event state, Event language field, `ends_at`/time zone | M9, add `events.status ∈ {draft, published}` |
| FR-5 | Shared invite link / unidentified guest | H2 |
| FR-6 / FR-16 | Proposed Task storage, dismiss/restore, recategorisation across Roles | C3, M2 |
| FR-7 / FR-12 | Owner shape, pending vs delegated, Role-owned → lead | H4 |
| FR-9 | 48 h unaccepted → needs-attention (derived? notified?) | Add to Task-state convention as derived `stale_unaccepted` |
| FR-16 | Guest results, one-reply rule (unique constraint), routing transaction | C3, M3, add `UNIQUE(request_id)` on replies |
| FR-21 | Custom groups, feed snapshot semantics, role-holder target restriction | H7 |
| FR-23 | Grouping consequence contradicted by AD-7 | H6 (PRD amendment) |
| FR-2 | Role deactivation with Tasks/members attached (FK behaviour) | Add: deactivating a Role is a soft flag (`roles.active=false`), never a delete |
| FR-3 | Account created later: token revocation, event shows under account | H1 |

## Summary of proposed AD changes

- **Tighten:** AD-3 (C1, H3), AD-4 (H1, H2), AD-5 (C2, C5, H2), AD-7 (C2, H6, H7), AD-8 (H5), AD-9 (M4), AD-11 (C5), Task-state convention (H4, M9).
- **New:** AD-18 Proposed Tasks & guest results (C3), AD-19 Database is the boundary (C4), AD-20 Environment isolation (S1), AD-21 Public-endpoint abuse limits (S2).
- **PRD:** amend FR-23 grouping (H6). Note that AD-11 supersedes §4.9's "out of scope" line, which is already flagged.
