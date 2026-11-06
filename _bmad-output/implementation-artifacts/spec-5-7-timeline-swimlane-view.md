---
title: 'Timeline: swimlane view'
type: 'feature'
created: '2026-11-06'
status: 'done'
baseline_revision: 'd11cc9a51eb6a7ad7d62155e371e844e3136de10'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-6-timeline-computation.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/EXPERIENCE.md'
warnings: []
deferred: []
---

<intent-contract>

## Intent

**Problem:** Story 5.6 computes the Timeline but no page draws it. A Team member cannot see the Event as one lane per Role, the order of work, or where Tasks clash (FR20, UX-DR15).

**Approach:** A read-only server-rendered page `/events/[eventId]/timeline` with a sidebar link, built on `computeTimeline` and `loadTimelineInput`. The computation gains the per-bar status the view needs; pure layout and week-label helpers get Vitest tests; one small client component scrolls, fades edges and jumps to today.

## Boundaries & Constraints

**Always:**
- Core scope only (Epic 5 context): overdue, blocked, waiting, done, open, not-yet-accepted, obsolete. No Decision, Problem or Proposed Task placeholders; decision diamonds are drawn only if a bar has `point`.
- "Today" and every date come from the server in the Event's zone (`eventToday`), never the browser clock. Deadlines format with `timeZone: "UTC"` so they never shift a day.
- Layout per DESIGN.md: sticky 170px Role column (Role name, holders with the existing "Invite pending" text, lead), 112px minimum lane height, 24px per day, Monday week labels, bars 40px high with radius 10px (`--radius` scale already has Timeline bars 10), today line (primary, 2px, labelled "Today"), Event-day column in `primary-soft` (labelled), 48px edge fade in `card` colour where the area scrolls.
- Status is icon plus word from `STATUSES` and the `status.*` messages, never colour alone. Blocked and not-yet-accepted bars have a dashed border; blocked bars also say "waits for {task}". Obsolete bars are struck through with the word "Obsolete".
- A bar narrower than 112px is still drawn at its true start and width, but its link has `min-width` 112px and lane packing uses that visual width so labels never overlap.
- Scroll area: `role="region"`, `aria-label` "Timeline" (localised message), `tabindex="0"`. Each readable lane is `<ul aria-label="{Role name}">` in computed order; each Task is a link named `{title}, {dates}, {status}[, waits for {task}]`; Subtasks are a nested list inside their parent's `<li>`. Focusing a link must not leave it under the sticky column or the fade (`scroll-margin`).
- Read-only: no drag and drop, no hover-only affordance. Cancelled and past published Events render the same page with the `tasks.readOnly` note and no *New task* link.
- Unreadable lane: Role column in full, body text `dashboard.unreadable` with `{role}`, no bars, no counts. Organizer and own holders see the bars.
- *Show obsolete (n)* is a link toggling `?obsolete=1`, shown only when `obsoleteCount > 0`, so it survives reload; off by default.
- All UI text in `messages/nb.json` and `messages/en.json`, same keys in both. Every route has a final-shape `loading.tsx` Skeleton, the Events `error.tsx` Retry card, `document.title` "Timeline – {Event} – Arrangly" via `generateMetadata`, and an `h1` (RouteFocus moves focus).
- No `SUPABASE_SECRET_KEY`, no SQL, no migration, no change to `task_state` or RLS.

