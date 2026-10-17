---
title: 'Story 1.10: Per-flow abuse-limiter buckets'
type: 'bugfix'
created: '2026-10-17'
status: 'done'
baseline_commit: '2116d442106be8e4f36d91d9e1220ea8a1b53bac'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Sign-up, resend verification and forgot password all count in the same two limiter buckets (`signup_ip`, `signup_email`), because the `abuse_counters` check constraint allows only those names. One person's sign-ups can therefore use up another's 3-per-hour budget for password recovery, which AD-21 now forbids.

**Approach:** A migration replaces the bucket check with a shape check; the shared `limit()` helper takes a flow name and counts in `<flow>_ip` and `<flow>_email`, with the same limits. Limits, the IP-first order and the identical answers (AD-4) do not change.

## Boundaries & Constraints

**Always:**
- One new migration in `supabase/migrations/` (timestamp after `20261014230000`), nothing else in SQL: drop the existing check on `abuse_counters.bucket` (inline check named `abuse_counters_bucket_check`; confirm the name in the local database before relying on it) and add `check (bucket ~ '^[a-z0-9_]{1,32}$')`. Existing rows stay and satisfy the new check. No data change, no new function, grant or policy.
- Regenerate `src/types/database.ts` with `supabase gen types --local --lang typescript` against the local database after the migration (never hand-edit; CI diffs it). If the output is unchanged, say so in the run result.
- `limit(flow, email, errors)` in `src/modules/auth/actions.ts`: buckets `` `${flow}_ip` `` and `` `${flow}_email` ``, limits unchanged (5 per 60 s per IP, 3 per 3600 s per email), IP hit first and an IP refusal never spends the email budget. `flow` is a literal union (`"signup" | "resend" | "forgot"`), so a typo fails type-checking. Callers: `signUp` uses `"signup"`, `resendVerification` `"resend"`, `forgotPassword` `"forgot"`. The stale comment above `limit()` about shared buckets is replaced by one that states the per-flow rule (AD-21).
- `logIn` stays without an app-level limiter (Auth throttles it). OAuth start, profile actions and every other action stay as they are.
- Error keys passed to `limit()` stay as they are today, except `resendVerification`, which currently passes `auth.logIn.errors`: leave it unless a key is missing, since changing copy is not this story.
- pgTAP in `supabase/tests/abuse_limiter.test.sql` (extend, keep the existing assertions; update `plan(n)`): one accepted new-style bucket name (for example `forgot_ip`) through `abuse_hit` as `anon`, one refused name (uppercase or hyphen, for example `Forgot-IP`, and one over 32 characters) that raises `23514`, and a check that exhausting `signup_email` for a key leaves `forgot_email` for the same key allowed.
- Vitest: `src/modules/auth/actions.test.ts` (and the file that covers `resendVerification` and `forgotPassword`, find it with grep) asserts the exact `p_bucket` each action sends for both hits: `signup_ip`/`signup_email`, `resend_ip`/`resend_email`, `forgot_ip`/`forgot_email`, with the unchanged `p_max` and `p_window_seconds`. A test calls the three flows in a row with the mocked limiter keyed by bucket and shows none is refused because another flow's bucket is full.
- Close the matching entry in `_bmad-output/implementation-artifacts/deferred-work.md` (the "share the `signup_ip` and `signup_email` limiter buckets" item) by deleting that one item; leave every other entry untouched.
- `docs/ki-logg.md`: this story's entry in the existing format (Norwegian).

