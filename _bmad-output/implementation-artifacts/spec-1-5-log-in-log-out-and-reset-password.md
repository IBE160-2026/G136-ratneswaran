---
title: 'Story 1.5: Log in, log out and reset password'
type: 'feature'
created: '2026-10-14'
status: 'done'
baseline_commit: '3cfd034f2d3dda7fdca593effc7f4c943d82b682'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: [oversized]
deferred:
  - summary: >-
      Login, resend, forgot-password and sign-up share the `signup_ip` and `signup_email` limiter buckets.
    evidence: |-
      `abuse_counters` has a check constraint allowing only those two buckets and the intent excludes a new migration, so the 3-per-hour email budget is spent jointly (sign-up, then reset, then resend, and a fourth request is refused) and one person can burn another's budget for reset. Settle with a migration widening the bucket constraint and per-flow buckets.
    location: >-
      src/modules/auth/actions.ts:limit
    severity: medium
  - summary: >-
      The password-reset `redirectTo` comes from the request `Origin` header and only the local allow-list names `/auth/reset`.
    evidence: |-
      Cloud Auth settings are not changed from this repo; the cloud `additional_redirect_urls` must list the production `/auth/reset` URL or recovery links fall back to the site root. Belongs to the Story 11.1 environment checklist; a configured site URL would also remove the header dependency.
    location: >-
      src/modules/auth/actions.ts:forgotPassword, supabase/config.toml
    severity: medium
---

<intent-contract>

## Intent

**Problem:** A verified user cannot log in, log out or recover a forgotten password, and no route is protected, so Story 1.5's acceptance criteria (FR1, AD-4, AD-6, AD-17, AD-21) are unmet and Stories 1.6-1.9 have no session flow to build on.

**Approach:** Add `/login`, `/forgot-password`, `/reset-password` and a minimal protected `/events` (*All events* placeholder that Story 1.7 fills) on `@supabase/ssr`, with `logIn`, `resendVerification`, `forgotPassword`, `updatePassword` and `logOut` Server Actions in `src/modules/auth`, reusing the `Result` shape and the `abuse_hit` limiter from Story 1.4. Recovery uses Supabase's PKCE link into a small `/auth/reset` route handler that exchanges the code.

## Boundaries & Constraints

