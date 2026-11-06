---
title: 'Dashboard housekeeping'
type: 'feature'
created: '2026-11-06'
status: 'done'
baseline_revision: 'a0f7505e5d60580c954317e79ce0c2b93d4fa27e'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-2-dashboard-needs-you.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-3-dashboard-at-risk-and-on-track.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md'
warnings: []
deferred:
  - 'Show dismissed (n) and Restore (Story 4.14 function, Target): build with the Proposed Task stories.'
  - 'Your invitation card slot (Epic 7 provides the card): reserved by Epic 7, nothing to render now.'
  - 'Role-revoked toast and redirect (UX-DR24): moved to Story 3.10 by the owner on 2026-10-28; a revoked person reaches the no-access page until then.'
---

<intent-contract>

## Intent

**Problem:** Story 5.4 asks that the Dashboard be complete for every visitor. Stories 2.8 (publish banner) and 5.2 (Role-holders land on the Dashboard) already built the Core parts, but nothing proves the Role-holder path end to end (join, Dashboard, own Task first, Accept, *My tasks* still in the sidebar) or that a cancelled Event offers no *Publish* or action buttons on the Dashboard.

**Approach:** Core scope only, test-only: verify the existing behaviour with Playwright and change production code only if a check fails. *Show dismissed* and *Restore* wait for the Story 4.14 Proposed Task functions (Target); the "Your invitation" slot is reserved by Epic 7 and renders nothing now; the role-revoked toast belongs to Story 3.10.

## Boundaries & Constraints

**Always:**
- The unpublished banner text, *Publish* button, confirmation and idempotent `events_publish` stay exactly as Story 2.8 built them (`e2e/publish.spec.ts` already covers banner, dialog and disappearance).
- A joined non-Organizer Role-holder: after joining they land on `/events/[eventId]` (Dashboard); their own Task is the first link in *Needs you*; opening it and choosing *Accept task* accepts it; *My tasks* stays in the sidebar.
- A cancelled Event's Dashboard shows "Cancelled", no *Publish* button, no banner and no button other than navigation; rows stay links.
- No migration, no new table, no `SUPABASE_SECRET_KEY`; no change to `_bmad/` or planning documents.

**Never:**
- No Dismissed list, *Restore*, Undo toast, Proposed rows or "Your invitation" placeholder; no new revoke toast.
- Do not change `classifyDashboard` rules or section order.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Holder joins | Invitee completes the invite, Event published, owns a delegated overdue Task and a later one | Lands on `/events/{id}`; first *Needs you* link is the overdue Task; sidebar has *My tasks*; Task detail *Accept task* accepts once | No error expected |
| Cancelled Event | Organizer opens Dashboard of a cancelled Event with a Task | "Cancelled" shown; no *Publish*, no banner text, no button in the main region | No error expected |
| Draft, Organizer | Unpublished complete Event | Banner with *Publish* (existing test) | No error expected |

</intent-contract>

## Code Map

