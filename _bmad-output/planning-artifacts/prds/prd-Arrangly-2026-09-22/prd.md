---
title: Arrangly
created: 2026-09-22
updated: 2026-09-24
status: draft
---

# PRD: Arrangly

## 0. Document Purpose

This PRD is for the builder (Aumgaran, solo) and for the downstream BMad workflows — UX, architecture, epics/stories — that will build on it. It builds on the finalized [Product Brief](../../briefs/brief-Arrangly-2026-09-20/brief.md) and its addendum; it does not restate their vision or origin story, only formalizes what ships. Vocabulary is fixed in §3 Glossary and used verbatim throughout. Features are grouped with Functional Requirements (FRs) nested under them, numbered globally (FR-1…FR-22) for stable downstream references. `[ASSUMPTION]` tags mark inferences made while structuring journeys into requirements; all are indexed in §9.

Context this PRD is written against: Arrangly is a solo submission for an IBE160 course exam, due 2026-11-30. Grading rewards a working AI-built application with visible documentation of AI usage and quality assurance (70%), plus a reflection report on process and tradeoffs (30%). Scope decisions below were made to stay ambitious rather than solo-scaled-down, with explicit tiering (Core/Target/Stretch, carried over from the brief) so a complete, demonstrable product is guaranteed even if Target/Stretch don't land.

## 1. Vision

Arrangly turns a complex event — a milestone birthday, a wedding party, an office event — into a managed project instead of a to-do list scattered across email, spreadsheets and group chats. The organizer builds a team, assigns roles, and Arrangly makes sure the right things happen in the right order: dependencies are tracked, blocked work is visible, and delegated tasks don't silently stall.

What makes it more than a task manager is that roles are the access model (not just labels), order and timing are first-class (tasks can depend on each other and on decisions not yet made), and AI acts as a working assistant throughout — drafting the initial task list from a one-sentence description, searching for real venues, drafting outreach emails, and turning a guest's offhand request into a task someone can actually act on.

The organizer manages, role-holders execute, and guests get a simple, separate experience — RSVP, allergies, practical info — without ever seeing the planning happening behind it.

## 2. Target User

### 2.1 Jobs To Be Done

- **Organizer** (e.g. Leah): "Let me hand off real pieces of this event to people I trust, and know where things stand without having to ask."
- **Role-holder** (e.g. Stine, Peter, Martin, Sheila): "Tell me exactly what I own, help me get it done faster, and make it obvious when I'm blocking someone else."
- **Guest** (e.g. Chris): "Let me tell you if I'm coming and what I need, without making me create an account or navigate the organizer's planning."

### 2.2 Non-Users (v1)

- Large-scale event producers (festivals, conferences) — explicitly out of scope per the brief.
- People wanting a generic project-management tool with no event structure (roles, RSVP, guest side) — Arrangly is event-shaped by design, not a Trello alternative.

### 2.3 Key User Journeys

**UJ-1. Leah sets up the 40th birthday and delegates the first wave of work.**
- **Persona + context:** Leah, head of the welfare committee, has just decided to run Lucas's (head of office) 40th birthday through Arrangly.
- **Entry state:** Unauthenticated, first-time use of Arrangly.
- **Path:** Logs in with email → dashboard prompts "create an event" → guided questionnaire (event type, guest count, duration, venue known?, RSVP wanted?, guest-list method) → adds guests by invite link/manual entry → writes a free-text event description (intentions, dress code) → Arrangly activates relevant Roles from the Branch Pool (Venue, Guests, Entertainment, Food & Beverage, Travel & Logistics) and proposes Tasks under them, with Decorations nested as a Subtask under Venue → she reviews and confirms each → app prompts her to build the team → she adds four people to Roles (Stine→Venue, Peter→Food & Beverage, Martin→Entertainment, Sheila→Venue's decorating Subtask *and* Food & Beverage's bar/bartender work).
- **Climax:** She publishes the event; invites go out to the full guest list in one action.
- **Resolution:** Session ends with a populated event, an assigned team, and pending guest RSVPs — nothing left in her head alone.
- **Edge case:** If she skips the venue question in the questionnaire, "book a venue" becomes an AI-suggested task rather than a silent gap.

