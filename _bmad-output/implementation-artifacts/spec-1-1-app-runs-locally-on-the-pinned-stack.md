---
title: 'Story 1.1: App runs locally on the pinned stack'
type: 'feature'
created: '2026-10-13'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repo has no application code. Every later story needs one scaffold, one env contract and one local-run path to build on (issue #17).

**Approach:** Scaffold Next.js 16.3 (App Router, TS 5.9, Tailwind 4.3, shadcn/ui, Lucide) with the Supabase layout from the Architecture Spine, a Zod env module, lint guards for AD-5, a README a stranger can follow, and a minimal CI that runs the same checks as local.

## Boundaries & Constraints

**Always:** pnpm only, with `packageManager` and `engines` set and the TODO lines in AGENTS.md replaced by real values. Env names are `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY`; legacy `ANON_KEY` and `SERVICE_ROLE_KEY` are rejected. `proxy.ts` (not `middleware.ts`) is created later, in Story 1.4. Layout follows the Spine source tree (`app/` and `vercel.json` at root, `src/modules/*` empty, `supabase/*`). `vercel.json` sets `regions: ["arn1"]`. `.env.example` has local defaults and no real secret; AI runs in fixture mode. Decisions (owner, 2026-10-13): `engines.node` is `>=24`; pnpm and Supabase CLI are installed locally with Homebrew; the story ships one minimal sample each of pgTAP, Vitest and Playwright so the README commands are real, and their CI wiring stays in Story 1.3.

**Never:** Touch `_bmad/` or `_bmad-output/planning-artifacts/`. Add auth, schema, migrations, design tokens or i18n content (Stories 1.2 and 1.4+). Change the Supabase cloud project. Add `npm` or `yarn` lockfiles.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fresh run | Clone, Docker running, `pnpm install`, `supabase start`, `pnpm dev` | Placeholder page served against local Supabase | N/A |
| Wrong package manager | `npm install` or `yarn install` | Corepack refuses (`packageManager` pins pnpm) | Names pnpm in the message |
| Env missing or legacy | Required variable absent, or `ANON_KEY` / `SERVICE_ROLE_KEY` set | App fails at start | Zod error names the variable |
| Client leak | Client component imports `SUPABASE_SECRET_KEY` or the env server section | `pnpm lint` fails | Lint message cites AD-5 |
| Hooks on install | `pnpm install` in a fresh clone | `prepare` sets `core.hooksPath .githooks` | N/A |

</frozen-after-approval>

## Code Map

- `AGENTS.md` -- TODO lines at "Running and verifying" are replaced with real values; touch nothing else.
- `.githooks/test.sh`, `.githooks/` -- existing hooks; CI runs `test.sh` and `prepare` activates the hooks.
- `.github/workflows/process.yml` -- existing traceability check; leave unchanged and add a separate `ci.yml`.
- `README.md` -- existing Norwegian group README; add a run section and keep the rest.
- `.gitignore` -- already covers Node and Next output; add `.env*` except `.env.example` if missing.
- Spine: Stack table (versions), "Config and secrets" row, Source tree, AD-5 and AD-11.

## Tasks & Acceptance

**Execution:**
- [ ] `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx` -- scaffold with the pinned versions and a placeholder page -- AC 1, 2
- [ ] `components.json`, `app/globals.css` -- shadcn init and Lucide with default tokens only -- AC 1
- [ ] `src/modules/{events,tasks,guests,notifications,ai}/.gitkeep` -- empty module folders -- AC 1
- [ ] `supabase/config.toml`, `supabase/{migrations,tests,fixtures/ai}/.gitkeep`, `supabase/seed.sql` -- `supabase init`, manual identity linking on -- AC 1
- [ ] `src/lib/env.ts` -- Zod schemas split into client and server sections, rejecting legacy names -- AC 3
- [ ] `src/lib/env.test.ts` -- Vitest cases for missing, legacy and valid env -- AC 3
- [ ] `eslint.config.mjs` -- `no-restricted-imports` for the env server section and `SUPABASE_SECRET_KEY` in client components -- AC 4
- [ ] `vercel.json` -- `regions: ["arn1"]` -- AC 4
- [ ] `.env.example`, `README.md` -- prerequisites with versions and copy-paste commands from clone to pgTAP, Vitest and Playwright -- AC 5
- [ ] `package.json` scripts -- `lint`, `format:check`, `prepare` -- AC 6, 7
- [ ] `supabase/tests/smoke.test.sql`, `e2e/home.spec.ts`, `playwright.config.ts`, `vitest.config.ts` -- one minimal sample each for pgTAP, Playwright and Vitest -- AC 5
- [ ] `.github/workflows/ci.yml` -- ESLint, Prettier check, secret scan (gitleaks binary), `.githooks/test.sh` -- AC 6, 7
- [ ] `AGENTS.md` -- replace the TODO lines for packageManager, test commands and Node -- AC 2
- [ ] `docs/ki-logg.md` -- append the Story 1.1 entry -- process rule

**Acceptance Criteria:**
- Given the story's seven Given/When/Then blocks in `epics.md` › Story 1.1, when each is run as written, then each passes.
- Given a push or PR, when CI runs, then a lint, format, secret-scan or hook-test failure fails the build.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Scope of CI: only the checks AC 6 and 7 name. `supabase test db`, Playwright in CI, the types-drift check and the deploy job belong to Story 1.3.

## Verification

**Commands:**
- `pnpm install && pnpm lint && pnpm format:check && pnpm test` -- expected: all pass
- `pnpm build` -- expected: succeeds
- `.githooks/test.sh` -- expected: all pass
- `npm install` -- expected: refused by `packageManager`

**Manual checks (if no CLI):**
- `supabase start` then `pnpm dev`; the placeholder page loads at http://localhost:3000 with no console error.
