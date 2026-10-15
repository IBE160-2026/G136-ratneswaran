# Epic 1 Context: Account and app shell

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

People can create an account, log in with email, Google or GitHub, see their events on *All events*, and set their profile, language and appearance. The app already carries the design system, localisation, accessibility floor, CI quality gates and abuse limiter that every later epic builds on.

## Stories

- Story 1.1: App runs locally on the pinned stack
- Story 1.2: Design system and language foundation
- Story 1.3: Quality gates run on every push
- Story 1.4: Create an account with email
- Story 1.5: Log in, log out and reset password
- Story 1.6: Sign in with Google or GitHub
- Story 1.7: App shell and *All events*
- Story 1.8: Feedback and state primitives
- Story 1.9: Profile and settings
- Story 1.10: Per-flow abuse-limiter buckets

## Requirements & Constraints

- Email sign-up needs a unique verified email and a password meeting a strength policy; login is blocked until the email is verified; a logged-in user lands on *All events*.
- Responses for sign-up, resend verification and forgot password are identical whether or not the account exists.
- Abuse limits on public flows: 5 per minute per IP and 3 per hour per email. Login has no app-level limiter (Auth throttles it).
- A verified provider email matching an existing account opens that same account (no duplicate user); an unverified provider email or a cancelled provider flow links nothing and shows a clear message.
- Accessibility floor: skip link first, landmarks (`header`, `nav`, `main`), `<html lang>` matches language, title "{Surface} – {Event} – Arrangly", focus moves to `h1`, errors use `aria-invalid`/`aria-describedby` and focus the first error, reduced motion becomes cross-fades. Statuses never rely on colour alone; Blocked is never red. Tap targets at least 44px; works at 320px/375px.
- Undo toasts last 10 s (pause on hover/focus, polite, F6 or Alt+T); skeletons not spinners; load failures show an inline `role="alert"` card with Retry; offline and save failures keep input; motion 150–250 ms.
- Privacy notice page (nb and en) lists processors (Supabase, Vercel, Anthropic, Google), what is stored and how a Guest deletes their data; the 15-day auto-deletion is added later (Story 7.9).
- Notification preferences are not shown in Epic 1 (Epic 10 adds them). The Create-new-event card belongs to Epic 2.

## Technical Decisions

- Stack pinned: Next.js 16.3 App Router, TypeScript 5.9, Tailwind 4.3, shadcn/ui, Lucide, Supabase (supabase-js 2.117, ssr 0.12), next-intl 4.14, Zod 4.6, Vitest 5, Playwright 1.63. pnpm only, `packageManager` pinned, Node engines declared; `prepare` sets `core.hooksPath .githooks`.
- Env validated with Zod at startup; legacy `ANON_KEY`/`SERVICE_ROLE_KEY` names rejected. Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` reach the client; lint fails if a client component imports the secret key or the env server section. `vercel.json` region `arn1`.
- Module folders `src/modules/{events,tasks,guests,notifications,ai}` exist; `supabase/` has `config.toml` (manual identity linking enabled), `migrations/`, `tests/`, `fixtures/ai/`, `seed.sql`.
- Sessions: `proxy.ts` only refreshes the session cookie and reads no personal data; server code uses `auth.getClaims()`, never `getSession()`. Login return paths accept relative paths only.
- Server Actions parse input with Zod first and return `{ ok, data }` or `{ ok: false, error: { code, message } }` with a next-intl key (AD-17).
- Providers: email/password, Google, GitHub through Supabase Auth only. Google/GitHub sign-in auto-links on a verified matching email. Adding a password uses `updateUser`; connecting a provider uses `linkIdentity`. Connected providers are read from the user's identities, never `raw_app_meta_data` (AD-6). Display name lives in Auth user metadata; email change needs verification.
- Localisation: next-intl without locale in URLs; user setting, else browser, else `en`; all text in `messages/nb.json` and `messages/en.json`, with a Vitest test failing on key mismatch (AD-14). Theme follows `prefers-color-scheme` by default ("Warm Sky" light, "Clear Sky" dark); `border` decorative, `input` for control boundaries, `ring` for focus.
- Abuse limiter is a Postgres-backed counter (`abuse_counters`). Story 1.10 replaces the two-value bucket check with a shape check (lowercase, digits, underscore, max 32 chars), keeps existing rows, and makes `limit()` take a flow name so each flow counts in `<flow>_ip` and `<flow>_email` (AD-21). Purging old counter rows stays with the later retention job.
- Schema changes are migrations only; regenerate `src/types/database.ts` after each and CI fails on drift; cloud receives migrations only via `supabase db push` from `main` (AD-15). Every policy, grant and SQL function needs a pgTAP allow and deny test (AD-16).
- CI: GitHub Actions starts local Supabase and runs pgTAP, Vitest and Playwright (one sample each), plus ESLint, Prettier check, secret scan and `.githooks/test.sh`; branch runs hold no cloud credentials. AI code uses fixtures unless `AI_LIVE` is set.

## UX & Interaction Patterns

- Desktop (1024px and up): left sidebar in a labelled `nav` with *All events* and profile at the bottom, `aria-current="page"`, room for a later event group. Under 1024px: top-right menu button (after the `h1` in DOM order) opens a right-hand `Sheet` that traps focus, closes on `Esc` or navigation, returns focus to the button.
- Empty *All events*: warm "Let's plan something." in the user's language.
- Login errors: "Email or password doesn't match." or "Check your inbox to verify your email." with *Resend*.
- *Profile & Settings*: language nb/en/Auto and appearance Light/Dark/System apply immediately and persist; options are written in their own language.
- Read DESIGN.md and EXPERIENCE.md before building any UI.

## Cross-Story Dependencies

- Stories 1.2 (design and i18n), 1.3 (CI) and 1.1 (scaffold) underpin all others; 1.4 creates the limiter that 1.5 reuses and 1.10 corrects.
- Story 1.6 must leave a documented mock-provider OAuth test path, reused by Epic 7's guest-upgrade test.
- Story 1.9 depends on 1.6 (linking) and 1.2 (language and theme).
- Later epics reuse Epic 1's limiter (each adds its own flow name), shell, feedback primitives and privacy page.
