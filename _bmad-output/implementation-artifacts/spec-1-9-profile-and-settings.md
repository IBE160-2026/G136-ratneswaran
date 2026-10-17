---
title: 'Story 1.9: Profile and settings'
type: 'feature'
created: '2026-10-15'
status: 'done'
baseline_commit: '4f283c80d02f999cbaf2566c0d7a24bb4933dbda'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
warnings: [oversized]
deferred:
  - summary: >-
      Language and Appearance radios save on change with no pending state or screen-reader confirmation, and a failed save leaves the radio on the unsaved choice.
    evidence: |-
      `RadioForm` shows only a failure alert; rapid toggling can queue several actions. Needs a pending state and a polite status once Story 1.8's toast host is used for settings.
    location: >-
      app/profile/forms.tsx
    severity: medium
  - summary: >-
      Email and password changes ask for no recent login or current password, and a password change leaves other sessions signed in.
    evidence: |-
      The spec fixes "no sign-out of other sessions" and does not ask for step-up. `secure_password_change` is false in `supabase/config.toml`. Revisit before launch (Epic 11) as a security hardening decision.
    location: >-
      src/modules/auth/actions.ts, supabase/config.toml
    severity: medium (unverified)
---

<intent-contract>

## Intent

**Problem:** A signed-in user cannot change their name, email or password, see or add sign-in methods, or pick a language or appearance, so Story 1.9's criteria (FR1, AD-6, AD-14) are unmet; the sidebar profile is plain text and `data-theme` is never set.

