
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

- source_spec: `_bmad-output/implementation-artifacts/spec-3-9-change-or-revoke-a-role.md`
  summary: The role-revoked `role="alert"` toast "Your access to {Role} was changed by {Organizer}" and its redirect (Story 3.9, UX-DR24) are built in Story 3.10.
  evidence: It needs a holder-readable record of the revoke (log reads are Organizer-only), a source for the Organizer's name (no profile table) and a landing page for the holder, none of which exist before 3.10. Owner chose this on 2026-10-28.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-10-the-role-holders-scoped-view.md`
  summary: is_team_member is an invoker helper read inside role_members_select, so it relies on the planner applying the leakproof user_id equality before the policy.
  evidence: pgTAP passes with five rows visible to a holder, but a plan that evaluates the policy first would recurse; settle it with a larger-table plan check or a different non-recursive shape.

- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-tasks-table-and-role-scoped-access.md`
  summary: `tasks_check_expected` compares `updated_at` at microsecond precision, so a Server Action that round-trips it through a JS `Date` gets a false `concurrent_edit`.
  evidence: `clock_timestamp()` has microseconds, JS `Date` milliseconds (medium). Settled in Story 4.2 by passing `updated_at` as the raw string end to end, or by a pgTAP/Vitest round trip.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-1-tasks-table-and-role-scoped-access.md`
  summary: Deleting a Task owner's auth user nulls `owner_user_id` but keeps `delegated_at` and `accepted_at`, so the Task reads as pending with stale acceptance.
  evidence: A CHECK tying them together would make `ON DELETE SET NULL` fail; the reset belongs to the account-deletion path and Story 4.7's `tasks_release_owner` (low).

- source_spec: `_bmad-output/implementation-artifacts/spec-4-2-create-edit-and-open-a-task.md`
  summary: Add `tasks.status.in_progress`, `waiting_external` and `done` to both message files.
  evidence: Only `not_started` has a key, so a Task in another status would throw a missing-message error; no writer of status exists before Story 4.4, which owns it.
- source_spec: `_bmad-output/implementation-artifacts/spec-4-2-create-edit-and-open-a-task.md`
  summary: Show the owner's name on the Task detail page and in the row.
  evidence: The owner cell renders blank when `owner_user_id` is set; it is always null until Story 4.5 delegates.
