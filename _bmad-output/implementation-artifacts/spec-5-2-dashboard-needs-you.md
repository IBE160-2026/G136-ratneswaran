---
title: 'Dashboard: Needs you'
type: 'feature'
created: '2026-11-06'
status: 'done'
baseline_revision: '6d98555868a652d5ebf08df7222588030952ef91'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-1-dashboard-sections-and-scope.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** The Event landing page is an interim home for the Organizer and a redirect to *My tasks* for everyone else. Nobody can open an Event and see at once what needs them.

**Approach:** `/events/[eventId]` becomes the Dashboard for the Organizer and every joined Role-holder. It keeps the interim home's header (name, date, state, publish banner) and adds the *Needs you* section, fed by Story 5.1's `classifyDashboard` and rendered with the existing `TaskRow`. Core scope only.

## Boundaries & Constraints

**Always:**
- The route stays `/events/[eventId]`; no redirect for Role-holders. A viewer without access (foreign Event, Guest-only user) already gets this segment's not-found page ("You don't have access to this part of the event.", no data) through `loadEvent`; keep that.
- Sidebar item *Dashboard* (was *Overview*) is shown to the Organizer and to Role-holders, links to the Event root and carries `aria-current="page"` there. `document.title` is "Dashboard – {Event} – Arrangly".
- *Needs you* is an `h2` with a count pill; rows are `TaskRow` in the order `classifyDashboard(...).needsYou` returns; each opens Task detail and shows "Overdue N days" with icon and word, and the Not yet accepted signal as `TaskRow` already does.
- Nothing in *Needs you*: one quiet line "Nothing needs you right now." (section and `h2` stay).
- Data loads under the viewer's session and RLS from `tasks`, `task_state`, `roles` and `role_members` (`leadRoleIds`: the viewer's joined `is_lead` memberships). No `SUPABASE_SECRET_KEY`, no migration, no new table.
- The section loads inside `Suspense` with a `Skeleton` in its final shape (header row plus three rows); a failed load throws to the existing Events Retry card (`app/events/error.tsx`, `role="alert"`).
- The Task-to-`ListedTask` mapping of `my-tasks/page.tsx` is extracted once and shared by both pages; *My tasks* behaves exactly as before.
- Every string in `messages/nb.json` and `messages/en.json`.

**Never:**
- No Decision card, Problem rows, Proposed rows, *At risk*, *On track*, inactive-Role note, in-place accept/dismiss or `concurrent_edit` toast: those are Target stories (4.8, 4.10-4.14) or Stories 5.3 and 5.4, and no placeholders. Rows are links, so Core has no in-place action to double-run; Task detail actions already revalidate the Event layout.
- Do not change the join redirect code (none exists; it is the old home redirect that is removed), `_bmad/`, or planning documents.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Organizer, mixed | Overdue, stale and fine Tasks in several Roles | *Needs you* lists overdue by deadline, then stale; count pill equals the rows; fine Tasks absent | No error expected |
| Holder | Owns an overdue and a not-accepted Task; Role-mate owns an overdue one | Only the two owned rows, overdue first; the mate's Task title appears nowhere | No error expected |
| Nothing needs the viewer | Only on-track Tasks, or none | "Nothing needs you right now." and the `h2`, no list | No error expected |
| Dismissed, obsolete, proposed | Such an overdue Task exists | Not listed, not counted | No error expected |
| No access | Signed-in user with no Role in the Event | "You don't have access to this part of the event.", no Task titles | Not-found page |
| Load fails | A query returns an error | Retry card with `role="alert"` | Thrown to the error boundary |
| Title and nav | Organizer or holder opens the Event | Title "Dashboard – {Event} – Arrangly", sidebar *Dashboard* has `aria-current="page"` | No error expected |

</intent-contract>

## Code Map

