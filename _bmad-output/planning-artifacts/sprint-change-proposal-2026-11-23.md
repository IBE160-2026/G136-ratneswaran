---
title: Sprint Change Proposal — Epic 12, visual polish and Dashboard redesign
date: 2026-11-23
status: approved
scope: moderate (new epic and five stories; one UX-DR addendum; DESIGN.md and EXPERIENCE.md additions; no PRD, architecture or schema change)
branch: plan/epic-12-visual-polish
---

# Sprint Change Proposal — Epic 12, visual polish and Dashboard redesign

## 1. Issue summary

**Trigger.** After Epics 1–5 and most of Epic 7 were built, the owner reviewed the running app (local stack, seeded Demo 40th Birthday, logged in as the demo Organizer, light and dark, 1024px wide) and found it bare. The Dashboard needs a full redesign.

**What was checked.** The tokens in `app/globals.css` match DESIGN.md (Warm Sky, Clear Sky, type, radius, densities). Status labels, the sidebar active state and the Timeline bars follow the spec. The gap is composition, not foundation:

- Dashboard sections are loose text rows on the page background. No cards, no section headers with weight, no key numbers.
- `src/components/ui/` holds 9 components. DESIGN.md lists `Card`, `Select`, `Tabs`, `Switch`, `Checkbox`, `Avatar`, `Separator` and `DropdownMenu` as used "as they come". None exist, so every card is a hand-written `bg-card rounded-md border` and the hairline shadow in DESIGN.md (Elevation) is not applied anywhere.
- The shell is a text header, three links and a loose footer link. The auth pages and the home page have no card, no centring and no hero.
- The Task page lacks the Accept banner, status control and Help card layout of DESIGN.md. Timeline controls ("Svømmebaner / Liste", "Ny oppgave") read as raw links.
- Sidebar label "Arrangementsinnstillinger" breaks mid-word at 240px.

**Not checked.** 375px and 320px layouts, the guest screens (landing page, RSVP, Guest Dashboard) and the Team & Roles and Guests tabs. Story 12.5 covers them.

**Type.** Misunderstanding of what "done" looks like: Epics 1–7 acceptance criteria checked behaviour and the status vocabulary, not visual composition. Nothing is rolled back.

**Evidence.** Screenshots of Alle arrangementer, Dashbord, Task detail and Tidslinje from the 2026-11-23 session; `out/dashboard-mockup.html` (owner approved it in both layouts).

**Inspiration, with a licence limit.** The owner pointed to Cruip's Mosaic Lite (`cruip/tailwind-dashboard-template`). It is GPL-3.0 ("don't republish, redistribute or resell"). **No code or markup from it may be copied.** It is a visual reference for the idea of a page head, a key-number row and titled cards only. Its purple brand colour, dark primary button, icon-only sidebar and large shadows all contradict DESIGN.md and are not used.

## 2. Impact analysis

**Epics.**

- Epic 5 (Dashboard and Timeline): all nine stories are `done`; none is reopened. The Dashboard keeps the sections, order and rules of Stories 5.1–5.4. Epic 12 restyles them and adds a page head, a key-number row and a "Next deadlines" card.
- Epic 11 (Ready for launch) stays last and unchanged. Epic 12 builds before it.
- Epics 6, 8, 9, 10: no change. Their screens will use the new components when built.
- Epic 4 Target stories 4.10–4.12 (decisions): the decision card and the "Waiting for decision" key tile appear only when those stories ship (Epic 5 rule: no placeholder for what does not exist).

