---
title: 'Story 1.6: Sign in with Google or GitHub'
type: 'feature'
created: '2026-10-15'
status: 'done'
baseline_commit: '48f6a5b17bea110c618d627a8c6109151ced68dc'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: [oversized]
deferred:
  - summary: >-
      Local Auth reaches the mock GitHub through `host.docker.internal`, which Docker Engine on Linux does not resolve by default.
    evidence: |-
      The Auth container has no `extra_hosts` entry here; it works on Docker Desktop (macOS). GitHub Actions runs Linux, so the OAuth e2e tests may fail in CI only. The first CI run settles it; if they fail, point `url` at an env-substituted host that CI resolves from the Docker network gateway.
    location: >-
      supabase/config.toml, playwright.config.ts
    severity: medium (unverified)
---

<intent-contract>

## Intent

**Problem:** A user can only sign up and log in with email and password, so Story 1.6's criteria (FR1, AD-6) are unmet, and Epic 7's guest-upgrade test has no OAuth test method to reuse (NFR9).

**Approach:** Add *Continue with Google* / *Continue with GitHub* to `/login` and `/signup` through one `signInWithProvider` Server Action (`signInWithOAuth`, PKCE) and an `/auth/callback` route that exchanges the code and lands on `/events`. Supabase Auth does the verified-email linking (AD-6); no account logic of our own. Automated testing uses a small mock GitHub OAuth server that local Auth is pointed at; the same code path serves Google.

## Boundaries & Constraints

**Always:** Zod parse first (`provider` is `"google" | "github"`); return `Result`, never throw; success ends in `redirect(data.url)`. `redirectTo` is `<origin header>/auth/callback` (no query, so it matches the allow-list exactly); missing `Origin` returns `unavailable`. `/auth/callback` maps outcomes to `/login?oauth=<reason>` (`cancelled` for `error=access_denied`, `unverified` when `error_description` mentions an unverified email, `failed` for any other error or failed exchange) and success to `/events`; it never creates a session on an error. `/login` shows the matching `role="alert"` message for `oauth`, ignoring unknown values; texts name what to do ("You cancelled the sign-in. Try again or use your email.", "Your <provider> email is not verified. Verify it there, or sign up with your email.", "Couldn't sign in with that provider. Try again or use your email."). All strings in `messages/{nb,en}.json` with identical keys. Never derive providers from `raw_app_meta_data` (AD-6). `supabase/config.toml`: `[auth.external.github]` enabled with `url = "http://host.docker.internal:54399"` and literal local mock `client_id`/`secret`; `[auth.external.google]` enabled with literal placeholders and `skip_nonce_check = true` (local sign-in with Google); `additional_redirect_urls` gains `http://localhost:3000/auth/callback` and `http://127.0.0.1:3000/auth/callback`; a comment says these are local mock values and the cloud project holds the real credentials. Mock server speaks only GitHub's authorize, token, `/api/v3/user` and `/api/v3/user/emails`; the test picks the identity through a `mock_identity` cookie (JSON `{ email, verified }`, or `{ deny: true }`) set on `host.docker.internal`, so tests stay parallel-safe. Chromium resolves `host.docker.internal` to `127.0.0.1` via `--host-resolver-rules`. `docs/oauth-testing.md` explains the method for Epic 7 in English.

**Never:** Real provider calls in tests or CI, `linkIdentity`/connect-from-settings (Story 1.9), adding a password (1.9), a guest upgrade (Epic 7), a `next` return path through OAuth (lands on `/events`), a limiter on the OAuth start (no email, AD-21 lists none), `SUPABASE_SECRET_KEY` in app code, a migration, cloud Auth or provider-console changes (owner task: enter real credentials and the production callback URL in the Supabase dashboard), editing `_bmad/` or planning documents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| New account | Provider reports a verified, unknown email | User created; lands on *All events* | N/A |
| Existing account | Verified email already has a password account | Same user opens; no second user | N/A |
| Unverified email | Provider reports `verified: false` | No session; `/login?oauth=unverified` message | `role="alert"` |
| Cancelled | User denies at provider | No session; `/login?oauth=cancelled` message | `role="alert"` |
| Bad code | `/auth/callback` without or with a bad `code` | `/login?oauth=failed` | `role="alert"` |
| Unknown provider | Action called with `provider=facebook` | `invalid_input`, no Auth call | `role="alert"` |
| No `Origin` | Action without the header | `unavailable` | message shown |

</intent-contract>

## Code Map

