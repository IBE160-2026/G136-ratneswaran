---
title: 'Story 3.6: Invite someone to a Role'
type: 'feature'
created: '2026-10-26'
status: 'done'
baseline_revision: '302d8260847c698c8ba487de2ebb60909cc50b25'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/DESIGN.md'
warnings: [oversized]
deferred:
  - summary: >-
      Passwordless auth users created for corrected or never-joined invitations are never deleted.
    evidence: |-
      Correct email deletes the role_members row but keeps the auth user; no retention job exists in Core. Owner: a retention story (AD-11) or Epic 7's guest deletion path.
    location: >-
      supabase/migrations/20261026120000_role_members.sql
    severity: medium
  - summary: >-
      Switching a Role off leaves its pending invitations and live role_holder links.
    evidence: |-
      invite_tokens_validate does not read roles.active, and events_set_role_active does not touch role_members; Story 3.7's exchange or 3.9's revoke must refuse or clean up.
    location: >-
      supabase/migrations/20261025120000_invite_tokens.sql
    severity: medium
---

<intent-contract>

## Intent

**Problem:** An Organizer can switch Roles on (2.5) but cannot put people in them; there is no membership, no invitation link and no access history (FR-1, FR-2).

**Approach:** One migration adds `role_members` and the append-only `role_membership_log` (events module) plus one mutation function that invites by email, reusing 3.5's `invite_tokens_create`. A Server Action creates the passwordless invitee with the secret key, then calls the function under the Organizer's session. Team & Roles gains an invite form, the people list and Access history.

## Boundaries & Constraints