**Never:**
- No List view or view toggle (Story 5.8), no phone-default redirect, no Dashboard changes, no inactive-Role note, no Decision data, no stored order, no `docs/refleksjonsnotater.md` edit.
- Do not edit `_bmad/` or planning documents. Do not hand-edit `src/types/database.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bar status | open past deadline / waiting_external / in_progress / done / obsolete / not_started | `status` overdue (with `overdueDays`) / waiting / inProgress / done / obsolete / notStarted; done and obsolete are never overdue | none |
| Blocked | Task depends on a live, non-obsolete, not-done Task | `blocked` true, `waitsFor` = earliest-deadline blocker's title; done or obsolete blockers do not block | none |
| Not accepted | delegated Task, open, `accepted` false | `notAccepted` true; false when undelegated, accepted, done or obsolete | none |
| Week labels | axis 2026-12-14 to 2027-01-18, `en` and `nb` | one label per Monday with its day offset; year is shown on the first label and on the first Monday of a new year; month names localised | none |
| Lane layout | overlapping bars; bar with Subtasks; 1-day bar | overlapping parents get separate tracks, none overlap horizontally using the 112px minimum width; a block with children is taller; lane height at least 112 | none |
| Unreadable lane | holder of Role A opens page | Role B column full, body shows the unreadable text, no bars | none |
| Empty | no bars at all | empty message and *New task* (Organizer or Lead of an active Role, Event not read-only) | none |
| Two-year range | tasks 2 years apart | page scrolls horizontally, *Jump to today* scrolls today (or the nearest edge) into view | none |

</intent-contract>

## Code Map

- `src/modules/tasks/timeline.ts` -- `computeTimeline`, `loadTimelineInput` (two queries, keep exactly two `from` calls), `eventToday`; add per-task `status`, `delegated`, `accepted` inputs and per-bar `status`, `overdueDays`, `blocked`, `waitsFor`, `notAccepted`; loader selects `status, owner_user_id, accepted_at` too and returns `canCreate` (`isOrganizer`, or the viewer is a joined Lead of an active Role, from the Roles embed).
- `src/modules/tasks/timeline.test.ts` -- existing 18 tests and the `task()` factory (add defaults for new fields); extend for status, blocked, notAccepted, `canCreate`.
- `src/modules/tasks/timeline-layout.ts` (new) -- pure `axisWeeks(start, end, locale)` and `placeLane(bars, axisStart)` plus constants (day 24, role column 170, min bar width 112, bar 40, child bar 28, gap 8, min lane 112). `timeline-layout.test.ts` (new) -- Vitest incl. year boundary, `en` and `nb`.
- `src/lib/status.ts` -- `STATUSES` icon and tone per status (read-only). `src/components/status-label.tsx` -- icon plus word (client-safe pattern; bars may use `STATUSES` directly).
- `app/events/[eventId]/tasks/page.tsx` -- pattern for `readOnly` (`!isDraft(event) && isPast(event, new Date())`), `generateMetadata`, claims redirect. `app/events/[eventId]/my-tasks/{loading,error}.tsx` -- Skeleton shape and `export { default } from "../../error"` Retry card. `app/events/[eventId]/on-track.tsx` -- holders, lead and "Invite pending" rendering (`events.team.people.pending`, `events.team.lead.current|none`, `dashboard.unreadable`). `app/events/[eventId]/load-event.ts` -- `loadEvent`.
- `src/components/app-nav.tsx` -- add the Timeline `NavLink` (lucide `ChartGantt`) after Tasks, before Team; message `shell.timeline`.
- `app/events/[eventId]/timeline/{page.tsx,timeline-view.tsx,timeline-scroller.tsx,loading.tsx,error.tsx}` (new). The scroller is the only `"use client"` file: scroll state for the 48px left and right fades, *Jump to today* button.
- `messages/nb.json`, `messages/en.json` -- new `timeline` namespace and `shell.timeline`; reuse `status.*`, `tasks.readOnly`, `dashboard.unreadable`, `events.roles.<key>.name`, `events.team.*`. `src/i18n/locale.test.ts` checks key parity.
- `app/globals.css` -- tokens `status-done|waiting|overdue|blocked-row`, `primary-soft`, `card`, `border`; global `:focus-visible` exists.
- `e2e/dashboard.spec.ts` and `e2e/support.ts` -- `seed(email, starts)`, `psql`, `signedIn`, `unique` pattern for the new `e2e/timeline.spec.ts`.
- `docs/ki-logg.md` -- add the Story 5.7 entry; `_bmad-output/implementation-artifacts/sprint-status.yaml` -- set `5-7` to `review` (not planning docs).
- Read Next 16 docs in `node_modules/next/dist/docs/` before writing page code (`searchParams` is a Promise).

## Tasks & Acceptance

**Execution:**
- `src/modules/tasks/timeline.ts` -- add status, blocked, waitsFor, notAccepted, overdueDays to bars; loader fields and `canCreate` -- the view needs them without a third query
- `src/modules/tasks/timeline.test.ts` -- cover the status, blocked, not-accepted and `canCreate` rows of the matrix
- `src/modules/tasks/timeline-layout.ts` and `.test.ts` -- `axisWeeks` and `placeLane` with tests for the Week-label, Lane-layout rows
- `messages/nb.json`, `messages/en.json` -- `timeline.*` and `shell.timeline` keys
- `src/components/app-nav.tsx` -- Timeline link
- `app/events/[eventId]/timeline/*` -- page, view, scroller, loading, error
- `e2e/timeline.spec.ts` -- Playwright: Organizer opens Timeline from the sidebar, sees region "Timeline", a nested Subtask, a blocked bar, a Role lane, clicks a Task and lands on its detail; holder of Role A sees Role B's lane with the unreadable text and no bars; Show obsolete survives reload
- `docs/ki-logg.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml` -- entry and `review` status

**Acceptance Criteria:**
- Given the sidebar, when I open Timeline on desktop, then the page shows the sticky Role column, lanes, a 24px-per-day axis with Monday week labels, status-styled bars with icon and word, a today line and an Event-day column, with edge fades where it scrolls; weeks across a year boundary are labelled correctly in `en` and `nb` (Vitest).
- Given a lane of a Role I do not hold, then only the Role column and the unreadable text show, while the Organizer and own holders see its bars.
- Given a bar, when I click it or press Enter, then the Task detail opens; the link name is "{title}, {dates}, {status}, waits for {x}"; blocked bars differ visibly; Subtasks nest in their parent; obsolete Tasks need *Show obsolete (n)*, kept in the URL.
- Given the scroll area, then it is `region` "Timeline" with `tabindex="0"`, lanes are labelled lists in order, focus scrolls a link into view, and the page is read-only.
- Given a two-year span, then it scrolls horizontally and *Jump to today* works.
- Given loading, failure and no Tasks, then Skeleton, Retry card and the empty message with *New task* show; a cancelled or past Event renders read-only.

## Spec Change Log

## Review Triage Log

### 2026-11-06 — Review pass
- verdicts: 29 findings — high 0, medium 3, low 11, false 15 (rejected), maybe-false 0
- findings:
  - `[medium]` `patch` not-accepted shown by dashed border only — word added to bar and link name.
  - `[medium]` `patch` bar with 112px minimum overflows the canvas at the axis end — canvas width now includes every placed bar.
  - `[medium]` `patch` no test for cancelled, empty, Overdue word, two-year scroll — added to e2e/timeline.spec.ts.
  - `[low]` `patch` Event-day and Today labels overlap — separate header rows. Fades stale on width change — canvas observed. Jump to today instant scroll. Dead decision/notAccepted keys removed.
  - `[low]`/`[false]` `reject` searchParams array, magic scroll margin, addDays duplicate, unknown dependency ignored (RLS), struck Obsolete word (UX-DR4), unreadable lane not a list, multi-day Event column, unknown status default, generateMetadata duplication (cache), e2e limiter copy, child-bar test gaps, Subtask-before-parent (axis includes children), Jump position assertion — each judged not reachable or cosmetic.

## Auto Run Result

Status: done. Summary: read-only Timeline page `/events/[eventId]/timeline` with sidebar link, per-bar status in `computeTimeline`, pure `axisWeeks` and `placeLane`, one client scroller (fades, Jump to today), Skeleton and Retry, and Playwright checks.

Files: `src/modules/tasks/timeline.ts`, `timeline.test.ts`, `timeline-layout.ts`, `timeline-layout.test.ts`, `app/events/[eventId]/timeline/*`, `src/components/app-nav.tsx`, `messages/*.json`, `e2e/timeline.spec.ts`, `docs/ki-logg.md`, `sprint-status.yaml`.

Review: 7 concerns patched (3 medium), none deferred, rest rejected with reasons above. Follow-up review recommended: false (patched mediums: 3, none high; small and covered by e2e).

Verification: lint, format:check, tsc, Vitest (446), `.githooks/test.sh`, Playwright timeline and shell specs (9 passed).

Residual risk: no visual check in a browser; full e2e suite not rerun.

## Design Notes

Status precedence for the word and icon: obsolete, done, overdue, waiting, in progress, not started. Blocked and not-accepted are separate border styles, so a blocked overdue bar shows Overdue and a dashed border plus "waits for". Lane packing is a greedy track assignment over each top-level block (parent plus its Subtasks) by visual span; shortcut: no re-sorting of tracks, upgrade if lanes grow tall.

## Verification

**Commands:**
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test` -- expected: pass
- `pnpm test:e2e --workers=1 e2e/timeline.spec.ts e2e/shell.spec.ts; git checkout AGENTS.md` -- expected: pass (needs `supabase start`)
- `.githooks/test.sh` -- expected: pass
