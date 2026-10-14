
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-app-runs-locally-on-the-pinned-stack.md`
  summary: `next dev` appends a "nextjs-agent-rules" block to AGENTS.md on every run, dirtying the tree.
  evidence: Seen in this story's diff; reverted by hand, and the generator re-adds it. The owner decides whether to adopt it or disable it, since it edits an agent-context file.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-app-runs-locally-on-the-pinned-stack.md`
  summary: CI runs no type-check or `next build`, so a type or build error passes CI.
  evidence: `ci.yml` runs lint, format, Vitest, gitleaks and the hook test only; Story 1.3 (quality gates) is the place to add `tsc --noEmit` and `pnpm build`.