**UJ-2. Stine gets help on the venue task and escalates the decision.**
- **Persona + context:** Stine, assigned the venue task, already knew it was coming.
- **Entry state:** Authenticated, notified of a new task assignment.
- **Path:** Opens task → confirms she'll take it on → declines "already done" → accepts "want help" → adds three candidate venues herself as options on the Task (hotel, restaurant, rooftop bar) — Core ships manual entry here; AI-populated search within a radius is a Target enhancement once proven feasible (see FR-13) → submits them as a Decision Task routed to Leah.
- **Climax:** ~30 minutes later, Leah's decision comes back (hotel, with the rooftop bar as fallback) plus a new task (book 8 single + 2 double rooms) spawned by that decision. Arrangly flags the venue-confirmation task as priority since other tasks depend on it.
- **Resolution:** Stine opens the task, accepts an AI-drafted outreach email (date, headcount, occasion) opened in her own mail client, sends it, and updates status to "reached out to venue, pending answer."
- **Edge case:** If Leah had picked the rooftop bar instead, no room-booking task would ever have spawned — the Decision Task's outcome only creates a Task for the chosen path. If Stine had instead pre-created a Task tied specifically to the hotel option in advance (e.g. drafting a room list early, before Leah decided), that Task would be marked obsolete rather than deleted once the rooftop bar was chosen.

**UJ-3. Chris RSVPs and gets a need turned into a task without asking anyone.**
- **Persona + context:** Chris, a business partner of Lucas's, received an invite link by email.
- **Entry state:** Unauthenticated guest, arriving via a magic link unique to his invite.
- **Path:** Clicks the link → recognized by name/email, no signup → greeted with a direct yes/no RSVP question → answers yes → plus-one? allergies? hotel needed? any other needs? → answers with a plus-one and a freeform note requesting airport pickup for both of them → optionally sets a 4-digit PIN to create a persistent login (skipped if his email already has an Arrangly account).
- **Climax:** On submit, Arrangly confirms he's on the list and that details (location, timing) will follow — while behind the scenes, his freeform note becomes a proposed task on the dashboard of whoever owns guest welfare.
- **Resolution:** Once that task is confirmed and later marked done, the resulting taxi info automatically appears on Chris's own guest dashboard — he never has to chase it.
- **Edge case:** If Chris doesn't respond at all, the organizer can trigger a manual reminder from the guest list rather than the system nagging him automatically.

**Scope dial used:** Heavier — auth (three distinct identity models), multi-surface navigation (dashboard, timeline, task detail, guest view), and everything here feeds UX and architecture directly.

## 3. Glossary

