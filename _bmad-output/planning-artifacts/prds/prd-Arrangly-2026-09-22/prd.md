---
title: Arrangly
created: 2026-09-22
updated: 2026-09-29
status: final
---

# PRD: Arrangly

## 0. Document Purpose

This PRD is for the builder (Aumgaran, solo) and for the downstream BMad workflows — UX, architecture, epics/stories — that will build on it. It builds on the finalized [Product Brief](../../briefs/brief-Arrangly-2026-09-20/brief.md) and its addendum; it does not restate their vision or origin story, only formalizes what ships. Vocabulary is fixed in §3 Glossary and used verbatim throughout. Features are grouped with Functional Requirements (FRs) nested under them, numbered globally (FR-1…FR-23) for stable downstream references. The UX specification (`ux-Arrangly-2026-09-27`) owns screen-level behaviour; its PRD deltas (D1–D16) are folded in here. `[ASSUMPTION]` tags mark inferences made while structuring journeys into requirements; all are indexed in §9.

Context this PRD is written against: Arrangly is a solo submission for an IBE160 course exam, due 2026-12-20. Grading rewards a working AI-built application with visible documentation of AI usage and quality assurance (70%), plus a reflection report on process and tradeoffs (30%). Scope decisions below were made to stay ambitious rather than solo-scaled-down, with explicit tiering (Core/Target/Stretch, carried over from the brief) so a complete, demonstrable product is guaranteed even if Target/Stretch don't land.

## 1. Vision

Arrangly turns a complex event — a milestone birthday, a wedding party, an office event — into a managed project instead of a to-do list scattered across email, spreadsheets and group chats. The organizer builds a team, assigns roles, and Arrangly makes sure the right things happen in the right order: dependencies are tracked, blocked work is visible, and delegated tasks don't silently stall.

What makes it more than a task manager is that roles are the access model (not just labels), order and timing are first-class (tasks can depend on each other and on decisions not yet made), and AI acts as a working assistant throughout — drafting the initial task list from a one-sentence description, drafting outreach emails and the guest-facing invitation text, and turning a guest's offhand request into a task someone can actually act on.

The organizer manages, role-holders execute, and guests get a simple, separate experience — RSVP, allergies, practical info — without ever seeing the planning happening behind it.

## 2. Target User

### 2.1 Jobs To Be Done

- **Organizer** (e.g. Leah): "Let me hand off real pieces of this event to people I trust, and know where things stand without having to ask."
- **Role-holder** (e.g. Stine, Peter, Martin, Sheila): "Tell me exactly what I own, help me get it done faster, and make it obvious when I'm blocking someone else."
- **Guest** (e.g. Chris): "Let me tell you if I'm coming and what I need, without making me create an account or navigate the organizer's planning."

### 2.2 Non-Users (v1)

Large-scale event producers and generic-PM-tool seekers — see §5 Non-Goals.

### 2.3 Key User Journeys

**UJ-1. Leah sets up the 40th birthday and delegates the first wave of work.**
- **Persona + context:** Leah, head of the welfare committee, has just decided to run Lucas's (head of office) 40th birthday through Arrangly.
- **Entry state:** Unauthenticated, first-time use of Arrangly.
- **Path:** Logs in with email → dashboard prompts "create an event" → guided questionnaire (event type, guest count, duration, venue known?, RSVP wanted and its due date, guest-list method) → adds guests by invite link/manual entry → writes a free-text event description (intentions, dress code) → Arrangly activates relevant Roles from the Branch Pool (Venue, Guests, Entertainment, Food & Beverage, Travel & Logistics) and proposes Tasks under them, with Decorations nested as a Subtask under Venue → she reviews and confirms each → app prompts her to build the team → she adds four people to Roles (Stine→Venue lead, Peter→Food & Beverage lead, Martin→Entertainment lead, Sheila→Venue's decorating Subtask *and* Food & Beverage's bar/bartender work); Role-owned Tasks go to each Role lead.
- **Climax:** She publishes the event; invites go out to the full guest list in one action.
- **Resolution:** Session ends with a populated event, an assigned team, and pending guest RSVPs — nothing left in her head alone.
- **Edge case:** If she skips the venue question in the questionnaire, "book a venue" becomes an AI-suggested task rather than a silent gap.
- **Day-of edge case:** A week before the event, Sheila reports a Problem on *Bar staff* ("Ola broke his arm, one bartender short"). It lands red in Leah's Dashboard; she sends an Announcement to the whole Team asking for volunteers, Kari taps *I can help*, and Leah assigns her the Task.

