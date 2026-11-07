---
title: 'Timeline: List view'
type: 'feature'
created: '2026-11-07'
status: 'done'
baseline_revision: '2f8495b0d497a05ba9c0bc086555da27afeb48be'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-7-timeline-swimlane-view.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/EXPERIENCE.md'
warnings: []
deferred:
  - summary: >-
      Decision point words are not in the List link name and no test renders a bar with a point.
    evidence: |-
      The Core loader passes no decision data; Story 4.8 supplies it.
    location: >-
      app/events/[eventId]/timeline/timeline-list.tsx
    severity: low
---

<intent-contract>

## Intent

**Problem:** The swimlane Timeline scrolls sideways and cannot be read on a phone or by assistive technology without two-way scrolling (WCAG 1.4.10). Story 5.8 asks for the same data as a plain grouped list (FR20, UX-DR15, NFR5, NFR6).

**Approach:** Same page `/events/[eventId]/timeline`, same `computeTimeline` result, plus a List rendering and a link-based view toggle in the URL (`?view=list|lanes`). With no `view` param the server renders both views and CSS picks one: List below 768px, swimlanes from 768px. No JS, no browser-clock logic.

## Boundaries & Constraints

**Always:**
- One data source: the existing page call to `loadTimelineInput` and `computeTimeline`; no new query, no SQL, no migration, no change to `task_state` or RLS, no `SUPABASE_SECRET_KEY`.
- Toggle: two links (Swimlanes, List) in a labelled group; the current one has `aria-current="true"`. `?view=list` or `?view=lanes` forces that view at every width; no param means List below 768px and swimlanes above. When the param is absent, render the toggle twice (one `md:hidden` marking List, one `hidden md:block` marking Swimlanes) so `aria-current` is right at both widths. `?obsolete=1` and `view` survive each other (every link on the page keeps the other param). Unknown `view` values behave as absent.
- List: one `section` per lane in `timeline.lanes` order; `h2` with the Role name, lead line and holders (same `events.team.*` messages and "Invite pending" text as the lane view), then `<ul aria-label="{Role}">` of top-level Tasks in computed order, Subtasks as a nested `<ul>` inside their parent `<li>`.
- Each Task row is one full-width `Link` to `/events/{id}/tasks/{taskId}`, `min-h-touch` (44px), title wraps (`break-words`), no truncation, no fixed widths, no horizontal scroll at 375px or 320 CSS px. Its `aria-label` is exactly the lane view's `timeline.barLabel` or `barLabelBlocked` (plus `, Not yet accepted`). Visible content: title, dates, status as icon plus word from `STATUSES`, "waits for {task}", "Not yet accepted" as words. Obsolete rows struck through with the word "Obsolete". Extract the text building out of `timeline-view.tsx` `Bar` into one shared hook so both views share one label.
- A Decision point (`bar.point`) shows icon plus the words "Needs a decision" (filled) or "Decided" (outline). The loader passes none in Core; do not add placeholders.
- Lane states: readable and empty gives "No tasks in this Role yet"; unreadable gives only `dashboard.unreadable` with `{role}` and a Lock icon, no counts, no rows.
- Organizer only (`timeline.inactiveRoleTasks > 0`, already organizer-gated in `computeTimeline`): one line below the lists reusing `dashboard.inactiveRoleTasks`, linking to `/events/{id}/team`. A holder never sees it.
- Everything else from Story 5.7 stays: read-only, `readOnly` note, Show obsolete link, empty message, Jump to today (swimlane only), `loading.tsx`, `error.tsx`, title, `h1`.
- All new text in `messages/nb.json` and `messages/en.json`, same keys (`src/i18n/locale.test.ts` checks parity). Status is never colour alone.

