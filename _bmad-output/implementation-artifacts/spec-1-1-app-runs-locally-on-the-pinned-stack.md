---
title: 'Story 1.1: App runs locally on the pinned stack'
type: 'feature'
created: '2026-10-13'
status: 'done'
baseline_commit: '2e1a485ceb2b03f0607c5f273b346a633973629b'
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
- [x] `package.json`, `pnpm-lock.yaml`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx` -- scaffold with the pinned versions and a placeholder page -- AC 1, 2
- [x] `components.json`, `app/globals.css` -- shadcn init and Lucide with default tokens only -- AC 1
- [x] `src/modules/{events,tasks,guests,notifications,ai}/.gitkeep` -- empty module folders -- AC 1
- [x] `supabase/config.toml`, `supabase/{migrations,tests,fixtures/ai}/.gitkeep`, `supabase/seed.sql` -- `supabase init`, manual identity linking on -- AC 1
- [x] `src/lib/env.ts` -- Zod schemas split into client and server sections, rejecting legacy names -- AC 3
- [x] `src/lib/env.test.ts` -- Vitest cases for missing, legacy and valid env -- AC 3
- [x] `eslint.config.mjs` -- `no-restricted-imports` for the env server section and `SUPABASE_SECRET_KEY` in client components -- AC 4
- [x] `vercel.json` -- `regions: ["arn1"]` -- AC 4
- [x] `.env.example`, `README.md` -- prerequisites with versions and copy-paste commands from clone to pgTAP, Vitest and Playwright -- AC 5
- [x] `package.json` scripts -- `lint`, `format:check`, `prepare` -- AC 6, 7
- [x] `supabase/tests/smoke.test.sql`, `e2e/home.spec.ts`, `playwright.config.ts`, `vitest.config.ts` -- one minimal sample each for pgTAP, Playwright and Vitest -- AC 5
- [x] `.github/workflows/ci.yml` -- ESLint, Prettier check, secret scan (gitleaks binary), `.githooks/test.sh` -- AC 6, 7
- [x] `AGENTS.md` -- replace the TODO lines for packageManager, test commands and Node -- AC 2
- [x] `docs/ki-logg.md` -- append the Story 1.1 entry -- process rule

**Acceptance Criteria:**
- Given the story's seven Given/When/Then blocks in `epics.md` › Story 1.1, when each is run as written, then each passes.
- Given a push or PR, when CI runs, then a lint, format, secret-scan or hook-test failure fails the build.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Finding | Verdict | Route | Evidence |
|---|---------|---------|-------|----------|
| 1 | `prepare` fails outside a git repo | medium | patch | `git config` exits 128 with no `.git`; now `|| true`. |
| 2 | AD-5 rule misses destructuring, re-export, dynamic import, `./env.ts` | high | patch | Reproduced by reading the old visitors; rule rewritten (Identifier, export-from, ImportExpression, extension-tolerant path). |
| 3 | AD-5 rule has no test | high | patch | Nothing failed if the rule broke; `src/lib/lint-ad5.test.ts` covers 7 violations and 2 allowed cases. |
| 4 | `getServerEnv`/`clientEnv` wiring untested | medium | patch | Tests only called the parsers; two `vi.stubEnv` cases added. |
| 5 | ESLint lints `playwright-report/`, `test-results/` | medium | patch | Flat config ignores `.gitignore`; added to `ignores`. |
| 6 | gitleaks allowlists all of `.env.example` | low | patch | A real secret pasted there was invisible; allowlist now the two demo values. |
| 7 | gitleaks tarball not checksum-verified | low | patch | `sha256sum -c` added with the value from the release checksums. |
| 8 | `components.json` `rsc: false` | medium | patch | `shadcn add` would omit `"use client"` handling for App Router; set `true`. |
| 9 | `site_url` 127.0.0.1 vs README localhost | medium | patch | Auth redirects from localhost would be rejected from Story 1.4; set `localhost` and both redirect URLs. |
| 10 | `next dev` appends a Next.js block to AGENTS.md | medium | defer | Real and recurs on every `pnpm dev`; fix edits an agent-context file. Reverted from this diff. |
| 11 | CI has no `tsc`/`next build` | low | defer | Belongs to Story 1.3 quality gates (Design Notes). |
| 12 | `AI_LIVE=` or `VAPID=` empty behaves inconsistently | low | rejected | Empty `AI_LIVE` fails loudly naming the variable; the example ships `false`. |
| 13 | Empty issue path gives blank name | false | rejected | Source is always an object; no reachable empty path. |
| 14 | `clientEnv` skips legacy check | false | rejected | `getServerEnv` runs at boot over all of `process.env`. |
| 15 | e2e needs `.env.local`, timeout, `forbidOnly`, port reuse | low | rejected | README orders `cp .env.example .env.local` first; fixes add config for no observed harm. |
| 16 | `instrumentation` has no runtime guard | low | rejected | No edge routes exist. |
| 17 | `shadcn` in `dependencies` | false | rejected | `app/globals.css` imports `shadcn/tailwind.css` at build. |
| 18 | `@types/node` 26 vs `engines >=24` | low | rejected | Cosmetic; no 25/26-only API used. |
| 19 | `<html lang="en">` fixed | low | rejected | i18n is Story 1.2; the intent excludes it. |
| 20 | CI runs twice on PR branches | low | rejected | The story's AC says "a push or PR". |
| 21 | CI lacks pgTAP and Playwright | false | rejected | Story 1.3 owns it (spec Design Notes). |
| 22 | `config.toml` references unset `OPENAI_API_KEY`, `S3_*` | false | rejected | `supabase start` ran clean with these defaults. |
| 23 | Custom rule instead of `no-restricted-imports` | false | rejected | Required behaviour holds and is tested; `no-restricted-imports` cannot see `"use client"`. |
| 24 | Template literal and `server-only` hardening | low | rejected | Adds a dependency and branches for no reachable case. |
| 25 | Spec status vs sprint-status mismatch; ki-logg placeholder; reflection entry | false | rejected | Step 5 syncs status; the ki-logg gap is owner-filled and the reflection entry is offered in step 5. |
| 26 | README clone URL hardcoded | low | rejected | It is the course repo URL. |

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