**UJ-2. Stine gets help on the venue task and escalates the decision.**
- **Persona + context:** Stine, assigned the venue task, already knew it was coming.
- **Entry state:** Authenticated, notified of a new task assignment.
- **Path:** Opens task → taps **Accept** (Leah's view changes from "Not yet accepted" to "Accepted") → uses the Task's help options to add three candidate venues herself as options on the Task (hotel, restaurant, rooftop bar) — Core ships manual entry here; AI-populated search within a radius is a Target enhancement once proven feasible (see FR-13) → submits them as a Decision Task routed to Leah.
- **Climax:** ~30 minutes later, Leah's decision comes back (hotel, with the rooftop bar as fallback) plus a new task (book 8 single + 2 double rooms) spawned by that decision. Arrangly flags the venue-confirmation task as a priority since other tasks depend on it.
- **Resolution:** Stine opens the task, accepts an AI-drafted outreach email (date, headcount, occasion) opened in her own mail client, sends it, and sets status to *Waiting on external* with the note "Asked hotel, waiting for reply."
- **Edge case:** If Leah had picked the rooftop bar instead, no room-booking task would ever have spawned — the Decision Task's outcome only creates a Task for the chosen path. If Stine had instead pre-created a Task tied specifically to the hotel option in advance (e.g. drafting a room list early, before Leah decided), that Task would be marked obsolete rather than deleted once the rooftop bar was chosen.

**UJ-3. Chris RSVPs and gets a need turned into a task without asking anyone.**
- **Persona + context:** Chris, a business partner of Lucas's, received an invite link by email.
- **Entry state:** Unauthenticated guest, arriving via a magic link unique to his invite.
- **Path:** Clicks the link → recognized by name/email, no signup → greeted with a direct yes/no RSVP question → answers yes → plus-one? allergies? hotel needed? any other needs? → answers with a plus-one and a freeform note requesting airport pickup for both of them → is offered an optional Arrangly account (skipped if his email already has one); declining keeps access by email → lands on the event's Landing page (about, program, location, menu).
- **Climax:** On submit, Arrangly confirms he's on the list and that details (location, timing) will follow — while behind the scenes, his freeform note becomes a proposed task on the dashboard of whoever owns guest welfare.
- **Resolution:** Once that task is confirmed and later marked done, the resulting taxi info automatically appears on Chris's own guest dashboard — he never has to chase it. Later he sends a request ("Can we bring our baby?") and Leah's one reply appears under it.
- **Edge case:** If Chris doesn't respond at all, the organizer can trigger a manual reminder from the guest list rather than the system nagging him automatically.

**Scope dial used:** Heavier — auth (three distinct identity models), multi-surface navigation (dashboard, timeline, task detail, guest view), and everything here feeds UX and architecture directly.

## 3. Glossary

- **Event** — The unit of work in Arrangly (e.g. "Lucas's 40th birthday"). Owns a Team, a guest list, Tasks, a Timeline, and a Run of Show.
- **Organizer** — The person who creates an Event and holds full control over it: activates Roles and assigns/changes/revokes them, sees everything. Exactly one per Event (may co-exist with delegated Role-holders who also help plan).
- **Branch Pool** — The pre-generated master set of possible Roles Arrangly can draw from (e.g. Venue, Guests, Entertainment, Food & Beverage, Travel & Logistics, and others suited to other event types). Not all activate on every Event — see Role.
- **Role** — A planning branch activated on an Event from the Branch Pool, based on event type and description (e.g. a party activates Entertainment; a seminar might not). A Role is simultaneously: (a) the RBAC boundary — only the Organizer can activate, assign, or revoke one, and it determines what its holder can see and do; (b) the grouping for Tasks and Subtasks in that area; and (c) one swimlane on the Timeline — a Role *is* a Line of Effort. Several Role-holders can share a Role. A person can hold different Roles across different Events, and a Guest can simultaneously hold a Role in the same Event. The Organizer can adjust which Roles are active beyond Arrangly's initial activation.
- **Role-holder** — A person assigned to one or more Roles on an Event's Team.
- **Role lead** — The one Role-holder per Role, set by the Organizer, who (besides the Organizer) may delegate that Role's Tasks. Role-owned Tasks default to the Role lead.
- **Team** — The set of people (Organizer + Role-holders) assigned to an Event.
- **Guest** — A person invited to attend an Event. As a Guest they use only the RSVP flow, their Guest Dashboard and the Landing page. A Guest may also hold a Role on the same Event; that Role's access comes from the Role, not from being a Guest.
- **Task** — A unit of work with an owner (a person or a Role), a deadline, a status, and optionally dependencies on other Tasks, a parent Task (see Subtask), or a Decision Task's outcome.
- **Subtask** — A Task nested under a parent Task within the same Role (e.g. "Decorations" as a Subtask of the Venue Role).
- **Decision Task** — A Task that requires a choice from a specific person (not just completion), whose outcome can mark other Tasks obsolete and/or spawn new Tasks.
- **Problem** — A flag a Task's owner raises on that Task, with a note, when something has gone wrong. It is not a status: it sits alongside whatever status the Task has, and is distinct from *Blocked* (dependency-only).
- **Timeline** — The visual, swimlane view of an Event's Roles (each Role = one Line of Effort), showing the sequence of Tasks and Subtasks within each, blocked Tasks, and Decision Task branch points. Organizer/Team-facing — the planning side.
- **Run of Show** — The Guest-facing, day-of schedule of the Event itself (e.g. doors, dinner, speeches, DJ), distinct from the Timeline. Where the Timeline is the planning view, the Run of Show is what a Guest actually experiences. It is shown as the Program section of the Landing page.
- **Landing page** — The Guest-facing event page: About, Program (the Run of Show), Location, Menu and practical info. The Organizer reviews and publishes it before Guests see it.
- **Dashboard** — The Organizer's (or relevant Role-holder's) prioritized view of what's done, overdue, blocked, and needs a decision or delegation.
- **Proposed Task** — A Task auto-suggested by Arrangly (from an event description, a skipped questionnaire answer, a guest's freeform need or request, or a Task's status note) that a person must confirm before it becomes an active Task.
- **Guest Dashboard** — The Guest's own simple view: their RSVP, any info resolved on their behalf (e.g. taxi details), and their requests with replies. Links to the Landing page.
- **Magic Link** — A unique, per-invite URL that identifies a Guest by matching the email it was sent to, without requiring login credentials.