**Schedule.** Feature freeze is 2026-12-15, submission 2026-12-20, today 2026-11-23: about three weeks. Core is finished except Story 4.8 (merged as PR #130, `sprint-status.yaml` still says `review`). Target stories compete with Epic 12 for the same time, so Epic 12 has a cut line (section 3).

**Artifacts.**

| Artifact | Change |
| --- | --- |
| PRD | None. FR19 and NFR12 are met; this changes presentation. |
| Architecture | None. No table, column, function or policy. Every number comes from `task_state` and existing loaders under the viewer's RLS (AD-3, AD-13). "Next deadlines" is computed per request, never stored. |
| `epics.md` | New Epic 12, release-tier row, epics overview line, UX-DR8 addendum. |
| `DESIGN.md` | Five new components (below). |
| `EXPERIENCE.md` | One clarification: key numbers are the exception to "Quiet & plain" on the Dashboard. |
| `sprint-status.yaml` | `epic-12` and five stories as `backlog`. |
| `AGENTS.md` | None. |
| Code | None in this proposal. |

**Conflict found.** EXPERIENCE.md (Tone, l.79) says working surfaces, Dashboard rows included, are "Quiet & plain". A row of large numbers is louder than the current Dashboard. Resolution in proposal 4.5: the key row is the only exception, it uses neutral surfaces, and only *Overdue* and *Decision* use status colour.

**Existing mock.** `mockups/key-dashboard-desktop.html` already exists. The new mockup extends it (page head, key row, Next deadlines, role bars). Per DESIGN.md the spine wins; this proposal updates the spine so the two agree.

## 3. Recommended approach

**Direct adjustment: add Epic 12, tier Core, built after Epic 7's Core stories and before Epic 11.** Effort: about five small PRs. Risk: medium, because of the freeze date, and low for correctness (no data or security change).

**Cut line.** 12.1, 12.2 and 12.3 are the commitment. 12.4 and 12.5 are built if time remains before 2026-12-15; if dropped, they move to the shipped-vs-planned record of Story 11.6. The "moments of delight" (P8) are not in Epic 12; they stay with the stories that own those screens.

**Alternatives rejected.**

- *Edit Stories 5.2 and 5.3 in place.* They are `done`; reopening them hides what shipped.
- *Fold polish into Epic 11.* Epic 11 is a launch checklist (its own convention says so) and would lose that shape.
- *Do nothing / polish informally.* Violates the traceability rules (one issue per story) and the planning-freeze rule in AGENTS.md.

## 4. Detailed change proposals

### 4.1 `epics.md` — new Epic 12 (insert before Epic 11 text, after Epic 10)

NEW:

> ## Epic 12: Visual polish and Dashboard redesign
>
> **Tier:** Core — see Release tiers. Built after Epic 7's Core stories and before Epic 11.
>
> The built screens match the composition in DESIGN.md and EXPERIENCE.md: shared components, an app frame, and a Dashboard that answers "what needs me now?" at a glance. No story adds a table, column, function or policy.
>
> **FRs covered:** none new; serves NFR12 and SM-5.
>
> **Epic-wide conventions:**
>
> - Only DESIGN.md tokens and shadcn components are used. No second brand colour, no gradients, no emojis, one shadow rule (hairline on cards; only the decision card lifts) (DESIGN.md Do's and Don'ts).
> - All data comes from existing loaders under the viewer's session and RLS. A holder never sees a number that reveals Tasks of a Role they do not hold (Epic 5 conventions).
> - Nothing renders for a feature that has not shipped: no placeholder tile, no empty decision card (Epic 5 Core scope note).
> - Every changed screen is checked at 1024px, 375px and 320px, light and dark, and keeps its existing Playwright tests green; text changes go to `messages/nb.json` and `messages/en.json` (AD-14).
> - Mosaic (Cruip) is GPL-3.0: no code or markup is copied from it. The Dev Notes of every story say so.
>
> ### Story 12.1: Shared components and the card
>
> As a developer, I want the shadcn parts DESIGN.md names and one card/section/row pattern, so that screens stop hand-writing cards.
>
> **Acceptance Criteria:**
>
> **Given** the components list in DESIGN.md
> **When** the story is done
> **Then** `Card`, `Select`, `Tabs` (segmented variant), `Switch`, `Separator` and `Avatar` exist in `src/components/ui/`, use `{colors.input}` for control borders and the focus ring token, and the hairline card shadow of DESIGN.md Elevation (light only)
> **And** a `SectionCard` (section-label `h2`, count pill, optional link) and a `TaskRow` (48px desktop, 44px phone minimum, status icon, word, subhead) are the only way the Dashboard, Tasks and My tasks list rows and sections
> **And** existing Playwright and Vitest tests pass without edits to their assertions.
>
> ### Story 12.2: App frame, auth and home
>
> As a visitor or a signed-in user, I want a frame and entry pages that look finished, so that the product feels trustworthy before I do anything.
>
> **Acceptance Criteria:**
>
> **Given** any page **When** it renders **Then** the header has the app name, the primary navigation and the profile or log-in controls laid out as in DESIGN.md Sidebar and Shell, and the privacy link sits in the footer, not beside the menu
> **And** the sidebar item "Arrangementsinnstillinger" and every other nb label wrap at word boundaries or are shortened in `messages/nb.json`, never broken mid-word at 240px
> **Given** `/login`, `/signup`, `/forgot-password`, `/reset-password` **When** they render **Then** the form is a centred `Card`, the primary button is the full-width pill, the password rules keep their icon and word, and the OAuth buttons are secondary buttons
> **Given** `/` **When** it renders **Then** it shows a hero (large title, tagline, sign-up and log-in actions) and nothing that implies a feature that does not exist.
>
> ### Story 12.3: Dashboard redesign
>
> As an Organizer or Role-holder, I want the Dashboard to open on a clear head, a few key numbers and then my work, so that I can state the Event's status in one look.
>
> **Acceptance Criteria:**
>
> **Given** the Dashboard **When** it renders **Then** the page head shows the Event name (`h1`), date, a "{n} days left" countdown computed on the server in the Event's time zone (AD-13, Conventions), the Draft or Published pill, and the primary *New task* button (Organizer only)
> **And** the Event cancelled, past and draft states of Story 5.3 and 5.4 keep their text and read-only behaviour inside the new head.
> **Given** the key row **When** it renders **Then** it shows tiles for *Open tasks* (of total, with a thin bar), *Overdue* (status-overdue outline and number, with the oldest in days) and *Guests answered* (n of N, with a thin bar, numbers only, no names or food data, NFR2), computed from `task_state` and the guest counts that Story 7.7 already reads
> **And** a *Waiting for decision* tile appears only once Stories 4.10–4.12 have shipped, in `{colors.status-decision}`, and not before
> **And** a holder of one Role sees tiles counted from the rows RLS lets them read, and a Role they cannot read adds nothing to any tile.
> **Given** *Needs you*, *At risk* and *On track* **When** they render **Then** each is a `SectionCard` with the same order, rows and rules as UX-DR8 and Stories 5.1–5.4, and *On track* shows one progress bar per Role (done of total, overdue segment in `{colors.status-overdue}`, label with counts) replacing the plain count row, still with Role lead, holders and link, and still showing "Tasks in {Role} are visible to its team." where the viewer cannot read
> **And** a *Next deadlines* card lists the five soonest open Tasks the viewer can read (date block, title, Role), computed per request, never stored, and collapses to one quiet line when empty
> **And** the decision card sits above *Needs you* and is the only lifted element, shown only when a decision exists.
> **Given** the Dashboard at 375px and 320px **When** it reflows **Then** the key row is two columns then one, the two-column body stacks, and nothing scrolls sideways (UX-DR24, NFR5)
> **And** the existing Dashboard and flagship Playwright tests pass, with new assertions for the page head, the key tiles' numbers against the seed (Story 5.9), and the Next deadlines order.
>
> ### Story 12.4: Task page
>
> As an owner, I want the Task page laid out as DESIGN.md describes, so that the next action is obvious.
>
> **Acceptance Criteria:**
>
> **Given** the Task page **When** it renders **Then** it shows, top to bottom: back control and `h1`, the Accept banner until accepted, the metadata inset card, the status control (segmented on desktop, full-width `Select` on phone) with the note field, then Problem, Delegate and history cards
> **And** the Help card and any option or decision section render only when their Target stories have shipped
> **And** on phone the primary actions sit in the sticky bottom bar with the safe-area inset, and toasts stack above it (DESIGN.md Elevation)
> **And** all Task Playwright tests pass.
>
> ### Story 12.5: Timeline controls, phone and guest screens
>
> As any user on a phone, I want every built screen to hold at 375px and 320px, so that no screen is only good on desktop.
>
> **Acceptance Criteria:**
>
> **Given** the Timeline **When** it renders **Then** *Svømmebaner / Liste* is a segmented control and *Ny oppgave* and *Hopp til i dag* use the secondary and primary button styles, with unchanged lane, bar and today-line behaviour
> **Given** Alle arrangementer, Guests, Team & Roles, the Guest Dashboard, the RSVP flow and the invite pages **When** they render **Then** each uses the shared components of Story 12.1, holds at 375px and reflows at 320px without two-way scrolling, in light and dark
> **And** a visual pass lists any remaining deviation from DESIGN.md as a finding in the story file; findings that need a rule change go to a new correct-course.

### 4.2 `epics.md` — Release tiers table

OLD (last rows):

> | 11 Ready for launch | all | — |

NEW:

> | 12 Visual polish and Dashboard redesign | 12.1–12.3; 12.4–12.5 only if time remains before the freeze | — |
> | 11 Ready for launch | all, built last | — |

### 4.3 `epics.md` — Epics overview and UX-DR8 addendum

After the `### Epic 11` summary block's neighbour in the overview (l.285 area), add:

> ### Epic 12: Visual polish and Dashboard redesign
> The built screens match the composition in DESIGN.md. Core. Built after Epic 7's Core stories, before Epic 11.

UX-DR8 (l.157), append one sentence:

> The Dashboard also has a page head (Event name, date, days left, status, *New task*), a key-number row (Open tasks, Overdue, Guests answered, and Waiting for decision once decisions exist) and a *Next deadlines* card, and *On track* shows one progress bar per Role (Epic 12, Story 12.3).

Rationale: UX-DR8 stays true for Stories 5.1–5.4; the sentence records what Story 12.3 adds without reopening them.

### 4.4 `DESIGN.md` — components

Add under Components → Arrangly-specific components, and in the YAML `components:` block:

> - **Page head.** `h1` large title, a subhead row (date · `clock` "{n} days left" · status pill in `{colors.primary-soft}`), and the primary button right-aligned; wraps under the title at <640px.
> - **Key tile.** `{colors.card}`, `{rounded.md}`, hairline shadow, 1.5px `{colors.border}`. Label (subhead, muted, Lucide icon), number (large-title scale), one line of context, optional 6px progress bar in `{colors.primary}`. *Overdue*: `{colors.status-overdue}` outline and number. *Waiting for decision*: `{colors.status-decision}` label and number. No other tile uses status colour.
> - **Role progress bar.** Role name, 6px bar (`{colors.primary}`; overdue segment `{colors.status-overdue}`), "done / total". Always with a count in words, never colour alone.
> - **Next deadlines.** Date block (month, day) plus title and Role; five rows, soonest first.
> - **Section card.** `{colors.card}`, `{rounded.lg}` desktop and `{rounded.md}` phone, section-label `h2`, count pill, optional "See all" link.

Rationale: DESIGN.md must describe what ships; the spine wins on conflict.

### 4.5 `EXPERIENCE.md` — Tone (l.79)

OLD:

> - **Quiet & plain** on working surfaces: status labels, Dashboard rows, Timeline, task metadata, Guests tab.

NEW:

> - **Quiet & plain** on working surfaces: status labels, Dashboard rows, Timeline, task metadata, Guests tab. The Dashboard's key-number row is the one louder element: neutral surfaces, with status colour only on *Overdue* and *Waiting for decision*.

### 4.6 `sprint-status.yaml`

Add after `epic-11` block's neighbour (build order noted in a comment):

> ```yaml
>   epic-12: backlog   # Core; built after Epic 7 Core, before Epic 11
>   12-1-shared-components-and-the-card: backlog
>   12-2-app-frame-auth-and-home: backlog
>   12-3-dashboard-redesign: backlog
>   12-4-task-page: backlog
>   12-5-timeline-controls-phone-and-guest-screens: backlog
>   epic-12-retrospective: optional
> ```

Also set `4-8-problem-flag` to `done` (PR #130 merged); this is housekeeping, not part of this change, and is listed so it is not forgotten.

## 5. Implementation handoff

**Scope: moderate.** Backlog reorganisation plus planning-document edits.

| Who | Does |
| --- | --- |
| Owner | Approves this proposal; reviews and merges the `plan/epic-12-visual-polish` PR. |
| Planning edits (this repo's `plan:` commits) | `epics.md`, `DESIGN.md`, `EXPERIENCE.md`, `sprint-status.yaml` on branch `plan/epic-12-visual-polish`. Not on `main`. |
| Developer agent | After the plan PR is merged: one GitHub issue per story, branch `feat/12.1-<slug>` from the updated `main`, in order 12.1 → 12.2 → 12.3, then 12.4 and 12.5 if time remains. |

**Success criteria.**

- Epic 12 stories 12.1–12.3 are `done` before the 2026-12-15 freeze, with the existing Playwright suite green.
- The Dashboard shows the page head, the key row, the three sections as cards, role bars and Next deadlines, in light and dark, at 1024px, 375px and 320px.
- No table, column, function or policy is added; `src/types/database.ts` is unchanged.
- No Mosaic code or markup is in the repository.
- Each story PR has its `docs/ki-logg.md` entry and the triage comment.

**Not covered by this proposal.** Landing page and Run of Show (Epic 9) and Announcements (Epic 10) screens are not built and are outside Epic 12. Dark-mode photography, illustration and motion are not proposed.
