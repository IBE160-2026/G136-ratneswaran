---
title: 'Story 3.7: Join through the invitation link'
type: 'feature'
created: '2026-10-26'
status: 'done'
route: 'dispatch'
baseline_commit: '2dbc6deed2c84d0eca4c4f9b97363fe78d4a667f'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 3.6 hands the Organizer a link `/api/invite/{token}`, but nothing answers it: an invited Role-holder cannot verify who they are, join, or reach the Event.

**Approach:** A GET-only route swaps the token for an `httpOnly` cookie and redirects to `/invite`. That page sends a new invitee through email OTP and then a password, and sends an existing account to log in. A system function, called with the secret key, attaches the membership only for the invited user and consumes the token. The member lands on `/events/{id}`.

## Boundaries & Constraints

**Always:**
- `GET /api/invite/[token]` only runs `limit("invite", {token})`, sets the cookie (`invite_token`, httpOnly, sameSite lax, secure outside dev, path `/`, 1 h) and redirects to `/invite`. Every response sets `Referrer-Policy: no-referrer`. `/invite` sets it too and loads no third-party assets.
- The page reveals only the token's own invitee. Unknown, used and revoked tokens look alike: "This invite has already been used. Log in instead." A cancelled or ended Event shows the expiry text ("ask {Organizer} for a new link" without a name, since no name is known before validation).
- A password is accepted only within an OTP session (`verifyOtp` type `email`) and follows `passwordSchema`. Name and email are shown read-only.
- The join attaches only when the session user is the token's `user_id` and that user's `email_confirmed_at` is set. The function makes this check once; no RLS policy compares email.
- Server Actions return `Result`; text lives in `messages/{nb,en}.json`; logs hold ids only.

**Never:** a Supabase magic or confirmation link in the invite flow; state change on GET; the secret key outside `src/modules/events` invite code; a second auth user; email in any policy.

## I/O & Edge-Case Matrix

| Scenario | State | Result |
|---|---|---|
| New invitee | valid token, no password, no OAuth identity | code sent → code verified → password set → joined → `/events/{id}` |
| Existing account | user has a password or an OAuth identity | "Log in to join" → `/login?next=/invite` (or Google/GitHub) → *Join* → `/events/{id}` |
| Signed in as another user | session ≠ token user | "This invite was sent to another email address." plus *Log out*; nothing changes |
| Used, revoked or unknown | — | used text; cookie cleared |
| Event cancelled or ended | — | expiry text; cookie cleared |
| No cookie on `/invite` | — | used text |
| Rate limited (GET or send code) | over the `invite` buckets | `invite.errors.rateLimited` |
| Wrong or expired code | — | field error, can resend |
| Double submit of *Join* | token already consumed by this user | idempotent: lands on the Event |