## 4. Features

### 4.1 Accounts, Roles & Access

**Description:** Organizers and Role-holders authenticate with a real account; Guests do not need one unless they opt in. Roles are the sole access-control mechanism on an Event — nobody can grant themselves access. Realizes UJ-1, UJ-2, UJ-3.

#### FR-1: Organizer/Role-holder account and login

Any person acting as an Organizer or Role-holder can create an account and log in with email credentials, or with Google or GitHub. Realizes UJ-1, UJ-2.

**Consequences (testable):**
- Signing in with Google or GitHub using a verified email that already has an Arrangly account opens that same account.
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
- The Organizer sets exactly one Role lead per Role (and can change it). Only the Role lead and the Organizer can delegate that Role's Tasks; delegation stays within the Role unless done by the Organizer.

#### FR-3: Guest identity via Magic Link with optional account

A Guest is identified by a Magic Link matched to the invited email, with no login required. After RSVP, a Guest whose email has no Arrangly account is offered an optional real account (password, Google or GitHub, same as FR-1) or *Not now*. There is no PIN. Realizes UJ-3.

**Consequences (testable):**
- Opening a valid Magic Link pre-fills the Guest's name from the invite record, with no signup step.
- If the Guest creates an account, the Event appears under their events the next time they log in with that email.
- A Guest who declines an account can always regain access by entering their email to receive a fresh Magic Link.
- An invalid or expired Magic Link shows an explanation and offers to send a fresh one, not a generic error.

### 4.2 Event Setup

**Description:** Turns a one-sentence idea into a structured Event with a starting task list. Realizes UJ-1.

#### FR-4: Guided event-creation questionnaire