- `app/events/[eventId]/page.tsx` -- interim home to rewrite: keep header, status, cancelled note and `PublishBanner`; remove the holder redirect; add the Suspense section; `generateMetadata` uses `events.home.surface`.
- `app/events/[eventId]/my-tasks/page.tsx` -- lines for tasks, roles, `task_state`, `role_members` queries and the `ListedTask` mapping; move into one shared loader (e.g. `app/events/[eventId]/tasks/load-listed.ts`) that also returns the raw fields `classifyDashboard` needs per Task (`roleId`, `overdue`, `stale_unaccepted`, `lifecycle`, `roleActive`, `ownerId`) and the viewer's `leadRoleIds`.
- `src/modules/tasks/dashboard.ts` -- `classifyDashboard`, `DashboardTask`, `DashboardViewer`; read-only.
- `app/events/[eventId]/tasks/task-row.tsx` -- `TaskRow` and `ListedTask`; read-only.
- `app/events/[eventId]/my-tasks/loading.tsx` -- skeleton style to copy; `app/events/error.tsx` -- Retry card.
- `src/components/app-nav.tsx` -- `overview` NavLink: rename to *Dashboard* (key `shell.dashboard`), show for everyone with an Event.
- `messages/nb.json`, `messages/en.json` -- `shell.overview`, `events.home.surface`, new `dashboard.*` keys.
- `e2e/events-list.spec.ts:96-98`, `e2e/holder-view.spec.ts:41`, `e2e/tasks.spec.ts:518-524`, `e2e/invite-join.spec.ts:70,79,118` -- assert the old title, label or `/my-tasks` landing; update them. New `e2e/dashboard.spec.ts`; seeding helpers in `e2e/support.ts` and `e2e/tasks.spec.ts` (`activate`, `psql`, `seed`, `signedIn`).

## Tasks & Acceptance

**Execution:**
- `app/events/[eventId]/tasks/load-listed.ts` -- shared loader extracted from My tasks -- one mapping, no drift
- `app/events/[eventId]/my-tasks/page.tsx` -- use the loader; output unchanged
- `app/events/[eventId]/needs-you.tsx` -- async section (classify, count pill, rows, empty line) and its `Skeleton` fallback
- `app/events/[eventId]/page.tsx` -- Dashboard landing as above
- `src/components/app-nav.tsx`, `messages/nb.json`, `messages/en.json` -- *Dashboard* item and new strings
- `e2e/dashboard.spec.ts` -- Organizer, holder, empty line, no-access, title, `aria-current`; update the four e2e files listed in the Code Map

