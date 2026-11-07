---
title: 'Story 7.1: Personal guest link'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: '8be81ca9a0797d4a6f91a17a6c94a4073af09a82'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-7-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      A guest session can set a password or link an OAuth identity and so keep the account after New link.
    evidence: |-
      supabase/config.toml has secure_password_change = false and enable_manual_linking = true, so
      auth.updateUser({ password }) or linkIdentity() from a link holder's guest session succeeds. The
      user then stops being guest-only, so New link no longer ends that session and the holder can sign in
      again. Blocking it in a trigger would also block the AD-6 upgrade and Story 7.6; the fix needs an
      Auth-setting or planning decision by the owner (bmad-correct-course).
    location: >-
      supabase/migrations/20261107120000_guest_links.sql (invite_tokens_password_changed)
    severity: high
---

<intent-contract>

## Intent

**Problem:** Guests on the Guests list cannot be invited: there is no guest identity, no guest token and no guest path through the one exchange route, so the Organizer has nothing to share.

**Approach:** The Organizer copies a personal link per guest (or the invitation text, or all links). Copying finds or creates a passwordless guest-only auth user (secret key, invitee creation), sets `guests.user_id` and returns the guest's one active `guest` token. Opening the link lands token-free on `/invite`, which greets the guest; *Continue* (POST) issues a Supabase session only for a guest-only user, otherwise asks them to log in.

## Boundaries & Constraints

**Always:**
- Token: 256 bits, base64url 43 chars, only `sha256` in `invite_tokens`, lookup by hash. At most one active (`revoked_at is null`) guest token per `(event_id, user_id)`, enforced by a partial unique index; concurrent copies are serialised by locking the guest row.
- *Copy link* is repeatable and returns the same link while it is active: the token is `HMAC-SHA256(vault key, token id)`, so it can be re-derived without storing it. *New link* (confirmed) revokes every earlier token of that guest and, for a guest-only user, deletes their `auth.sessions` in the same transaction.
- `GET /api/invite/[token]` stays unchanged: no session, token to a 1-hour `httpOnly` cookie, URL cleaned, `invite` limiter. *Continue* has its own limiter bucket (`guest_open`: 5/min/IP, 3/h/token).
- Guest-only (no usable password, no non-email identity, no `role_members` row, organizes no Event) is decided once, in SQL (`guests_is_guest_only`), never in a policy. A usable password is a non-empty hash without `app_metadata.password_pending = true`; a trigger on `auth.users` clears the marker and revokes guest tokens whenever the password changes (AD-4 revocation).
- Rejection copy carries no Event or email: unknown, malformed, other kind, removed guest → `guestLink.invalid`; revoked → `guestLink.revoked` with the Organizer's name (generic copy when the Organizer has no name).
- Secret key only in the guests link actions (invitee creation, exchange) and existing AD-5 places; never in a client component.
- Logs carry ids and codes only; no guest name or email.

**Never:**
- No emailed link, no Supabase magic link handed to anyone (the admin-generated hash is verified server-side at once), no session from a GET, no email match in a policy, no direct `INSERT/UPDATE/DELETE` grant on `guests`.
- No RSVP, Guest Dashboard or Guests-tab summary (Stories 7.3, 7.5, 7.7); no placeholders for them.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First copy | guest, no auth user | user created (confirmed, `password_pending`), `user_id` set, token returned, row "Link copied · not opened" | createUser `email_exists` → retry the call |
| Double click | two concurrent copies | one user, one active token, both get the same link | none |
| Existing account | email of a Role-holder/Organizer | that user attached, link created; *Continue* asks to log in, email prefilled | none |
| New link | confirm | old tokens revoked, guest-only sessions deleted; old link: "This link is no longer active. Ask {Organizer} for a new one." | — |
| Open valid | GET then `/invite` | "Hi {first name}, this is your invitation to {Event}." + *Continue* + "Not {first name}? …" | rate limit → `invite.errors.rateLimited` |
| Continue, guest-only | POST | session for the token's user, `first_opened_at` set once, `/invite` shows the signed-in greeting | session user ≠ token user → sign out, unavailable |
| Signed in as someone else | valid link | greeting + "signed in with another account" + *Log out*; no Continue | — |
| Cancelled / ended | valid token | cancelled text + Organizer's note / "Thanks for coming!", read-only, no Continue | — |
| Deleted Event | token gone by cascade | generic `guestLink.invalid` | — |