An Organizer creating an Event answers a short, branching questionnaire (event type, guest count, duration, venue known y/n, RSVP wanted y/n and RSVP due date, guest-list method) that produces an initial Event framework.

**Consequences (testable):**
- Answers populate structured Event fields (not just free text) that later steps (AI task suggestion, guest list) read from.
- Each Event has an Event language (Norwegian Bokmål or English), defaulting to the Organizer's interface language and changeable in Event settings. AI-drafted Guest-facing text uses it (§4.9).
- The RSVP due date is set by the Organizer and can be changed later in Event settings; it drives FR-16's late-change rule.
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
- A Task's status note can also yield a Proposed Task (e.g. "Caterer needs food preferences and allergies 10 days before delivery" → a Proposed Task to send them), under the same per-Task confirmation rule.

### 4.3 Team & Task Management

**Description:** How work gets owned, sequenced, and escalated once a Team exists. Realizes UJ-1, UJ-2.

#### FR-7: Task creation with owner, deadline, status, dependencies, and hierarchy

Any Task has exactly one owner (a person or a Role), a deadline, a status, and optionally one or more dependencies on other Tasks and/or a parent Task (Subtask nesting), always within the same Role.

**Consequences (testable):**
- A Task blocked by an incomplete dependency is visually distinguishable from an unblocked Task on both the Dashboard and Timeline.
- Changing a Task's owner (delegating, per FR-2's Role-lead rule) reassigns it without losing its history/status; the new owner must accept it (FR-9).
- A Subtask cannot be moved to a different Role than its parent Task without first being promoted to a top-level Task.
- A Task carries optional guest-program fields: *show on guest program* (on/off), a guest-facing label, and a time of day distinct from its deadline. Only Tasks with *show on guest program* on reach the Run of Show (FR-22).

#### FR-8: Task status model, computed states, and Problem flag

Task status is more granular than done/not-done. The owner can set: **Not started, In progress, Waiting on external, Done**, each with an optional status note. **Blocked** (an incomplete dependency) and **Overdue** (past deadline, not Done) are computed by Arrangly, never set by hand. Separately, the owner can raise a **Problem** flag with a note.

**Consequences (testable):**
- A Task in "Waiting on external" surfaces distinctly from "Blocked" (which implies a dependency, not an outside party) on the Dashboard.
- A user cannot set Blocked or Overdue directly; both appear and clear automatically as dependencies and dates change.
- A raised Problem shows in the Organizer's and the Role lead's Dashboard as needing attention, with its note, until someone resolves it. It is visually distinct from Blocked.
- Status changes are timestamped, supporting both "overdue" computation and the course's AI-usage/QA documentation requirement (§0).

#### FR-9: Role-holder task view

A Role-holder sees their assigned Tasks, each Task's scope/expectations, and enough Team context (who else is on the Team) to understand how their part fits. Realizes UJ-2.

**Consequences (testable):**
- Opening an assigned Task shows its scope description, deadline, dependencies, parent Task/Subtasks, and current status in one view.
- A newly assigned Task must be explicitly **accepted** by its owner. Until then the Organizer sees it as "Not yet accepted"; after 48 hours unaccepted it moves into the Organizer's needs-attention list.
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
- Reversing a Decision Task's outcome re-runs the same spawn/obsolete logic idempotently: a previously obsoleted option-tied Task re-activates, and the other option's tied Task(s), if any, become obsolete in turn. No separate undo/redo history is required.

**Out of Scope:** Visual fork rendering — see §6.2.

#### FR-12: Task-delegation tracker

Every Task row shows, per Task, whether it has been delegated (a person assigned as owner) or is still pending (owned by a Role with no person assigned) — independent of completion status.

**Consequences (testable):**
- A Task with an assigned owner shows as "delegated," never as "pending," regardless of its completion status.
- The Organizer can filter their personal task list (*My tasks*) to pending (undelegated) Tasks only. The Dashboard stays ordered by urgency and has no delegation filter.
- A delegated Task shows whether its owner has accepted it ("Not yet accepted" / "Accepted"), as a separate signal from delegation.

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
- A Guest can change their answer at any time, including after the RSVP due date (FR-4).

#### FR-16: Guest needs, requests, and late changes