**Never:**
- No client JS for choosing the view, no `window.matchMedia`, no redirect on viewport, no cookie. No change to `computeTimeline` semantics, no Dashboard change, no inactive-Role note in the swimlane view.
- Do not edit `_bmad/` or planning documents, do not hand-edit `src/types/database.ts`, no `docs/refleksjonsnotater.md` edit.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Phone default | 375px, no `view` | List visible, swimlane hidden, toggle marks List, no horizontal page scroll | none |
| Desktop default | 1280px, no `view` | swimlane visible, List hidden, toggle marks Swimlanes | none |
| Forced view | `?view=list` at 1280px, `?view=lanes` at 375px | the forced view only | none |
| 320px reflow | long title, many Roles | titles wrap, `document` scrollWidth <= clientWidth, every row at least 44px high | none |
| Empty Role | active Role, no Tasks | heading, lead, holders, "No tasks in this Role yet" | none |
| Unreadable Role | holder of Role A | Role B group: heading, lead, holders, "Tasks in Program are visible to its team.", no rows | none |
| Subtask | parent with child | child link inside a nested list in the parent `<li>` | none |
| Inactive Role | Organizer, 2 Tasks on an inactive Role | line "2 tasks belong to inactive Roles" linking to Team & Roles; holder sees none | none |
| Obsolete | Obsolete Task | hidden unless `?obsolete=1`; link and toggle keep `view` | none |

</intent-contract>

## Code Map

- `app/events/[eventId]/timeline/page.tsx` -- reads `searchParams` (`obsolete`); add `view` (`"list" | "lanes" | undefined`), pass it and `timeline.inactiveRoleTasks` (organizer flag) down. Next 16: `searchParams` is a Promise; read `node_modules/next/dist/docs/` before editing.
- `app/events/[eventId]/timeline/timeline-view.tsx` -- `Bar` builds `dates`, `word`, `waits`, `label` inline (extract), `Lane` is the swimlane lane, `TimelineView` renders h1, New task, Show obsolete link (`base`, `?obsolete=1`), readOnly note, empty note and `TimelineScroller`. Wrap the scroller in the swimlane visibility classes, add toggle and `<TimelineList>`.
- `app/events/[eventId]/timeline/bar-text.ts` (new, no `"use client"`) -- hook `useBarText(bar)` returning `{ dates, word, waits, label }`, using `useTranslations`/`useFormatter` exactly as `Bar` does now.
- `app/events/[eventId]/timeline/timeline-list.tsx` (new, server component) -- grouped list described above. Reference for holders/lead/pending markup: `Lane` in `timeline-view.tsx` and `app/events/[eventId]/on-track.tsx` (inactive-Role link at the bottom).
- `src/lib/status.ts` -- `STATUSES` (`decision`, `done`, icons and tones); read-only. `app/globals.css` -- `--spacing-touch` (`min-h-touch`), tokens `border`, `card`, `muted`, `status-*`.
- `messages/nb.json`, `messages/en.json` -- add to `timeline`: `viewLabel` ("View"), `viewLanes` ("Swimlanes"), `viewList` ("List"), `emptyRole` ("No tasks in this Role yet"), `decisionOpen` ("Needs a decision"), `decisionResolved` ("Decided"); Bokmål equivalents. Reuse `dashboard.inactiveRoleTasks`, `dashboard.unreadable`, `events.team.*`, `status.*`, `timeline.barLabel*`.
- `e2e/timeline.spec.ts`, `e2e/support.ts` -- existing `setup()` helper and 4 desktop tests (default viewport stays swimlane; hidden List does not match role queries). Add Story 5.8 tests here.
- `docs/ki-logg.md`, `_bmad-output/implementation-artifacts/sprint-status.yaml` -- entry; set `5-8-timeline-list-view` to `review`.

## Tasks & Acceptance

**Execution:**
- `app/events/[eventId]/timeline/bar-text.ts` -- extract shared label/word/dates hook; use it in `Bar` -- one accessible name for both views
- `app/events/[eventId]/timeline/timeline-list.tsx` -- List view -- the story
- `app/events/[eventId]/timeline/timeline-view.tsx` and `page.tsx` -- `view` param, toggle, visibility classes, `view`-preserving links, inactive-Role line -- the toggle and default rule
- `messages/nb.json`, `messages/en.json` -- new `timeline.*` keys
- `e2e/timeline.spec.ts` -- Playwright: 375px default List (h2 per Role, nested Subtask, empty-Role text, row opens Task detail, rows at least 44px high, `scrollWidth <= clientWidth` at 375 and 320, toggle to Swimlanes via `?view=lanes` and back with URL); desktop default swimlane and `?view=list` List; holder sees unreadable text in List and no inactive-Role line, Organizer sees it with link to `/team`; `aria-label` of a List link equals the swimlane link's
- `docs/ki-logg.md`, `sprint-status.yaml` -- entry and `review`

