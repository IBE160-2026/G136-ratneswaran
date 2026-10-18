<!-- bmad:context -->
<!-- Verified 2026-10-13 against 121d130. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## Arrangly

Event-planning web app (weddings, parties) for the solo IBE160 course project, due 2026-12-20. Next.js 16 App Router + Supabase (Postgres RLS is the security boundary) + Anthropic API, hosted on Vercel. Planning follows BMad; all planning documents live in `_bmad-output/planning-artifacts/`.

## Policy

- Never commit or push to `main`; work on a branch (`feat/…`, `fix/…`) and open a PR. The owner reviews and merges every change. Never merge a PR yourself.
- Keep the `Co-Authored-By` trailer on every commit you author; it is the course's evidence of how AI was used.
- During implementation, never edit `_bmad/` or the planning documents in `_bmad-output/planning-artifacts/`. If code must contradict a planning document, stop and propose `bmad-correct-course`.
- `docs/refleksjonsnotater.md` is append-only: when a story forces a choice the reflection report must explain, offer a new entry in the existing format. Never rewrite existing entries.
- Never use `SUPABASE_SECRET_KEY` outside the three places in AD-5 (invite exchange, invitee creation, notification delivery), and never import it into a client component.
- Never change the Supabase cloud project directly (dashboard or CLI). Every schema, policy, grant, function, trigger and cron change is a new file in `supabase/migrations/`; the cloud receives it only via CI from `main`.
- Never hand-edit `src/types/database.ts`; regenerate it with `supabase gen types` after every migration.
- Never put allergy, food or hotel data in an AI prompt, a notification payload or a log line (GDPR, AD-11).

## Where things are

- Binding architecture rules AD-1–AD-21: `_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md`. Before writing SQL, an RLS policy or a Server Action, read the ADs your story names.
- Requirements: `_bmad-output/planning-artifacts/prds/prd-Arrangly-2026-09-22/prd.md`. Glossary terms (§3) are used verbatim in code.
- Building UI? Read `_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/DESIGN.md` and `EXPERIENCE.md` first.

## Running and verifying

- Use pnpm (`pnpm install`, `pnpm dlx` instead of `npx`); never npm or yarn. A second lockfile breaks Vercel's install.
- `package.json` pins `"packageManager": "pnpm@12.11.2"`, so Corepack rejects npm and yarn (Node 25+ no longer bundles Corepack: `brew install corepack && corepack enable npm yarn pnpm`).
- Tests, all against local Supabase (`supabase start`, needs Docker), never the cloud project: `supabase test db` (pgTAP in `supabase/tests/`), `pnpm test` (Vitest), `pnpm test:e2e` (Playwright). Checks: `pnpm lint`, `pnpm format:check`, `.githooks/test.sh`.
- Node `>=24` (`engines` in `package.json`).

## Conventions that differ from defaults

- Only the owning module writes its tables. A multi-step change is one Postgres function called from a Server Action; direct updates only on columns the migration grants (AD-1, AD-2, AD-19).
- Every table has RLS. Policies use `is_organizer`/`holds_role`/`is_guest_of`/`is_guest_self`, never an email match; on the table a helper itself reads (`events`, `role_members`, `guests`) the policy compares the AD-3 input with `(select auth.uid())` directly, because the invoker helper would recurse. Every policy, grant and SQL function gets a pgTAP test proving one allow and one deny (AD-3, AD-16).
- `security definer` only for the two kinds AD-5 lists, always with `search_path = ''`: mutation functions (the AD-2 functions, including `ai_reserve` and `guests_delete_guest_data`) are granted to `authenticated` and authorise from `auth.uid()` and the AD-3 helpers, never from an id the caller passes; system functions (`notifications_emit`, purge hooks, retention job, token exchange) are `REVOKE EXECUTE … FROM public, anon, authenticated`. Auth users are deleted in SQL, not with the Admin API.
- Notifications and all app email are created only through `notifications_emit` (outbox); never send email or push from a Server Action (AD-7, AD-10). Until Story 3.1 (Target 3) builds the outbox, `notifications_emit` is a no-op stub with the final signature, and Core sends no app email.
- Only `src/modules/ai` imports `@anthropic-ai/sdk`; every call goes through `ai_reserve` with a feature key. Dev and tests use fixtures in `supabase/fixtures/ai` (AD-9).
- Session refresh lives in `proxy.ts` (Next 16), not `middleware.ts`. Server code checks users with `auth.getClaims()`, never `getSession()`.
- Supabase env names are `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`, never the legacy `ANON_KEY`/`SERVICE_ROLE_KEY`.
- Server Actions parse input with Zod first and return `{ ok: true, data } | { ok: false, error: { code, message } }`, where `message` is a next-intl key; never throw to the client.
- All UI text lives in `messages/nb.json` and `messages/en.json`; next-intl without locale in URLs (AD-14).
- Timeline order is computed per request, never stored in a column (AD-13).

<!-- /bmad:context -->

## Traceability (sensor criteria, see `docs/sensor-criteria.md`)

- One GitHub issue per story. Branch `feat/<story-id>-<slug>` (e.g. `feat/4.3-task-status`), PR title starts with the story id and the PR body says `Closes #<issue>`.
- Commit messages: `<story-id>: <what changed and why>` on story branches; elsewhere `plan:`, `docs:`, `chore:`, `ci:` or `fix:`. At least four words after the prefix. Non-story branches are `plan|docs|chore|ci/<slug>`. Small commits, one concern each; never a catch-all commit.
- When a story's issue is closed (its PR merged), create the next story's issue from `epics.md` in `sprint-status.yaml` order, and its branch `feat/<story-id>-<slug>` from the updated `main`.
- Every story PR adds an entry to `docs/ki-logg.md`: key prompts, what the AI proposed, what the owner accepted, corrected or rejected and why, linked to the commit or PR.
- Review findings on AI-written code are posted as PR comments, not only fixed silently.
- Definition of Done: lint and format pass, no commented-out code, no unused files, no debug leftovers.
- Enforcement: `.githooks/` (commit-msg, pre-push; activate once per clone with `git config core.hooksPath .githooks`), `.claude/hooks/` (Claude only) and `.github/workflows/process.yml` (every PR). Self-test: `.githooks/test.sh`. Never skip the hooks.
