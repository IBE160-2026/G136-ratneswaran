---
title: Sprint Change Proposal — AD-3 helpers on their own tables
date: 2026-10-18
status: approved
scope: minor (wording in AD-3, epics and AGENTS.md; no story added, no code change)
branch: plan/ad3-helper-policies
---

# Sprint Change Proposal — AD-3 helpers on their own tables

## 1. Issue summary

**Trigger.** Story 2.1 (issue #40, branch `feat/2.1-events-table-and-organizer-only-access`) built `public.events` and the helper `is_organizer(event_id)`. AD-3 says "every policy uses `is_organizer`, `holds_role`, `is_guest_of` and `is_guest_self`". AD-5 allows `security definer` only for mutation and system functions, so the helpers are `security invoker`. An invoker helper reads its table under RLS. A policy on that same table that calls the helper therefore recurses, and Postgres refuses the query.

**Effect.** The literal AD-3 sentence cannot be met on `events`. Story 2.1's policies compare `organizer_id = (select auth.uid())` directly. That comparison is an allowed AD-3 input, but nothing in the planning documents states it is allowed in place of the helper. The same trap waits for `holds_role` on `role_members` (Epic 3) and for `is_guest_of`/`is_guest_self` on `guests` (Epic 7).

**Evidence.**
- `supabase/migrations/20261018120000_events.sql` (policy comment).
- The deferred item and the Review Triage Log in `_bmad-output/implementation-artifacts/spec-2-1-events-table-and-organizer-only-access.md`.
- The `docs/ki-logg.md` entry for Story 2.1.

**Type.** A technical limitation found during implementation. The two ADs are in tension, and AD-5 wins. Nothing is rolled back.

## 2. Impact analysis

- **Epics.** No epic changes scope or order. The AD-3 summary (l.115), Story 2.1 AC 4, Story 3.10 AC 3 and the Epic 7 guest-session note (l.2469) get one clarifying clause each.
- **PRD.** No change.
- **Architecture.** AD-3 "Shared helpers" gains the own-table exception and its reason. AD-5 is unchanged.
- **UX.** No change.
- **AGENTS.md.** The RLS convention line gains the same exception, so agents don't "fix" the direct comparison.
- **Code.** None. Story 2.1 already implements the new wording. Epics 3 and 7 will follow it when built.
- **Sprint status.** No change. The Story 2.1 PR is not blocked; it can point to this proposal.

## 3. Recommended approach

**Direct adjustment (wording only).** Effort: low. Risk: low.

The alternative was to make the helpers `security definer` so that every policy could call them. That widens AD-5's confined set of elevated functions. It would also need the same proof per helper that AD-5 asks of mutation functions, and it gains nothing over the direct comparison. Rejected.

## 4. Detailed change proposals

### Architecture — `architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md`, AD-3 (l.86)

OLD:

> - **Shared helpers:** every policy uses `is_organizer(event_id)`, `holds_role(role_id)`, `is_guest_of(event_id)` and `is_guest_self(guest_id)`.

NEW:

> - **Shared helpers:** every policy uses `is_organizer(event_id)`, `holds_role(role_id)`, `is_guest_of(event_id)` and `is_guest_self(guest_id)`, except on the table a helper itself reads (`events`, `role_members`, `guests`). There the policy compares that table's allowed input with `(select auth.uid())` directly. The helpers are `security invoker` (AD-5), so calling one from a policy on its own table would recurse under RLS.

Rationale: this keeps the four allowed inputs as the only policy inputs and records the one layout that works with AD-5.

### Epics — `epics.md`

**AD-3 summary (l.115).** Only the inserted clause changes. The rest of the line is unchanged.

OLD:

> … through the helpers `is_organizer`, `holds_role`, `is_guest_of`, `is_guest_self`; never email matching; …

NEW:

> … through the helpers `is_organizer`, `holds_role`, `is_guest_of`, `is_guest_self`, except on the table a helper itself reads (`events`, `role_members`, `guests`), where the policy compares the input with `(select auth.uid())` directly because the helpers are `security invoker`; never email matching; …

**Story 2.1, AC 4 (l.637).**

OLD:

> **When** policies use it

NEW:

> **When** policies on tables that reference `events` use it (the `events` policies compare `organizer_id` directly, AD-3)

**Story 3.10, AC 3 (l.1211).**

OLD:

> **When** policies use it

NEW:

> **When** policies on tables other than `role_members` use it (the `role_members` policies compare `user_id` directly, AD-3)

**Epic 7 guest-session note (l.2469).**

OLD:

> Every guest policy uses `is_guest_of(guest_id)` or `is_guest_self(guest_id)`, never an email match (AD-3).

NEW:

> Every guest policy uses `is_guest_of(guest_id)` or `is_guest_self(guest_id)`, except the policies on `guests` itself, which compare `guests.user_id` with `(select auth.uid())` directly; never an email match (AD-3).

Rationale: the epic context files are compiled from these lines. Without the change, Epics 3 and 7 would inherit the contradiction.

### Project context — `AGENTS.md` (l.35)

OLD:

> - Every table has RLS. Policies use `is_organizer`/`holds_role`/`is_guest_of`/`is_guest_self`, never an email match. Every policy, grant and SQL function gets a pgTAP test proving one allow and one deny (AD-3, AD-16).

NEW:

> - Every table has RLS. Policies use `is_organizer`/`holds_role`/`is_guest_of`/`is_guest_self`, never an email match; on the table a helper itself reads (`events`, `role_members`, `guests`) the policy compares the AD-3 input with `(select auth.uid())` directly, because the invoker helper would recurse. Every policy, grant and SQL function gets a pgTAP test proving one allow and one deny (AD-3, AD-16).

Rationale: AGENTS.md is loaded every session, so this is where an agent actually meets the rule.

## 5. Implementation handoff

- **Scope:** minor.
- **Developer agent:** apply the six edits above on `plan/ad3-helper-policies`, one commit per artifact (`plan:` prefix). Then open a PR to `main` for the owner to review and merge.
- **Story 2.1:** no code change. After this PR merges, the deferred item in `spec-2-1-…` is resolved. The Story 2.1 PR body can link this proposal.
- **Success criteria:**
  - `grep` for "every policy uses" in AD-3, the AD-3 summary in `epics.md` and `AGENTS.md` shows the exception in each.
  - Story 2.1, Story 3.10 and the Epic 7 note no longer require a helper on its own table.
  - `pnpm format:check` passes.
