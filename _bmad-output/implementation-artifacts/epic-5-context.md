# Epic 5 Context: Dashboard and Timeline

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

An Organizer, or any Role-holder within their scope, sees the state of the Event at a glance (what needs them, what is at risk, what is on track) and reads the Event as one swimlane per Role on the Timeline. The Organizer should be able to state the Event's status from the Dashboard alone, without opening Tasks or asking anyone.

## Stories

- Story 5.1: Dashboard sections and scope
- Story 5.2: Dashboard: Needs you
- Story 5.3: Dashboard: At risk and On track
- Story 5.4: Dashboard housekeeping
- Story 5.5: Event cards show state
- Story 5.6: Timeline computation
- Story 5.7: Timeline: swimlane view
- Story 5.8: Timeline: List view
- Story 5.9: Flagship check

## Requirements & Constraints

- Team-facing status overview (FR19) and per-Role Timeline (FR20). Success check: the Organizer can read counts of done, overdue, blocked, Problem, not accepted and awaiting decision straight from the Dashboard.
- Core scope: only Core items render (overdue, blocked, waiting, done, open). Decision cards, Problems, Proposed Tasks and not-yet-accepted rows come from Target stories (4.6, 4.8, 4.10-4.14); show no placeholders for them until they ship, and keep the flagship seed to Core states until then.
- A Role-holder never receives Task data from a Role they do not hold. Every active Role's lane still shows name, holders ("Invite pending" marked) and lead to everyone on the Team; an unreadable lane shows only "Tasks in {Role} are visible to its team." with no bars or counts.
- "Today" and dates are computed on the server in the Event's time zone, never the browser clock.
- Obsolete and dismissed Tasks are hidden by default (obsolete only behind *Show obsolete (n)*); Proposed Tasks never count in any total, lane or bar.
- Status is never colour alone: icon plus word from the single status vocabulary. Every screen works at 375px and 320 CSS px reflow, with a final-shape `Skeleton`, a *Retry* card (`role="alert"`) on failure, a visible focus ring, and `document.title` plus focus on `h1`.
- Cancelled and past Events render read-only; drafts show the publish banner.
- Guest numbers (RSVP split, pie chart) and guest-card state belong to Epic 7. This epic shows only "N guests added" and reads no Guest names or food data.
- Tasks of inactive Roles are counted for the Organizer only ("N tasks belong to inactive Roles", linked to Team & Roles).

## Technical Decisions

- Everything reads through the `task_state` view (a `security_invoker` view; `blocked`, `overdue`, `stale_unaccepted` (48 h) are derived, never stored) under the viewer's own session and RLS. No `SUPABASE_SECRET_KEY`, no new tables, no stored order or state columns.
- Task visibility: organizer, or holder of the Task's Role, or Task owner. Policies use the AD-3 helpers; pgTAP must prove each viewer type (holder of one Role, holder of another, Guest-only, anonymous) gets only allowed rows.
- `classifyDashboard(tasks, viewer)` is a pure function and the only home of section rules. Fixed section order: Needs you, At risk, On track. Each Task appears once, in the highest matching section, with secondary flags kept on the row.
  - Organizer Needs you order: own open Decision Tasks, Problems, Proposed Tasks, overdue, `stale_unaccepted`, each by deadline then title. Others' Decisions go to At risk as "Waiting on {name}".
  - Lead: same rules for own Role plus own Tasks. Plain holder: only owned Tasks. A delegated, unaccepted Task shows in the owner's Needs you as "Not yet accepted".
  - At risk: waiting-on-external first, then blocked, by deadline. On track: per-Role summary (done, open, overdue), not a list.
- `computeTimeline(roles, tasks, event, today)` is one TS function run on the server per request (AD-13): one lane per active Role (empty lanes tagged), topological sort by dependency, ties by deadline, `created_at`, id; Subtasks nested under parent; cycle fallback to deadline order, terminating, logging only Event and Role ids. Bars end at deadline and start at the latest dependency deadline or `created_at` (min one day width). Axis runs from earliest start to the later of latest deadline or Event end. Data loads in two queries (Roles; Tasks with dependencies), no per-Task query. Must handle 300 Tasks across 12 Roles.
- Event cards (5.5): one grouped query over `task_state` for all visible Events, with an index on `(event_id, owner_user_id)`; query count constant regardless of Event count. "New" means owned and not yet accepted (does not clear on opening).
- Server Actions follow the Zod-in, `{ ok, data } | { ok: false, error }` convention. Concurrent changes return `concurrent_edit` with a toast and refresh; no double-run on double click. Pages revalidate after actions.
- Reuse existing functions: `events_publish` (idempotent, with its confirmation) and the Story 4.14 Proposed Task accept/dismiss/restore functions. All UI text in `messages/nb.json` and `messages/en.json`.

## UX & Interaction Patterns

- Dashboard is the Event landing page for Organizer and joined Role-holders (replacing the interim home and *My tasks* as landing; *My tasks* stays in the sidebar). Sidebar item has `aria-current="page"`.
- Needs you: `h2` with count pill; open Decision shown first as the Decision card, the only lifted element, with *Decide*. Problem rows use a flag icon and "Problem reported" (visibly distinct from grey Blocked). Overdue rows say "Overdue N days". Empty sections collapse to a quiet line ("Nothing needs you right now."), never hidden. *Show dismissed (n)* with *Restore* and Undo toast.
- At risk rows: "Waiting on external" with note excerpt; "Waits for: {blocker}" with Blocked tint, never red.
- No-access viewers see "You don't have access to this part of the event." and no data.
- Timeline swimlane (desktop): sticky Role column, 112px lanes, 24px/day axis with Monday week labels, today line, Event-day column, 48px edge fade, read-only (no drag, no hover-only). Scroll area is `role="region"` `aria-label="Timeline"` `tabindex="0"`; bars are links named "{title}, {dates}, {status}, waits for {x}". Decision points: filled while open, outline once resolved. *Show obsolete (n)* and view toggle live in the URL. *Jump to today* control.
- List view: same data grouped per Role, default below 768px, no horizontal scroll, 44x44px targets, Decision points as words plus icon. Empty states: "No tasks in this Role yet"; "The timeline fills in as tasks are added."

## Cross-Story Dependencies

- 5.1 (classification and `task_state` pgTAP) underpins 5.2, 5.3, 5.4 and the card counts in 5.5; 5.4 builds on 5.2/5.3 and Story 2.8 (publish).
- 5.6 underpins 5.7 and 5.8, which render the same computed data.
- 5.9 validates everything: the flagship seed in `supabase/seed.sql` (no real names) plus Playwright for Organizer and Role-holder (no other Role's Task title anywhere), with AI in fixture mode.
- Depends on Epic 4 (task state, dependencies, Decision Tasks, Proposed Tasks, My tasks), Epic 3 (Team & Roles, role-revoked redirect from 3.9) and Story 2.4/2.5.
- Carry-forwards: Epic 7 replaces "N guests added" with the RSVP summary and chart and adds the "Your invitation" card slot (reserved here in 5.4); Epic 10 notification links open the Dashboard or Task; Epic 11 includes the flagship seed, these Playwright tests and a 300-Task performance check.