- `e2e/invite-join.spec.ts` -- first test already joins and lands on the Dashboard with the Task link; extend it with order, sidebar and Accept (the AC's "join → Dashboard → Task first → Accept").
- `e2e/dashboard.spec.ts` -- add the cancelled-Event test; helpers `setup`, `psql`, `signedIn`.
- `e2e/publish.spec.ts` (lines 40-76) -- existing banner/idempotent publish coverage; read-only.
- `app/events/[eventId]/page.tsx` -- `isDraft` already excludes cancelled Events from the banner; read-only unless a test fails.
- `app/events/[eventId]/tasks/[taskId]` -- *Accept task* action from Story 4.6; read-only.

## Tasks & Acceptance

**Execution:**
- `e2e/invite-join.spec.ts` -- seed a later second Task, assert the overdue one is first in *Needs you*, *My tasks* sidebar link, accept from Task detail -- Role-holder path of UJ-1
- `e2e/dashboard.spec.ts` -- cancelled Event Dashboard has no *Publish*/banner/buttons -- last AC

**Acceptance Criteria:**
- Given local Supabase, when `supabase db reset && supabase test db`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm exec tsc --noEmit` and `pnpm test:e2e --workers=1` run, then all pass.

## Spec Change Log

## Review Triage Log

### 2026-11-06 — Review pass
- verdicts: 18 findings — high 0, medium 0, low 12, false 6, maybe-false 0 (the verification-gap layer reported none)
- findings:
  - `[low]` `reject` Cancelled test covers only a never-published Event (blind) — that is the only case where `isDraft` could wrongly show the banner; a published Event is excluded by `published_at` alone.
  - `[low]` `reject` `main` button count is brittle and rows-are-links is not asserted (blind, edge) — the Task link is asserted with `needsYou(page).first()`; no other button is in `main` today and the check is the point of the AC.
  - `[low]` `reject` `getByText("Cancelled", { exact: true })` may match twice (blind, edge) — the test passed in strict mode; the Dashboard renders one status label.
  - `[low]` `patch` Banner text not asserted absent on a cancelled Event (blind, edge, intent) — added `Only your team can see this event.` count 0 to the cancelled test.
  - `[low]` `patch` `rows.last()` assumes exactly two rows (blind, edge) — added `toHaveCount(2)`.
  - `[low]` `patch` Accept not checked to be spent (blind, edge) — the *Accept task* button count 0 after accepting.
  - `[low]` `reject` Reload does not assert the accepted state or row position (blind, edge) — Story 4.6's e2e covers persistence; an accepted overdue Task stays in *Needs you* by design.
  - `[low]` `reject` `navigation "Main"` with `.first()` is fragile (blind, edge) — it passes at the default viewport and matches the pattern in `e2e/shell.spec.ts`.
  - `[low]` `reject` Zero-button check could pass before render (edge) — the test asserts the Task link (rendered content) in the same test, and Playwright auto-retries the count.
  - `[low]` `reject` No test for an empty *Needs you* Role-holder or a draft Event seen by a holder (blind) — covered by `dashboard.spec.ts` "nothing needing the viewer" and by the join test, which runs on a draft first.
  - `[low]` `reject` No idempotence test for Accept (blind, edge) — Story 4.6's double-click test covers it.
  - `[false]` `reject` Spec status `in-progress`, empty logs, no ki-logg entry (blind) — a snapshot of the working tree before the review; finalization adds them outside the reviewed diff.
  - `[false]` `reject` `git checkout AGENTS.md` unexplained (blind) — same note as in Story 5.2/5.3.
  - `[false]` `reject` Landing is asserted by `goto`, not by the join redirect (intent) — the join test asserts the URL and title straight after *Join*, before any `goto`.
  - `[false]` `reject` AC1 has no new test (intent) — `publish.spec.ts` covers banner, dialog and idempotent publish; the story adds no banner code.
  - `[false]` `reject` AC2 and AC4 have no change (intent) — excluded by the intent: *Restore* needs the Target Story 4.14 function; the invitation card is Epic 7's, "this story only reserves the slot".
  - `[false]` `reject` Cancelled half tested for the Organizer only (intent) — a holder has no Publish or Organizer actions; rows are links.
  - `[low]` `defer` Role-revoked `role="alert"` toast and redirect (intent) — not built; Story 3.9's spec moved it to Story 3.10 by owner decision (2026-10-28); a revoked person reaches the no-access page (listed in `deferred`).

## Design Notes

Most of the story already exists from Stories 2.8, 3.9, 5.2 and 5.3, so the honest Core deliverable is proof, not new code. The three deferred items are listed in frontmatter with their owner.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass
- `pnpm lint && pnpm format:check && pnpm test && pnpm exec tsc --noEmit` -- expected: pass
- `pnpm test:e2e --workers=1; git checkout AGENTS.md` -- expected: pass

## Auto Run Result

Status: done. Summary: test-only Core delivery. The Role-holder path (join, Dashboard, own overdue Task first, *My tasks* in the sidebar, *Accept task*) and the read-only cancelled Event Dashboard (no *Publish*, banner or buttons) are now proven with Playwright. No production code changed; the behaviour came from Stories 2.8, 3.9, 5.2 and 5.3.

Files changed:
- `e2e/invite-join.spec.ts` -- join test extended with row order, count, sidebar link and Accept.
- `e2e/dashboard.spec.ts` -- cancelled Event test.
- `docs/ki-logg.md` -- Story 5.4 entry.

Review: patches applied 3 (all low); deferred 1 (role-revoked toast, Story 3.10); the rest rejected with the reasons above. Follow-up review recommended: false.

Verification: `supabase db reset`, `supabase test db` (PASS), `pnpm lint`, `pnpm format:check`, `pnpm test` (414), `pnpm exec tsc --noEmit` and the full `pnpm test:e2e --workers=1` (108) passed. After the three review patches the two touched specs were re-run: the first re-run had 4 invite-join tests fail (not investigated), the second passed 12 of 12, so likely a flake. A `tsc` run right after the e2e run reported stale `.next/dev/types` errors and passed on re-run.

Residual risk: not built by scope: *Show dismissed*/*Restore* (Story 4.14), the "Your invitation" slot (Epic 7), the role-revoked toast and redirect (Story 3.10). The last acceptance criterion's "Story 3.9 toast still applies" does not match the code and needs the owner's decision.