**Never:** Changing limits or windows, purging counter rows (Target 2 retention job), salting hashes, changing `abuse_hit`, its grants, policies or trigger, a bucket per login attempt, editing `_bmad/` or planning documents (the sprint change proposal already records this story), `SUPABASE_SECRET_KEY`, touching the Supabase cloud project, a hand-edited `database.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Own buckets | `signUp`, `resendVerification`, `forgotPassword` for one email | Each hits `<flow>_ip` then `<flow>_email` | N/A |
| No cross-flow spend | `signup_email` already at 3 for an email | `forgotPassword` for that email is still allowed | N/A |
| Same-flow limit | A 4th `forgot_email` hit in an hour | Refused with `rate_limited` as before | Same message as today |
| New bucket name | `abuse_hit('forgot_ip', …)` as `anon` | Allowed and counted | N/A |
| Bad bucket name | `Forgot-IP`, or 33 characters | Check violation `23514` | Insert refused |
| Existing rows | Rows with `signup_ip` or `signup_email` | Kept; migration applies cleanly | N/A |
| IP refused | IP bucket over its limit | Email bucket not touched | `rate_limited` |

</intent-contract>

## Code Map

- `supabase/migrations/20261014230000_abuse_limiter.sql` -- the table and its inline `check (bucket in ('signup_ip', 'signup_email'))`; read-only evidence, never edited (AD-15); `abuse_hit` takes the bucket as a plain text argument and needs no change.
- `src/modules/auth/actions.ts:36` -- `limit(email, errors)` with the two hard-coded buckets; callers at `signUp`, `resendVerification`, `forgotPassword`.
- `src/modules/auth/actions.test.ts:83-95` -- the existing test of the bucket names and limits for sign-up; the pattern for the new assertions (`rpc` mock, `sha`).
- `supabase/tests/abuse_limiter.test.sql` -- pgTAP pattern (`set local role anon`, `throws_ok`, `plan(11)`).
- `src/types/database.ts` -- generated; `.github/workflows/ci.yml:57` -- the CI drift check.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- the item to close; `_bmad-output/planning-artifacts/sprint-change-proposal-2026-10-15.md` -- background, read-only.
- Not to change: `_bmad/`, planning documents, existing migrations, `proxy.ts`, `.github/workflows/*`, `app/`.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/<timestamp>_abuse_counters_bucket_shape.sql` -- replace the bucket check with the shape check -- AD-15, AD-21
- `src/types/database.ts` -- regenerate with `supabase gen types --local` after `supabase db reset` or migration up -- AD-15
- `supabase/tests/abuse_limiter.test.sql` -- accepted name, two refused names, cross-flow independence -- AD-16
- `src/modules/auth/actions.ts` -- `limit(flow, …)` and the three callers -- AD-21, NFR10
- `src/modules/auth/*.test.ts` -- bucket names per action and the three-flows-in-a-row test
- `_bmad-output/implementation-artifacts/deferred-work.md`, `docs/ki-logg.md` -- close the deferred item; AI log entry

**Acceptance Criteria:**
- Given `abuse_counters`, when the migration runs, then only the shape of `bucket` is checked, existing rows are kept, `database.ts` is regenerated and pgTAP proves one accepted and one refused name.
- Given sign-up, resend verification and forgot password, when each calls the limiter, then it counts in its own `<flow>_ip` and `<flow>_email` buckets with 5 per minute per IP and 3 per hour per email, and `limit()` takes the flow name.
- Given a person who signs up, resends the verification and asks for a reset within an hour, when each request is made, then none is refused because of another flow's use, and a Vitest test asserts each action's bucket names.
- Given the limiter, when this story is done, then login still has no app-level limiter and no purge exists.

## Spec Change Log

## Review Triage Log

### 2026-10-17 — Review pass
- verdicts: 11 grouped entries from four layers — high 0, medium 0, low 6, false 3, maybe-false 2 (duplicates across layers share a row)
- findings:
  - `[low]` `[patch]` The 32-character boundary is untested (blind, edge) — pgTAP now asserts an exactly 32-character name is accepted (`plan(18)`).
  - `[low]` `[patch]` `limit()` doc comment split into a JSDoc line and a `//` line (blind) — merged into one block.
  - `[false]` `[reject]` The migration drops the check by a guessed name (blind, edge, intent) — the name was read from the local database and `supabase db reset` plus `supabase test db` pass; `if exists` would hide a wrong name.
  - `[false]` `[reject]` Drop and add are not atomic, so a failed add leaves no check (edge) — Supabase runs each migration file in one transaction.
  - `[false]` `[reject]` `database.ts` missing from the diff (blind, intent) — `supabase gen types --local` produced no difference, so the file is unchanged.
  - `[maybe-false]` `[reject]` "Existing rows are kept" is untested (blind, gap) — `signup_ip` and `signup_email` both match the regex; the migration would fail on `db reset` or `db push` otherwise.
  - `[low]` `[reject]` Missing `x-forwarded-for` falls back to a shared `unknown` IP bucket (edge) — pre-existing behaviour from Story 1.4; Vercel always sets the header.
  - `[low]` `[reject]` Cross-flow test does not assert which buckets resend and forgot hit; no IP-refusal test per new flow (blind, edge) — the same file asserts the exact bucket names and limits for both hits, and `actions.test.ts` covers the IP-first order that `limit()` shares across flows.
  - `[low]` `[reject]` `resendVerification` keeps the `auth.logIn.errors` keys (blind, edge) — the spec leaves copy alone, and the keys exist in both languages.
  - `[low]` `[reject]` `NIL` assessment, no PR link, deleted ledger item not marked resolved (blind, edge, intent) — the owner assessment is added after review; the ledger has no "resolved" convention.
  - `[maybe-false]` `[reject]` Behaviour is proven only through mocks and pgTAP, not Action to database (intent) — the mock-level test of bucket names plus pgTAP of the table are the layers AD-16 assigns; no e2e is needed for a constraint change.

## Design Notes

The shape check is the whole security boundary for bucket names: `abuse_hit` is `security invoker` and `anon` may insert, so an unchecked name would let any caller create unbounded bucket namespaces. The regex keeps names to lowercase, digits and underscore up to 32 characters, which fits `<flow>_ip` and `<flow>_email` for any flow name up to 26 characters. Dropping the old check by its generated name is the one fragile step; if Postgres named it differently, look it up in `pg_constraint` and use that name in the migration, never a guess.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP tests pass, including the new ones
- `supabase gen types --local --lang typescript | diff - src/types/database.ts` -- expected: no difference after regeneration
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test` -- expected: all pass (stale `.next` types may be ignored)
- `pnpm test:e2e` -- expected: all pass
- `.githooks/test.sh` -- expected: all checks pass

## Auto Run Result

Status: done

**Summary:** `abuse_counters.bucket` now has a shape check (`^[a-z0-9_]{1,32}$`) instead of the two fixed names, and `limit(flow, email, errors)` counts sign-up, resend verification and forgot password in their own `<flow>_ip` and `<flow>_email` buckets with unchanged limits.

**Files changed:**
- `supabase/migrations/20261017120000_abuse_counters_bucket_shape.sql` -- replaces the check constraint.
- `src/modules/auth/actions.ts` -- `limit()` takes the flow; three callers.
- `supabase/tests/abuse_limiter.test.sql`, `src/modules/auth/session-actions.test.ts` -- accepted and refused names, cross-flow independence, bucket names per action.
- `_bmad-output/implementation-artifacts/deferred-work.md`, `docs/ki-logg.md` -- closed ledger item, AI log.

**Review:** 11 grouped entries. Patched 2 (low): 32-character boundary test, merged doc comment. Nothing deferred. The rest rejected with reasons in the triage log.

**Follow-up review recommended:** false.

**Verification:** `supabase db reset` and `supabase test db` pass (18 assertions in the limiter file); `supabase gen types --local` matches `src/types/database.ts`; `pnpm lint`, `format:check`, `tsc --noEmit` pass; `pnpm test` 136 passed; `pnpm test:e2e` 43 of 43 and `.githooks/test.sh` 26 of 26 before the final test-only patches.

**Residual risks:** The cloud database receives the migration only through CI from `main`; the first `supabase db push` is the real test that existing cloud rows satisfy the new check. Callers without `x-forwarded-for` still share one `unknown` IP bucket per flow (pre-existing).
