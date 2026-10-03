<!-- bmad:context -->
<!-- Verified 2026-10-03 against 430de9c. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Arrangly

Event-planning web app (weddings, parties) for the solo IBE160 course project, due 2026-12-20. Next.js 16 App Router + Supabase (Postgres RLS is the security boundary) + Anthropic API, hosted on Vercel. Planning follows BMad; all planning documents live in `_bmad-output/planning-artifacts/`.

## Policy

- Never commit or push to `main`; work on a branch (`feat/…`, `fix/…`) and open a PR. The owner reviews and merges every change. Never merge a PR yourself.
- Keep the `Co-Authored-By` trailer on every commit you author; it is the course's evidence of how AI was used.
- During implementation, never edit `_bmad/` or the planning documents in `_bmad-output/planning-artifacts/`. If code must contradict a planning document, stop and propose `bmad-correct-course`.
- `docs/refleksjonsnotater.md` is append-only: when a story forces a choice the reflection report must explain, offer a new entry in the existing format. Never rewrite existing entries.
- Never use `SUPABASE_SECRET_KEY` outside the four places in AD-5 (invite exchange, invitee creation, notification delivery, auth-user deletion), and never import it into a client component.
- Never change the Supabase cloud project directly (dashboard or CLI). Every schema, policy, grant, function, trigger and cron change is a new file in `supabase/migrations/`; the cloud receives it only via CI from `main`.
- Never hand-edit `src/types/database.ts`; regenerate it with `supabase gen types` after every migration.
- Never put allergy, food or hotel data in an AI prompt, a notification payload or a log line (GDPR, AD-11).

## Where things are

- Binding architecture rules AD-1–AD-21: `_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md`. Before writing SQL, an RLS policy or a Server Action, read the ADs your story names.
- Requirements: `_bmad-output/planning-artifacts/prds/prd-Arrangly-2026-09-22/prd.md`. Glossary terms (§3) are used verbatim in code.
- Building UI? Read `_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/DESIGN.md` and `EXPERIENCE.md` first.

## Running and verifying

- Use pnpm (`pnpm install`, `pnpm dlx` instead of `npx`); never npm or yarn. A second lockfile breaks Vercel's install.
- TODO at scaffold: add `"packageManager": "pnpm@<version>"` to `package.json` so Corepack rejects npm; a later refresh then drops the pnpm line above.
- TODO (verify on first refresh after scaffold): test commands for pgTAP (`supabase test db`), Vitest and Playwright. All run against local Supabase (`supabase start`, needs Docker), never the cloud project.
- TODO: Node version once `package.json` declares `engines`.

## Conventions that differ from defaults

- Only the owning module writes its tables. A multi-step change is one Postgres function called from a Server Action; direct updates only on columns the migration grants (AD-1, AD-2, AD-19).
- Every table has RLS. Policies use `is_organizer`/`holds_role`/`is_guest_of`/`is_guest_self`, never an email match. Every policy, grant and SQL function gets a pgTAP test proving one allow and one deny (AD-3, AD-16).
- `security definer` only for the functions AD-5 lists, always with `search_path = ''` and `REVOKE EXECUTE … FROM public, anon, authenticated`.
- Notifications and all app email are created only through `notifications_emit` (outbox); never send email or push from a Server Action (AD-7, AD-10).
- Only `src/modules/ai` imports `@anthropic-ai/sdk`; every call goes through `ai_reserve` with a feature key. Dev and tests use fixtures in `supabase/fixtures/ai` (AD-9).
- Session refresh lives in `proxy.ts` (Next 16), not `middleware.ts`. Server code checks users with `auth.getClaims()`, never `getSession()`.
- Supabase env names are `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`, never the legacy `ANON_KEY`/`SERVICE_ROLE_KEY`.
- Server Actions parse input with Zod first and return `{ ok: true, data } | { ok: false, error: { code, message } }`, where `message` is a next-intl key; never throw to the client.
- All UI text lives in `messages/nb.json` and `messages/en.json`; next-intl without locale in URLs (AD-14).
- Timeline order is computed per request, never stored in a column (AD-13).

<!-- /bmad:context -->
