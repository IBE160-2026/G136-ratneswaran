
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-app-runs-locally-on-the-pinned-stack.md`
  summary: `next dev` appends a "nextjs-agent-rules" block to AGENTS.md on every run, dirtying the tree.
  evidence: Seen in this story's diff; reverted by hand, and the generator re-adds it. The owner decides whether to adopt it or disable it, since it edits an agent-context file.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-app-runs-locally-on-the-pinned-stack.md`
  summary: CI runs no type-check or `next build`, so a type or build error passes CI.
  evidence: `ci.yml` runs lint, format, Vitest, gitleaks and the hook test only; Story 1.3 (quality gates) is the place to add `tsc --noEmit` and `pnpm build`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-design-system-and-language-foundation.md`
  summary: `pnpm test:e2e` is not run in CI, so the layout, skip link, `lang` and theme checks are not gated.
  evidence: `ci.yml` has no Playwright step; Story 1.3 wires Playwright into CI.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-design-system-and-language-foundation.md`
  summary: `RouteFocus` is untested and may miss an `h1` that renders after the pathname changes (Suspense).
  evidence: Only one route exists; add a client-navigation e2e test when Story 1.4 adds a second route.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-create-an-account-with-email.md`
  summary: Add a purge for `abuse_counters` rows older than their window.
  evidence: One row per key per window is written and never deleted; the retention job is Target 2.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-create-an-account-with-email.md`
  summary: Hash limiter keys with a server-side secret and stop anon reading `abuse_counters`.
  evidence: Option C needs a SELECT grant for the upsert, so unsalted hashes of emails and IPs are readable and guessable (medium, accepted for Core).
- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-create-an-account-with-email.md`
  summary: Verify cloud Auth has email confirmation on and test `refreshSession` cookie forwarding.
  evidence: Cloud Auth settings are outside migrations (Story 11.1 checklist); sessions first exist in Story 1.5.