**Acceptance Criteria:**
- Given local Supabase, when `supabase db reset && supabase test db`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm exec tsc --noEmit` and `pnpm test:e2e --workers=1` run, then all pass.

## Spec Change Log

## Review Triage Log

### 2026-11-06 — Review pass
- verdicts: 25 findings — high 0, medium 1, low 17, false 6, maybe-false 1
- findings:
  - `[low]` `reject` Holder on a draft Event gets an empty *Needs you* (blind, gap) — Tasks of a draft Event are Organizer-only by RLS and the empty line is accurate; not worth a guard.
  - `[low]` `reject` Zero in the count pill next to the empty line is redundant, and the line does not say why (blind) — the story specifies both the pill and the line.
  - `[medium]` `patch` Lead scope (`is_lead` and `joined_at` filter, `manages` stale rule) not exercised end to end (blind, gap) — e2e test added: a joined lead sees a Role-mate's overdue Task and not another Role's.
  - `[low]` `reject` `loadListed` runs four queries and maps more than the Dashboard needs (blind) — same query shape as Story 4.9 at Event scale; splitting adds a second loader.
  - `[low]` `reject` `rows.get(task.id)!` can throw (blind, edge, gap) — both lists derive from the same array, so the id always exists.
  - `[low]` `reject` Skeleton has a fixed three rows, no `aria-busy` (blind) — final shape is the header plus rows; row count is unknown while loading.
  - `[false]` `reject` `generateMetadata` and the page both call `loadEvent` (blind, edge) — `loadEvent` is wrapped in React `cache()`, so it runs once and `notFound` behaves the same.
  - `[low]` `reject` Nav key rename and holder `aria-current` untested (blind, intent) — a missing key fails `tsc`, lint and every e2e that opens the nav; holder title is asserted in `invite-join.spec.ts`.
  - `[low]` `reject` No Vitest for the `loadListed` mapping (blind, intent) — it is I/O glue; the e2e tests assert its outputs and the classifier has its own unit tests.
  - `[low]` `reject` `staleDays` is organizer-only, so a lead's stale row shows "Not yet accepted" without days (edge) — the shared mapping must leave My tasks unchanged; the word and icon are still shown.
  - `[low]` `reject` A Task whose Role row is not returned is dropped (edge) — members read the Event's Roles through RLS, and `roleActive` false is the safe default.
  - `[false]` `reject` A Task with no `task_state` row is treated as on track (edge) — the view is one row per Task and both reads use the same snapshot per request.
  - `[false]` `reject` Join redirect claim is wrong (edge) — the `/my-tasks` landing came from the removed home redirect; `invite-join.spec.ts` passes on the Event root.
  - `[false]` `reject` My tasks breaks on the extra columns (edge) — they are on views and tables the viewer already reads; the My tasks e2e tests pass.
  - `[maybe-false]` `reject` Metadata `notFound` twice (edge) — same cache evidence as above; would only be low.
  - `[low]` `patch` Tasks of an inactive Role are not exercised end to end (gap, deferred by the reviewer) — one assertion added to the Organizer e2e test.
  - `[low]` `reject` Invited, not yet joined holder not covered (gap) — such a holder has no `joined_at`, and RLS gives no Task rows; covered in `holder_scoped_view.test.sql`.
  - `[low]` `defer` `concurrent_edit` toast and double-click guard on the Dashboard (intent) — Core rows are links; the only in-place actions are on Proposed Tasks (Stories 4.13 and 4.14), which extend this section.
  - `[false]` `reject` Revalidation after actions is not added (intent) — `touched()` in `src/modules/tasks/actions.ts` already calls `revalidatePath(eventPath, "layout")`, which includes this page.
  - `[low]` `reject` Holder landing is a wider reading than "for the Organizer" (intent) — the epic context states the Dashboard is the landing page for joined Role-holders too; recorded as a deviation in the result.
  - `[low]` `reject` Guest-only no-access test uses a stranger (intent) — guests have no user link yet (Story 5.1 triage); the not-found path is the same.
  - `[low]` `reject` Failure path (Retry card) not tested here (intent, blind) — the Events segment `error.tsx` is Story 1.8's covered component; the thrown error reaches it.
  - `[false]` `reject` Issue body truncated, last criterion missing (intent) — true of the issue text, not the diff; the issue body was corrected.
  - `[low]` `reject` Nav item now shows to a Guest-only user (intent) — such a user only sees the no-access page behind it.
  - `[low]` `reject` Skeleton and empty line are an inference on the criterion (intent) — covered by the corrected issue text.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass
- `pnpm lint && pnpm format:check && pnpm test && pnpm exec tsc --noEmit` -- expected: pass
- `pnpm test:e2e --workers=1; git checkout AGENTS.md` -- expected: pass

## Auto Run Result

Status: done. Summary: `/events/[eventId]` is the Dashboard for the Organizer and joined Role-holders, with a *Needs you* section from `classifyDashboard`, an empty-state line, a Suspense skeleton, title "Dashboard – {Event} – Arrangly" and a *Dashboard* sidebar item.

Files changed:
- `app/events/[eventId]/tasks/load-listed.ts` -- shared Task mapping extracted from My tasks, plus the classifier input and `leadRoleIds`.
- `app/events/[eventId]/my-tasks/page.tsx` -- uses the loader.
- `app/events/[eventId]/needs-you.tsx` -- section and skeleton.
- `app/events/[eventId]/page.tsx` -- Dashboard landing, holder redirect removed.
- `src/components/app-nav.tsx`, `messages/nb.json`, `messages/en.json` -- *Dashboard* item and strings.
- `e2e/dashboard.spec.ts` and four updated e2e specs.

Review: patches applied 2 (1 medium, 1 low); deferred 1 (`concurrent_edit` toast on Proposed Task rows, Stories 4.13-4.14); the other findings are rejected with the reasons above. Follow-up review recommended: false.

Verification: see the final report; Playwright run in full.

Deviation: Role-holders also land on the Dashboard (epic context), so the post-join landing changed from `/my-tasks` to the Event root. No schema change, so no pgTAP file.

Residual risk: a failed load reaches the Events Retry card through Suspense; not exercised in a test.