A freeform guest need from the RSVP, or a request the Guest sends later from their Guest Dashboard at any time, surfaces as a Proposed Task on the Dashboard of the Role that owns that area (e.g. Guests, Food & Beverage, Travel & Logistics), and is always visible to the Organizer. Arrangly ✦ suggests the owning Role from the text; when it is unsure, the Proposed Task goes to the Organizer, who can re-route it. Once confirmed and later completed, any resulting information is automatically shown on that Guest's own Guest Dashboard. A request can receive exactly one in-app reply, from the Organizer or a holder of the owning Role. Changes to RSVP, allergies, or hotel need made **after** the RSVP due date notify the owning Roles instead of creating a Proposed Task; before the due date, such changes just update the Guests tab. Realizes UJ-3.

**Consequences (testable):**
- A Proposed Task from guest data requires explicit confirmation before becoming an active Task (same rule as FR-6).
- Completing the resulting Task writes a Guest-visible result (e.g. "your airport pickup: [details]") without any manual step by the Role-holder to notify the Guest.
- A reply to a Guest request appears under that request on the Guest Dashboard, with a notification to the Guest. There is one reply per request and no thread.
- A post-due-date RSVP, allergy, or hotel change sends a notification to every holder of the Role(s) that own the changed data, and creates no Proposed Task.

#### FR-17: Manual guest reminder

From the guest list, the Organizer can trigger a reminder email to a non-responding Guest (or a filtered set of them) on demand.