**Decisions (owner, 2026-10-26):**
- The interim home must render for a joined member. 3.7 adds `events_select_member` on `events`: `exists` over `role_members` with `user_id = (select auth.uid())` and `joined_at is not null`, compared directly, with no helper. The *Publish* banner shows only to the Organizer. The sidebar, the Role label and the Organizer-only-page message stay in 3.10.
- Keep the full spec; the token overrun is accepted.

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261025120000_invite_tokens.sql:82` -- `invite_tokens_validate(token, kind, event)`. Its lookup is reusable, but kind and Event must already be known.
- `supabase/migrations/20261026120000_role_members.sql` -- `role_members` (`joined_at` null = pending, `email`, `name`), `role_membership_log` actions, definer-function style.
- `src/modules/events/actions.ts:233` -- `inviteToRole`. It calls `createUser` without `email_confirm`, so OTP to that user sends the signup *confirmation link*, not a code (verified locally).
- `src/lib/supabase/admin.ts` -- `createAdminClient()`, reserved for this exchange. `src/lib/lint-ad5.test.ts` guards client imports.
- `src/lib/limit.ts` -- `limit("invite", {token}, errorsPrefix)`. The `invite_ip`/`invite_token` buckets already exist.
- `src/modules/auth/schemas.ts:12,49` -- `passwordSchema`, `safeNext`. `actions.ts:149,253` -- the `updateUser({password})` error mapping to copy.
- `src/modules/auth/actions.ts:129` + `app/auth/callback/route.ts` -- OAuth start deletes `oauth_next`, and the callback treats `oauth_next` as a *link* flow. Sign-in return needs its own cookie.
- `app/login/page.tsx`, `app/oauth-buttons.tsx` -- `next` handling on the login page.
- `app/events/[eventId]/page.tsx`, `load-event.ts` -- the interim home and `PublishBanner`.
- `supabase/config.toml:234-257` -- `enable_confirmations`, `otp_length = 6`, commented template blocks. CI runs only `db push`, so cloud auth templates are never synced.
- `e2e/support.ts` -- `MAILPIT`, `mailLink`, `signedIn`, `psql`, `seed`, `unique`. `e2e/team-invite.spec.ts` -- reading the link and setting a per-test `x-forwarded-for`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20261027120000_invite_join.sql` -- the following, all system functions `revoke … from public, anon, authenticated` unless stated:
  - `invite_tokens_lookup(p_token)`: validate's body without the kind/Event check. Recreate `invite_tokens_validate` on top of it, so the rule exists in one copy.
  - `events_invite_preview(p_token)`: status, plus for a valid `role_holder` the event id, the Event name, the Role key, the member's name and email, and `has_account` (non-empty `encrypted_password`, or an identity whose provider is not `email`).
  - `events_join_role(p_token, p_user_id)`: lock the token row; on a consumed token whose user and member are already joined, return `joined`. Otherwise `invalid`/`used`/`expired`; then `mismatch` unless the user matches and the email is confirmed; set `joined_at`, `consumed_at`, revoke guest tokens, log `joined` with actor = the user, return the event id.
  - The `events_select_member` policy (Decisions).
- [x] `supabase/tests/invite_join.test.sql` -- pgTAP for every matrix row at the SQL surface. `authenticated` and `anon` are refused execute. The function makes no change for mismatch, unconfirmed, used, expired or wrong kind. Validate is unchanged for 3.5's cases. Policy allow (joined) and deny (pending, stranger).
- [x] `src/types/database.ts` -- regenerate.
- [x] `src/modules/events/actions.ts` -- `inviteToRole`'s `createUser` gets `email_confirm: true`. Update its test.
- [x] `src/modules/events/join.ts` (`"use server"`) + `schemas.ts` -- actions `sendJoinCode`, `verifyJoinCode` (`verifyOtp`), `setPasswordAndJoin` (`passwordSchema` → `updateUser` → join), `joinEvent` and `leaveAndRetry` (sign out). Each reads the cookie, uses the preview for the email (never client input) and the admin rpc for the join, clears the cookie and redirects on `joined`. `sendJoinCode` calls `limit("invite", {token})` then `signInWithOtp({shouldCreateUser:false})`.
- [x] `src/modules/events/join.test.ts` -- Vitest: the email always comes from the preview; join only after the password is saved; codes map to keys; no email in logs.
- [x] `app/api/invite/[token]/route.ts` -- GET as in Always.
- [x] `app/invite/page.tsx` + `app/invite/join-flow.tsx` -- server page picks the state (matrix) from the preview and `getClaims`; client steps: send code → code (6 digits) → password; log in; join; mismatch. Set `Referrer-Policy` via `next.config.ts` `headers()` for `/invite` and `/api/invite/:path*`.
- [x] `src/modules/auth/actions.ts`, `app/auth/callback/route.ts`, `app/oauth-buttons.tsx`, `app/login/page.tsx` -- OAuth sign-in carries `next` in a separate `login_next` cookie (via `safeNext`). `oauth_next` keeps its link meaning.
- [x] `app/events/[eventId]/page.tsx` -- `PublishBanner` only for the Organizer.
- [x] `supabase/config.toml` + `supabase/templates/magic_link.html` -- OTP email shows `{{ .Token }}` and no link.
- [x] `messages/en.json`, `messages/nb.json` -- `invite.*`.
- [x] `e2e/support.ts` (`mailCode`) + `e2e/invite-join.spec.ts` -- new invitee: invite → open link → URL has no token → code → password → lands on the Event (UJ-1, Role-holder part); existing account: log in → join; used link shows the used text.

**Acceptance Criteria:**
- Given the Organizer's People list after a join, when it renders, then the row is joined and Access history shows `joined` with the member as actor.
- Given an existing account that joins, when it is done, then `auth.users` has no new row for that email.

## Review Triage Log