</intent-contract>

## Code Map

- `supabase/migrations/20261025120000_invite_tokens.sql`, `20261027120000_invite_join.sql` -- `invite_tokens` (events-owned), `invite_tokens_lookup`, `invite_tokens_revoke_for_user`, `events_invite_preview`; read-only, reuse.
- `supabase/migrations/20261020090000_guests.sql`, `20261020120000_guests_update_remove.sql` -- `guests`, `guest_contacts`, `guests_select` (Organizer), `guests_update`, `guests_remove`; guests owns them.
- `supabase/migrations/20261030130000_role_member_contacts.sql:22` -- `events_invite_to_role`: P0002-then-createUser pattern and `lower(u.email)` user lookup to mirror.
- `src/modules/events/actions.ts:276` `inviteToRole` -- createUser with `email_confirm` + `password_pending`, `email_exists` tolerated, retry.
- `app/api/invite/[token]/route.ts`, `src/modules/events/invite.ts` (`INVITE_COOKIE`, `readInvite`), `src/modules/events/join.ts`, `app/invite/page.tsx`, `app/invite/join-flow.tsx` (`Ended`, `Mismatch`, `leaveAndRetry`, `forgetInvite`) -- the one exchange path; extend `/invite` with the guest branch.
- `src/lib/limit.ts` -- add flow `guest_open`.
- `src/lib/status.ts`, `src/components/status-label.tsx` -- add `linkCopied`, `opened`.
- `app/events/[eventId]/guests/{page,guest-list,guest-rows}.tsx` -- list rows gain the copy menu; `team/people-list.tsx` `RevokeButton` is the confirm-dialog pattern; `team/invite-form.tsx` `InviteLink` the clipboard-fallback pattern.
- `app/login/form.tsx` `LogInForm` -- add optional prefilled `email`.
- Local GoTrue facts (probed): `admin.createUser` without password stores a random bcrypt hash; `admin.generateLink({type:"magiclink"})` returns `properties.hashed_token`, and `verifyOtp({type:"magiclink", token_hash})` returns a session, sending no email.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/20261107120000_guest_links.sql` -- `guests.user_id` (→ auth.users set null) + `first_opened_at`; unique `(event_id, user_id)`; index on `user_id`; `guests_select_self` policy (`user_id = (select auth.uid())`); `is_guest_of`/`is_guest_self` (stable invoker, `search_path=''`, granted to authenticated); vault secret `guest_link_key`; events system fns `invite_tokens_guest_token(id)`, `invite_tokens_guest_link(event, user, renew)`, `invite_tokens_revoke_guest(event, user)`; password trigger on `auth.users`; partial unique index; guests fns `guests_is_guest_only(user)` (system), `guests_copy_link(guest, renew)` (mutation, Organizer, read-only refused 55000, P0002 when no auth user), `guests_link_preview(token)` and `guests_open_link(token)` (system); `create or replace guests_update` (email change → revoke + null `user_id`) and `guests_remove` (revoke).
- `src/types/database.ts` -- regenerate.
- `supabase/tests/guest_links.test.sql` -- allow + deny for every new policy, grant, helper and function; RLS isolation (other guest, other Event, `invite_tokens`), no direct writes, one active token, renew ends sessions, trigger, FK actions.
- `src/modules/guests/link.ts` (server only) + `src/modules/guests/link-actions.ts` (`"use server"`): `copyGuestLink`, `openGuestLink`, and the invitation text in `events.language`.
- `src/modules/guests/link-actions.test.ts` -- each rejection copy, the session path, the sign-in path, user creation retry.
- `app/invite/page.tsx`, `app/invite/guest-flow.tsx` -- guest branch; `src/modules/events/invite.ts` -- unknown token reads `invalid` (generic copy).
- `app/events/[eventId]/guests/*` -- copy menu (*Copy link*, *Copy invitation text*, *New link* with confirm), *Copy all links* with progress, row state labels.
- `messages/en.json`, `messages/nb.json` -- all new copy.
- `e2e/guest-link.spec.ts`; update `e2e/invite-join.spec.ts` unknown-link text.

**Acceptance Criteria:**
- Given the Guests page, when I choose *Copy link*, then the clipboard holds `/api/invite/<43 chars>` and the row reads "Link copied · not opened"; a second copy gives the same link.
- Given *Copy all links* with more than 500 guests, then nothing is created and a message says the limit; otherwise one tab-separated line per guest is copied after batches of 5 with a progress line.
- Given a guest session, when it queries `guests`, `guest_contacts` or `invite_tokens` through PostgREST, then it sees only its own `guests` row and nothing else, and cannot write `guests`.

## Spec Change Log

## Review Triage Log

### 2026-11-07 — Review pass
- verdicts: 39 findings — high 1, medium 10, low 24, false 4, maybe-false 0
- findings:
  - `[medium]` `[patch]` (blind) a changed email keeps `first_opened_at`, so the new address reads "Opened" — `guests_update` clears it with `user_id`.
  - `[low]` `[reject]` (blind) `first_opened_at` is written before the session is verified — only a failed `verifyOtp` or a hand-posted action reaches it; the fix needs a second system call.
  - `[medium]` `[patch]` (blind) real-account guests never reach "Opened" — `guests_open_link` records the first open for `sign_in` too.
  - `[low]` `[reject]` (blind) *New link* also ends the guest-only user's sessions for other Events — the AC requires ending "that user's sessions"; Supabase sessions are per user, not per Event.
  - `[high]` `[defer]` (blind) a link holder with a guest session can set a password (`secure_password_change = false`) or link an OAuth identity (`enable_manual_linking = true`) and keep the account after *New link* — real; blocking it breaks the AD-6/7.6 upgrade paths and the fix needs an Auth-setting or planning decision the owner must take (cloud Auth config is dashboard-only).
  - `[low]` `[reject]` (blind) a password change makes old links say "no longer active" — AD-4 mandates the revocation; rare.
  - `[low]` `[reject]` (blind) clipboard write after an await may be refused on Safari — the spec's read-only fallback field handles it; a ClipboardItem promise adds branching.
  - `[medium]` `[patch]` (blind) *Copy all links* is not parallel because Next runs a client's Server Actions in sequence, and first copies revalidate per guest — new `copyGuestLinks` batch action, parallel server-side, one revalidation per batch.
  - `[low]` `[reject]` (blind) `sign_in` returns the guest's email to the link holder — the AC requires the email prefilled.
  - `[low]` `[patch]` (blind) a reload of a cancelled or ended invitation shows the invalid text — cancelled/ended no longer drop the cookie.
  - `[false]` `[reject]` (blind) the link host comes from the Origin header — the same pattern as the auth actions; previews share the demo database by AD-20.
  - `[low]` `[reject]` (blind) no `docs/ki-logg.md` entry — added at finalisation, not code.
  - `[low]` `[reject]` (blind) reflection-note offer for HMAC, session minting and renew — offered to the owner in the final report (append-only file, owner's choice).
  - `[medium]` `[patch]` (blind) untested paths: sign_in, other account, email change, renew cross-Event, missing Origin — e2e added for sign_in and other account; email change covered by pgTAP; the rest rejected (by design / trivial).
  - `[low]` `[patch]` (blind) `guests_is_guest_only` evaluated twice in `guests_open_link` — computed once.
  - `[low]` `[reject]` (blind) `MAX_COPY_ALL` repeats a budget — no shared constant exists to import.
  - `[false]` `[reject]` (blind) `failed && !failed.ok` is redundant — needed for TypeScript narrowing of the union.
  - `[low]` `[reject]` (blind) progress never shows total of total — the copied message replaces it at once.
  - `[low]` `[reject]` (blind) over-cap message only after a click — matches the AC ("is limited to 500"); disabling hides the reason.
  - `[low]` `[reject]` (edge) cross-Event logout on renew — same as above.
  - `[low]` `[reject]` (edge) an unpublished draft with a past `ends_at` copies a link that reads ended — the AC reads validity from `ends_at` at use; rare.
  - `[low]` `[reject]` (edge) open recorded before session — same as above.
  - `[low]` `[reject]` (edge) label from `user_id` while a role add or password change revoked the token — rare; row states belong to Story 7.7.
  - `[medium]` `[patch]` (edge) sign_in never "Opened" — same patch as above.
  - `[low]` `[reject]` (edge) password reset of a real-account guest revokes their links — AD-4 rule.
  - `[medium]` `[patch]` (edge) `guests_update` reads the guest without a lock, racing `guests_copy_link` — `for update` added.
  - `[low]` `[patch]` (edge) heading flips after `forgetInvite` refresh — same cookie patch.
  - `[false]` `[reject]` (edge) *Copy all links* with zero guests — `GuestRows` returns the empty text before rendering `CopyAllLinks`.
  - `[medium]` `[patch]` (verification-gap) sign_in prefill and other-account views untested — e2e added.
  - `[medium]` `[patch]` (verification-gap) copy-all cap, failure and clipboard fallback untested — e2e for fallback and the 501-guest cap; batch action Vitest.
  - `[medium]` `[patch]` (verification-gap) race e2e order not forced — second copy starts only once the first holds the lock.
  - `[medium]` `[patch]` (intent) the generic rejection copy differs from the AC's literal text — `guestLink.invalid` now reads the AC text, with a Vitest pinning each rejection to it.
  - `[low]` `[reject]` (intent) the deleted-Event text is not shown — `invite_tokens.event_id` is `on delete cascade` (Story 3.5), so no token of a deleted Event exists; the copy belongs to the session pages of Story 7.5.
  - `[low]` `[reject]` (intent) the 500 cap is client-side only — each call is per guest; the cap is a UX bound.
  - `[low]` `[reject]` (intent) `link.ts` has no `server-only` guard — the package is not installed; the AD-5 lint rule guards direct imports and only server files import it.
  - `[low]` `[patch]` (intent) cross-Event deny proven only indirectly — pgTAP asserts a guest reads no `events` and a one-Event guest sees only their row.
  - `[false]` `[reject]` (intent) a role token falls through to the role flow — it is a valid Role invitation, which the one exchange route must serve (AD-4).
  - `[low]` `[reject]` (intent) the createUser race is only mocked — `email_exists` handling is the same as Story 3.6's, and the DB race is proven.
  - `[low]` `[reject]` (intent) HMAC derivation and guest-only-only session end go beyond the literal wording — recorded in Design Notes; offered for a reflection note.

## Design Notes

- Why HMAC: the AC needs a link that can be copied again (per guest, in the invitation text, in *Copy all links* after a failure) while storing only its hash. Deriving the token from the row id with a vault-held key makes the link reproducible; anyone able to read the vault already holds the secret key, so nothing new is exposed. A database dump without the vault key reveals no link.
- Session minting: there is no admin "create session" API; `generateLink` + immediate server-side `verifyOtp` is the narrowest path, the hash never leaves the server, and the resulting session user id is checked against the token's user.
- Access tokens already issued stay valid up to `jwt_expiry` (3600 s) after *New link*; refresh fails at once because the session row is gone.
- The organizer of a guest who is also a Role-holder does not log that person out with *New link*: their sessions never came from a link.
- Token derivation in SQL: `translate(encode(extensions.hmac(id::text, <vault decrypted_secret 'guest_link_key'>, 'sha256'), 'base64'), '+/=', '-_')` (43 chars, matches `inviteTokenSchema`). The migration creates the secret with `vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'guest_link_key', …)`. All events/guests system functions are `security definer`, `search_path = ''`, `REVOKE EXECUTE … FROM public, anon, authenticated`; the trigger function likewise (GoTrue's role must be able to fire it).
- `guests_copy_link`: lock the guest row `for update`, authorise `is_organizer` (unknown guest = 42501), refuse cancelled/ended (55000, same rule as `guests_add`), find the user by `lower(email)` from `guest_contacts` (none → P0002), when `guests.user_id` differs revoke the old user's guest tokens and set it, on renew delete `auth.sessions` of a guest-only user, then return `invite_tokens_guest_link(...)`.
- `guests_link_preview(p_token)` returns `status` ∈ `valid | revoked | cancelled | ended | invalid | other_kind` plus `event_id, user_id, guest_name, event_name, organizer_name (raw_user_meta_data->>'name'), cancellation_note`, filled only as each status allows (invalid/other_kind: nothing; revoked: organizer only). A token whose guest row for `(event_id, user_id)` is missing reads `invalid`. Order: unknown → other kind → revoked → guest missing → cancelled → ended (`ends_at < now()`) → valid.
- `guests_open_link(p_token)` returns `status` ∈ preview statuses but `valid` becomes `session` (guest-only; sets `first_opened_at = coalesce(first_opened_at, now())`) or `sign_in`, with `user_id` and the user's `email` only for those two.
- `/invite` order: `?error` → guest preview (admin) → if `invalid`, generic `guestLink.invalid` (also when no cookie); if `other_kind`, the existing role flow (`readInvite`) unchanged; otherwise the guest view. Guest view: valid + no session → greeting, *Continue* form, "Not {first}? Ask {Organizer} for your own link."; valid + session of the token's user → greeting + signed-in line; valid + other session → greeting + `Mismatch`-style *Log out*; *Continue* returning `sign_in` shows `LogInForm` with the email prefilled and `next=/invite`; cancelled/ended/revoked/invalid show their text and drop the cookie (reuse `Ended`'s pattern without its log-in link).
- Invitation text: built in the action with next-intl `createTranslator` on `messages/<events.language>.json` (fallback `en`), date with `Intl.DateTimeFormat(language, { dateStyle: "long", timeZone })`, a no-date variant for Events without `starts_at`. The action reads the Origin header (as `src/modules/auth/actions.ts` does) to build `${origin}/api/invite/${token}` and returns `{ link, text }`.
- *Copy all links*: client loops in batches of 5 through `copyGuestLink`, progress line in a `role="status"`, lines `name\temail\tlink`; a failure stops with an error and a retry runs the whole list again (idempotent). On a refused clipboard, show the text in a read-only field to select (as `InviteLink`).
- Copy menu only on the Guests page (`GuestList` prop), not in wizard step 2; hidden when read-only. Row label: no `user_id` → `notInvited`, `first_opened_at` null → `linkCopied`, else `opened`.
- Work on the current branch in small one-concern commits `7.1: <what and why>` with the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer; never push; never skip hooks.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- all pgTAP pass
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test` -- pass
- `pnpm test:e2e e2e/guest-link.spec.ts e2e/invite-join.spec.ts e2e/guests.spec.ts` -- pass

## Auto Run Result

Status: done

**Summary:** Organizer copies a personal guest link (single, invitation text in the Event's language, or all links in batches of 5); the copy finds or creates a passwordless guest-only user with the secret key and returns the guest's one active token, derived by HMAC from a vault key so it can be copied again while only its SHA-256 is stored. `/invite` greets the guest; *Continue* (POST, own `guest_open` limiter bucket) mints a session only for a guest-only user, otherwise shows a log-in with the email prefilled. *New link* revokes and ends a guest-only user's sessions in one transaction. Revoked, cancelled, ended and invalid states have their own copy.

**Files:** `supabase/migrations/20261107120000_guest_links.sql` (columns, policy, helpers, vault key, token/link/open functions, password trigger, guests_update/remove), `supabase/tests/guest_links.test.sql` (pgTAP), `src/modules/guests/link.ts` + `link-actions.ts` (+ test), `app/invite/page.tsx` + `guest-flow.tsx`, `app/events/[eventId]/guests/copy-menu.tsx` + list/rows/page, `app/login/form.tsx` (email prefill), `src/modules/events/invite.ts`/`join.ts` (unknown token = generic copy), `src/lib/limit.ts`, `src/lib/status.ts`, `messages/*.json`, `e2e/guest-link.spec.ts`, `e2e/guest-link-race.spec.ts`, `e2e/invite-join.spec.ts`, `src/types/database.ts` (regenerated).

**Review:** 39 findings (high 1, medium 10, low 24, false 4). Patched: 10 medium + 4 low (email change clears open mark and locks the row, first open recorded for sign_in too, batch action for real parallel copy-all, cancelled/ended keep the cookie, AC's exact invalid copy with Vitest, cross-Event pgTAP, four new e2e, forced race order). Deferred: 1 high (password/identity takeover from a guest session; owner decision). Rejected: 24 with reasons in the triage log.

**Follow-up review:** recommended (true): 10 medium entries were patched in a second pass that only targeted tests ran on; the deferred high risk is unresolved by design.

**Verification:** lint, format:check, tsc pass; Vitest 479/479; `supabase db reset` + `supabase test db` 1060/1060; Playwright serial run of guest-link, guest-link-race, invite-join, guests, team-invite, team-revoke, login: 31/31. In a parallel run several team/guest specs time out under dev-server load (each passes alone).

**Residual risks:** the deferred takeover above; `vault.create_secret` in the cloud migration is unverified until CI applies it; the deleted-Event text is not reachable (tokens cascade with the Event); safari clipboard falls back to the select field; parallel e2e timeouts under load.