**Consequences (testable):**
- The reminder is only sent when explicitly triggered — no automatic time-based send in Core (see §6.2 re: role-holder reminders, which remain Target and are unaffected by FR-17's manual-only scope).

#### FR-18: Guest dashboard

A Guest sees their own RSVP (with *Change my answer*), any information resolved on their behalf, their requests with replies, a *Send a request* action, and a link to the Landing page (FR-22). A Guest with an account (FR-3) also sees their upcoming Event(s) together.

**Consequences (testable):**
- A Guest without an account can still reach the same information via their Magic Link at any time.

### 4.6 Organizer Dashboard & Timeline

**Description:** The two core views an Organizer uses to run an Event without chasing anyone. Realizes UJ-1, UJ-2.

#### FR-19: Organizer dashboard

A single view shows, across the Event: what's done, overdue, blocked, flagged with a Problem, not yet accepted, and needs a decision or delegation, plus a Guests tab aggregating RSVP status and compiled allergy/hotel data routed to the relevant Role.

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

**Out of Scope:** Visual fork rendering — see §6.2.

### 4.7 Communication

**Description:** One-way announcements tied to the Event's structure, plus the notification channels that carry them and other alerts (FR-23). Announcements were shrunk from a full threaded-messaging model after feasibility review, but kept load-bearing in Core because day-of coordination depends on it: a speech running long and shifting main-course timing needs to reach the kitchen/serving team immediately, not sit in a backlog.

#### FR-21: Announcement/notification feed to a Role, person, or group

An Organizer (or a Role-holder, scoped to their Role) can push a one-way announcement to an individual, an entire Role, the whole Team, or a custom group the Organizer defines. A Role-holder can address only their own Role(s) or people in them. No threading, no read receipts — announcements append to a flat feed each recipient can scroll. The sender can switch on **Ask for volunteers**, which adds a one-tap *I can help* response; this is the only response an announcement accepts.

**Consequences (testable):**
- An announcement sent to a Role reaches every current holder of that Role at send time.
- Delivery is in-app plus each recipient's enabled channels (FR-23); the feed is visible to its recipients within the Event, not just as an outbound message.
- An announcement can be sent standalone at any time; nothing auto-triggers one from a Task or Timeline event in Core.
- On a volunteer announcement, a recipient can offer help and withdraw the offer. The sender sees responders in order and can assign any of them to a Task in one step (opening delegation prefilled).

**Out of Scope:** Two-way threaded conversation, free-text replies to announcements, read receipts, and automatic delay-triggered notifications — see §6.2, Stretch ("Delay-impact propagation... with Organizer approval"), which is where an automatic version of this would live.

#### FR-23: Notification channels and preferences

Every user chooses how Arrangly reaches them, per channel: **in-app** (always on), **email**, and **web push** (browser notifications, requested only when the user switches it on). Notifications fire for: a new Task assigned, a new decision request, a decision result, a Problem reported, a post-due-date RSVP change (FR-16), an announcement, and a reply to a Guest request.

**Consequences (testable):**
- In-app notifications cannot be switched off; email and web push can.
- Arrangly never triggers the browser's push-permission prompt unless the user switches web push on. If the browser has blocked push, the setting shows as off with instructions, and Arrangly never re-prompts automatically.
- Every notification is sent immediately; there is no time-based grouping. One user action produces at most one notification per recipient — several items from that action arrive as one (e.g. "2 new items need you").

**Out of Scope:** SMS — it needs an external messaging provider, which §5 rules out for v1. It is shown as a disabled "coming later" option only.

### 4.8 Landing Page & Run of Show

**Description:** The Guest-facing event page, whose Program section is the day-of Run of Show — distinct from the Timeline (FR-20), which is the Organizer/Team's planning view. Where FR-20 is the airline's operations timeline, this is the passenger's itinerary: what's happening and when, from the Guest's side. Realizes UJ-3.

#### FR-22: Landing page with guest-facing Run of Show

Each Event has a Landing page with About, Program, Location, Menu and practical info. The Program is the Run of Show: a simple, chronological day-of schedule (e.g. doors, dinner, speeches, DJ) built from Tasks with *show on guest program* switched on (FR-7), using their guest label and time of day. On first open, Arrangly ✦ drafts the About text as a warm invitation in the Event's language, from the questionnaire, event description, dress code and guest-program Tasks. The Organizer can edit it, ask for a rewrite with a tone hint, or write it themselves. The Organizer reviews the page and publishes it; Guests see only the last published version.

**Consequences (testable):**
- The Program shows only Tasks with *show on guest program* on, using their guest label and time of day — never a Role's internal Task title, owner, deadline, or status.
- Guests with or without an account can view the published Landing page via their Magic Link. Before first publish, Guests see RSVP and their Guest Dashboard only.
- Edits after publishing are not visible to Guests until the Organizer publishes the update.
- The AI-drafted About counts toward the AI call cap (§4.9). If drafting fails or the cap is reached, the Organizer gets an empty editor with a short explanation, and the page is never blocked.

**Out of Scope:** Live linkage where a Timeline delay automatically updates the Run of Show — see §6.2, Stretch ("Impact of delays on the run of show").

### 4.9 Constraints and Guardrails

**Privacy (GDPR baseline):** Allergy and food data are health data (GDPR art. 9). They are visible only to the Organizer, the Guest and the Role they're routed to (e.g. catering), per FR-2's RBAC model. The baseline in Core:

- All data is stored and processed in the EU.
- A Guest gives explicit consent before entering allergy or food data.
- Health data is never sent to AI.
- Guest personal data is deleted automatically 15 days after the Event ends, keeping anonymous counts only.
- A Guest can *Delete my data* from the Guest Dashboard at any time.
- A privacy notice lists the processors.

A full compliance program (records of processing, data processing agreements, DPIA, consent log) is out of scope for v1. A real product launch would need it.

**Localisation:** The whole product (Team and Guest sides, including AI-drafted text and emails) is available in **Norwegian Bokmål and English**. The language follows the device/browser, falls back to English, and can be overridden in the user's settings. Norwegian strings are written natively, not machine-translated literally. AI-drafted Guest-facing text uses the Event's language.

**Cost:** FR-6, FR-14, FR-16's Role routing and FR-22's About draft (and FR-13's Target-tier AI-search enhancement, if built) all make live AI/tool calls against a personal/course budget, not production infra. Before building any AI-touching FR, define a hard per-feature call cap and a mocking/fixture strategy for development — see Open Question 1 for the specific numbers still to be set.

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
- Announcements & notifications: FR-21 (flat feed, no threading; *Ask for volunteers*), FR-23 (in-app, email, web push)
- Landing page & Run of Show: FR-22 (incl. ✦ AI-drafted About)
- Norwegian + English localisation (§4.9)

Added to Core by the UX pass (2026-09-29): Landing page (was Target), Role lead, Accept step, Problem flag, guest requests with one reply, volunteer announcements, web push, localisation, and the AI-drafted About. The due date moved to 2026-12-20 in the same period.

`[NOTE FOR PM]` These additions grew Core by more than the 20 extra days cover. If Core slips, move to Target in this order: web push (FR-23 keeps in-app + email), then the *I can help* volunteer response (FR-21 keeps plain announcements), then the AI-drafted About (FR-22 keeps a manual editor). Each cut leaves its FR working.

### 6.2 Out of Scope for MVP

**Target — build if Core is stable:**
- Bulk guest-list import via file upload (`.xls`/`.csv`) — deferred from FR-5; manual/link entry covers Core.
- AI-populated venue search (deferred from FR-13) — auto-suggesting candidates from an external venue/places source within a radius. Per feasibility review, real venue APIs don't expose a structured capacity field, so even here this ships as best-effort, LLM-inferred, clearly-flagged-as-approximate information — never a reliable capacity filter. Core's manual entry (FR-13) is not a placeholder for this; it may remain the better path permanently.
- AI backward-planned timeline with dependencies and lead times (from the brief; builds on FR-20's sequential timeline).
- Automated reminders to Role-holders (brief's original Target item; distinct from the Guest reminder in FR-17, which is manual and Core).
- Visual fork/branch rendering in the Timeline (deferred from FR-11/FR-20) — the obsolete-marking logic itself ships in Core; only the graphical fork is deferred, as isolated rendering risk rather than data-model risk.
- Richer Timeline interactivity beyond static read-only render (drag-and-drop, live editing, zoom) — deferred from FR-20.
- Announcements beyond FR-21's flat feed: two-way threaded messaging, read receipts. (The brief's guest information page moved to Core as FR-22's Landing page.)

**Stretch — only with time to spare:**
- AI detection of gaps in the plan (e.g. a DJ without a soundcheck).
- Delay-impact propagation across the Run of Show (builds on FR-22), with Organizer approval.
- Guest-count changes rippling into food, staffing, and budget.
- Gift register (a wish-list Guests can browse from the Landing page — distinct from crowdfunded/pooled-payment gifts, which stay a Non-Goal per §5).
- Seating chart on the Landing page (where each Guest sits). New in the UX pass; not in the brief.
- AI-proposed guest program shown in the Guest view.

Risk-triage history for the Core/Target boundary lives in `review-feasibility.md`.

## 7. Success Metrics

**Primary**
- **SM-1**: A deployed, working web application runs the flagship scenario (40th birthday, 80 guests: venue, dinner, speeches, quiz, DJ) end to end across all three personas by 2026-12-20. Validates FR-1, FR-4, FR-6, FR-7, FR-15, FR-19, FR-22.
- **SM-2**: RBAC holds under test — zero observed instances of a user acting outside their Role's granted access. Validates FR-2.

**Secondary**
- **SM-3**: A first-time Role-holder finds their Tasks and understands what's expected within about a minute of registering. Validates FR-9.
- **SM-4**: A Guest can RSVP, manage a plus-one, and register allergies without creating an account. Validates FR-3, FR-15.
- **SM-5**: The Organizer can state the Event's current status (done/overdue/blocked/needs-decision) from the Dashboard alone, without contacting Team members. Validates FR-19.

**Counter-metrics (do not optimize)**
- **SM-C1**: AI-suggested Task acceptance rate should not be driven toward 100% — a rate that high more likely indicates rubber-stamping than good suggestions. Counterbalances FR-6.
- **SM-C2**: Total Task count is not a target to maximize — more Tasks without completion tracking would inflate Dashboard noise and undermine SM-5. Counterbalances FR-7, FR-12.

## 8. Open Questions

None open.

*Resolved in architecture (2026-10-02, `architecture-Arrangly-2026-09-29`, AD-9/AD-7):* per-feature AI caps, a USD 5/month ceiling and fixture mode are fixed in AD-9. Notification grouping was dropped in favour of "one action, at most one notification per recipient" (AD-7, FR-23).

*Resolved in the UX pass:* PIN hardening no longer applies — the PIN was removed (FR-3). Run of Show Task fields are settled by FR-7's guest-program fields.

## 9. Assumptions Index

No open inline `[ASSUMPTION]` tags remain — FR-8's timestamping inference was confirmed during Finalize triage (see `.memlog.md`) and is now stated as a decided consequence.
