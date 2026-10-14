---
title: 'Story 1.4: Create an account with email'
type: 'feature'
created: '2026-10-14'
status: 'done'
baseline_commit: 'ec5a7f644d84cf8940eb604f3f9af9b3bcb0d822'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no way to create an account. Organizers and Role-holders cannot start using Arrangly, and Stories 1.5-1.6 have no Server Action shape, `proxy.ts` or limiter to reuse (FR1, AD-4, AD-17, AD-21, NFR10).

**Approach:** Add a `/signup` page and a `signUp` Server Action (Zod first, `{ ok, data }` result, next-intl error keys) on `@supabase/ssr`, with email confirmation required locally. Add `proxy.ts` for session refresh only, and a Postgres-backed abuse limiter (migration, function, pgTAP) the action calls before touching Auth.

## Boundaries & Constraints

**Always:** Password policy: at least 8 characters, one letter, one digit; the same rule in Zod, the inline rule list and `config.toml` (`minimum_password_length`, `password_requirements = "letters_digits"`). `[auth.email] enable_confirmations = true`; local mail is read in Mailpit. The success response is identical for a new and an existing email (Supabase returns an obfuscated user for a confirmed email; do not branch on it). Errors render inline with `aria-invalid`, `aria-describedby` and focus on the first invalid field. All text in `messages/nb.json` and `messages/en.json`, with identical keys. Page title `Sign up – Arrangly`-style via messages. Server code reads the user with `auth.getClaims()`, never `getSession()`; `proxy.ts` only refreshes the cookie. Limits: 5 per minute per IP, 3 per hour per email (hashed key, never the raw email or IP in a log). Migration for the limiter only; regenerate `src/types/database.ts` with `supabase gen types`, never by hand. Every function and grant gets a pgTAP allow and deny test.

**Limiter privilege (decided by the owner):** option C. `abuse_hit` is a `security invoker` function and `anon` and `authenticated` get only the INSERT/UPDATE grant on `abuse_counters`, with RLS allowing counter rows only; no `security definer`, no secret key, no AD change. Known weakness accepted: a caller can burn another person's email bucket.

**Never:** `SUPABASE_SECRET_KEY` in this story. Sending app email (Auth mail only). Login, logout, reset, OAuth, display name field (Stories 1.5-1.6, 1.9). Editing `_bmad/` or planning documents. Revealing in any response, status code, message or timing branch whether an email exists.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New account | Valid email, strong password | Account unconfirmed; page shows "Check your inbox to verify your email."; cannot log in until confirmed | N/A |
| Existing email | Email already registered | Same `{ ok: true }` and same message as above | No error, no extra mail beyond Auth's own |
| Malformed email | `not-an-email` | `{ ok: false, error: { code: "invalid_input", message: "auth.signUp.errors.email" } }`; field `aria-invalid`, focus on it | Inline |
| Weak password | `abc123` | Rule list shows unmet rules; `aria-invalid` on password; focus on first error | Inline |
| IP over limit | 6th sign-up in a minute from one IP | `{ ok: false, error: { code: "rate_limited", message: "auth.signUp.errors.rateLimited" } }` friendly text | Auth is not called |
| Email over limit | 4th sign-up for one email in an hour | Same refusal | Auth is not called |
| Auth failure | Supabase returns an error other than the above | `{ ok: false, error: { code: "unavailable", ... } }` | Never throws to the client |

</frozen-after-approval>

## Code Map

