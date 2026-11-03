# Epic 4 Context: Tasks and decisions

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

The Team runs the work of an Event. Organizers and Role leads create Tasks with deadlines, Subtasks and dependencies; owners accept, update status and raise Problems; Role-holders see their own Tasks; a Task can be sent to a named person as a Decision Task whose outcome spawns follow-up Tasks or marks option-tied Tasks obsolete. Proposed Tasks (from questionnaire gaps and later AI) become active only after per-Task confirmation. This is the core of the product and feeds the Dashboard and Timeline (Epic 5).

## Stories

- Story 4.1: Tasks table and Role-scoped access
- Story 4.2: Create, edit and open a Task
- Story 4.3: Subtasks and dependencies
- Story 4.4: Status, notes and *Overdue*
- Story 4.5: Delegate a Task
- Story 4.6: Accept a Task and the 48-hour rule
- Story 4.7: Role lead and revoke hooks
- Story 4.8: Problem flag
- Story 4.9: *My tasks*
- Story 4.10: Options on a Task and sending for decision
- Story 4.11: Decide and spawn follow-up Tasks
- Story 4.12: Option-tied Tasks become obsolete, and decisions can change
- Story 4.13: Proposed Tasks from questionnaire gaps
- Story 4.14: Review Proposed Tasks

## Requirements & Constraints

- A Task has exactly one Role, at most one owner (a person), a deadline, a status (Not started, In progress, Waiting on external, Done) and an optional status note. No owner means Role-owned, i.e. "pending".
- *Blocked* (incomplete dependency) and *Overdue* (past deadline, not Done) are computed, never set by hand or stored. A Problem is a flag beside status, not a status.
- Dependencies and parents stay within one Role; a Subtask cannot change Role without being promoted first.
- A newly delegated Task must be accepted by its owner; unaccepted after 48 hours it enters the Organizer's needs-attention list. Changing owner keeps history and status but resets acceptance.
- Only the Role lead and the Organizer may delegate a Role's Tasks; delegation stays within the Role unless the Organizer does it.
- Decision Tasks name a recipient; only that person or the Organizer resolves it. A new Task spawns only from the chosen path; a Task tied to an un-chosen option is marked obsolete, never deleted. A decision can be reversed.
- Tasks carry optional guest-program fields (show on guest program, guest label, time of day), added in Story 4.2.
- Proposed Tasks never become active without explicit per-Task confirmation; a proposed Task may lack a deadline, an active one may not.
- Tasks in a draft Event are visible to the Organizer only; cancelled or ended Events are read-only.
- No Task text, notes or Problem notes go to AI, logs or notification payloads (GDPR). Payloads hold ids and i18n keys only; no notification while the Event is a draft.
- Every mutation is idempotent: a repeat writes no second history row and emits no second notification.

## Technical Decisions

- **Ownership:** the tasks module is the only writer of `tasks` and its sibling tables; other modules call its SQL functions only along the module graph.
- **Two mutation paths:** direct `UPDATE` only on granted columns (`title`, `description`, guest-program fields); everything else is one Postgres function (`tasks_create`, `tasks_set_status`, `tasks_delegate`, `tasks_accept`, `tasks_propose`, `tasks_confirm_proposed`, `tasks_resolve_decision`). `INSERT` and `DELETE` are denied to `authenticated`.
- **Privilege model:** every `tasks_*` function is a mutation function: `security definer`, `search_path = ''`, granted to `authenticated`, revoked from `public` and `anon`, authorising from `auth.uid()` and the AD-3 helpers before any write, never from a caller-supplied user id. System functions (`tasks_purge_guest`) are revoked from `authenticated`.
- **Visibility:** `is_organizer(event_id) OR holds_role(role_id) OR owner_user_id = auth.uid()`; never match on email. A Task of an inactive Role (`roles.active = false`) is visible to the Organizer only.
- **Lifecycle vs status:** `lifecycle ∈ {proposed, active, dismissed}` is separate from `status`; `source ∈ {ai_description, questionnaire_gap, status_note, guest_need, guest_request}` with optional `source_guest_request_id`. Only `tasks_propose` creates proposed rows.
- **Derived state** lives in one `security_invoker` view, `task_state`, extended by later stories with `CREATE OR REPLACE VIEW`. Timeline order is computed per request (AD-13).
- **Concurrency and validation:** each function takes `expected_updated_at` and returns `concurrent_edit` on mismatch; `tasks_assert_writable(event_id)` refuses cancelled or ended Events. Server Actions parse with Zod first and return `{ ok, data } | { ok: false, error: { code, message } }` with a next-intl key.
- **Seams to Epic 3:** `events_set_role_lead` calls `tasks_assign_role_owned_to_lead(role_id)`; `events_revoke_role` calls `tasks_release_owner(role_id, user_id)`. Marked call sites exist in the Epic 3 functions.
- **Constraints over code:** invariants a direct call could break are CHECKs, partial unique indexes or triggers. Each story adds only its own columns and tables (`task_dependencies`, `status_history`, `problems`, `decision_options`). Every migration is a file in `supabase/migrations`, followed by regenerated `src/types/database.ts`.
- **Tests:** every policy, grant and function gets a pgTAP allow and deny, including a denied direct PostgREST write; Vitest for branching TS logic.
- **Notifications:** kinds `task_assigned`, `decision_requested`, `decision_resolved`, `problem_reported`, emitted only through `notifications_emit` (a no-op stub in Core).

## UX & Interaction Patterns

- Concurrent edits show the shared concurrent-edit toast; outward or destructive actions use a confirmation dialog, others use Undo toasts.
- A blocked Task is visibly distinct from an unblocked one; *Waiting on external* is distinct from *Blocked*.
- A Decision Task shows on the recipient's Dashboard as "needs your decision"; the Organizer sees an unaccepted Task as "Not yet accepted".
- Opening a Task shows scope, deadline, dependencies, parent and Subtasks, and status in one view.

## Cross-Story Dependencies

- 4.1 is the base for all others (table, RLS, grants, `tasks_assert_writable`, `task_state`, privilege model); 4.2 adds create/edit; 4.3 dependencies; 4.4 status history; 4.5–4.6 delegation and acceptance; 4.7 wires the Epic 3 seams; 4.10–4.12 build the decision flow in order; 4.13–4.14 add Proposed Tasks.
- Depends on Epic 2 (events, Roles, publish, cancel) and Epic 3 (`role_members`, `holds_role`, Role lead and revoke functions).
- Feeds Epic 5 (Dashboard, Timeline), Epic 6 (AI proposals via `tasks_propose`) and Epic 7 (guest requests and results through `source_guest_request_id`).