**Always:** Zod parse first; return `Result`, never throw to the client (a successful `logIn`, `updatePassword` and `logOut` end in Next's `redirect()`, which is navigation, not an error). Messages are next-intl keys in `messages/nb.json` and `messages/en.json` with identical keys; exact texts: "Email or password doesn't match." and "Check your inbox to verify your email." + *Resend*. `invalid_credentials` and `email_not_confirmed` are the only login errors with their own message (Auth returns `email_not_confirmed` only after a correct password, so no account enumeration); every other failure is `unavailable`. `forgotPassword` and `resendVerification` return the identical `{ ok: true }` whether or not the account exists, map `over_email_send_rate_limit` to `{ ok: true }` (AD-4), and call `abuse_hit` first (IP bucket before email bucket, 5/min per IP, 3/hour per email, hashed keys; share one helper with `signUp`, not a copy). The new password uses the existing `passwordRules` and the same Zod refinements as sign-up (extract one `passwordSchema`). Return paths: `next` is accepted only when it starts with `/` and not `//` or `/\`; otherwise `/events`. Protection lives in `/events` via `getClaims()`, never in `proxy.ts` (it stays cookie-refresh only) and never `getSession()`. The header shows *Log in* and *Sign up* when logged out and a *Log out* form button when logged in. Pages set titles `{Surface} – Arrangly`; errors inline with `aria-invalid`, `aria-describedby`, focus on the first error; the credential and unverified messages use `role="alert"`. `supabase/config.toml` `additional_redirect_urls` gains `http://localhost:3000/auth/reset` and `http://127.0.0.1:3000/auth/reset` (local only). No `SUPABASE_SECRET_KEY`, no new migration, no change to `src/types/database.ts`.

**Never:** Google/GitHub (1.6), app shell, sidebar or the real *All events* content (1.7), profile or password change while logged in (1.9), sending app email (Auth mail only), cloud Auth settings, editing `_bmad/` or planning documents. No branch, status code or message that reveals whether an email exists.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Log in | Verified account, right credentials, optional safe `next` | Session set; redirect to `next` or `/events` | N/A |
| Wrong credentials | Unknown email or wrong password | `{ code: "invalid_credentials", message: "auth.logIn.errors.invalidCredentials" }` | `role="alert"`, no field marked |
| Unverified | Unconfirmed account, right password | `{ code: "email_not_confirmed", message: "auth.logIn.errors.unverified" }` and *Resend* shown | `role="alert"` |
| Resend | Any well-formed email | `{ ok: true }` and "Check your inbox to verify your email." | Over limit: `rate_limited`; Auth failure: `unavailable` |
| Unsafe return path | `next=//evil.com`, `https://x`, `/\x` | Treated as absent; lands on `/events` | N/A |
| Protected route | Logged out opens `/events` | Redirect to `/login?next=/events`; after log in returns to `/events` | N/A |
| Forgot password | Existing or unknown email | Identical `{ ok: true }` and screen | Over limit: `rate_limited` |
| Reset link | Valid recovery code | `/auth/reset` sets a session and redirects to `/reset-password` | Bad or used code: redirect to `/forgot-password?expired=1` with a message |
| New password | Weak or over 72 bytes | `invalid_input` with `fields.password`, inline rule list | No Auth call |
| Log out | Logged in | Session ended; `/events` redirects to `/login` | N/A |

</intent-contract>

## Code Map

- `src/modules/auth/schemas.ts` -- `Result`, `passwordRules`, `signUpSchema`; extract `passwordSchema` and add `logInSchema`, `emailSchema`, `safeNext`.
- `src/modules/auth/actions.ts` -- `signUp` holds the inline IP-then-email limiter and the `over_email_send_rate_limit` mapping; pull the limiter into a non-exported helper and reuse it; add the new actions here (`"use server"` files export async functions only).
- `src/lib/supabase/server.ts` -- `createClient()` and `getClaims()`; reuse. `src/lib/supabase/proxy.ts` and `proxy.ts` -- unchanged.
- `app/layout.tsx` -- header nav is static (Home, Sign up); make it session-aware with `getClaims()`; `RouteFocus` and the skip link stay.
- `app/signup/{page,form}.tsx` -- pattern to copy: `useActionState`, controlled inputs, `aria-describedby`, focus-first-error effect, `generateMetadata` title.
- `messages/{nb,en}.json` -- add `shell.logIn`, `shell.logOut`, `events.*`, `auth.logIn.*`, `auth.forgot.*`, `auth.reset.*`; the key-parity test already guards both files.
- `supabase/config.toml` -- `[auth] additional_redirect_urls`; local Auth needs `supabase stop && supabase start` after the change.
- `e2e/signup.spec.ts` -- Mailpit REST at `http://127.0.0.1:54324/api/v1` and per-test random `x-forwarded-for`; copy for the new e2e. `src/modules/auth/{actions,schemas}.test.ts` -- Vitest style with mocked `@/lib/supabase/server` and `next/headers`.
- To create: `app/login/{page,form}.tsx`, `app/forgot-password/{page,form}.tsx`, `app/reset-password/{page,form}.tsx`, `app/auth/reset/route.ts`, `app/events/page.tsx`, `e2e/login.spec.ts`.
- Not to change: `_bmad/`, planning documents, `docs/refleksjonsnotater.md` entries, `.github/workflows/*`, `supabase/migrations/`.

## Tasks & Acceptance

**Execution:**
- `src/modules/auth/schemas.ts` -- extract `passwordSchema`; add `logInSchema`, `forgotSchema`, `safeNext` -- AD-17
- `src/modules/auth/actions.ts` -- shared limiter helper; `logIn`, `resendVerification`, `forgotPassword`, `updatePassword`, `logOut` -- FR1, AD-4, AD-21
- `app/auth/reset/route.ts` -- `exchangeCodeForSession(code)`; redirect to `/reset-password` or `/forgot-password?expired=1` -- AD-6
- `app/login/*`, `app/forgot-password/*`, `app/reset-password/*` -- pages and forms with inline errors, rule list on reset, *Resend* on unverified, *Forgot password* link -- UX-DR25
- `app/events/page.tsx` -- protected placeholder with `h1` *All events*; redirects to `/login?next=/events` when logged out -- FR1
- `app/layout.tsx` -- session-aware header with *Log in* / *Sign up* or *Log out* -- FR1
- `supabase/config.toml` -- add the two `/auth/reset` redirect URLs -- AD-6
- `messages/{nb,en}.json` -- all new strings in both languages
- `src/modules/auth/*.test.ts` -- Vitest for `safeNext`, `passwordSchema`, and every I/O row of the actions with a mocked client (including: limiter refusal never calls Auth; `forgotPassword` identical for both outcomes)
- `e2e/login.spec.ts` -- confirm an account through the Mailpit link, then: log in lands on *All events*; wrong password message; unverified message and *Resend* sends a second mail; logged-out `/events` returns to `/events` after login; unsafe `next` ignored; forgot password then Mailpit link then new password then log in with it; log out then `/events` redirects
- `docs/ki-logg.md` -- append this story's entry in the existing format -- AGENTS.md traceability

**Acceptance Criteria:**
- Given a logged-in user, when they open `/login`, `/forgot-password` or any page, then no page reads the session with `getSession()` (the existing Vitest grep stays green).
- Given an unknown and a known email, when each submits *Forgot password*, then the two responses and rendered screens are identical.
- Given a reset link that was already used, when it is opened, then the user lands on `/forgot-password` with an expired-link message and no session.
- Given nb and en, when either file lacks a key the other has, then the existing parity test fails.

## Spec Change Log

## Review Triage Log

### 2026-10-14 — Review pass
- verdicts: 45 findings — high 2, medium 15, low 20, false 8, maybe-false 0
- findings:
  - `[medium]` `[patch]` Reset does not revoke other sessions — added `signOut({ scope: "others" })` after `updateUser`, with a test.
  - `[low]` `[reject]` `logIn` has no limiter — AD-21 does not list login, Auth throttles sign-ins itself (30 per 5 min per IP), and the shared buckets would make it worse.
  - `[medium]` `[defer]` Flows share the signup buckets — fix needs a migration the intent excludes; see `deferred`.
  - `[medium]` `[defer]` `redirectTo` from `Origin` and production allow-list — cloud Auth config is outside this repo; see `deferred`.
  - `[low]` `[patch]` `/auth/reset` says "expired" for a link opened in another browser — copy now names that case; the route is covered by the bad-code e2e; `type=recovery` check and logging rejected as noise.
  - `[false]` `[reject]` `/events` protection only in the page — the spec chose this, and `proxy.ts` must read no personal data.
  - `[low]` `[reject]` `/reset-password` reachable while logged in — the page is only a UI path to what Auth already allows any session (`secure_password_change = false`); a cosmetic guard adds no security. Revisit with Story 1.9.
  - `[false]` `[reject]` `email_not_confirmed` leaks existence — reproduced against local Auth: wrong password gives `invalid_credentials`, right password gives `email_not_confirmed`; a typo in Resend sends only to the typed address.
  - `[high]` `[patch]` `safeNext` lets `/\t/evil.com` through — now rejects any control character, with tests.
  - `[low]` `[reject]` Password held in React state — same pattern as sign-up, needed because React 19 resets uncontrolled fields.
  - `[low]` `[reject]` Log out button styling and no `/events` nav link — cosmetic; the sidebar is Story 1.7.
  - `[low]` `[reject]` Test coverage holes — the 61 s wait is Auth's resend window, route and flows are covered by e2e, `same_password` is patched under another finding.
  - `[low]` `[reject]` Copy and docs nits — shared keys are fine, `NIL` is the owner's field, the PR link does not exist yet.
  - `[false]` `[reject]` Error contract lax — `issues[0]` exists whenever parsing fails, and supabase-js returns network failures as `error` rather than throwing.
  - `[high]` `[patch]` `safeNext` control-character open redirect (edge hunter) — same fix as above.
  - `[medium]` `[defer]` Reset locked out via shared email bucket (edge hunter) — see the bucket entry.
  - `[medium]` `[defer]` Legitimate user refused on fourth mail (edge hunter) — see the bucket entry.
  - `[low]` `[reject]` No login limiter (edge hunter) — see above.
  - `[low]` `[reject]` Recovery marker for `updatePassword` (edge hunter) — see the logged-in reset finding.
  - `[low]` `[reject]` Reset form reachable outside recovery (edge hunter) — same.
  - `[low]` `[reject]` Logged-in user sees the login form — not required by the story's criteria; no harm.
  - `[medium]` `[patch]` Expired alert stays above the success message — the alert moved into `ForgotForm` and hides on success.
  - `[low]` `[reject]` Failed code exchange leaves an existing session — correct behaviour; the other session is valid.
  - `[low]` `[reject]` Exchange throwing gives a 500 — Auth outage only; Next's error page is acceptable.
  - `[low]` `[patch]` `same_password` shown as weak password — added `auth.reset.errors.samePassword` and the mapping.
  - `[low]` `[reject]` Resend `invalid_input` marks no field — Resend appears only after a valid submit; message still shows.
  - `[medium]` `[patch]` `getClaims()` failure takes every page down — wrapped in try/catch returning null, like `proxy.ts`.
  - `[low]` `[reject]` `signOut` error leaves a session — supabase-js clears local cookies regardless of the server answer.
  - `[medium]` `[defer]` Origin not in cloud allow-list — see the redirect entry.
  - `[medium]` `[defer]` Production `/auth/reset` URL missing — see the redirect entry.
  - `[false]` `[reject]` `generateMetadata` runs unguarded — it reads no personal data and renders only a title.
  - `[false]` `[reject]` Claim: `email_not_confirmed` only after correct password — verified against local Auth, see above.
  - `[low]` `[reject]` Claim: no password change while logged in — see the logged-in reset finding.
  - `[medium]` `[defer]` Claim: per-flow limits — see the bucket entry.
  - `[low]` `[reject]` Claim: failed exchange leaves no session — see above.
  - `[medium]` `[patch]` `updatePassword` error mapping untested — added table tests for `weak_password`, `same_password` and other codes.
  - `[low]` `[patch]` `fieldErrors` passes Zod's default message for a missing field — fields now default to an empty string, with a test.
  - `[medium]` `[defer]` Shared buckets untested together — see the bucket entry.
  - `[low]` `[reject]` `logIn` not limited — see above.
  - `[medium]` `[defer]` Cloud allow-list only local (intent auditor) — see the redirect entry.
  - `[medium]` `[defer]` `redirectTo` depends on the `Origin` header (intent auditor) — see the redirect entry.
  - `[medium]` `[defer]` Shared buckets (intent auditor) — see the bucket entry.
  - `[false]` `[reject]` `/events` is a heading only — the criteria are met by the route; Story 1.7 fills it, as the spec states.
  - `[false]` `[reject]` Nav state per request — the layout already reads cookies through `getLocale`.
  - `[false]` `[reject]` No pgTAP changes — no schema change was made.

### 2026-10-15 — Review pass (follow-up)
- verdicts: 36 findings — high 0, medium 7, low 23, false 6, maybe-false 0
- findings:
  - `[medium]` `[defer]` `carried` Shared limiter buckets (blind hunter) — see the first pass.
  - `[medium]` `[defer]` `carried` `redirectTo` from `Origin` and cloud allow-list (blind hunter) — see the first pass.
  - `[low]` `[reject]` `carried` Resend with a cleared email shows only the generic message — Resend appears only after a valid submit.
  - `[low]` `[reject]` `signOut({ scope: "others" })` result ignored — supabase-js returns the error rather than throwing, and a failure leaves the state as before the patch; logging it adds a branch for no everyday case.
  - `[false]` `[reject]` `safeNext` misses `/%09/evil.com` and `/..//evil.com` — both are path-absolute references that resolve on the same origin; only a literal `//` or `/\` prefix or a control character changes the host, and all are rejected.
  - `[false]` `[reject]` `carried` `email_not_confirmed` enumeration — reproduced against local Auth in the first pass.
  - `[low]` `[reject]` Accessibility polish (focus after success, live regions, show-password) — nothing the story's criteria or the UX floor requires.
  - `[low]` `[reject]` Layout reads claims on every request and shows *Log in* during an outage — pages were already dynamic through `getLocale`; the outage nav is a transient state.
  - `[medium]` `[patch]` `getClaims` fallback has no test — added `src/lib/supabase/server.test.ts` with signed-in, no-session and Auth-down cases.
  - `[low]` `[reject]` `carried` e2e fragility (61 s wait, header collisions, first URL in mail) — the wait is Auth's resend window; the rest is test-only.
  - `[low]` `[patch]` nb `samePassword` text does not mean the English one — now "Velg et annet passord enn det du har nå."
  - `[false]` `[reject]` Process artifacts missing — the review diff excludes `docs/` and `_bmad-output/`; `ki-logg.md` and `refleksjonsnotater.md` have entries, and the PR is opened after this pass.
  - `[low]` `[reject]` `signOut` failure or throw in `updatePassword` (edge hunter) — same as above.
  - `[low]` `[reject]` Non-string `password` reaches `t()` with Zod's message (edge hunter) — only a hand-crafted POST; normal forms and a missing field are covered.
  - `[low]` `[reject]` Same for `logIn` password (edge hunter) — same reason.
  - `[low]` `[reject]` `carried` No login limiter — see the first pass.
  - `[medium]` `[defer]` `carried` Shared buckets lock a user out of recovery (edge hunter).
  - `[low]` `[reject]` `carried` Missing `x-forwarded-for` shares an `unknown` bucket — rejected in Story 1.4: Vercel always sets the header.
  - `[medium]` `[defer]` `carried` Production allow-list lacks `/auth/reset` (edge hunter).
  - `[low]` `[reject]` `carried` Valid code while a session exists — the existing session stays valid, which is correct.
  - `[low]` `[reject]` `request.url` may carry an internal host — Vercel passes the public host to route handlers; no evidence of a proxy that rewrites it.
  - `[low]` `[reject]` `?expired=0` shows the alert — hand-typed URL only, no harm.
  - `[low]` `[reject]` `carried` Resend field errors not rendered.
  - `[low]` `[reject]` Auth outage in `updatePassword` reads as an expired link — transient and recoverable by requesting a new link.
  - `[low]` `[reject]` Zod message fallback removed from `fieldErrors` (edge hunter) — all schemas carry their own keys and missing fields default to an empty string.
  - `[low]` `[reject]` Spec says `forgotSchema`, code has `emailSchema` — a name only; the key texts for resend are identical.
  - `[low]` `[reject]` `carried` Not every auth action is limited — see the login limiter row.
  - `[medium]` `[patch]` `getClaims` untested (gap reviewer) — same fix as above.
  - `[medium]` `[defer]` `carried` Buckets not pinned together by a test — see the bucket entry; a migration changes the model first.
  - `[low]` `[reject]` `carried` `logIn` not limited (gap reviewer).
  - `[false]` `[reject]` `forgotPassword` returns `unavailable` without `Origin` — depends only on the request, so it reveals nothing about the account.
  - `[low]` `[reject]` No test compares an existing and an unknown account for *Forgot password* — the action never branches on existence; Auth answers both with success.
  - `[low]` `[reject]` Reset page weak-password case not in e2e — covered by Vitest and the shared `passwordSchema`.
  - `[false]` `[reject]` Only one protected route — `/events` is the only one that exists until Story 1.7.
  - `[low]` `[reject]` Additions beyond the criteria (other sessions, `getClaims` guard, shared buckets) lack browser tests — the first two now have unit tests; buckets are deferred.
  - `[false]` `[reject]` Process steps unexercised by the diff — the PR and issue link are created in the next step.

## Design Notes

`forgotPassword` calls `resetPasswordForEmail(email, { redirectTo: <request origin> + "/auth/reset" })`; the PKCE verifier cookie is set by the same server client, so the link must be opened in the browser that asked for it (the e2e uses one page). The origin comes from the `origin` request header; if absent, return `unavailable`. `/events` is a placeholder only so "land on *All events*" and "team route" have a real target; Story 1.7 replaces its body and keeps the route and the redirect.

## Verification

**Commands:**
- `supabase start && supabase test db` -- expected: pass (no SQL change)
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test && pnpm test:e2e` -- expected: all pass
- `.githooks/test.sh` -- expected: all checks pass

**Manual checks (if no CLI):**
- Log in at `/login`, log out from the header, request a reset at `/forgot-password`, open the link in Mailpit at `http://127.0.0.1:54324`, set a new password and log in with it.

## Auto Run Result

Status: done

**Summary:** Log in, log out, resend verification, forgot and reset password on Supabase Auth, with a protected `/events` placeholder, a session-aware header and a PKCE recovery route.

**Files changed:**
- `src/modules/auth/{schemas,actions}.ts` -- `passwordSchema`, `emailSchema`, `logInSchema`, `safeNext`; five new actions and a shared limiter helper.
- `src/lib/supabase/server.ts` -- `getClaims()` returns null on failure.
- `app/{login,forgot-password,reset-password}/*`, `app/auth/reset/route.ts`, `app/events/page.tsx`, `app/layout.tsx` -- pages, recovery code exchange, protected route, header.
- `messages/{nb,en}.json`, `supabase/config.toml` -- strings and local redirect URLs.
- `src/modules/auth/*.test.ts`, `e2e/login.spec.ts` -- unit and e2e coverage; `docs/ki-logg.md` -- entry.

**Review:** 45 findings. Patched 8 entries (2 high, 3 medium, 3 low rows); deferred 2 (shared limiter buckets, cloud redirect allow-list); rejected the rest with reasons in the triage log.

**Follow-up review recommended:** false. The follow-up pass (owner-requested) found no high finding; it patched 1 medium (`getClaims` test) and 1 low (nb copy), deferred nothing new and rejected the rest with reasons in the triage log.

**Verification:** `pnpm lint`, `format:check`, `tsc --noEmit` pass; `pnpm test` 83 passed; `supabase test db` pass; `.githooks/test.sh` 26 of 26; `pnpm test:e2e` 17 of 17.

**Residual risks:** limiter buckets are shared across flows until a migration lands; `/reset-password` is reachable by a logged-in user (Auth allows the same call); the cloud project needs the production `/auth/reset` redirect URL.