- `supabase/config.toml` -- `[auth]` lines 156-186 and `[auth.email]` line 227: set password rules, `enable_confirmations = true`.
- `supabase/migrations/` (only `.gitkeep`) -- add the limiter migration here; `supabase/tests/smoke.test.sql` is the pgTAP shape to follow.
- `src/lib/env.ts` -- `clientEnv()` supplies URL and publishable key for the Supabase clients; do not touch the server section.
- `app/layout.tsx` -- header, skip link, `RouteFocus` already present; reuse. Add a Sign up link to the nav only if it stays a single message key.
- `app/page.tsx` -- pattern for `generateMetadata` plus `getTranslations` titles `{Surface} – Arrangly`.
- `src/components/route-focus.tsx`, `src/components/status-label.tsx` -- reuse; no changes.
- `eslint.config.mjs` -- AD-5 rule already blocks secret-key leaks into `"use client"` files; keep the form component client-only without server env.
- `e2e/home.spec.ts` -- Playwright style; add `e2e/signup.spec.ts` (Mailpit REST at `http://127.0.0.1:54324/api/v1/messages` for the confirmation mail).
- `src/lib/*.test.ts` -- Vitest style for the schema and action tests. `messages/*.json` key parity is already tested.
- To create: `proxy.ts`, `src/lib/supabase/{server,client,proxy}.ts`, `src/modules/auth/{schemas,actions}.ts` (shared by 1.5-1.6; AD-1's five modules do not own auth tables), `app/signup/{page,form}.tsx`.
- Not to change: `_bmad/`, planning documents, `docs/refleksjonsnotater.md` entries, `.github/workflows/*`.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- add `@supabase/supabase-js` and `@supabase/ssr` with pnpm -- clients (AD-5 client key)
- [x] `supabase/config.toml` -- password rules and confirmations on -- FR1
- [x] `supabase/migrations/<ts>_abuse_limiter.sql` -- counter table with RLS and the limiter function as decided in Boundaries -- AD-21
- [x] `supabase/tests/abuse_limiter.test.sql` -- one allowed and one denied call, plus one caller-privilege allow and deny -- AD-3, AD-16
- [x] `src/types/database.ts` -- regenerate with `supabase gen types --local --lang typescript` -- AD-15
- [x] `proxy.ts`, `src/lib/supabase/*` -- cookie refresh only, no personal data read; server client with `getClaims()` helper -- AD-6
- [x] `src/modules/auth/schemas.ts`, `actions.ts` -- Zod schema, limiter checks (IP from `x-forwarded-for`, email hashed), `signUp`, result shape -- AD-17
- [x] `app/signup/page.tsx`, `form.tsx`, `messages/{nb,en}.json` -- form, rule list, inline errors, focus on first error, success message -- UX-DR25
- [x] `src/modules/auth/*.test.ts`, `e2e/signup.spec.ts` -- schema, action I/O matrix with a mocked Supabase client; e2e happy path, weak password, existing email identical, confirmation mail in Mailpit
- [x] `docs/ki-logg.md` -- append this story's entry -- AGENTS.md traceability

**Acceptance Criteria:**
- Given an unconfirmed new account, when the owner tries to log in, then Auth refuses until the Mailpit link is opened.
- Given the limiter, when a request is within its limit and then over it, then the first passes and the second is refused (pgTAP).
- Given any request, when `proxy.ts` runs, then it refreshes the cookie and reads no personal data; no `getSession()` appears in `src/` or `app/` (Vitest grep).
- Given nb and en, when either file lacks a key the other has, then the existing parity test fails.

## Implementation Notes

- `Result` error gained an optional `fields` map (field name to message key) so the form can mark the right input; the `{ code, message }` core is unchanged.
- Auth answers a second sign-up for an unconfirmed email within its resend window with `over_email_send_rate_limit`; the action maps that one code to `{ ok: true }` because an error would reveal the account (AD-4). Cost: a genuine global Auth mail limit also reads as success.
- Local Auth config changes need `supabase stop && supabase start`, not only `db reset`.
- Review patch: abuse trigger added to the (unmerged) limiter migration instead of a second migration.
- `next dev` rewrote `AGENTS.md` again during e2e; reverted with `git checkout AGENTS.md`.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| anon could lower or reset a counter via PostgREST (bypass) | high | patch | `UPDATE (hits)` with `using (true)`; added an invoker `before update` trigger allowing only `hits + 1`, plus pgTAP deny. Raising another key's counter stays accepted (option C). |
| anon can read `key_hash` rows; unsalted SHA-256 guessable | medium | defer | Needed for `on conflict … returning`; a keyed hash needs a server secret, outside option C. |
| `abuse_hit` takes caller-chosen max, window, bucket; zero window divides by zero | low | rejected | Caller only affects its own return value; zero window errors out, no harm; victim-bucket burning is the accepted C weakness. |
| No purge of `abuse_counters` | medium | defer | Retention job is Target 2 (spec Design Notes). |
| `x-forwarded-for` leftmost spoofable; `unknown` shared bucket | low | rejected | Vercel overwrites the header with the client IP and always sets it; local spoofing is test-only. |
| Email budget spent when the IP was already refused | medium | patch | Reproduced from code; IP checked first and the action returns before the email call; unit test added. |
| `over_email_send_rate_limit` also covers project-wide quota | low | rejected | Documented trade-off in Implementation Notes, needed for AD-4. |
| Cloud Auth with confirmations off returns a session | medium | defer | Cloud Auth settings are not changed from this repo; belongs to Story 11.1 env checklist. |
| Timing difference new vs existing email | low | rejected | Known residual; fix adds artificial delay. |
| 72 limit counted in characters; `\p{L}` vs Auth ASCII letters | medium | patch | Confirmed against local Auth (422 and 400 responses); schema now uses bytes and `[A-Za-z]`; tests added. |
| `useEffect` without deps refocuses on every keystroke | high | patch | Dependency is now `[state]`. |
| Email cleared after a failed submit (React 19 form reset) | medium | patch | Email input is controlled. |
| `proxy.ts` 500s on an Auth outage; cache headers dropped | medium | patch | `getClaims()` wrapped in try/catch; `setAll` forwards headers. |
| Matcher runs on images | low | rejected | Cost only; fix adds a pattern. |
| e2e IP header collides; fixed window can split the sixth test | medium | patch | Random IP per test; test waits when under 15 s remain in the minute. |
| `getSession` guard test shallow | low | rejected | A grep is the spec's chosen check. |
| Limiter bucket/max/window, normalisation, `weak_password`, limiter-error branches untested; no `authenticated` pgTAP | medium | patch | Unit and pgTAP cases added (plan 11). |
| Session refresh has no behavioural test | low | defer | No session exists until Story 1.5. |
| "Existing email" unit test mocks an unused branch | low | rejected | Real behaviour covered by e2e. |
| No `/auth/confirm` callback; resend; sign-up link for signed-in users | low | rejected | Out of the story's ACs; login and shell are Stories 1.5 and 1.7. |
| `getClaims()` reads personal data | false | rejected | Proxy discards the result and reads no field. |
| ki-logg `NIL`, `last_updated` earlier than before | false | rejected | `NIL` is the owner's field; the date is a timestamp, not a rule. |

## Design Notes

Result shape for every action: `type Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } }`, exported from `src/modules/auth/schemas.ts` for 1.5-1.6. Limiter: fixed windows, counter row per `(bucket, key_hash, window_start)`, `insert … on conflict do update set hits = hits + 1 returning hits`, allowed while `hits <= max`; old windows are not purged in this story (retention job is Target 2).

## Verification

**Commands:**
- `supabase start && supabase test db` -- expected: smoke and limiter tests pass
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test && pnpm test:e2e` -- expected: all pass
- `supabase gen types --local --lang typescript | diff - src/types/database.ts` -- expected: no output
- `.githooks/test.sh` -- expected: all checks pass

**Manual checks (if no CLI):**
- Sign up at `/signup`, open Mailpit at `http://127.0.0.1:54324`, confirm the link; repeat with the same email and compare the two screens.