### 2026-10-26 — Review pass 1 (blind, edge-case, verification-gap)

| # | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|
| 1 | Invitees created by 3.6 (unconfirmed, Auth's random password, no `password_pending`) get `has_account = true` and a `mismatch` join; no backfill and no pgTAP row (blind, edge, verification-gap) | medium | The preview rule reads the marker that only new invitees get; `events_join_role` requires `email_confirmed_at` | patch: backfill pending, never-signed-in invitees in the migration, plus a pgTAP row |
| 2 | `Ended` calls `forgetInvite` on mount; the cookie delete refreshes the route, so the expired text flips to the used text | medium | A Server Action that mutates cookies re-renders the route; with no cookie, `readInvite` returns `used` | patch: keep the first message in state |
| 3 | `verifyJoinCode` has no app limit, so a forwarded link lets a 6-digit code be brute-forced across IPs within its 1 h life, then a password set | medium | The only limit is GoTrue's per-IP `token_verifications = 30`/5 min | patch: `limit("join_code", {token})` before `verifyOtp` |
| 4 | `sendJoinCode` runs the admin preview before `limit` | low | Each retry with a dead cookie costs an admin RPC; reordering is a direct correction | patch |
| 5 | The pgTAP comment says the Organizer still sees the Event but nothing asserts it; the pending check relies on claims set far above | low | Verified in `invite_join.test.sql`; a direct correction | patch |
| 6 | No test that a joined member on a draft Event sees no *Publish* banner | medium (gap) | The e2e seeds a published Event, so removing the guard passes every test | patch: e2e on a draft Event |
| 7 | No test for the mismatch state or its *Log out* (cookie kept) | medium (gap) | No hits for `Mismatch`/`leaveAndRetry` in tests | patch: e2e |
| 8 | No check that `next` reaches the OAuth form on `/invite` | low (gap) | Only both ends are unit-tested | defer |
| 9 | Cloud magic-link template must be applied by hand, untracked | medium | CI runs only `db push` | defer |
| 10 | Possible RLS recursion `events` ↔ `role_members` | false | 442 pgTAP tests, including the 3.6 Organizer reads of `role_members` and the new member/Organizer reads, pass; local probe with rows returned correct counts | reject |
| 11 | `email_exists` user who signed up but never confirmed is stuck | low | Rare; the fix needs a new branch | reject |
| 12 | Forgot-password before joining leaves `password_pending` set, so the flow asks for a password again | low | Only the invitee is affected, and they choose a new password; clearing elsewhere needs the secret key outside AD-5's places | reject |
| 13 | `login_next` set without `secure`, and also when there is no `next` | low | Matches the existing `oauth_next` pattern | reject |
| 14 | A repeat *Join* or password submit after the cookie is gone shows the used text | low | Only from a stale tab after a successful join; concurrent double submits both reach the idempotent SQL | reject |
| 15 | Mismatch decided by email, not user id (email changed after the invite) | low | Needs a signed-in invitee who changed their email in between; rare | reject |
| 16 | An existing account can use the code path | false | The code only goes to the invitee's inbox; no harm | reject |
| 17 | e2e `token()` called twice in the same millisecond | low | Shares a bucket at 2 of 3 hits; the test still holds | reject |
| 18 | Template hardcodes "one hour"; the comment scopes it to 3.7 | low | Cosmetic | reject |
| 19 | Spec does not describe `password_pending`, `updateUserById` or `same_password` | — | The fix edits this spec | reject (reported to the owner) |
| 20 | No `docs/ki-logg.md` entry or reflection entry in the diff | — | Delivered at PR time, outside the code review | reject |

## Design Notes

Confirming the invitee's email at invite time is safe and needed. It is safe because a session can only come from the inbox (OTP), an OAuth provider that verifies the email, or a password, and an invitee has no password. It is needed for two reasons. First, GoTrue answers OTP for an unconfirmed user with a confirmation *link*. Second, `signUp` on an unconfirmed user may set a password, which is the pre-account-takeover risk.

The cloud project does not get `config.toml` templates through CI. The owner must apply the magic-link template to the cloud project (outside this story) before invitations work there.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- all pass
- `pnpm lint && pnpm format:check && pnpm test` -- pass
- `supabase stop && supabase start` (template change), then `pnpm test:e2e` -- invite-join and existing specs pass
