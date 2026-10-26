
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

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-log-in-log-out-and-reset-password.md`
  summary: Cloud Auth `additional_redirect_urls` must list the production `/auth/reset` URL.
  evidence: `forgotPassword` builds `redirectTo` from the request origin; only the local allow-list names `/auth/reset`. Owner takes it in Story 11.1's environment checklist.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-draft-that-is-never-lost.md`
  summary: Prove with two database connections that simultaneous `events_create` calls for one Organizer end with one row.
  evidence: pgTAP runs in one session, so it checks the lock key and the sequential reuse but cannot race two callers (medium, unverified). A psql two-connection script or a Vitest test against local Supabase would settle it.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-3-draft-that-is-never-lost.md`
  summary: Test that `/events` leaves a published Event out of the draft list and shows the empty state for an Organizer who has none.
  evidence: No published Event can be made through the app until Story 2.8, so no test reaches the `published_at is null` filter. Story 2.4 replaces the list with cards and can carry this check (low).
- source_spec: `_bmad-output/implementation-artifacts/spec-2-5-roles-from-the-branch-pool.md`
  summary: Prove that the 2.5 backfill gives Events created before the migration six Roles with the base three active.
  evidence: pgTAP and e2e run on a freshly migrated database with no Events before `20261019170000_roles.sql`, so the backfill touches zero rows in every test (low). A pre-migration fixture or a check against the cloud data after deploy would settle it.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-7-join-through-the-invitation-link.md`
  summary: No test checks that the OAuth form on `/invite` (and `/login?next=…`) posts `next`, so an OAuth invitee could silently return to `/events` instead of `/invite`.
  evidence: Review pass 1 (verification gap): `oauth.test.ts` covers both ends with hand-built input; real OAuth cannot run in e2e, but an assertion on the hidden `next` input on `/invite` would cover the form.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-7-join-through-the-invitation-link.md`
  summary: The magic-link email template (`supabase/templates/magic_link.html`, a code only) must be applied to the cloud project by hand before invitations work there; nothing tracks it.
  evidence: CI runs only `supabase db push`; without the template, cloud invitees get Supabase's default link mail and no code, so the join flow cannot complete.