**Always:**
- `events_invite_to_role(p_role_id uuid, p_name text, p_email text, p_replaces uuid default null) returns table(status text, token text)` — `security definer`, `search_path = ''`, granted to `authenticated` only. It takes no user id: it resolves the invitee from `auth.users` by lower-cased email, authorises with `is_organizer` on the Role's own Event, and does everything in one transaction.
- Refusals: not the Organizer → `42501`; Role inactive or of another Event → `22023`; Event cancelled, or published and ended → `55000`; no auth user for the email → `P0002`; daily cap → `53400` (from `invite_tokens_create`).
- Statuses: `invited` (pending row, live token returned), `added` (person already holds a joined Role in this Event: row joined at once, no token), `member` (already joined this Role: no-op), `self` (the email is the Organizer's: no-op). Re-inviting a pending person revokes their live `role_holder` tokens for that Role and returns a new one (*New link*).
- `p_replaces` (*Correct email*): must be a pending row of the same Role; it is deleted and its tokens revoked in the same transaction, logging `revoked` for the old person.
- Every new row calls `invite_tokens_revoke_for_user` for the invitee in the same transaction (a `role_members` row ends guest-only, AD-4).
- `role_members(id, event_id → events cascade, role_id → roles cascade, user_id → auth.users cascade, name text 1–100, email text, joined_at timestamptz null, invited_by → auth.users set null, created_at)`, `unique (role_id, user_id)`. RLS select: `is_organizer(event_id) or user_id = (select auth.uid())`. No INSERT/UPDATE/DELETE grants.
- `role_membership_log(id, event_id → events set null, role_id → roles set null, user_id → auth.users set null, action text check in ('invited','joined','lead_changed','revoked'), actor_id → auth.users set null, created_at)`. Ids only. RLS select `is_organizer(event_id)`; no write grants.
- The secret key lives only in a new `src/lib/supabase/admin.ts`; the action creates the user with `auth.admin.createUser({ email, user_metadata: { name } })` only after an RLS read proves the caller sees the Role, and treats `email_exists` as success.
- The link is `${origin}/api/invite/${token}`, shown once with *Copy link* and "Send this link to {name}"; it is never stored, logged or re-shown.
- All copy in `messages/en.json` and `messages/nb.json`; logs carry ids and error codes only.

**Never:**
- No email of any kind, no Supabase magic link, no `/api/invite` route (3.7).
- No Role lead, revoke or Role-holder view (3.8–3.10); no `holds_role` yet.
- No user id from the client; no email match in a policy.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New invitee | Organizer, active Role, unknown email | user created, pending row, `invited` log, link shown once | — |
| Same person again | pending row exists | old token revoked, new link (*New link*) | — |
| Already joined this Role | joined row | no change | "already on this Role" message |
| Holds another Role | joined row in another Role of the Event | joined row at once, no link, no second user | "added" message |
| Organizer's own email | email = Organizer | no row | "you already organize this event" message |
| Correct email | `p_replaces` = pending row | old row gone + tokens revoked + `revoked` log; new invite | — |
| Cap | 31st Role invite in 24 h | nothing created | "daily limit of 30 invitations" message |
| Not Organizer | other user calls function / action | nothing created | `42501` → forbidden message |
| Read-only Event | cancelled or ended published | nothing created; form hidden | `55000` → read-only message |
| Bad input | blank name, invalid email, non-uuid Role | nothing called | `invalid_input` with field keys |

</intent-contract>

## Code Map

- `supabase/migrations/20261025120000_invite_tokens.sql` -- `invite_tokens_create(event, kind, user, role)` (needs `is_organizer`, caps role_holder), `invite_tokens_revoke_for_user(user)`; both system functions callable from a definer function.
- `supabase/migrations/20261019210000_events_cancel_delete.sql:11-37` -- the read-only rule (`cancelled_at`, or `published_at` and `ends_at < now()`); repeat the same condition in the new function (inserts fire no trigger).
- `supabase/migrations/20261019170000_roles.sql` -- `roles(id, event_id, key, active)`; style for definer functions and grants.
- `supabase/tests/invite_tokens.test.sql` -- fixture and `request.jwt.claims` patterns.
- `src/modules/events/actions.ts:156-187` -- `setRoleActive`: Zod → `getClaims` → rpc → code mapping pattern; `refuse` from `src/lib/result.ts`.
- `src/modules/guests/actions.ts:35-45` -- id-only logger pattern.
- `src/modules/events/save.ts` -- `callSafely` for client calls.
- `src/lib/env.ts:57` -- `getServerEnv()` gives `SUPABASE_SECRET_KEY`; `src/lib/lint-ad5.test.ts` enforces no client import.
- `src/lib/supabase/server.ts` -- `createClient`, `getClaims`.
- `app/events/[eventId]/team/page.tsx` -- current Roles page; add People and Access history below the switches.
- `app/events/[eventId]/team/role-switch.tsx` -- client component style.
- `e2e/roles.spec.ts`, `e2e/support.ts` -- Organizer login and Team page helpers.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/20261026120000_role_members.sql` -- tables, indexes on FKs, RLS, grants, `events_invite_to_role` as above. Also a system helper `invite_tokens_check_cap()` (raises `53400` when the caller has 30 `role_holder` tokens in 24 h; revoked from public, anon, authenticated) and `create or replace invite_tokens_create` so it calls the helper instead of its inline count (one copy of the rule). Function order, each step before the next: authorise (`42501`, also for an unknown Role id) → Role active (`22023`) → Event read-only (`55000`) → `invite_tokens_check_cap()` (`53400`) → resolve user by email, missing → `P0002` → process `p_replaces` (stale or not pending → `P0001` with message `stale_invitation`; otherwise delete, revoke, log `revoked`) → `self` / `member` checks → insert with `on conflict (role_id, user_id) do nothing` and re-read, so a concurrent duplicate becomes the re-invite path, never `23505`.
- `supabase/tests/role_members.test.sql` -- pgTAP: every Matrix row at the SQL surface; allow and deny for each policy and the function; direct INSERT/UPDATE/DELETE on both tables refused; guest tokens revoked on a new row; log rows written with ids and actor; cap and read-only refused before `P0002` for an unknown email; Correct email to the Organizer's own or an existing member's email still removes the replaced row; stale `p_replaces` gives `P0001`.
- `supabase/tests/events_cancel_delete.test.sql` -- the "every FK to events cascades" assertion exempts `role_membership_log` (its FKs are `set null` by design).
- `src/types/database.ts` -- regenerate.
- `src/lib/supabase/admin.ts` -- secret-key client (`persistSession: false`).
- `eslint.config.mjs`, `src/lib/lint-ad5.test.ts` -- the AD-5 client-component rule also refuses any import resolving to `supabase/admin` (absolute or relative path), with a test.
- `src/modules/events/schemas.ts` -- `inviteSchema` (eventId, roleId uuid; name 1–100 trimmed; email; replaces optional uuid).
- `src/modules/events/actions.ts` -- `inviteToRole(input)`: parse → claims → RLS read of the Role (none → `forbidden`) → rpc; only on `P0002` call `createUser` (treat `email_exists` as success) and the rpc once more. Return `{ ok: true, data: { status, token } }`, mapping codes to `events.team.invite.errors.*` (`P0001` → `staleInvitation`); revalidate the Team path.
- `src/modules/events/actions.test.ts` -- Vitest: code mapping; `createUser` never called unless the first rpc gave `P0002`; `email_exists` tolerated; no name or email in logs.
- `app/events/[eventId]/team/page.tsx` -- load `role_members` and `role_membership_log` (Organizer only); render invite form, people list, Access history; hide forms when read-only.
- `app/events/[eventId]/team/invite-form.tsx` -- client: name, email, Role (active Roles) → confirm step showing the address → result panel with the link, *Copy link* (`navigator.clipboard`; a rejected write shows "Couldn't copy. Select the link and copy it." in `role="status"`) and "Send this link to {name}". When opened for *Correct email*, focus moves to the email field.
- `app/events/[eventId]/team/people-list.tsx` -- rows: name, Role, "Invited · not joined yet" or joined; pending rows offer *New link* (same action, same email; a result without a token shows its status message) and *Correct email* (form prefilled, `replaces`).
- `messages/en.json`, `messages/nb.json` -- `events.team.invite.*`, `events.team.people.*`, `events.team.history.*`; no unused keys.
- `e2e/team-invite.spec.ts` -- Organizer invites a new email: link and "Send this link to {name}" shown, row shows "Invited · not joined yet", *New link* gives a different link, *Correct email* replaces the row (one row for the Role, Access history shows `revoked`), Access history shows `invited`. Read-only case: an ended published Event with an active Role and a pending member shows no invite form, no *New link* and no *Correct email*.

**Acceptance Criteria:**
- Given the Access history, when an invitation is created, then a row shows the Role, the person's name (from `role_members`, else "Former invitee"), the action and "You" for the acting Organizer, newest first.
- Given a Role-holder or stranger, when they read `role_membership_log` or another person's `role_members` row, then they get no rows (pgTAP).

## Spec Change Log

### 2026-10-26 — Review loop 1
- **Trigger:** review found `createUser` runs before every database refusal, so cap, read-only and inactive-Role attempts each leave a passwordless auth user (the Matrix says "nothing created"), and an unbounded loop of new emails creates users without limit. It also found *Correct email* to the Organizer's or an existing member's email returned `self`/`member` before deleting the replaced row, leaving the wrong address's live link.
- **Amended:** Tasks for the migration (fixed step order, shared `invite_tokens_check_cap()`, `on conflict`), the action (rpc first, `createUser` only on `P0002`), tests, UI feedback, e2e, lint rule; Design Notes.
- **Known-bad state avoided:** auth users created for refused invitations; a "corrected" invitation whose old link still works; `23505` shown as "unavailable"; a read-only e2e that passes vacuously.
- **KEEP:** the first attempt is saved at `out/3-6-attempt-1.diff` (repo-relative). Reuse unchanged everything it got right: table and log shape, RLS policies and grants, statuses and their messages, the confirm step, the link panel, the People list and Access history layout, the `events_cancel_delete.test.sql` exemption, the logger pattern, and the e2e invite / New link steps.

## Review Triage Log

### 2026-10-26 — Review pass
- verdicts: 31 findings — high 5, medium 8, low 10, false 8, maybe-false 0
- findings:
  - `[medium]` `[bad_spec]` (verification-gap) read-only e2e passes vacuously (no active Role, no members) — amended e2e task: active Role + pending member.
  - `[medium]` `[bad_spec]` (verification-gap) *Correct email* never exercised through the UI — amended e2e task.
  - `[low]` `[bad_spec]` (verification-gap, other) stale `p_replaces` shares `22023` with an inactive Role and shows "Role switched off" — amended: `P0001` → `staleInvitation`.
  - `[false]` `[reject]` (blind) one invite revokes guest links on every Event — AD-4: guest-only means no `role_members` row anywhere; same verdict as 3.5's triage.
  - `[high]` `[bad_spec]` (blind) cap does not limit account creation — `createUser` precedes the rpc (actions.ts:221 vs 229); amended action order and shared cap helper.
  - `[medium]` `[defer]` (blind) auth users for corrected or never-joined emails are never deleted — retention of unused invitee users is not in this story's intent; deferred.
  - `[false]` `[reject]` (blind) access history kept with nulls after Event delete — the story AC requires `ON DELETE SET NULL` (AD-11).
  - `[low]` `[reject]` (blind) `docs/ki-logg.md` entry missing — PR-time requirement, added at commit time.
  - `[low]` `[bad_spec]` (blind) *New link* gives no feedback when no token returns — amended people-list task.
  - `[low]` `[bad_spec]` (blind) failed copy is silent — amended invite-form task.
  - `[low]` `[bad_spec]` (blind) focus not moved to the *Correct email* form — amended invite-form task.
  - `[medium]` `[bad_spec]` (blind) concurrent first invites raise `23505` shown as unavailable — `for update` locks no row when none exists; amended to `on conflict`.
  - `[low]` `[bad_spec]` (blind) unused `events.team.invite.correcting` key — amended messages task.
  - `[low]` `[bad_spec]` (blind) admin client guarded only by a regex that misses relative imports — amended lint task.
  - `[medium]` `[bad_spec]` (blind) no e2e for *Correct email* — same group as the verification-gap row.
  - `[medium]` `[defer]` (blind) switching a Role off leaves pending invites and live links — 3.5's validate does not check `roles.active`; the 3.7 exchange (or 3.9 revoke) must decide; deferred.
  - `[low]` `[reject]` (blind) history query has no limit — a per-Event log of a few dozen rows; paging adds complexity nobody meets in Core.
  - `[low]` `[reject]` (blind) generated return type says `token: string` though it can be null — Supabase gen limitation; the action branches on `status`.
  - `[false]` `[reject]` (edge) revoke without event filter — same as the blind row; AD-4.
  - `[high]` `[bad_spec]` (edge) refusals after `createUser` leave an auth user — same group as the cap row.
  - `[high]` `[bad_spec]` (edge) `p_replaces` with self/member email returns before the delete — verified at role_members.sql:111/119 vs 124; amended function order.
  - `[medium]` `[bad_spec]` (edge) concurrent invites `23505` — same group.
  - `[medium]` `[defer]` (edge) Correct email leaves an orphaned auth user — same group as the blind retention row.
  - `[low]` `[bad_spec]` (edge) lint regex misses `./admin` — same group.
  - `[false]` `[reject]` (edge, claim) foreign Role gives `42501` not `22023` — an id the caller cannot see must look like no access; amended the task to say so explicitly.
  - `[high]` `[bad_spec]` (edge, claim) "nothing created" false for the auth user — same group as the cap row.
  - `[high]` `[bad_spec]` (edge, claim) replaced row survives self/member — same group.
  - `[false]` `[reject]` (edge, claim) guest access to other Events revoked — AD-4 as above.
  - `[false]` `[reject]` (intent) the allowlist part of the intent lies below the baseline — committed separately in 302d826; nothing to review in this diff.
  - `[false]` `[reject]` (intent) reading B (allowlist only) would make the feature out of scope — the invocation is `/bmad-build-auto` on a story id, so the story is the deliverable.
  - `[false]` `[reject]` (intent) the allowlist has no test and omits `pnpm test:e2e` — e2e mutates the local database, so it stays prompted on purpose.

### 2026-10-26 — Review pass (loop 1)
- verdicts: 34 findings — high 0, medium 5, low 16, false 13, maybe-false 0
- findings:
  - `[false]` `[reject]` (blind) a pending invite revokes guest links on every Event — carried: AD-4, guest-only means no `role_members` row anywhere.
  - `[medium]` `[defer]` (blind) typo'd invitees leave orphan auth users — carried: already in `deferred`.
  - `[low]` `[patch]` (blind) re-invite under a new name keeps the old name — fixed: the re-invite path updates `name` (pgTAP).
  - `[low]` `[reject]` (blind) *Correct email* to self/member removes the row with only a self/member message — the People list re-renders without the row and Access history shows `revoked`; a new status adds surface for a rare case.
  - `[false]` `[reject]` (blind) log rows outlive their Event — carried: the AC requires `ON DELETE SET NULL` (AD-11).
  - `[low]` `[reject]` (blind) the `on conflict` branch, same-address replace and double cap check untested — the race needs two concurrent transactions pgTAP cannot express; the second cap check is the same idempotent count under a re-entrant lock.
  - `[low]` `[patch]` (blind) the roles pre-read comment overstates its job — fixed: comment says it checks the Role belongs to the URL's Event.
  - `[low]` `[reject]` (blind) Access history unbounded — carried.
  - `[low]` `[reject]` (blind) no ki-logg entry or reflection offer — carried: PR-time; the reflection offer goes to the owner.
  - `[low]` `[patch]` (blind) `secondaryClass` exported from a component file — fixed: moved to `@/components/form`.
  - `[low]` `[patch]` (blind) pending rows on a switched-off Role offer actions that always fail — fixed: hidden when the Role is inactive.
  - `[medium]` `[patch]` (verification-gap) the relative-import and `export *` branches of the AD-5 lint rule are untested — fixed: two lint cases, one linted from `src/lib/supabase/`.
  - `[medium]` `[patch]` (verification-gap) `added`/`member`/`self` UI never exercised — fixed: e2e for the `member` result.
  - `[low]` `[reject]` (verification-gap) the concurrent-insert fallback has no test — filed `defer`; a two-transaction race pgTAP cannot reach, rare, and a fix is more than a direct correction.
  - `[false]` `[reject]` (edge) revoke without event filter — carried.
  - `[false]` `[reject]` (edge) guest loses guest access before accepting — carried: a pending row already ends guest-only (AD-4).
  - `[low]` `[reject]` (edge) concurrent insert-then-delete before the re-read mints a token without a row — needs two racing transactions with a Correct email between statements; not demonstrated.
  - `[medium]` `[defer]` (edge) `createUser` succeeds, then the retry is refused — same group as the deferred orphan users (a state change between two calls).
  - `[medium]` `[defer]` (edge) Correct email leaves the typo address's auth user — carried: deferred.
  - `[low]` `[patch]` (edge) `P0001` without errcode shows "Someone changed this invitation" — fixed: mapped only on message `stale_invitation`.
  - `[low]` `[reject]` (edge) *New link* in a second tab after *Correct email* re-invites the old address — two-tab race; the fix (`replaces` on New link) changes the history semantics.
  - `[low]` `[patch]` (edge) `navigator.clipboard` undefined throws — fixed: guarded, shows `copyFailed`.
  - `[low]` `[patch]` (edge) Back enabled while the send is pending — fixed: disabled while pending.
  - `[false]` `[reject]` (edge) `user_already_exists` not tolerated — `auth.admin.createUser` reports a duplicate as `email_exists`; the other code belongs to `signUp`.
  - `[low]` `[patch]` (edge) Access history name keyed by user only — fixed: keyed by Role and user, then any row, then "Former invitee".
  - `[false]` `[reject]` (edge) log rows with null `event_id` kept — carried.
  - `[low]` `[reject]` (edge) at the cap, re-inviting a member or self is refused as cap — only at the cap; reordering would split the cap check around the user lookup.
  - `[false]` `[reject]` (intent) the allowlist commit sits below the baseline — carried.
  - `[false]` `[reject]` (intent) reading B (allowlist only) — carried.
  - `[false]` `[reject]` (intent) no test covers the settings change — carried.
  - `[false]` `[reject]` (intent) `supabase gen types *` is not read-only — the command only prints; a file is written only by a shell redirect, which is evaluated as its own permission.
  - `[false]` `[reject]` (intent) `.claude/settings.local.json` invisible to the diff — personal and gitignored by design; not part of the story or the allowlist task.
  - `[false]` `[reject]` (intent) the Target 3 emailed invitation is left out — the spec's Never list and the Release scope note exclude it.
  - `[false]` `[reject]` (intent) the commit prefix ties the allowlist to the story — AGENTS.md requires the story prefix on story branches.

### 2026-10-26 — Review pass (follow-up)
- verdicts: 38 findings — high 0, medium 6, low 19, false 13, maybe-false 0
- findings:
  - `[false]` `[reject]` (intent R1) the action calls the rpc before `createUser` — carried: the loop-1 amendment; the Matrix's "nothing created" settles it.
  - `[false]` `[reject]` (intent R2) a Role of another Event gives `forbidden`/`42501`, not `22023` — carried from pass 1.
  - `[low]` `[reject]` (intent R3) the cap refuses `added`/`member`/`self` — carried: only at the cap.
  - `[false]` `[reject]` (intent R4) 3.5's `invite_tokens_create` is redefined — the loop-1 Tasks require it so the cap rule exists once; `invite_tokens.test.sql` still passes against it.
  - `[false]` `[reject]` (intent) form hidden on a cancelled Event untested — the `readOnly` rule is 2.5's code, covered by `e2e/roles.spec.ts`; pre-existing.
  - `[low]` `[reject]` (intent) `added`/`self` UI text untested end to end — Vitest pins the mapping, pgTAP the statuses; the `member` e2e exercises the same no-token branch.
  - `[low]` `[reject]` (intent) open choices (extra `invited` on New link, `joined` for `added`, `P0001`, name update, `23514`) — choices inside the intent's gap, each tested.
  - `[medium]` `[patch]` (verification-gap) the Role-to-Event check in `inviteToRole` is unobserved — the mock ignores `eq` arguments; fixed: the test asserts both filters.
  - `[medium]` `[patch]` (verification-gap) deleting an Event with members or log rows is untested and the catalog check exempts the log — fixed: the check pins `set null`, and an `events_delete` case seeds both tables.
  - `[low]` `[reject]` (verification-gap) hidden actions on a switched-off Role untested — filed `defer`; the database refuses with `22023` (pgTAP), so the gate only saves a failing click.
  - `[low]` `[reject]` (verification-gap, other) cap refuses no-token outcomes — carried.
  - `[medium]` `[defer]` (edge) `createUser` then a failed retry or Correct email leaves an auth user — carried: already in `deferred`.
  - `[low]` `[reject]` (edge) New link in a stale tab re-invites the corrected address — carried.
  - `[medium]` `[patch]` (edge) a pending row on this Role while the person joined another Role gets a new link instead of `added` — verified at role_members.sql:220-231; fixed: the pending branch adds them and logs `joined` (pgTAP).
  - `[low]` `[reject]` (edge) the re-invite path does not call `invite_tokens_revoke_for_user` — the row is not new, its insert already revoked; no guest-link issuer exists before Epic 7.
  - `[false]` `[reject]` (edge) two auth users whose emails differ only by case — Supabase Auth stores emails lower-cased under a unique index.
  - `[false]` `[reject]` (edge, claim) the intent says the user is created before the call — carried: R1 above.
  - `[medium]` `[defer]` (blind) typo addresses keep orphan auth users — carried.
  - `[low]` `[patch]` (blind) comments promise a user only for an invitation that will succeed — a refusal can still land between the calls; fixed: both comments reworded.
  - `[low]` `[reject]` (blind) `admin.ts` lacks `import "server-only"` — the package is not installed; the lint guard covers direct, relative and re-export imports; adding a dependency is more than a direct fix.
  - `[false]` `[reject]` (blind) log rows without an Event are never purged — carried: AC requires `ON DELETE SET NULL`.
  - `[medium]` `[patch]` (blind) pgTAP does not test that log rows survive with null references — same group as the delete-Event gap row.
  - `[low]` `[reject]` (blind) the `name` check (control characters, over 100) untested — the blank case pins the constraint; Zod rejects the others before the call.
  - `[low]` `[patch]` (blind) the `added` path's guest-link revocation unasserted — fixed: pgTAP assertion.
  - `[low]` `[patch]` (blind) a joined Role-holder calling the function untested — fixed: pgTAP `42501`.
  - `[false]` `[reject]` (blind) reworked `invite_tokens_create` has no new allow/deny — `invite_tokens.test.sql` keeps its allow and deny cases and passes.
  - `[low]` `[reject]` (blind) `stale_invitation` matched by message text — pgTAP asserts the message, so a reworded raise fails a test.
  - `[low]` `[reject]` (blind) Access history unbounded — carried.
  - `[low]` `[reject]` (blind) the link uses `window.location.origin` — previews are protected demo hosts; no public site URL exists in Core.
  - `[low]` `[patch]` (blind) closing Correct email drops focus to body — fixed: focus returns to the row's button.
  - `[low]` `[reject]` (blind) the rpc result is cast, not checked — carried.
  - `[low]` `[reject]` (blind) Correct email with the same address logs revoke + invite — rare, and both rows are true of what happened.
  - `[false]` `[reject]` (blind) cap checked twice — carried: idempotent under a re-entrant lock.
  - `[low]` `[patch]` (blind) email input lacks `maxLength={254}` — fixed.
  - `[false]` `[reject]` (blind) e2e `LINK` regex hard-codes localhost — Playwright's `baseURL` is that host by config.
  - `[false]` `[reject]` (intent) "Role of another Event" — duplicate of R2.
  - `[false]` `[reject]` (intent) `email_exists` race only in a mocked test — the race cannot be produced against local Auth deterministically; the real P0002 path runs in e2e.
  - `[false]` `[reject]` (intent) matrix rows tested only at pgTAP or Vitest — each row has a running test at the surface it names.

## Design Notes

AD-5 forbids a mutation function from taking a user id, so the function takes the email and resolves the user itself; the secret-key step only creates a missing user, and only after the function has refused everything it can refuse without one. A user is therefore created only when the invitation will succeed (barring a race), so the cap bounds account creation too.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pass.
- `pnpm test` -- expected: green.
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit` -- expected: clean.
- `pnpm test:e2e e2e/team-invite.spec.ts e2e/roles.spec.ts` -- expected: pass.

## Auto Run Result

**Summary:** Story 3.6 lets the Organizer invite a person to a Role from Team & Roles. `events_invite_to_role` (definer, `authenticated` only) refuses in a fixed order — Organizer, Role active, read-only, daily cap, then a missing account (`P0002`) — so the Server Action creates the passwordless invitee with the secret key only after every other refusal has passed, then calls the function again. It writes the pending `role_members` row, an `invited` row in the append-only `role_membership_log`, revokes the invitee's guest links, and returns a `role_holder` link shown once with *Copy link*. *New link*, *Correct email*, the `added`/`member`/`self` outcomes and Access history are in the UI.

**Files changed:**
- `supabase/migrations/20261026120000_role_members.sql` -- tables, RLS, grants, `invite_tokens_check_cap()`, `invite_tokens_create` using it, `events_invite_to_role`.
- `supabase/tests/role_members.test.sql`, `supabase/tests/events_cancel_delete.test.sql` -- 55 new pgTAP assertions; cascade check exempts the log.
- `src/lib/supabase/admin.ts`, `eslint.config.mjs`, `src/lib/lint-ad5.test.ts` -- secret-key client and its AD-5 lint guard (absolute, relative, re-export).
- `src/modules/events/schemas.ts`, `actions.ts`, `actions.test.ts` -- `inviteSchema`, `inviteToRole` and its tests.
- `src/components/form.tsx` -- shared `secondaryClass`.
- `app/events/[eventId]/team/page.tsx`, `invite-form.tsx`, `people-list.tsx` -- invite form, People list, Access history.
- `messages/en.json`, `messages/nb.json` -- copy; `src/types/database.ts` -- regenerated.
- `e2e/team-invite.spec.ts` -- invite, New link, Correct email, member result, read-only.

**Review findings:** Pass 1 (31 findings) routed to `bad_spec`: `createUser` ran before the database refusals, and *Correct email* to self/member kept the old link; the spec was amended and the code re-derived (loop 1). Pass 2 (34 findings): 10 patches (medium 2 — lint branch coverage, member-result e2e; low 8 — name on re-invite, `P0001` mapping, pre-read comment, shared class, inactive-Role actions, clipboard guard, Back while pending, history name key). Deferred: orphan auth users for corrected or never-joined invitees; switched-off Roles keep pending links. Rejected: every other finding, with its reason in the Review Triage Log.

**Follow-up review recommendation:** `true` — two medium entries were patched on this pass (medium 2, low 8). Unverified risk: the concurrent `on conflict` fallback in `events_invite_to_role` cannot be reached by single-transaction pgTAP, so the race path is reviewed but untested.

**Verification:** `supabase db reset && supabase test db` -- 14 files, 387 tests, PASS. `pnpm test` -- 21 files, 314 tests. `pnpm lint`, `pnpm format:check`, `pnpm exec tsc --noEmit` -- clean. `.githooks/test.sh` -- 27/27. `pnpm test:e2e e2e/team-invite.spec.ts e2e/roles.spec.ts` -- 8/8.

**Residual risks:** the two deferred items; `added` and `self` UI messages are covered by Vitest and pgTAP but not e2e; `next dev` keeps re-adding a block to `AGENTS.md`, which was restored and not committed.

### Follow-up review pass (2026-10-26)

**Patches applied (7):** medium 3 — a pending row for a person joined on another Role now becomes `added` instead of getting a link; the Event-delete path with members and log rows is tested and the catalog check pins `set null`; the action test asserts the Role read filters by both `id` and `event_id`. Low 4 — honest comments on the create-then-retry race, pgTAP for the `added` path's guest-link revocation and a joined Role-holder's `42501`, focus returns after closing *Correct email*, `maxLength={254}` on the email field.

**Deferred:** none new (the two existing items stand). **Rejected:** 31, each with its reason in the Review Triage Log.

**Follow-up review recommendation:** `false` — this follow-up pass patched no high finding (medium 3, low 4), so the work has converged.

**Verification:** `supabase test db` -- 14 files, 396 tests, PASS. `pnpm test` -- 314. lint, format, tsc clean. `.githooks/test.sh` 27/27. `pnpm test:e2e e2e/team-invite.spec.ts e2e/roles.spec.ts` -- 8/8.

**Residual risks:** the two deferred items; focus return after *Correct email* has no automated test.
