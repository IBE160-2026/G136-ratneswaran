---
title: 'Story 3.5: Invitation tokens and rules'
type: 'feature'
created: '2026-10-25'
status: 'done'
baseline_revision: '77e64981244ff248bc7be2ea90527881d0ce4421'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
warnings: [oversized]
deferred: []
---

<intent-contract>

## Intent

**Problem:** Stories 3.6 (invite to a Role), 3.7 (join through the link) and Epic 7 (guest links) need one invite-token store that is unguessable, revocable and rate-limited; none exists yet (AD-4, AD-21, NFR10).

**Approach:** One migration adds the events-owned `invite_tokens` table with no client grants, plus three system functions (create, validate, revoke a user's guest tokens) that 3.6/3.7/Epic 7 call; the Epic 1 `limit()` helper moves to a shared server module and learns a token-keyed bucket for public token routes.

## Boundaries & Constraints

**Always:**
- Tokens: 32 random bytes (`extensions.gen_random_bytes`), returned once as unpadded base64url (43 chars); only `sha256` of the token text is stored (`bytea`, 32 octets, unique). Lookup is by hash, so timing never depends on the plaintext.
- `invite_tokens` has RLS on, `revoke all … from public, anon, authenticated`, no policies. `service_role` keeps its default grants.
- All three functions are `security definer`, `search_path = ''`, `revoke execute … from public, anon, authenticated` (AD-5 system functions). Callers are other SQL functions or the secret-key route.
- Validation reads `events.ends_at` and `events.cancelled_at` at call time; nothing about validity is copied onto the token.
- Validation returns exactly one of `valid | used | expired | invalid`; ids only when `valid`. Unknown token, other Event, other kind, and a deleted Event (row cascaded away) are all `invalid`.
- Daily cap: at most 30 `role_holder` tokens per creator in the last 24 hours, counted from `invite_tokens` itself; the 31st raises SQLSTATE `53400`. Guest and shared-event tokens are not counted.
- Public token limits reuse `abuse_hit`: `<flow>_ip` 5/60 s, then `<flow>_token` (or `<flow>_email`) 3/3600 s, IP first.

**Never:**
- No Server Action, route, UI, message keys, `role_members` or `role_membership_log` (3.6/3.7 own those).
- No email of any kind; no Supabase magic links.
- No plaintext token in any table, log line or notice.
- No new limiter table or vendor.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Create | role_holder for an Event the caller organizes | 43-char token; row with hash, `created_by = auth.uid()` | — |
| Cap | 30 role_holder tokens by A in last 24 h | 31st create refused | SQLSTATE `53400` |
| Valid | live token, Event not cancelled, `ends_at` future or null | `valid` + token id, event id, kind, user id, role id | — |
| Revoked / consumed | `revoked_at` or `consumed_at` set | `used` | — |
| Ended / cancelled | `ends_at < now()` or `cancelled_at` set | `expired` | — |
| Mismatch | other kind, other Event, unknown token, deleted Event | `invalid` | — |
| Revoke for user | user has guest + role_holder tokens | only that user's live guest tokens get `revoked_at` | — |
| Direct call | `authenticated` or `anon` calls any function / selects table | refused | `42501` |

</intent-contract>

## Code Map

- `supabase/migrations/20261014230000_abuse_limiter.sql` -- `abuse_hit(bucket, key_hash, max, window_seconds)`; reuse, do not change.
- `supabase/migrations/20261017120000_abuse_counters_bucket_shape.sql` -- bucket names must match `^[a-z0-9_]{1,32}$`.
- `supabase/migrations/20261018120000_events.sql:49` -- `is_organizer(event_id)`, invoker helper.
- `supabase/migrations/20261019170000_roles.sql` -- `roles(id, event_id, …)`; style for definer functions, revoke/grant lines and header comments.
- `supabase/migrations/20261019210000_events_cancel_delete.sql` -- `events.cancelled_at`; Event delete is a hard `delete`, so tokens must `on delete cascade`.
- `src/modules/auth/actions.ts:22-47` -- private `sha256` and `limit(flow, email, errors)`; callers at lines 63, 119, 140. A `"use server"` file must not export it (it would become an action).
- `src/modules/auth/actions.test.ts:60-100` -- asserts bucket names, hashed keys, IP-first order; must keep passing unchanged.
- `supabase/tests/guests_update_remove.test.sql:74-75` -- pattern for `set local role authenticated` + `request.jwt.claims`.
- `src/types/database.ts` -- regenerate, never hand-edit.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/20261025120000_invite_tokens.sql` -- create enum `invite_kind (guest, role_holder, shared_event)`; table `invite_tokens(id uuid pk, event_id → events on delete cascade, kind, token_hash bytea unique check octet_length = 32, user_id → auth.users on delete cascade null, role_id → roles on delete cascade null, created_by → auth.users on delete set null, created_at, revoked_at, consumed_at)` with checks: `role_id` set iff `role_holder`; `user_id` null iff `shared_event`; `consumed_at` only for `role_holder`; a role's Event equals `event_id` (enforce in create). Indexes on `(created_by, created_at)` and `user_id`. RLS on, revoke all. Functions `invite_tokens_create(p_event_id, p_kind, p_user_id, p_role_id) returns text`, `invite_tokens_validate(p_token text, p_kind, p_event_id) returns table(status text, token_id, event_id, kind, user_id, role_id)`, `invite_tokens_revoke_for_user(p_user_id) returns void`; all revoked from public, anon, authenticated -- AD-4/AD-5/AD-19.
- `supabase/tests/invite_tokens.test.sql` -- pgTAP for every Matrix row, plus: no table privilege for `anon`/`authenticated`; stored hash equals `sha256(convert_to(token,'UTF8'))`; two creates differ; `service_role` may execute the functions (allow) while `authenticated` may not (deny); a create for a Role of another Event is refused; tokens older than 24 h do not count toward the cap -- AD-16.
- `src/lib/limit.ts` -- move `sha256` + `limit` here (server-only module, no `"use server"`); signature `limit(flow: "signup" | "resend" | "forgot" | "invite", subject: { email: string } | { token: string }, errors: string)`; email is trimmed and lower-cased, token used as given -- AD-21 reuse.
- `src/modules/auth/actions.ts` -- import `limit` from `@/lib/limit`, pass `{ email }`; drop the local copies.
- `src/lib/limit.test.ts` -- Vitest: `invite` flow calls `invite_ip` (5, 60) then `invite_token` (3, 3600) with hashed keys; IP refusal skips the token bucket.
- `src/types/database.ts` -- regenerate with `supabase gen types typescript --local`.

**Acceptance Criteria:**
- Given the migration applied, when `authenticated` runs `select` on `invite_tokens`, then it gets `42501` (pgTAP).
- Given a user added to a Role inside one transaction that calls `invite_tokens_revoke_for_user`, when the transaction rolls back, then the guest tokens are not revoked (same-transaction semantics, pgTAP).
- Given the auth flows, when sign-up, resend and forgot run, then they hit the same `<flow>_ip`/`<flow>_email` buckets as before (existing Vitest passes untouched).

## Spec Change Log

## Review Triage Log

### 2026-10-25 — Review pass
- verdicts: 35 findings — high 0, medium 9, low 7, false 19, maybe-false 0 (patched entries after grouping: null-kind/event validate, null creator/Organizer check, CHECK coverage — medium 3; nullable args, FK indexes — low 2)
- findings:
  - `[medium]` `[patch]` (edge) validate skips the mismatch branch when p_kind or p_event_id is NULL, so any live token is `valid` — `<>` on NULL yields NULL inside the `or`; fixed with `is distinct from` + pgTAP.
  - `[medium]` `[patch]` (edge) create with no session stores created_by null and skips the cap — reachable from a secret-key caller; fixed by refusing role_holder unless `is_organizer(p_event_id)` (42501) + pgTAP.
  - `[false]` `[reject]` (edge) create allows a Role with `active = false` — the story's AC enumerates the rejection cases and Role state is not one; Role lifecycle belongs to 3.6/3.9.
  - `[false]` `[reject]` (edge) validate accepts a role_holder token after its Role is deactivated — same: not among the AC's rejection cases.
  - `[false]` `[reject]` (edge) revoke_for_user revokes guest tokens of other Events — AD-4 guest-only means no `role_members` row anywhere, so a Role-holder loses every guest link by design.
  - `[low]` `[patch]` (edge) generated Args require string for p_user_id/p_role_id though guest/shared_event need null — 3.6/Epic 7 callers would fail tsc; fixed with `default null` + regenerated types.
  - `[low]` `[reject]` (edge) generated return columns typed non-null although ids are null unless `valid` — Supabase gen never marks function return columns nullable; callers branch on `status` first; a fix needs a wrapper.
  - `[medium]` `[patch]` (blind) daily cap skipped with no session user — same root cause as the edge null-creator row; same fix.
  - `[low]` `[reject]` (blind) null p_role_id gets the "another Event" message — the call is still refused; the message never reaches a user.
  - `[false]` `[reject]` (blind) validate never checks Role active — see edge rows above.
  - `[low]` `[patch]` (blind) no index on cascade FKs event_id and role_id — cascade deletes scan the table; added two indexes.
  - `[false]` `[reject]` (blind) no hook revokes guest tokens on password/identity add — the AC assigns that reuse to Epic 7.
  - `[low]` `[reject]` (blind) `status` is untyped text — no wrong outcome; an enum adds public surface for a four-value set documented in the function comment.
  - `[low]` `[patch]` (blind) nullable args marked required in types — same root cause as the edge row; same fix.
  - `[medium]` `[patch]` (blind) pgTAP misses shared_event-with-user and guest-without-user checks — same root cause as the verification-gap row; same fix.
  - `[medium]` `[patch]` (blind) pgTAP misses consumed_at on a non-role_holder row — same group; same fix.
  - `[false]` `[reject]` (blind) anon not tested against create/revoke — the privilege test at invite_tokens.test.sql:400-406 checks `anon` on all three functions.
  - `[false]` `[reject]` (blind) status order (used vs expired) untested — the order is not part of the intent and both answers reveal nothing.
  - `[false]` `[reject]` (blind) limit.test misses the `unavailable` mapping — same code path is pinned by src/modules/auth/actions.test.ts:111.
  - `[false]` `[reject]` (blind) limit.test misses a refusal from the token bucket — the second-bucket refusal is pinned for the same loop by actions.test.ts ("email" case).
  - `[false]` `[reject]` (blind) email branch untested in the shared module — actions.test.ts:89-108 and session-actions.test.ts:110-125 pin it.
  - `[false]` `[reject]` (blind) "server-only" is only a comment — limit.ts imports `next/headers`, which already fails in a client bundle.
  - `[false]` `[reject]` (blind) invite_token bucket does little against guessing — 256-bit tokens make guessing infeasible; the per-token bucket is AD-21's rule.
  - `[false]` `[reject]` (blind) other AD-21 flows missing from the union — their stories (Epic 7) add their own flow names.
  - `[low]` `[reject]` (blind) no `docs/ki-logg.md` entry — a PR-time requirement, added with the story PR, not part of the build diff.
  - `[medium]` `[patch]` (verification-gap) CHECK constraints on user_id/shared_event and consumed_at unpinned by pgTAP — added three throws_ok 23514 cases.
  - `[medium]` `[patch]` (verification-gap, other) null creator skips the cap — same group as the null-creator rows; same fix.
  - `[false]` `[reject]` (intent a) no external message surface — the AC's messages live in 3.7's route; 3.5's AC is phrased at the token primitive.
  - `[false]` `[reject]` (intent b) revoke helper has no Role-join caller — `role_members` is 3.6; the AC names the helper.
  - `[false]` `[reject]` (intent c) limiter has no route caller yet — 3.7 adds the route.
  - `[false]` `[reject]` (intent d, scope) cap counts role_holder only — Story 3.6 places the cap on Role invitations; guest lists of 150 (FR-5) would break otherwise.
  - `[medium]` `[patch]` (intent d, identity) cap not applied from a secret-key caller — same null-creator group; same fix.
  - `[medium]` `[patch]` (intent e) create does not check the Organizer — same fix as the null-creator group.
  - `[false]` `[reject]` (intent f) constant-time compare replaced by hash lookup — lookup by SHA-256 never compares plaintext; rationale in Design Notes.
  - `[false]` `[reject]` (intent g) cancelled guest tokens hide the Event id — Epic 7 owns the read-only cancelled page and may widen validate then.

## Design Notes

Hash-then-lookup is the constant-time measure: an index probe on `sha256(token)` leaks at most timing about a hash prefix, which says nothing about any valid token. No byte comparison happens in TS.

Cap scope is `role_holder` only: the AC places it on role invitations (3.6), and counting guest links would stop an Organizer from issuing a 150-guest list in one day (FR-5). `ends_at` null (a draft without dates) means no end yet, so the token stays valid until the Event has one.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass.
- `pnpm test` -- expected: green, including `src/lib/limit.test.ts` and `src/modules/auth/actions.test.ts`.
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit` -- expected: clean.

## Auto Run Result

**Summary:** Story 3.5 adds the events-owned `invite_tokens` store (hash-only, no client grants, RLS on) with three AD-5 system functions — `invite_tokens_create` (256-bit token returned once; role_holder requires the Organizer and is capped at 30 per 24 h), `invite_tokens_validate` (`valid | used | expired | invalid`, ids only when valid) and `invite_tokens_revoke_for_user` (a user's live guest tokens) — and moves the Epic 1 limiter to `src/lib/limit.ts` with a token-keyed `invite` flow.

**Files changed:**
- `supabase/migrations/20261025120000_invite_tokens.sql` -- enum, table, checks, four indexes, three definer functions.
- `supabase/tests/invite_tokens.test.sql` -- 42 pgTAP assertions covering every Matrix row, grants, constraints, cap and the Organizer check.
- `src/lib/limit.ts` -- shared server-only limiter, `{ email } | { token }` subject.
- `src/lib/limit.test.ts` -- `invite_ip` then `invite_token`, IP-first.
- `src/modules/auth/actions.ts` -- uses the shared limiter.
- `src/types/database.ts` -- regenerated.

**Review findings:** 35 findings from four layers. Patched (5 entries): NULL kind/event in validate (medium), missing Organizer check / null creator skipping the cap (medium), unpinned CHECK constraints (medium), nullable create args (low), FK indexes (low). Deferred: none. Rejected: 19 false and 3 low, each with its reason in the Review Triage Log (Role `active` not among the AC's rejection cases; revoking all guest tokens is AD-4 by design; password/identity revocation is Epic 7; ki-logg entry is PR-time).

**Follow-up review recommendation:** `true` — three medium entries were patched on a first pass (medium 3, low 2). Unverified risk: the new `is_organizer` gate in `invite_tokens_create` assumes Story 3.6 calls it from a mutation function under the Organizer's session, never from the secret-key route; that call path does not exist yet.

**Verification:** `supabase db reset && supabase test db` -- 13 files, 332 tests, PASS. `pnpm test` -- 21 files, 291 tests, PASS. `pnpm lint`, `pnpm format:check`, `pnpm exec tsc --noEmit` -- clean. `.githooks/test.sh` -- 27/27.

**Residual risks:** Story 3.7's exchange route has only the token, while validate requires the expected kind and Event; 3.7 must look those up or add a token-only variant. Epic 7's read-only cancelled page may need validate to return the Event id on `expired`.
