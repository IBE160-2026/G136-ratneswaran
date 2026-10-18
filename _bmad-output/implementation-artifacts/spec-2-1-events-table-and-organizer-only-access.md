---
title: '2.1: Events table and Organizer-only access'
type: 'feature'
created: '2026-10-18'
status: 'done'
baseline_revision: 'df34f0ec6c25f67ef77654399acd56511a8d5688'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
warnings: ['oversized']
deferred:
  - summary: >-
      The events policies match organizer_id directly instead of calling is_organizer, while AD-3 says every policy uses the shared helpers.
    evidence: |-
      A security-invoker is_organizer that reads events would recurse under the events RLS policy, and AD-5 forbids making the helper security definer. AD-3 also lists events.organizer_id as an allowed policy input, so the two AD-3 clauses pull apart. AGENTS.md asks for bmad-correct-course when code must contradict a planning document; the owner should run it to settle the AD-3 wording (for example "policies on tables that reference events use is_organizer").
    location: >-
      supabase/migrations/20261018120000_events.sql:38
    severity: medium
---

<intent-contract>

## Intent

**Problem:** There is no `events` table yet, so nothing in Epic 2 can store an Event, and there is no database-level guarantee that only its Organizer can see or change it (GitHub issue #40).

**Approach:** One migration creates `public.events` with RLS, column grants, a publish CHECK, the AD-3 helper `is_organizer(event_id)` and the AD-2 mutation function `events_create()`. A pgTAP file proves every allow and deny. `src/types/database.ts` is regenerated.

## Boundaries & Constraints

**Always:**
- `organizer_id` is set only inside `events_create` from `auth.uid()`. The function takes no arguments, so a caller cannot supply an organizer (AD-2, AD-5, AD-19).
- `events_create` is `security definer`, `set search_path = ''`, authorises first (refuses a null `auth.uid()` with SQLSTATE `42501`), and is `revoke execute … from public, anon` + `grant execute … to authenticated`.
- `is_organizer(p_event_id uuid)` is `language sql stable security invoker set search_path = ''`, execute granted to `authenticated` only.
- `revoke all on public.events from public, anon, authenticated`, then `grant select` and `grant update (name)` to `authenticated`. `name` is the only direct-edit column in this story. Later stories grant their own columns in their own migrations.
- RLS is enabled. The select and update policies are `to authenticated` and match `organizer_id = (select auth.uid())`.
- CHECK `events_publishable`: `published_at is null or (name, starts_at, ends_at, time_zone, language all not null and starts_at < ends_at)`.
- `language` is null or one of `nb`, `en`. `name` is null or 1–200 characters. Times are `timestamptz`. Keys are `uuid default gen_random_uuid()`.
- `organizer_id uuid not null references auth.users (id) on delete cascade`. Deleting an auth user then removes their Events instead of blocking the delete (AD-11).
- Every policy, grant and function gets a pgTAP allow and deny (AD-16).

**Never:**
- No Server Action, UI, `messages/*.json` change or TS module code. Those belong to Stories 2.2–2.4. `src/modules/events` stays empty.
- No `roles`, `guests`, questionnaire, description, `cancelled_at`, `events_publish`, `events_update_schedule` or `events_delete` in this migration. Those columns and functions come in Stories 2.2–2.8.
- No edit of earlier migrations, of `_bmad/` or of the planning documents. No hand edit of `src/types/database.ts`. No change to the cloud project.
- No email match in any policy. No `security definer` on `is_organizer`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Create | user A calls `events_create()` | returns a new id. Row has `organizer_id = A` and `published_at` null | none |
| Create without a session | role `authenticated` with no `sub` claim | raises | `42501` |
| Anon create | role `anon` calls `events_create()` | no execute privilege | `42501` |
| Read | A, B and anon select A's event | A sees 1 row, B sees 0 rows, anon is denied | anon `42501` |
| Direct insert | A inserts into `events` | denied | `42501` |
| Move ownership | A updates `organizer_id` | denied | `42501` |
| Rename | A sets `name`, B sets `name` on A's event | A's update applies. B's update affects 0 rows and the name is unchanged | none |
| Direct delete | A deletes their event | denied | `42501` |
| Publish incomplete | `published_at` set while `ends_at` is null | rejected | `23514` |
| Publish reversed times | all required set, `starts_at >= ends_at` | rejected | `23514` |
| Publish complete | all required set, `starts_at < ends_at` | accepted | none |
| Helper | `is_organizer(id)` for A / for B | true / false | none |

</intent-contract>

## Code Map

- `supabase/migrations/20261014230000_abuse_limiter.sql` -- house style to copy: lower-case SQL, `revoke all … from public, anon, authenticated` before the grants (Supabase default privileges grant anon and authenticated on new tables and functions), `set search_path = ''`, a short comment naming the AD.
- `supabase/tests/abuse_limiter.test.sql` -- pgTAP style: `begin; select plan(N); … select * from finish(); rollback;`, `set local role …`, `throws_ok(…, '42501', null, '…')`.
- `supabase/tests/` -- flat directory. The new test goes here as `events.test.sql`.
- `src/types/database.ts` -- generated, and ignored by Prettier and ESLint. CI diffs it against `supabase gen types --local --lang typescript` (`.github/workflows/ci.yml:57`).
- `_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md` -- AD-2 (l.65), AD-3 (l.79), AD-5 (l.111), AD-16 (l.270), AD-19 (l.301). Read-only.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/20261018120000_events.sql` -- create `public.events` (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, created_at default `now()`), the CHECKs, RLS and policies, grants, `is_organizer` and `events_create` -- the table and its access model that Stories 2.2–2.10 build on.
- `supabase/tests/events.test.sql` -- pgTAP for every row of the I/O matrix, plus: RLS enabled, `organizer_id` NOT NULL, the set of `authenticated` UPDATE column privileges is exactly `{name}`, `is_organizer` is STABLE (`provolatile = 's'`), both functions carry `search_path=""` in `proconfig`, `events_create` is `prosecdef` and `is_organizer` is not, and neither function is executable by `anon`. Users are inserted into `auth.users` and selected with `set local request.jwt.claims` -- AD-16 allow/deny proof.
- `src/types/database.ts` -- regenerate with `supabase gen types --local --lang typescript > src/types/database.ts` -- AD-15 and the CI drift check.

**Acceptance Criteria:**
- Given the migration is applied, when `supabase test db` runs, then every test in `events.test.sql` and the existing files pass.
- Given the regenerated types, when CI runs its drift diff, then `src/types/database.ts` matches and contains `events`, `events_create` and `is_organizer`.
- Given the change, when `pnpm lint`, `pnpm format:check` and `.githooks/test.sh` run, then they pass.

## Spec Change Log

## Review Triage Log

### 2026-10-18 — Review pass
- verdicts: 25 findings — high 0, medium 5, low 6, false 14, maybe-false 0
- findings:
  - `[low]` `[patch]` (edge) whitespace-only `name` passes the length CHECK and the publish rule — CHECK changed to `char_length(btrim(name)) between 1 and 200`, with tests for `''` and `'   '`.
  - `[false]` `[reject]` (edge) `time_zone` is not validated — no path in this diff lets a user write `time_zone` (no grant, no function). A CHECK cannot query `pg_timezone_names`, so validation belongs to `events_update_schedule` (2.6).
  - `[false]` `[reject]` (edge) a draft can hold `starts_at >= ends_at` — no user path writes either column in this diff. Story 2.6 owns the general CHECK ("enforced by CHECK").
  - `[low]` `[reject]` (edge) a valid JWT for a deleted auth user gets 23503 instead of 42501 — rare, fails loudly anyway, and the fix adds a guard branch.
  - `[low]` `[reject]` (edge) `events_create` has no rate limit — a user only fills their own rows. AD-21 covers public endpoints, and a limiter adds a new surface beyond a direct correction.
  - `[false]` `[reject]` (intent a) no app caller — the ACs are database properties. pgTAP sets `role authenticated` + `request.jwt.claims`, which is exactly how PostgREST runs an RPC under a session. The app caller arrives with 2.3/2.4.
  - `[false]` `[reject]` (intent b) "events module only writer" not enforced in TS — no TS writer exists, and the grants stop any other writer at the database (AD-19).
  - `[medium]` `[defer]` (intent c) the `events` policies do not call `is_organizer`, while AD-3 says every policy uses the helpers — grouped with blind #1.
  - `[false]` `[reject]` (intent d) anon is denied by a grant, not RLS — the observable outcome (anon sees nothing) is the AC, and revoking the grant is stricter.
  - `[false]` `[reject]` (intent e) the CHECK is tested as superuser — no publish path exists yet. A CHECK is a table property and is proven at the table, and 2.8 tests `events_publish`.
  - `[false]` `[reject]` (intent f) ownership not proven fixed against definer functions — no definer function writes `organizer_id` except the insert in `events_create`.
  - `[false]` `[reject]` (intent g) the patch cannot show the types were generated — the verification ran `supabase gen types --local | diff`, with no diff.
  - `[false]` `[reject]` (intent h) no ki-logg entry or PR — grouped with blind #2. The PR is outside this workflow.
  - `[medium]` `[patch]` (gap) the `is_organizer` deny test passes even if the helper ignored `organizer_id`, because RLS hides the row — added owner-context tests with B's claims (false) and A's claims (true).
  - `[medium]` `[patch]` (gap) four `events_publishable` null branches and the empty name are untested — added a `throws_ok 23514` for each.
  - `[medium]` `[patch]` (gap) `on delete cascade` is untested — added a deletion test, merged with blind #3.
  - `[medium]` `[defer]` (blind 1) AD-3 contradiction with no correct-course — real tension: a strict reading of AD-3 is impossible without a definer helper, which AD-5 forbids. The fix is a planning-document amendment, which this run may not make. Deferred to the owner via `bmad-correct-course`.
  - `[low]` `[patch]` (blind 2) no `docs/ki-logg.md` entry — entry appended. The reflection-note entry is offered to the owner (append-only, owner's choice).
  - `[low]` `[patch]` (blind 3) no AD-11 test that FKs to `auth.users` are not `NO ACTION` — added a `pg_constraint` enumeration test plus the cascade test.
  - `[false]` `[reject]` (blind 4) draft reversed times — same as edge #3.
  - `[false]` `[reject]` (blind 5) blank name — grouped with edge #1 (patched there). The finding's separate untested claim is covered by the same patch.
  - `[false]` `[reject]` (blind 6) `time_zone` not validated — same as edge #2.
  - `[false]` `[reject]` (blind 7) `events_create` cannot dedupe a double click — Story 2.3 owns "double-click → exactly one draft", and nothing calls the function from a UI in this diff. Changing a signature later is an ordinary migration.
  - `[low]` `[patch]` (blind 8) the cascade comment does not warn that it bypasses `events_delete` — comment extended.
  - `[false]` `[reject]` (blind 9) anon `update` and `is_organizer` denials are checked only through privilege flags — the privilege flags are the mechanism. Real-call `throws_ok` tests were added anyway, since they cost nothing.

## Design Notes

The `events` policies match `organizer_id` directly instead of calling `is_organizer`. AD-3 lists `events.organizer_id` as an allowed policy input. `is_organizer` is security invoker (AD-5 permits no other definer kind) and reads `events`, so an `events` policy that called it would recurse ("infinite recursion detected in policy"). The helper is for the tables that reference `events` (`roles` and `guests` in Stories 2.5 and 2.9). The migration states this in a comment so later stories don't "fix" it.

`name` is the only direct-edit column for now: dates, time zone and language belong to `events_update_schedule` (2.6), and `published_at` belongs to `events_publish` (2.8). The 200-character bound on `name` keeps a direct PostgREST write bounded. The Zod schema in 2.2 should use the same limit.

## Verification

**Commands:**
- `supabase start` -- expected: local stack up (needs Docker)
- `supabase db reset` -- expected: all migrations apply cleanly
- `supabase test db` -- expected: all pgTAP files pass
- `supabase gen types --local --lang typescript | diff - src/types/database.ts` -- expected: no diff
- `pnpm lint && pnpm format:check && .githooks/test.sh` -- expected: exit 0

## Auto Run Result

- **Summary:** `public.events` with RLS, `select` + `update (name)` grants for `authenticated`, the `events_publishable` CHECK, the AD-3 helper `is_organizer` (stable, invoker) and the AD-2 function `events_create()` (definer, no arguments, organizer from `auth.uid()`), proven by 43 pgTAP assertions. Types are regenerated.
- **Files changed:**
  - `supabase/migrations/20261018120000_events.sql` -- table, CHECKs, index, RLS, grants, `is_organizer`, `events_create`.
  - `supabase/tests/events.test.sql` -- allow/deny for every I/O matrix row, plus the structural, AD-11 FK and cascade checks.
  - `src/types/database.ts` -- regenerated.
  - `docs/ki-logg.md` -- Story 2.1 entry. *Min vurdering* is left `NIL` for the owner.
  - `_bmad-output/implementation-artifacts/epic-2-context.md` -- compiled Epic 2 context.
- **Review findings:** 25 in total. 6 entries patched: medium 3, low 3 (blank name, cascade comment, `is_organizer` without RLS, the four publish nulls and empty name, the AD-11 FK test and cascade test, anon real-call denials, ki-logg entry). 1 deferred (AD-3 wording, medium, owner to run `bmad-correct-course`). 18 rejected, each with its reason in the Review Triage Log.
- **Follow-up review recommended:** false. 3 medium patches qualify on count, but every patch is a test addition or a one-token CHECK change that the full verification re-ran, so no specific unverified risk remains.
- **Verification:** `supabase db reset` is clean. `supabase test db` passes 3 files, 62 tests. `supabase gen types --local --lang typescript | diff` shows no diff. `pnpm lint`, `pnpm format:check` and `.githooks/test.sh` (26/0) all pass.
- **Residual risks:**
  - The AD-3 wording question stays open until the owner decides it.
  - `time_zone` validity and the draft `starts_at < ends_at` rule are left to Story 2.6.
  - Double-click idempotency of `events_create` is left to Story 2.3.