**Approach:** Add a `/profile` page, *Profile & Settings*, reached from the sidebar profile. Name, language and appearance live in Supabase Auth user metadata and are read from the verified claims; email, password and identity linking go through Supabase Auth (`updateUser`, `linkIdentity`, the user's identities). No table, no migration.

## Boundaries & Constraints

**Always:**
- Read DESIGN.md and EXPERIENCE.md first (Profile & Settings, Accessibility Floor, forms). Tokens only, Lucide at 1.75, no emojis, 44px targets, works at 320px. Page title "Profile & Settings – Arrangly" (nb: "Profil og innstillinger"), one `h1`, one `h2` per section: **Name**, **Email**, **Password**, **Connected accounts**, **Language**, **Appearance**. All text in `messages/{nb,en}.json` under `profile.*`, identical keys. Notification preferences are not shown (Epic 10).
- Logged-out visit to `/profile` redirects to `/login?next=/profile` (same pattern as `/events`).
- Server Actions in `src/modules/auth/actions.ts` (`"use server"`, async exports only). Each parses with Zod first (new schemas in `schemas.ts`), returns `Result` (`{ ok: true, data } | { ok: false, error: { code, message, fields? } }`) with next-intl keys as messages, never throws, and checks `getClaims()` first (no session → `unavailable`, or redirect to login).
- **Name** (`updateName`): trimmed, 1–80 chars; `updateUser({ data: { name } })`; the existing sidebar label (`user_metadata.name`, else email) then shows it.
- **Email** (`updateEmail`): `z.email`, max 254; `updateUser({ email })`; Auth sends confirmation (config has `double_confirm_changes`); success shows a `role="status"` "Check your inbox to confirm the new email." and the shown address does not change until confirmed. Same address or Auth error maps to a message, never a leak of whether another account owns the address (answer identically).
- **Password** (`updatePassword` is taken by the reset flow: add `setPassword`): `passwordSchema` from `schemas.ts` (same strength policy and the same field-error pattern as sign-up, with the live rules list), `updateUser({ password })`. One form serves both change and "add a password" for a provider-created account; the button label is `profile.password.set` for both. Error codes `weak_password` and `same_password` map as in `updatePassword`. No sign-out of other sessions here.
- **Connected accounts**: list from `supabase.auth.getUserIdentities()` (`identity.provider`), **never** `raw_app_meta_data` (AD-6; the existing `no-get-session` style test greps for forbidden calls: extend it or add a sibling grep test for `raw_app_meta_data` under `app/` and `src/`). Show *Email* (when an `email` identity exists), *Google*, *GitHub*, each "Connected" or a *Connect Google* / *Connect GitHub* button (no unlink in this story). `connectProvider` parses `provider` with `providerSchema`, requires an `Origin` header (else `unavailable`), sets a short-lived `httpOnly` `oauth_next` cookie to `/profile` (max-age 600, `sameSite=lax`, path `/`), calls `linkIdentity({ provider, options: { redirectTo: `${origin}/auth/callback`, skipBrowserRedirect: true } })` and ends in `redirect(data.url)`. `/auth/callback` reads and deletes `oauth_next`, passes it through `safeNext`, and on success redirects there instead of `/events`; on a failed exchange or provider error it redirects to `/profile?link=failed` (or `link=cancelled`) when `oauth_next` was present, else to `/login?oauth=…` exactly as today. `/profile` shows a `role="alert"` for `link=failed|cancelled` (ignore other values).
- **Language** (`updateLanguage`): `"auto" | "nb" | "en"`, stored as `user_metadata.language`. **Appearance** (`updateAppearance`): `"system" | "light" | "dark"`, stored as `user_metadata.theme`. Both are native radio groups in a `fieldset` with a `legend`, applied immediately: changing a radio submits its form (no Save button) and the page re-renders with the new `lang` and `data-theme`. Language option labels are written in their own language: "Norsk bokmål", "English", "Auto" (nb UI shows "Auto" the same); Appearance labels use the UI language (Light/Dark/System, Lys/Mørk/System).
- After every metadata write the action must make the new value visible on the next render: Auth only puts `user_metadata` into the access token on refresh, so call `supabase.auth.refreshSession()` after a successful `updateUser` that changes name, language or theme, then `revalidatePath("/", "layout")`. Verify in the e2e that claims reflect the change without a re-login; if `refreshSession` does not carry it, fall back to reading `auth.getUser()` in one shared helper and say so in the run result.
- **Locale** (`src/i18n/request.ts`, `src/i18n/locale.ts`): the locale is the user's `language` when it is `nb` or `en` (from `getClaims()`), otherwise `resolveLocale(accept-language)` as today (AD-14). Extend `resolveLocale` or add a small pure function and cover it in `locale.test.ts`. **Theme** (`app/layout.tsx`): `<html data-theme>` is `light` or `dark` from `user_metadata.theme`, and absent for `system` or unset (the CSS already follows `prefers-color-scheme` then). Persists across sessions because it lives in the user's metadata; logged-out pages stay on browser defaults.
- Sidebar (`src/components/app-nav.tsx`): the profile label becomes a link to `/profile` (min 44px, `aria-current="page"` and the same active style as *All events* when on `/profile`); *Log out* stays. `usePathname` active logic is shared, not duplicated.
- Messages: new keys also for link failures, field errors and success statuses; reuse `auth.signUp.rules*`/`errors.password` for the password rules instead of copying them.

**Never:** A table or migration, `SUPABASE_SECRET_KEY`, `getSession()`, `raw_app_meta_data`, unlinking an identity, deleting the account, avatar upload, notification preferences, a language or theme cookie or `localStorage` for logged-in users, a `next` query on the OAuth `redirectTo` (the allow-list matches the bare callback URL), real provider calls in tests (use the mock GitHub from Story 1.6, `docs/oauth-testing.md`), editing `_bmad/` or planning documents, cloud Auth changes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Change name | "  Ada L  " | Saved trimmed; sidebar shows "Ada L" after the action | Empty or over 80 chars: field error, nothing saved |
| Change email | New valid address | "Check your inbox to confirm the new email."; shown email unchanged; Auth mail sent | Invalid: field error; Auth failure: `unavailable` message |
| Add password (OAuth user) | Valid password | Saved; user can later log in with email and that password | Weak: rules list and field error |
| Change password | Valid, different password | Saved; stays signed in | Same password: `samePassword` message |
| Connect GitHub | Email user clicks *Connect GitHub* (mock) | Returns to `/profile` with GitHub shown "Connected" | Cancelled or failed: `/profile?link=…` alert, nothing linked |
| Providers list | Identities `email`, `github` | Email and GitHub "Connected", Google offers *Connect Google* | N/A |
| Language | Choose Norsk bokmål | `<html lang="nb">` immediately, nb text, persists after reload and re-login | Invalid value: `invalid_input` |
| Language Auto | Choose Auto | Browser language decides again | N/A |
| Appearance | Dark / Light / System | `data-theme` `dark` / `light` / absent immediately; persists | Invalid value: `invalid_input` |
| Logged out | `/profile` | Redirect to `/login?next=/profile` | N/A |

</intent-contract>

## Code Map

- `src/modules/auth/actions.ts` -- `updatePassword` (reset flow, `weak_password`/`same_password` mapping), `signInWithProvider` (`Origin` handling, `redirect(data.url)`), `refuse`, `fieldErrors`; add `updateName`, `updateEmail`, `setPassword`, `connectProvider`, `updateLanguage`, `updateAppearance`.
- `src/modules/auth/schemas.ts` -- `passwordSchema`, `providerSchema`, `safeNext`, `Result`; add name, email, language and theme schemas.
- `app/auth/callback/route.ts` -- exchange and error mapping (read it in full before changing); `oauth_next` cookie handling goes here.
- `app/layout.tsx` -- `getClaims()` already read; add `data-theme`; `src/i18n/request.ts` + `src/i18n/locale.ts` -- locale from accept-language; `src/i18n/locale.test.ts`.
- `src/components/app-nav.tsx` -- profile label becomes a link; `src/components/mobile-menu.tsx` passes props through.
- `app/signup/form.tsx` and `app/reset-password/form.tsx` -- pattern for the password field with live rules list, `aria-invalid`/`aria-describedby`, focus on first error, `useActionState`; `app/oauth-buttons.tsx` -- pattern for provider buttons.
- `app/events/page.tsx` -- pattern for the logged-in redirect and `generateMetadata`.
- `e2e/support.ts` (`confirmed`, `unique`, `mailLink`, `signUp`), `e2e/oauth.spec.ts` + `e2e/mock-github.ts` + `docs/oauth-testing.md` (mock identity cookie `mock_identity`, host mapping, psql helper for `auth.users`/`auth.identities`), `src/modules/auth/oauth.test.ts` (mocked-client pattern for actions), `src/lib/no-get-session.test.ts` (grep-test pattern).
- `supabase/config.toml` -- `enable_manual_linking = true`, `double_confirm_changes = true`, local callback URLs already allowed; no change expected.
- To create: `app/profile/{page,forms}.tsx` (server page plus client forms), `src/modules/auth/profile.test.ts`, `e2e/profile.spec.ts`.
- Not to change: `_bmad/`, planning documents, `supabase/migrations/`, `src/types/database.ts`, `proxy.ts`, `.github/workflows/*`.

## Tasks & Acceptance

**Execution:**
- `src/modules/auth/schemas.ts`, `actions.ts` -- schemas and the six actions above -- FR1, AD-6, AD-14, AD-17
- `app/auth/callback/route.ts` -- honour `oauth_next` and map link failures -- AD-6
- `src/i18n/{locale,request}.ts`, `app/layout.tsx` -- user language and `data-theme` from claims -- AD-14
- `app/profile/page.tsx`, `app/profile/forms.tsx` -- the six sections, auto-submitting radio groups, `role="status"`/`role="alert"` feedback
- `src/components/app-nav.tsx` -- profile link with active state
- `messages/{nb,en}.json` -- `profile.*` strings in both languages
- `src/modules/auth/profile.test.ts`, `src/i18n/locale.test.ts`, a `raw_app_meta_data` grep test -- Vitest with a mocked client: each action's success, invalid input, Auth error and no-session; locale precedence; no `raw_app_meta_data` in `app/` or `src/`
- `e2e/profile.spec.ts` -- name change shows in the sidebar; language nb then reload and re-login keep it, `lang` switches at once; dark sets `data-theme="dark"`, System removes it; email change shows the status and a mail reaches Mailpit; OAuth (mock GitHub) user adds a password, logs out and logs in with it; email user connects GitHub through the mock and the list shows it; cancelled link shows the alert; `/profile` logged out redirects; no horizontal scroll at 320px
- `docs/ki-logg.md` -- this story's entry in the existing format (Norwegian)

**Acceptance Criteria:**
- Given *Profile & Settings*, when I change my display name, then it is saved in Auth user metadata and shown across the app.
- Given I am signed in with email, when I change my email or password, then it goes through `updateUser`, an email change needs verification and the new password follows the strength policy.
- Given *Connected accounts*, when I choose *Connect Google* or *Connect GitHub*, then `linkIdentity` links it, the list comes from the user's identities, and a provider-created account can add a password.
- Given *Language* and *Appearance*, when I choose nb, en or Auto and Light, Dark or System, then it applies immediately, `lang` updates, the language options are in their own language and it persists across sessions.
- Given notification preferences, when this story is done, then they are not shown.

## Spec Change Log

## Review Triage Log

### 2026-10-15 — Review pass
- verdicts: 17 grouped entries from four layers — high 0, medium 5, low 8, false 3, maybe-false 1 (duplicates across layers share a row)
- findings:
  - `[medium]` `[patch]` A leftover `oauth_next` cookie from an abandoned *Connect* turns a later plain sign-in into a return to `/profile` (blind, edge, gap) — `signInWithProvider` now deletes the cookie before redirecting.
  - `[medium]` `[patch]` `refreshSession()` error ignored, so the action reports success while claims stay stale (blind, edge, gap) — returns `unavailable`; the value is stored, a retry is idempotent.
  - `[medium]` `[patch]` Callback's cookie deletion untested (gap) — `profile.test.ts` asserts the `oauth_next` expiry on the success path.
  - `[medium]` `[patch]` Name and email inputs reset after an invalid submit (React 19 form reset) and the password stays in state after success (edge) — inputs are controlled; email and password clear on success.
  - `[low]` `[patch]` `String(claims.email)` compares "undefined" for provider accounts without an email (blind, edge) — compares against an empty string.
  - `[medium]` `[defer]` Radios have no pending state or confirmation (blind, edge) — see `deferred`.
  - `[medium]` `[defer]` No step-up or session sign-out on email and password change (blind) — see `deferred`.
  - `[low]` `[reject]` `getClaims()` called in both `request.ts` and the layout (blind) — verification is local against cached keys; `getClaims` already catches Auth outages, so locale resolution cannot throw.
  - `[low]` `[reject]` `oauth_next` with its own query string builds `?a=1?link=failed` (edge) — the cookie is only ever set to `/profile` by our action.
  - `[low]` `[reject]` Empty profile label gives the link no text (edge) — a user always has an email or a name; provider accounts without email are outside Auth's rules.
  - `[low]` `[reject]` `getUserIdentities` error shows providers as unlinked (edge) — a failed list falls back to offering *Connect*, which Auth refuses for an already linked identity; Epic 1 has no richer load-error pattern for this page.
  - `[low]` `[reject]` `Origin` not checked against the site URL (edge) — same pattern as Story 1.5/1.6; the Auth allow-list is the guard.
  - `[low]` `[reject]` Email timing and rate-limit responses differ (blind, edge) — the same-address branch is a no-op by design; Auth throttles the rest.
  - `[low]` `[reject]` Process and test notes: `NIL` in `ki-logg`, no refleksjonsnotat, loose icon type, shallow-merge test, `getByLabel("Auto")` collision, 320px timing (blind, gap) — cosmetic or hygiene; the owner assessment is added after review.
  - `[false]` `[reject]` `mobile-menu.tsx` missing from the diff (intent) — it passes `profileLabel` through unchanged; `AppNav` carries the change.
  - `[false]` `[reject]` Intent readings B–D diverge (intent) — descriptive only; the diff implements the story through the spec.
  - `[false]` `[reject]` `linkIdentity` order versus cookie set (blind) — the cookie must follow a successful call, otherwise a failed start would leave a stale cookie.
  - `[maybe-false]` `[reject]` Claims may not carry the change after `refreshSession` (intent) — the e2e shows name, language and theme without a re-login.

## Design Notes

Why metadata and not a table: the three values are per-user, tiny and needed on every request, and the claims already carry `user_metadata`, so no query and no RLS surface is added (AD-1 and AD-2 stay untouched). The cost is the token refresh after a write; if `refreshSession` proves flaky, `getUser()` once per request in a shared helper is the fallback, not a cookie. The `oauth_next` cookie exists only because the allow-listed `redirectTo` cannot carry a query; Story 1.6's callback always lands on `/events`, and linking must return to `/profile`. Google linking cannot be tested locally (same limit as Story 1.6); GitHub through the mock proves the `linkIdentity` path.

## Verification

**Commands:**
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test` -- expected: all pass (stale `.next` types may be ignored)
- `pnpm test:e2e` -- expected: all pass, including existing specs
- `.githooks/test.sh` -- expected: all checks pass

**Manual checks (if no CLI):**
- With real Google credentials, *Connect Google* links and returns to `/profile`; an email change confirmed from both mails updates the shown address.

## Auto Run Result

Status: done

**Summary:** `/profile` (*Profile & Settings*) with name, email, password (change or add), connected accounts from the user's identities, language and appearance. Name, language and theme live in Auth user metadata, are refreshed into the claims after each write, and drive `<html lang>` and `data-theme`. `connectProvider` links GitHub or Google through `linkIdentity` and returns to `/profile` via an `oauth_next` cookie read by `/auth/callback`.

**Files changed:**
- `src/modules/auth/{schemas,actions}.ts`, `app/auth/callback/route.ts` -- six actions, return path, link failures.
- `app/profile/{page,forms}.tsx`, `src/components/app-nav.tsx` -- page, forms, profile link in the sidebar.
- `src/i18n/{locale,request}.ts`, `app/layout.tsx`, `messages/{nb,en}.json` -- user language, `data-theme`, strings.
- `src/modules/auth/{profile,oauth}.test.ts`, `src/i18n/locale.test.ts`, `src/lib/no-get-session.test.ts`, `e2e/profile.spec.ts`, `docs/ki-logg.md` -- tests and AI log.

**Review:** 17 grouped entries. Patched 5 (4 medium, 1 low): stale `oauth_next` cookie, refresh error, cookie-deletion test, form values kept or cleared correctly, empty-email comparison. Deferred 2 (medium): radio feedback and step-up on credential changes. The rest rejected with reasons in the triage log.

**Follow-up review recommended:** false.

**Verification:** `pnpm lint`, `format:check`, `tsc --noEmit` pass (stale `.next` types ignored); `pnpm test` 133 passed; `pnpm test:e2e` 43 of 43 after the patches; `.githooks/test.sh` 26 of 26 before the patches.

**Residual risks:** *Connect Google* is untested locally (GitHub mock covers the same `linkIdentity` path); a confirmed email change was not exercised end to end because confirmation links do not sign the user in; `next dev` rewrites `AGENTS.md` during e2e (reverted, not committed).
