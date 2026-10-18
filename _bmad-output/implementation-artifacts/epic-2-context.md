# Epic 2 Context: Event and guest list

<!-- Generated from planning artifacts. Regenerate with compile-epic-context if planning docs change. -->

## Goal

An Organizer can create an Event through a guided, branching questionnaire, get Roles activated from the Branch Pool for its type and adjust them, change the Event's settings, add and edit guests by hand, cancel or delete the Event, and publish it to the team, with a draft that is never lost. This epic lays down the `events`, `roles`, `guests` and `guest_contacts` tables, the `is_organizer` helper and the Organizer-only access model that every later epic (Team, Tasks, Dashboard, Guests) builds on.

## Stories

- Story 2.1: Events table and Organizer-only access
- Story 2.2: Questionnaire with structured answers
- Story 2.3: Draft that is never lost
- Story 2.4: *All events* shows my events
- Story 2.5: Roles from the Branch Pool
- Story 2.6: Event settings: dates, RSVP due date and language
- Story 2.7: Cancel or delete an Event
- Story 2.8: Description and publish to the team
- Story 2.9: Add guests by hand
- Story 2.10: Edit and remove guests

## Requirements & Constraints

- Exactly one Organizer per Event. In this epic only the Organizer can read or write an Event, its Roles and its guests. Other logged-in users and anonymous callers see nothing, and this is enforced in the database, not the UI.
- Questionnaire answers (event type, date and time with time zone, guest count, duration, venue known, RSVP wanted plus due date, guest-list method) are stored as structured columns. "Not sure yet" is stored as an explicit `unknown`, distinct from "never asked", so a later epic can turn it into a Proposed Task. Epic 2 creates no Tasks.
- Event language (nb/en) defaults to the Organizer's interface language and can be changed. It drives only Guest-facing text and never changes the Organizer's own UI language.
- Required before publish: `name`, `starts_at`, `ends_at`, `time_zone`, `language`, with `starts_at < ends_at`. A draft may be incomplete. RSVP due date must be on or before `starts_at`. Guest count must be a positive integer. Each rule is checked both in Zod and in a database CHECK.
- Drafts autosave per step. Concurrent tabs must not overwrite each other's columns, and a double click on *Create new event* or *Publish* has an effect only once.
- Publishing is idempotent and refuses an incomplete draft, listing exactly what is missing. A cancelled Event is read-only and cannot be published. Core sends no application email, so publish copy must not promise that invitations are sent.
- Guests: name and email per row, validated inline for email format and for duplicates (case-insensitive) within the input and against the existing list. Rows with control characters or line breaks are rejected (protects future email headers). A documented upper bound applies per submission, and the user sees how many rows were added and which failed.
- Logs carry event id and user id only, never guest names or emails.
- Status words never rely on colour alone. Accessibility: inline errors use `aria-invalid`/`aria-describedby` with focus on the first error, and focus moves to the `h1` on every route and wizard step.

## Technical Decisions

