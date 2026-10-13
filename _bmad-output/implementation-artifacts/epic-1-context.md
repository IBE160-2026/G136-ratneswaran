# Epic 1 Context: Account and app shell

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

People can create an account, log in with email, Google or GitHub, see their events on *All events*, and set their profile, language and appearance. The app already carries the design system, localisation, accessibility floor, feedback primitives and CI that every later epic relies on. This is a Core epic (all nine stories ship before the 2026-12-15 feature freeze).

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

## Requirements & Constraints

- Accounts: email and password (verified email required before login), Google and GitHub. No other providers in v1.
- Sign-up, reset and "email exists" responses must be identical whether or not the account exists (no account enumeration).
- Sign-up is rate limited: 5 per minute per IP, 3 per hour per email; refusal is a friendly message.
- Login return paths accept relative paths only.
- Core has no application email; locally, auth mail arrives in Supabase's mail catcher.
- The app must run from `README.md` alone, with AI in fixture mode and local email, with no personal key.
- Accessibility floor: skip link first, landmarks (`header`, `nav`, `main`), `<html lang>` matches language, title pattern "{Surface} – {Event} – Arrangly", focus moves to `h1` on route change, inline errors use `aria-invalid` and `aria-describedby` with focus on the first error, `prefers-reduced-motion` reduces motion to cross-fades. Layout holds at 320px.
- Status vocabulary: colour + Lucide icon + localised word, never colour alone; Blocked is never red.
- Privacy notice page (nb and en) linked from every footer, listing processors (Supabase, Vercel, Anthropic, Google), what is stored, and how a Guest deletes data.
- Notification preferences are not shown yet (Epic 10 adds them); the Create-event card on *All events* is added by Epic 2.

## Technical Decisions

- Stack: Next.js 16 App Router, TypeScript, Tailwind 4, shadcn/ui, Lucide, Supabase, hosted on Vercel with `regions: ["arn1"]`. pnpm only; `packageManager` and `engines` in `package.json` (replace the matching TODOs in AGENTS.md).
- Repo layout: `supabase/{config.toml (manual identity linking on), migrations, tests, fixtures/ai, seed.sql}`; empty module folders `src/modules/{events,tasks,guests,notifications,ai}`; `messages/{nb,en}.json`; generated `src/types/database.ts`.
- Env: Zod-validated at startup, naming the offending variable. Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` are client-readable. Legacy `ANON_KEY`/`SERVICE_ROLE_KEY` are rejected. Lint fails if a client component imports `SUPABASE_SECRET_KEY` or the env server section.
- `proxy.ts` (not `middleware.ts`) only refreshes the session cookie and reads no personal data; server code uses `auth.getClaims()`, never `getSession()`.
- Server Actions: Zod parse first, return `{ ok: true, data } | { ok: false, error: { code, message } }` where `message` is a next-intl key; never throw to the client.
- Abuse limiter is a Postgres-backed counter, with a pgTAP test for one allowed and one denied call.
- Providers: Google/GitHub sign-in auto-links to an existing user only when the provider reports the email verified. Password added via `updateUser`; connecting providers via `linkIdentity`. Show connected providers from the user's identities, never `raw_app_meta_data`. Display name lives in Auth user metadata.
- Needs a documented automated way to test OAuth sign-in and linking (mock provider or equivalent); Epic 7's guest-upgrade test reuses it.
- Localisation: next-intl with no locale in URLs. Language comes from the user's setting, else the browser (Norwegian gives `nb`, anything else `en`). All UI text from the message files; a Vitest test fails if the two files' keys differ. Language and appearance (Light/Dark/System) persist and apply immediately.
- Theme: shadcn variables carry the DESIGN.md values ("Warm Sky" light, "Clear Sky" dark); `border` decorative only, `input` for control boundaries, `ring` for focus. System font stack, role sizes in rem, Airy and Balanced densities, radius scale.
- CI (GitHub Actions): ESLint, Prettier check, secret scan, `.githooks/test.sh`, and `supabase test db`, Vitest and Playwright (one sample each) against local Supabase in Docker, with no cloud credentials on branch runs. Fails if regenerated `src/types/database.ts` differs from the committed one. Deploy job on merge to `main` runs `supabase db push` (the only path to the cloud), configured but needing the owner to add `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`. Playwright uses AI fixtures (`AI_LIVE` unset).
- A `prepare` script sets `git config core.hooksPath .githooks`.
- Verified test commands replace the TODOs in AGENTS.md.
- Every schema change is a migration file; types regenerated after each; every policy, grant and function gets a pgTAP allow and deny test.

## UX & Interaction Patterns

- Desktop (1024px and up): left sidebar in a labelled `nav` with *All events* and profile at the bottom, `aria-current="page"` on the active item, room for the event group added later.
- Under 1024px: top-right menu button, placed after the `h1` in DOM order, opens the sidebar as a right-hand `Sheet` that traps focus, closes on `Esc` or navigation, and returns focus to the button.
- Empty *All events*: warm "Let's plan something." message in the user's language.
- Toasts for undoable actions: 10 seconds, pause on hover or focus, `polite`, reachable with F6 or Alt+T.
- Loading uses a `Skeleton` in the final layout shape, not a full-page spinner.
- Load failure: inline `role="alert"` card, "Couldn't load this. Check your connection and try again." with *Retry*, cached content stays visible. Offline or failed save: a single `role="alert"` or toast, input kept with *Retry*. Motion is 150-250 ms ease-out.
- Auth messages: "Check your inbox to verify your email.", "Email or password doesn't match." (with *Resend* when unverified).
- Language options are written in their own language.

## Cross-Story Dependencies

- 1.1 is the base for everything; 1.2 (design and i18n) underpins all UI in 1.4-1.9, and 1.3 (CI) gates all later migrations and tests.
- 1.4 establishes the Server Action result shape, `proxy.ts` and the rate limiter reused by 1.5-1.6.
- 1.6 creates the OAuth test harness reused by 1.9 (`linkIdentity`) and Epic 7.
- 1.7 uses the Sheet, and 1.8 supplies the toast and state primitives later epics use.
- Later epics extend this epic's output: Epic 2 adds the Create-event card, Epic 7.9 adds 15-day deletion to the privacy notice, Epic 10 adds notification preferences, and Epic 3 adds the Role-holder invite exchange.