- **Event** — The unit of work in Arrangly (e.g. "Lucas's 40th birthday"). Owns a Team, a guest list, Tasks, a Timeline, and a Run of Show.
- **Organizer** — The person who creates an Event and holds full control over it: activates Roles and assigns/changes/revokes them, sees everything. Exactly one per Event (may co-exist with delegated Role-holders who also help plan).
- **Branch Pool** — The pre-generated master set of possible Roles Arrangly can draw from (e.g. Venue, Guests, Entertainment, Food & Beverage, Travel & Logistics, and others suited to other event types). Not all activate on every Event — see Role.
- **Role** — A planning branch activated on an Event from the Branch Pool, based on event type and description (e.g. a party activates Entertainment; a seminar might not). A Role is simultaneously: (a) the RBAC boundary — only the Organizer can activate, assign, or revoke one, and it determines what its holder can see and do; (b) the grouping for Tasks and Subtasks in that area; and (c) one swimlane on the Timeline — a Role *is* a Line of Effort. Several Role-holders can share a Role. A person can hold different Roles across different Events, and a Guest can simultaneously hold a Role in the same Event. The Organizer can adjust which Roles are active beyond Arrangly's initial activation.
- **Role-holder** — A person assigned to one or more Roles on an Event's Team.
- **Team** — The set of people (Organizer + Role-holders) assigned to an Event.
- **Guest** — A person invited to an Event who has not been assigned a Role. Interacts only through the RSVP flow and their own Guest Dashboard.
- **Task** — A unit of work with an owner (a person or a Role), a deadline, a status, and optionally dependencies on other Tasks, a parent Task (see Subtask), or a Decision Task's outcome.
- **Subtask** — A Task nested under a parent Task within the same Role (e.g. "Decorations" as a Subtask of the Venue Role).
- **Decision Task** — A Task that requires a choice from a specific person (not just completion), whose outcome can mark other Tasks obsolete and/or spawn new Tasks.
- **Timeline** — The visual, swimlane view of an Event's Roles (each Role = one Line of Effort), showing the sequence of Tasks and Subtasks within each, blocked Tasks, and Decision Task branch points. Organizer/Team-facing — the planning side.
- **Run of Show** — The Guest-facing, day-of schedule of the Event itself (e.g. doors, dinner, speeches, DJ), distinct from the Timeline. Where the Timeline is the planning view, the Run of Show is what a Guest actually experiences.
- **Dashboard** — The Organizer's (or relevant Role-holder's) prioritized view of what's done, overdue, blocked, and needs a decision or delegation.
- **Proposed Task** — A Task auto-suggested by Arrangly (from an event description, a guest's freeform need, or a data change like a late RSVP) that a person must confirm before it becomes an active Task.
- **Guest Dashboard** — The Guest's own simple view: their Event(s), RSVP status, the Run of Show, and any info resolved on their behalf (e.g. taxi details).
- **Magic Link** — A unique, per-invite URL that identifies a Guest by matching the email it was sent to, without requiring login credentials.

## 4. Features

### 4.1 Accounts, Roles & Access

**Description:** Organizers and Role-holders authenticate with a real account; Guests do not need one unless they opt in. Roles are the sole access-control mechanism on an Event — nobody can grant themselves access. Realizes UJ-1, UJ-2, UJ-3.

#### FR-1: Organizer/Role-holder account and login

Any person acting as an Organizer or Role-holder can create an account and log in with email credentials. Realizes UJ-1, UJ-2.

**Consequences (testable):**
- A new account requires a unique, verified email and a password meeting a minimum strength policy.
- A logged-in Organizer/Role-holder lands on a dashboard listing their events.
- A Role-holder is invited to create their account via a unique invite link sent by the Organizer; opening it pre-fills their name/email where known.

#### FR-2: Role activation and RBAC enforcement

When an Event is created, Arrangly activates a relevant subset of Roles from the Branch Pool based on event type and description; the Organizer can add or remove active Roles beyond that. Only the Organizer can assign, change, or revoke a Role-holder's Role on that Event. A Role-holder can see and act on only what their Role permits. Realizes UJ-1.

**Consequences (testable):**
- Activated Roles reflect the Event's type/description (e.g. a seminar does not activate Entertainment by default) and can be manually adjusted by the Organizer at any time.
- A Role-holder attempting to assign themselves a Role, or to view/act on data outside their Role's scope, is rejected server-side (not just hidden in the UI).
- Revoking a Role immediately removes the holder's access to that Role's Tasks and views.
- Multiple Role-holders can be assigned to the same Role simultaneously.

#### FR-3: Guest identity via Magic Link with optional PIN account

A Guest is identified by a Magic Link matched to the invited email, with no login required. At the end of RSVP, they may optionally set a 4-digit PIN to create a persistent login tied to that email; this step is skipped if the email already has an Arrangly account. Realizes UJ-3.

**Consequences (testable):**
- Opening a valid Magic Link pre-fills the Guest's name from the invite record, with no signup step.
- If a PIN is set, the Event appears under "upcoming events" the next time that email logs in.
- An invalid or expired Magic Link shows an explanation, not a generic error.

**Feature-specific NFRs:**
- A 4-digit PIN is a materially weak sole credential (10,000 combinations, no inherent lockout). `[NOTE FOR PM]` Accepted as a deliberate UX tradeoff for launch; architecture phase should add rate-limiting/lockout on PIN attempts as a mitigation, not a redesign.

### 4.2 Event Setup

**Description:** Turns a one-sentence idea into a structured Event with a starting task list. Realizes UJ-1.

#### FR-4: Guided event-creation questionnaire

An Organizer creating an Event answers a short, branching questionnaire (event type, guest count, duration, venue known y/n, RSVP wanted y/n, guest-list method) that produces an initial Event framework.

**Consequences (testable):**
- Answers populate structured Event fields (not just free text) that later steps (AI task suggestion, guest list) read from.
- Skipping a question that later matters (e.g. venue) results in a corresponding Proposed Task rather than a silent gap.

#### FR-5: Guest list entry via invite link or manual add

An Organizer adds Guests to an Event by shareable invite link or by entering them manually (name + email).

**Consequences (testable):**
- Manually entered Guests receive an individual Magic Link by email once the Event is published.
- An invite-link Guest is recorded as unidentified until they open the link and confirm their name.

**Out of Scope:** Bulk import via file upload (`.xls`/`.csv`) — see §6.2, Target.

#### FR-6: AI task suggestion from event description

An Organizer writes a free-text description of the Event (intentions, dress code, etc.); Arrangly proposes an initial set of Tasks, categorized under the Roles it activated (FR-2), including Subtasks where a Task naturally nests under another (e.g. Decorations under Venue). The Organizer reviews and confirms each Task individually before it becomes active.

**Consequences (testable):**
- No AI-suggested Task becomes active without explicit per-Task confirmation from the Organizer.
- Every suggested Task is categorized under exactly one active Role at creation; the Organizer can recategorize it afterward.
- Suggested Tasks reflect questionnaire gaps (e.g. no venue named → a venue Task is suggested).

### 4.3 Team & Task Management

**Description:** How work gets owned, sequenced, and escalated once a Team exists. Realizes UJ-1, UJ-2.

#### FR-7: Task creation with owner, deadline, status, dependencies, and hierarchy

Any Task has exactly one owner (a person or a Role), a deadline, a status, and optionally one or more dependencies on other Tasks and/or a parent Task (Subtask nesting), always within the same Role.

**Consequences (testable):**
- A Task blocked by an incomplete dependency is visually distinguishable from an unblocked Task on both the Dashboard and Timeline.
- Changing a Task's owner reassigns it without losing its history/status.
- A Subtask cannot be moved to a different Role than its parent Task without first being promoted to a top-level Task.

#### FR-8: Task status model including externally-blocked states

Task status is more granular than done/not-done — it includes at minimum: not started, in progress, waiting on external response, blocked, done.

**Consequences (testable):**
- A Task in "waiting on external response" surfaces distinctly from "blocked" (which implies a dependency, not an outside party) on the Dashboard.
- Status changes are timestamped for later reflection-report documentation of process. `[ASSUMPTION: timestamping wasn't explicitly discussed but is needed to support the course's documentation requirement (§0) and to make "overdue" computable.]`

#### FR-9: Role-holder task view

A Role-holder sees their assigned Tasks, each Task's scope/expectations, and enough Team context (who else is on the Team) to understand how their part fits. Realizes UJ-2.

**Consequences (testable):**
- Opening an assigned Task shows its scope description, deadline, dependencies, parent Task/Subtasks, and current status in one view.
- A first-time Role-holder can find their Tasks and understand what's expected within about a minute of registering (brief's stated qualitative target).