- `src/modules/auth/actions.ts` -- add `signInWithProvider` (copy `forgotPassword`'s `Origin` handling and `refuse`); `"use server"` exports async functions only.
- `src/modules/auth/schemas.ts` -- add `providerSchema`; `Result` reused. `src/lib/supabase/server.ts` `createClient()` reused; `proxy.ts` unchanged.
- `app/auth/reset/route.ts` -- pattern for `/auth/callback/route.ts` (`exchangeCodeForSession`).
- `app/login/{page,form}.tsx`, `app/signup/{page,form}.tsx` -- add the buttons; `page.tsx` reads `searchParams.oauth`; pattern: `useActionState`, `role="alert"`.
- `messages/{nb,en}.json` -- new `auth.oauth.*`; key-parity test guards both files.
- `supabase/config.toml` -- `[auth]` redirect list, `[auth.external.*]` (only `apple` exists today). Local Auth needs `supabase stop && supabase start`.
- `playwright.config.ts` -- second `webServer` for the mock; Chromium `launchOptions.args`.
- `e2e/login.spec.ts` -- helpers `unique`, `mailLink`, `confirmed` to reuse or lift into `e2e/support.ts`; `.env.local` holds `SUPABASE_SECRET_KEY` (`process.loadEnvFile`) for an Auth admin user count in tests only.
- To create: `app/oauth-buttons.tsx`, `app/auth/callback/route.ts`, `e2e/mock-github.ts` (run with `node`), `e2e/oauth.spec.ts`, `docs/oauth-testing.md`.
- Not to change: `_bmad/`, planning documents, `supabase/migrations/`, `src/types/database.ts`, `.github/workflows/*` (CI already runs local Supabase and `pnpm test:e2e`).

## Tasks & Acceptance

**Execution:**
- `src/modules/auth/schemas.ts`, `actions.ts` -- `providerSchema`, `signInWithProvider` -- FR1, AD-6
- `app/auth/callback/route.ts` -- exchange the code; map errors to `/login?oauth=…` -- AD-6
- `app/oauth-buttons.tsx`, `app/login/*`, `app/signup/*` -- two buttons and the `oauth` alert, 44px targets, visible text -- UX-DR25
- `messages/{nb,en}.json` -- button labels and three messages in both languages
- `supabase/config.toml` -- providers and redirect URLs as above
- `e2e/mock-github.ts`, `playwright.config.ts` -- mock on port 54399, started by Playwright; host mapping -- NFR9
- `src/modules/auth/*.test.ts` -- Vitest: `signInWithProvider` for both providers, unknown provider, missing `Origin`, Auth error; callback route for each outcome (mocked client)
- `e2e/oauth.spec.ts` -- new GitHub user lands on *All events*; password user with the same verified email signs in and the Auth user count for that email stays 1; unverified, cancelled, bad callback each show their message and `/events` still redirects to `/login`; buttons present on both pages
- `docs/oauth-testing.md`, `docs/ki-logg.md` -- method (mock, cookie, host mapping, Google limits) and this story's entry in the existing format

**Acceptance Criteria:**
- Given the log-in and sign-up screens, when I choose *Continue with GitHub* (mock) with an unknown verified email, then an account exists and I land on *All events*.
- Given a verified email that already has a password account, when I continue with GitHub, then that user opens and Auth lists one user for the email.
- Given an unverified email or a cancelled consent, when I return, then I am logged out, see the matching message and no identity was linked.
- Given nb and en, when either file lacks a key the other has, then the parity test fails; and no page reads the session with `getSession()`.

## Spec Change Log

## Review Triage Log

### 2026-10-15 — Review pass
- verdicts: 41 findings — high 1, medium 4, low 24, false 7, maybe-false 5
- findings:
  - `[high]` `[patch]` Unverified provider email on an existing confirmed account is untested (account-takeover path; gap reviewer, edge hunter) — added an e2e test: same user id, providers stay `["email"]`, no session.
  - `[medium]` `[patch]` Existing-account test proves only heading and count (gap reviewer) — now asserts the same user id and providers `email` and `github`.
  - `[medium]` `[patch]` e2e uses `SUPABASE_SECRET_KEY` against the AGENTS.md rule (blind hunter, edge hunter, gap reviewer) — replaced by `docker exec … psql` on `auth.users`/`auth.identities`; no secret key left in `e2e`.
  - `[medium]` `[patch]` `usersOf` unpaged, no `res.ok` check, and the unverified test passes with zero rows (edge hunter, gap reviewer) — the psql query filters by email and the test asserts the row count.
  - `[medium]` `[defer]` `host.docker.internal` unresolved from the Auth container on Linux CI (edge hunter, gap reviewer, blind hunter) — maybe-false; see `deferred`, the first CI run settles it.
  - `[false]` `[reject]` `process.loadEnvFile(".env.local")` throws in CI (blind hunter, edge hunter) — CI copies `.env.example` to `.env.local` first, and the call is gone after the patch above.
  - `[false]` `[reject]` Claim "no `getSession()`" is untested (gap reviewer, edge hunter) — `src/lib/no-get-session.test.ts` already greps the tree.
  - `[low]` `[reject]` Mock crashes on a malformed cookie, bearer or missing `redirect_uri` (edge hunter, blind hunter) — only a hand-crafted request reaches it; test-only code.
  - `[low]` `[reject]` Mock binds `0.0.0.0` (blind hunter) — the Auth container must reach it, so loopback is not an option; it mints identities only for local tests.
  - `[low]` `[reject]` Unverified message does not name the provider (blind hunter, intent auditor) — the callback cannot know the provider; the message still says what to do.
  - `[low]` `[reject]` Regex on `error_description` is fragile (blind hunter, edge hunter, gap reviewer) — the e2e test fails on a wording change, so it cannot go unnoticed.
  - `[low]` `[reject]` Google local placeholders give a failure page; Google has no automated test (blind hunter, edge hunter, gap reviewer, intent auditor) — stated in the spec: Google needs real credentials and is a manual check.
  - `[low]` `[reject]` `Origin` header has no fallback (blind hunter) — same pattern as `forgotPassword`, already deferred in Story 1.5.
  - `[low]` `[reject]` No limiter on OAuth start (blind hunter) — the spec excludes it; AD-21 lists no OAuth bucket.
  - `[low]` `[reject]` Callback replaces an existing session; PKCE cookie lingers after failure (blind hunter, edge hunter) — the user chose to sign in again; Auth clears the verifier on next use.
  - `[low]` `[reject]` Alert focus and announcement, stale action error shadowing the callback message, key-existence and `?oauth` ignore tests (blind hunter, edge hunter) — cosmetic or hand-typed URLs; the allow-list is tested through the page.
  - `[low]` `[reject]` Message-key lookup built from the raw query value (blind hunter) — guarded by the allow-list in the same file.
  - `[low]` `[reject]` Unconfirmed password account meets a verified provider (blind hunter) — Auth's linking rule applies (AD-6); no custom account logic by design.
  - `[low]` `[reject]` Process notes: `epic-1-context.md` rewritten, `ki-logg` has no PR link, oversized spec (blind hunter, edge hunter, intent auditor) — the context file is the workflow's regenerated output, committed on its own; the PR is opened after this pass.
  - `[low]` `[reject]` Remaining nb copy, `/signup` landing on `/login`, `config.toml` mock values reaching the cloud, no return path (blind hunter, intent auditor) — the cloud takes config only through the dashboard, and the spec sets the landing page.
  - `[false]` `[reject]` Intent readings A–E diverge on surfaces (intent auditor) — descriptive only; the diff implements the spec's reading.

## Design Notes

GoTrue's GitHub provider derives authorize, token and API URLs from `url` (GitHub Enterprise style: `{url}/login/oauth/authorize`, `{url}/login/oauth/access_token`, `{url}/api/v3/user[/emails]`). The mock's `code` and `access_token` are the identity cookie's base64url JSON, so it keeps no state. Google's flow validates an ID token against Google and cannot be faked this way; it shares the `signInWithOAuth` call and callback, so GitHub proves the code path and Google is a manual check with real credentials. If local Auth rejects a mock detail, adapt the mock, not the app code.

## Verification

**Commands:**
- `supabase stop && supabase start && supabase test db` -- expected: pass (no SQL change)
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test && pnpm test:e2e` -- expected: all pass
- `.githooks/test.sh` -- expected: all checks pass

**Manual checks (if no CLI):**
- With real Google credentials in the cloud project, *Continue with Google* creates an account and lands on *All events*.

## Auto Run Result

Status: done

**Summary:** *Continue with Google* and *Continue with GitHub* on `/login` and `/signup` through `signInWithProvider` and an `/auth/callback` route; Auth links verified same-email accounts. A stateless mock GitHub server with a cookie-chosen identity gives local and CI a documented OAuth test method.

**Files changed:**
- `src/modules/auth/{schemas,actions}.ts`, `app/auth/callback/route.ts`, `app/oauth-buttons.tsx`, `app/{login,signup}/page.tsx` -- action, callback, buttons and messages.
- `messages/{nb,en}.json`, `supabase/config.toml` -- strings, providers, callback redirect URLs.
- `e2e/{mock-github,support,oauth.spec}.ts`, `e2e/login.spec.ts`, `playwright.config.ts`, `src/modules/auth/oauth.test.ts` -- mock, shared helpers, e2e and unit tests.
- `docs/oauth-testing.md`, `docs/ki-logg.md`, `epic-1-context.md` -- method, log entry, regenerated epic context.

**Review:** 41 findings. Patched 4 (1 high, 3 medium): unverified-takeover test, same-user assertion, no secret key in e2e, row counts. Deferred 1 (`host.docker.internal` on Linux CI, unverified). Rejected the rest with reasons in the triage log.

**Follow-up review recommended:** true. The patched high was a missing test; the unverified risk is that the OAuth e2e tests fail on the Linux CI runner.

**Verification:** `pnpm lint`, `format:check`, `tsc --noEmit` pass; `pnpm test` 94 passed; `supabase test db` 26 passed before the patches (no SQL change); `.githooks/test.sh` 26 of 26; `pnpm test:e2e` 25 of 25 locally.

**Residual risks:** CI on Linux may not resolve `host.docker.internal`; Google is manual only; the owner must enter real Google and GitHub credentials and the production `/auth/callback` URL in the Supabase dashboard.