- **Ownership:** the events module owns `events` and `roles`; the guests module owns `guests` and `guest_contacts`. Only the owner writes its tables (AD-1).
- **Mutation paths:** multi-step changes are one Postgres function called from a Server Action: `events_create`, `events_update_schedule`, `events_publish`, `events_delete`, plus the Role toggle. These are mutation functions: `security definer`, `search_path = ''`, granted to `authenticated`, revoked from `public`/`anon`, and they authorise from `auth.uid()` and `is_organizer`. They never take a user id from the caller, so `organizer_id = auth.uid()` is set inside `events_create`. Direct edits are allowed only on columns the migration grants via `UPDATE (col, …)`, and all other INSERT/UPDATE/DELETE is revoked (AD-2, AD-5, AD-19).
- **RLS:** every table has RLS. Policies use only the AD-3 helpers. `is_organizer(event_id)` is `STABLE` with `search_path = ''`. No email matching, and any view is `security_invoker`.
- **Roles:** the Branch Pool has stable keys (`venue`, `guests`, `food_beverage`, `entertainment`, `travel_logistics`, others) with localised names. The type → default-active mapping lives in one TS place with a Vitest test. Every pool Role gets a `roles` row with `active` set by the mapping. A Role is deactivated with `roles.active = false` and never deleted. `roles.active` is the single source for "owning Role inactive, so the Organizer owns its guest data". Changing the type only suggests Role changes and never silently undoes a manual toggle.
- **Guest storage split:** the name lives in `guests`. The email lives in `guest_contacts` (`guest_id` unique, `event_id`, `email`, `ON DELETE CASCADE`), readable only by the Organizer, with a unique `(event_id, lower(email))` constraint so races cannot create duplicates.
- **Deletion:** every foreign key to `events` is `ON DELETE CASCADE`. A pgTAP test lists all FKs to `events` and fails on `NO ACTION`. Discarding a draft uses the same `events_delete` without the typed-name confirmation.
- **Time:** `timestamptz` in UTC. `ends_at` is read at run time by later jobs (retention, invite validity) and is never cached.
- **Tests:** every policy, grant and function gets a pgTAP allow and deny. These include a denied direct PostgREST `INSERT`, a denied `UPDATE` of `organizer_id`, a denied direct `DELETE` on `roles`, and non-Organizer denial on each function (AD-16).
- **Process:** every schema change is a new migration. Regenerate `src/types/database.ts` after each one. Server Actions parse with Zod first and return the `{ ok, data } | { ok: false, error: { code, message } }` shape, where `message` is a next-intl key. All strings go in `messages/nb.json` and `messages/en.json`.

## UX & Interaction Patterns

- **Wizard:** six steps (Questionnaire → Guests → Description → Review ✦ → Team → Publish), with a "Step N of 6" caption and *Back*/*Next* on every step. Every answer stays editable later, and branching skips questions that don't apply (e.g. RSVP "no" skips the due date). AI review and team building come from later epics.
- ***All events*:** one card per Event (name, date, "Organizer") with a single link that has a full accessible name, sorted by date. Space is reserved for the counts and badges that arrive in Epics 4–5. A draft card reads "Draft · continue setup" and reopens the last incomplete step. The *Create new event* card is always last, and with no events it is the only card under "Let's plan something.". Past events sit under "Past events" (read-only). Cancelled Events show "Cancelled" with an icon and the word. Lists load with a final-shape `Skeleton` and show the *Retry* card on failure.
- **Interim Event home:** shows name, date and Draft/Published, with a sidebar event group listing only the items that exist so far. The Epic 5 Dashboard replaces it later. An unpublished Event shows the banner "Only your team can see this event. Publish to send invitations." with *Publish*. Opening someone else's Event by URL shows "You don't have access to this part of the event." and no data.
- **Confirmations:** Publish and Cancel/Delete event use confirmation dialogs. Delete requires typing the Event name. Removing a guest uses a 10 s *Undo* toast that restores the same details, with no dialog.
- **Failure states:** a failed save or going offline shows "Couldn't save. Trying again.", keeps the input and offers *Retry*.
- **Guests list:** shows "Not invited yet" per guest and the guest count, and is readable at 320px. The empty state offers adding by hand. The invite-link option comes in Epic 7.
- Read DESIGN.md and EXPERIENCE.md before building any UI.

## Cross-Story Dependencies

- Story 2.1 (table, grants, `is_organizer`, publish CHECK) underpins every other story. Stories 2.3 and 2.8 rely on its CHECK, and Story 2.5 hooks into `events_create` and the type answer.
- Story 2.4 replaces the Epic 1 empty state and the Create-new-event placeholder. Before the first Epic 2 form, shared form styles and the password-rules list are extracted into `src/components` (Epic 1 retrospective action).
- Leave named hooks for later epics:
  - `events_update_schedule` is the single place where Epic 4 recalculates resolved deadlines when `starts_at` changes. Mark this with a code comment.
  - `events_delete` is the single place where Epic 7 adds the guest-data and auth-user purge.
  - Guest removal (Story 2.10) moves to `guests_delete_guest_data` once a guest has an RSVP or an auth user (Epic 7). Note this in code.
- Epic 3 builds Team, invitations and `role_members` on these Roles. Epic 7 builds invitations, the Guests tab and RSVP on these `guests`/`guest_contacts` rows. Later epics reuse the Epic 1 limiter, shell and feedback primitives.