#### FR-10: Decision-escalation tasks

A Task can be routed to a specific person as a decision request (options + context) rather than a simple completion. The recipient's response is recorded and can spawn a new Task. Realizes UJ-2.

**Consequences (testable):**
- A Decision Task shows on the recipient's Dashboard distinctly from an ordinary Task ("needs your decision").
- Recording a decision can create a new Task in the same action (e.g. choosing the hotel creates "book rooms").

#### FR-11: Obsolete-marking for pre-created option-specific tasks

The default case needs no branching logic at all: a new Task spawns only after a Decision Task resolves (FR-10), so nothing exists on the un-chosen path to clean up. FR-11 covers only the narrower case: if a Task was explicitly tied to one specific, not-yet-chosen option of an open Decision Task, and that Decision Task later resolves against that option, the tied Task is automatically marked obsolete. Realizes UJ-2.

**Consequences (testable):**
- An obsolete Task is visually distinct (e.g. greyed out / filtered) on both Dashboard and Timeline, never deleted.
- Reversing a Decision Task's outcome re-runs the same spawn/obsolete logic idempotently: a previously obsoleted option-tied Task re-activates, and the other option's tied Task(s), if any, obsolete in turn. No separate undo/redo history is required.

**Out of Scope:** Visual fork/branch rendering in the Timeline UI — see §6.2, Target. This FR covers only the underlying obsolete-marking logic, which can be represented as a flat filtered list.

#### FR-12: Task-delegation tracker

The Dashboard shows, per Task, whether it has been delegated (owner assigned) or is still pending assignment — independent of completion status.

**Consequences (testable):**
- A Task with an assigned owner shows as "delegated," never as "pending," regardless of its completion status.
- The Organizer can filter the Dashboard to pending (undelegated) Tasks only.

### 4.4 Task Execution Support

