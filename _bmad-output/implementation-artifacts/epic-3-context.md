# Epic 3 Context: Team and invitations

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

An Organizer builds the Team for an Event: they invite people to Roles with a secure link they copy and share themselves, appoint one Role lead per Role, and change or revoke access. Every invitee joins through the single invite system, and a Role-holder sees only what their Role allows, enforced in the database. This is the RBAC foundation that Tasks (Epic 4), the Dashboard (Epic 5) and Guest invitations (Epic 7) build on. Application email (outbox, delivery, language, retry, Stories 3.1–3.4) is Target 3 and is not built in Core.

## Stories

- Story 3.1: Outbox and `notifications_emit` (Target 3)
- Story 3.2: Delivery route and trigger (Target 3)
- Story 3.3: Email in the recipient's language (Target 3)
- Story 3.4: Retry, pacing and visible queue (Target 3)
- Story 3.5: Invitation tokens and rules
- Story 3.6: Invite someone to a Role
- Story 3.7: Join through the invitation link
- Story 3.8: Role lead
- Story 3.9: Change or revoke a Role
- Story 3.10: The Role-holder's scoped view

## Requirements & Constraints

- Only the Organizer can assign, change or revoke a Role-holder's Role, and set the Role lead. Several Role-holders can share a Role; a person can hold several Roles. Exactly one Role lead per Role (zero allowed, never two).
- Revoking a Role removes access immediately: the next request returns nothing from that Role. A person with no remaining Role and no Guest link no longer sees the Event.
- A Role-holder is invited by a unique link that pre-fills name and email. In Core there is no application email: the link is shown once to the Organizer with *Copy link*. The only emails sent in Core are Supabase Auth's own (one-time codes, confirmations, resets).
- RBAC must hold under test: no user acts outside their Role, every rule is enforced by RLS, column grants and SQL functions, never only in the UI.
- Abuse limits on public token routes: 5/minute per IP and 3/hour per email or token, using the existing Postgres-backed limiter with each flow in its own bucket (`<flow>_ip`, `<flow>_email`). An Organizer may create at most 30 invitations per day; hitting the cap gives a clear message, not an error.
- Invite tokens: 256-bit random, stored only as SHA-256, compared in constant time, revocable, valid until `events.ends_at` (read at use). Rejection messages must never reveal which Events or emails exist.
- Logs and access history store ids only, never names or emails.
- Target 3 hooks (emailed invitation, "Couldn't deliver", `team(event)` notification on cancel/delete) are noted but not built; until then `notifications_emit` is a no-op stub.

## Technical Decisions

- **Ownership:** `invite_tokens`, `role_members`, `role_membership_log` belong to the events module. Only events-module code writes them.
- **Mutations:** multi-step changes are single `security definer` Postgres functions with `search_path = ''`, called from Server Actions under the user's session (`events_set_role_lead`, `events_revoke_role`, plus the invite-creation and exchange functions). Mutation functions authorise from `auth.uid()` and the helpers, never from a caller-supplied user id; system functions (token exchange) are revoked from `public, anon, authenticated`.
- **Grants:** `authenticated` has no `SELECT` on `invite_tokens`; no direct INSERT/UPDATE/DELETE on membership or log tables; a direct write of the lead flag is denied.
- **Invariants as constraints:** one lead per Role via a partial unique index, swapped in one statement; `(role_id, user_id)` unique on memberships; `role_membership_log` is append-only (actions `invited`, `joined`, lead change, `revoked`) with `ON DELETE SET NULL` FKs.
- **RLS:** policies use `is_organizer`, `holds_role`, `is_guest_of`, `is_guest_self`; on `role_members` (which `holds_role` reads) the policy compares `user_id = (select auth.uid())` directly to avoid recursion. `holds_role` is `STABLE`, `search_path = ''`. Never match on email in a policy. Holders of any Role cannot read `guests` rows (counts only).
- **Invite system:** one table `invite_tokens` with `kind ∈ {guest, role_holder, shared_event}`, one exchange route `app/api/invite/[token]`. Invitees are created as passwordless Supabase Auth users at invite time. `invite_tokens_revoke_for_user(user_id)` revokes a user's guest tokens in the same transaction when they are added to a Role (reused by Epic 7). Supabase magic links are never used as invite links.
- **Join flow security:** `GET` on the invite route changes no state (link scanners); it sets `Referrer-Policy: no-referrer`, loads no third-party assets, swaps the token for a short-lived `httpOnly` cookie and redirects to a token-free URL. New accounts verify the email with a Supabase Auth email OTP (`signInWithOtp` + `verifyOtp`) before a password can be set. The membership attaches only if the verified email equals the invited email, compared once inside the exchange function.
- **Secret key:** `SUPABASE_SECRET_KEY` only in the invite exchange route and invitee user creation; never in a client component.
- **Epic 4 seams:** `events_set_role_lead` will later call `tasks_assign_role_owned_to_lead`; `events_revoke_role` will call `tasks_release_owner`. Leave a marked call site.
- **Conventions:** Zod-parsed Server Actions returning `{ ok, data } | { ok: false, error: { code, message } }` with a next-intl key; server auth via `auth.getClaims()`; every policy, grant and function gets a pgTAP allow and deny; UI text in `messages/nb.json` and `messages/en.json`.

## UX & Interaction Patterns

- **Team & Roles:** the Organizer activates Roles, invites (name, email, Role, confirm the address), sets the Role lead, revokes. Others see who is on the Team and who leads each Role. Pending invites show "Invited · not joined yet" with *New link* and *Correct email*. A Role without a lead shows "No lead yet". An "Access history" list shows the membership log.
- Invite result shows the link once with *Copy link* and "Send this link to {name}".
- *Revoke* needs a confirmation dialog (outward action); other actions use Undo toasts rather than "Are you sure?".
- Revoked mid-session: `role="alert"` toast "Your access to {Role} was changed by {Organizer}", then redirect.
- Organizer-only route opened by URL: "You don't have access to this part of the event. Ask {Organizer} if you need it." with no data. Sidebar items outside the viewer's Role are not rendered.
- Used/expired invite: "This invite has already been used. Log in instead." or an expiry message to ask the Organizer for a new link. An invite to an existing account requires login (or Google/GitHub) first, then join, with no second user.
- *All events* shows the Event with the holder's Role label.

## Cross-Story Dependencies

- 3.5 (tokens, revoke helper, limits) underpins 3.6 and 3.7; 3.6 creates the memberships 3.8–3.10 act on; 3.7 adds the Playwright invite-to-join test (UJ-1 Role-holder part); 3.10 adds the team part of UJ-1.
- Depends on Epic 1 (accounts, password rules, OAuth, rate limiter) and Epic 2 (events, Roles from the Branch Pool, publish, cancel/delete).
- Epic 4 wires Task ownership into the lead and revoke functions; Epic 7 reuses the invite system and `invite_tokens_revoke_for_user` for guest tokens; Stories 3.1–3.4 (Target 3) replace the stub `notifications_emit` and add emailed invitations.