**Acceptance Criteria:**
- Given the toggle, when I choose List, then the same `computeTimeline` data shows as one group per active Role in lane order with nested Subtasks, the URL carries `view=list`, and List is the default below 768px while remaining available on desktop.
- Given 375px and 320 CSS px, when List renders, then nothing scrolls horizontally, long titles wrap, every row is at least 44px high and opens its Task detail.
- Given a Role group, then it has a heading, the lead and holders; empty says "No tasks in this Role yet"; an unreadable Role says only "Tasks in {Role} are visible to its team."; Decision points read "Needs a decision" or "Decided" with an icon.
- Given a row, then status and Role are icon plus word and the link name equals the swimlane's "{title}, {dates}, {status}, waits for {x}".
- Given the Organizer and Tasks on an inactive Role, then a line with the count links to Team & Roles; a holder never sees it.

## Spec Change Log

## Review Triage Log

### 2026-11-07 — Review pass
- verdicts: 25 findings — high 0, medium 0, low 10, false 15
- findings:
  - `[low]` `patch` lead and holder lines could overflow at 320px with a long unbroken name — `break-words` added.
  - `[low]` `patch` toggle links 44px high but narrow — `min-w-touch` added (done before review, found in screenshots).
  - `[low]` `patch` toggle keeping `obsolete`, Hide obsolete and unknown `view` untested — assertions added to the desktop e2e test.
  - `[low]` `defer` Decision point words missing from the link name (WCAG 2.5.3) and no render test — loader passes no points in Core (Story 4.8).
  - `[low]` `reject` inactive-Role line only in List — the AC sits under the List story and the Dashboard shows it; spec says no note in swimlanes.
  - `[low]` `reject` unreadable lane shows lead and holders — AC3 and Epic 5 context require them for every Role.
  - `[low]` `reject` empty page message plus per-Role "No tasks" duplicate; empty `<p>` when no holders (same as lane view); spec wording nit on `md:block`.
  - `[false]` `reject` both views shipped in HTML (display:none leaves the a11y tree); scroller measures width 0 when hidden (ResizeObserver re-measures on show, Jump computes on click); `t` unused in `Bar` (lint passes); status tokens missing (used by the lane view); nested list unlabeled, deep nesting at 320px (Subtasks are one level); mixed landmarks; forced lanes reflow (region scrolls inside it); bookkeeping files absent from diff (committed after review).

## Auto Run Result

Status: done. Summary: List view and URL toggle on `/events/[eventId]/timeline` reusing `computeTimeline`; CSS picks List below 768px when no `view` param; shared `useBarText` keeps one link name.

Files: `app/events/[eventId]/timeline/{bar-text.ts,timeline-list.tsx,timeline-view.tsx,page.tsx}`, `messages/*.json`, `e2e/timeline.spec.ts`, `docs/ki-logg.md`, `sprint-status.yaml`.

Review: 3 low patches, 1 deferred, rest rejected above. Follow-up review recommended: false (no high, no medium).

Verification: lint, format:check, tsc (source clean), Vitest 446, `.githooks/test.sh` 27, Playwright timeline, shell, dashboard, holder-view pass; screenshots at 375, 320 and 1280px viewed.

Residual risk: Decision point markup untested until Story 4.8.

## Verification

**Commands:**
- `pnpm lint && pnpm format:check && pnpm exec tsc --noEmit && pnpm test` -- expected: pass
- `pnpm test:e2e --workers=1 e2e/timeline.spec.ts e2e/shell.spec.ts e2e/dashboard.spec.ts; git checkout AGENTS.md` -- expected: pass (needs `supabase start`)
- `.githooks/test.sh` -- expected: pass

**Manual checks:** screenshots at 375px, 320px and desktop of `/timeline` (default, `?view=list`, `?view=lanes`) viewed by the runner.