**Description:** Helping a Role-holder get a Task done, whether by structured manual entry or AI assistance. Realizes UJ-2.

#### FR-13: Venue-option entry on a Task

A Role-holder can add one or more candidate options (e.g. venues) directly to a Task, to submit as a Decision Task (FR-10) — matching UJ-2's flow with manual entry in place of AI search.

**Consequences (testable):**
- A Task supports attaching multiple named options, each with free-text details (name, type, notes), for use in a Decision Task.
- No capacity or geo filtering is performed automatically; the Role-holder enters this information themselves.

**Out of Scope:** AI-populated candidate search (auto-suggesting options from an external venue/places source, filtered by radius and capacity) — see §6.2, Target. Per feasibility review: mainstream venue/places APIs don't expose a structured capacity field, so even in Target this can only ship as best-effort, LLM-inferred information clearly flagged as approximate, never a reliable filter.

#### FR-14: AI-drafted external communication

From within a Task, a Role-holder can request an AI-drafted message (e.g. vendor outreach email) pre-filled with relevant Task/Event context, handed off to their own mail client rather than sent by Arrangly directly.

**Consequences (testable):**
- The draft includes, at minimum, the Event date, guest count, and occasion where relevant to the Task.
- Arrangly never sends the message itself; the user always reviews and sends from their own client.

### 4.5 Guest Experience

**Description:** The simple, separate side for people who are attending, not planning. Realizes UJ-3.

#### FR-15: Guest RSVP flow

A Guest opening their Magic Link is greeted by name and asked to RSVP yes/no, then (if yes) plus-one, allergies and food preferences, hotel need, and a freeform "other needs" field.

**Consequences (testable):**
- Declining (RSVP no) skips the follow-up questions and ends the flow.
- A submitted RSVP is visible to the Organizer (and relevant Role, per FR-16) within the same session, no delay.

#### FR-16: Guest-need-driven proposed tasks

A freeform guest need, or an allergy/hotel-need change that affects planning (e.g. a late RSVP shifting a catering count), surfaces as a Proposed Task on the Dashboard of whoever owns the relevant area (guest welfare, catering, booking). Once confirmed and later completed, any resulting information is automatically shown on that Guest's own Guest Dashboard. Realizes UJ-3.

**Consequences (testable):**
- A Proposed Task from guest data requires explicit confirmation before becoming an active Task (same rule as FR-6).
- Completing the resulting Task writes a Guest-visible result (e.g. "your airport pickup: [details]") without any manual step by the Role-holder to notify the Guest.

#### FR-17: Manual guest reminder

From the guest list, the Organizer can trigger a reminder email to a non-responding Guest (or a filtered set of them) on demand.

**Consequences (testable):**
- The reminder is only sent when explicitly triggered — no automatic time-based send in Core (see §6.2 re: role-holder reminders, which remain Target and unaffected by this decision).

#### FR-18: Guest dashboard

A Guest with a persistent login (FR-3) sees their upcoming Event(s), their own RSVP status, and any information resolved on their behalf.

**Consequences (testable):**
- A Guest without a PIN-based login can still reach the same information via their original Magic Link at any time.

### 4.6 Organizer Dashboard & Timeline

**Description:** The two core views an Organizer uses to run an Event without chasing anyone. Realizes UJ-1, UJ-2.

#### FR-19: Organizer dashboard

A single view shows, across the Event: what's done, overdue, blocked, and needs a decision or delegation, plus a Guests tab aggregating RSVP status and compiled allergy/hotel data routed to the relevant Role.

**Consequences (testable):**
- The Organizer can answer "what's the state of this event" from the Dashboard alone, without messaging anyone (brief's stated qualitative target).
- The Guests tab shows per-guest RSVP status (responded/pending/declined) individually, plus allergy/hotel data compiled for the owning Role.

#### FR-20: Timeline (Role = Line of Effort)

A dedicated Timeline view renders each active Role as its own swimlane — a Role *is* a Line of Effort. Each lane shows its Tasks and Subtasks in sequence, including blocked Tasks and Decision Task points, without visual branch/fork rendering.

**Consequences (testable):**
- Each active Role renders as exactly one lane, ordered by dependency, independent of the others.
- A Subtask renders nested within its parent Task's position on the lane, not as a separate lane.
- A Decision Task point is visible on its lane even before it's resolved.
- Core ships a static, server-computed, read-only render (simple topological sort within a lane, ties broken by deadline) — no drag-and-drop, live editing, or zoom. The view scrolls horizontally so long sequences within a lane stay reachable. Clicking a Task opens it; any richer interactivity is Target.

**Out of Scope:** Visual forking (showing the obsolete branch graphically rather than as a flat obsolete-marked item) — see §6.2, Target.

### 4.7 Communication

**Description:** One-way announcements tied to the Event's structure — shrunk from a full threaded-messaging model after feasibility review, but kept load-bearing in Core because day-of coordination depends on it: a speech running long shifting main-course timing needs to reach the kitchen/serving team immediately, not sit in a backlog.

#### FR-21: Announcement/notification feed to a Role, person, or group

An Organizer (or a Role-holder, scoped to their Role) can push a one-way announcement to an individual, an entire Role, or a defined group. No threading, no read receipts — announcements append to a flat feed each recipient can scroll.

**Consequences (testable):**
- An announcement sent to a Role reaches every current holder of that Role at send time.
- Delivery is in-app plus email; the feed is visible to its recipients within the Event, not just as an outbound email.
- An announcement can be sent standalone at any time; nothing auto-triggers one from a Task or Timeline event in Core.

**Out of Scope:** Two-way threaded conversation, read receipts, and automatic delay-triggered notifications — see §6.2, Stretch ("Delay-impact propagation... with Organizer approval"), which is where an automatic version of this would live.

### 4.8 Run of Show

**Description:** The Guest-facing, day-of schedule of the Event — distinct from the Timeline (FR-20), which is the Organizer/Team's planning view. Where FR-20 is the airline's operations timeline, this is the passenger's itinerary: what's happening and when, from the Guest's side. Realizes UJ-3.

#### FR-22: Guest-facing run of show

Arrangly generates a simple, chronological day-of schedule for the Event (e.g. doors, dinner, speeches, DJ) from the Event's confirmed Tasks and timing, shown on the Guest Dashboard (FR-18).

**Consequences (testable):**
- The Run of Show reflects confirmed Event timing (from the questionnaire/Tasks), not a Role's internal Task detail — a Guest never sees Role-scoped planning information.
- Guests without a persistent login can view the Run of Show via their Magic Link once it's published.

**Out of Scope:** Live linkage where a Timeline delay automatically updates the Run of Show — see §6.2, Stretch ("Impact of delays on the run of show").

### 4.9 Constraints and Guardrails

**Privacy:** Allergy and other health-adjacent guest data (FR-15) is visible only to the Role it's routed to (e.g. catering), per FR-2's RBAC model — not broadcast to the full Team beyond what each Role needs for planning. This is an access-scoping guardrail, not a compliance program; formal handling (GDPR-style retention/consent flows) is out of scope for v1.

**Cost:** FR-6 and FR-14 (and FR-13's Target-tier AI-search enhancement, if built) all make live AI/tool calls against a personal/course budget, not production infra. Before building any AI-touching FR, define a hard per-feature call cap and a mocking/fixture strategy for development — see Open Question 2 for the specific numbers still to be set.

## 5. Non-Goals (Explicit)

- Arrangly is not a supplier marketplace — no vendor booking, payments, ticketing, or accounting.
- Arrangly does not do face recognition, photo galleries, or crowdfunded gifts.
- Arrangly does not integrate with external calendar, messaging, or payment services in v1.
- Arrangly is not a native mobile app — web only, with the Guest side required to work well on phone browsers (target: usable at 375px width in current mobile Safari/Chrome).
- Arrangly does not target very large-scale events (festivals, conferences) — the unit of work assumes a single organizer-led team, not a multi-organizer operation.
- Arrangly is not becoming a generic project-management tool; every capability is anchored to the Event/Role/Task/Guest model in §3.

## 6. MVP Scope

### 6.1 In Scope (Core)

- Accounts & RBAC: FR-1, FR-2, FR-3
- Event setup: FR-4, FR-5 (link/manual only), FR-6
- Team & tasks: FR-7 through FR-12 (obsolete-marking limited to pre-created option-specific tasks; no general branch tree)
- Task execution support: FR-13 (manual venue-option entry), FR-14 (AI-drafted communication)
- Guest experience: FR-15 through FR-18
- Organizer dashboard & timeline (static, sequential, non-branching, horizontally scrollable): FR-19, FR-20
- Announcements: FR-21 (flat feed, no threading)
- Run of show: FR-22

### 6.2 Out of Scope for MVP

**Target — build if Core is stable:**
- Bulk guest-list import via file upload (`.xls`/`.csv`) — deferred from FR-5; manual/link entry covers Core.
- AI-populated venue search (deferred from FR-13) — auto-suggesting candidates from an external venue/places source within a radius. Per feasibility review, real venue APIs don't expose a structured capacity field, so even here this ships as best-effort, LLM-inferred, clearly-flagged-as-approximate information — never a reliable capacity filter. Core's manual entry (FR-13) is not a placeholder for this; it may remain the better path permanently.
- AI backward-planned timeline with dependencies and lead times (from the brief; builds on FR-20's sequential timeline).
- Automated reminders to Role-holders (brief's original Target item; distinct from the Guest reminder in FR-17, which is manual and Core).
- Guest information page and announcements beyond FR-21's flat feed.
- Visual fork/branch rendering in the Timeline (deferred from FR-11/FR-20) — the obsolete-marking logic itself ships in Core; only the graphical fork is deferred, as isolated rendering risk rather than data-model risk.
- Richer Timeline interactivity beyond static read-only render (drag-and-drop, live editing, zoom) — deferred from FR-20.
- Two-way threaded messaging, read receipts (deferred from FR-21).

**Stretch — only with time to spare (unchanged from the brief):**
- AI detection of gaps in the plan (e.g. a DJ without a soundcheck).
- Delay-impact propagation across the Run of Show (builds on FR-22), with Organizer approval.
- Guest-count changes rippling into food, staffing, and budget.
- AI-proposed guest program shown in the Guest view.
- Gift register.

`[NOTE FOR PM]` Per the brief, if Core is at risk, the full team matrix was the first item to cut — that item has since been redefined (§4.3 FR-12, §4.6 FR-20) into leaner Core pieces. AI venue search, the next flagged risk, has since been resolved by moving it to Target outright (FR-13 is now manual entry in Core; see §4.9 and the feasibility review at `review-feasibility.md`). Per that same review, Core's next real risk concentration is the Timeline's rendering (FR-20) and the decision-branching semantics (FR-10/FR-11) rather than a single swappable item — both have since been scoped down directly in their FR text rather than deferred to a future cut.

## 7. Success Metrics

**Primary**
- **SM-1**: A deployed, working web application runs the flagship scenario (40th birthday, 80 guests: venue, dinner, speeches, quiz, DJ) end to end across all three personas by 2026-11-30. Validates FR-1, FR-4, FR-6, FR-7, FR-15, FR-19, FR-22.
- **SM-2**: RBAC holds under test — zero observed instances of a user acting outside their Role's granted access. Validates FR-2.

**Secondary**
- **SM-3**: A first-time Role-holder finds their Tasks and understands what's expected within about a minute of registering. Validates FR-9.
- **SM-4**: A Guest can RSVP, manage a plus-one, and register allergies without creating an account. Validates FR-3, FR-15.
- **SM-5**: The Organizer can state the Event's current status (done/overdue/blocked/needs-decision) from the Dashboard alone, without contacting Team members. Validates FR-19.

**Counter-metrics (do not optimize)**
- **SM-C1**: AI-suggested Task acceptance rate should not be driven toward 100% — a rate that high more likely indicates rubber-stamping than good suggestions. Counterbalances FR-6.
- **SM-C2**: Total Task count is not a target to maximize — more Tasks without completion tracking would inflate Dashboard noise and undermine SM-5. Counterbalances FR-7, FR-12.

## 8. Open Questions

1. What are the specific per-feature AI call caps and mocking/fixture strategy for FR-6, FR-13's Target enhancement, and FR-14 (§4.9 states the guardrail principle; exact numbers still TBD at architecture)?
2. PIN security hardening (rate-limiting/lockout on the 4-digit Guest PIN) — accepted as a v1 tradeoff; exact mitigation deferred to architecture.
3. FR-22's Run of Show needs Task-model additions (a guest-facing display label, a public/private flag, and a scheduled time-of-day distinct from a deadline) to know what's safe to show a Guest — resolve during architecture/data-model design, before FR-22 is built.

## 9. Assumptions Index

- §4.3 FR-8 — Task status changes are timestamped, to support both "overdue" computation and the course's AI-usage/QA documentation requirement.
