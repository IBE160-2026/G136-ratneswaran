# Spine Pair Review — Arrangly

## Overall verdict

This spine pair is **adequate, not yet a clean contract**. The shape is correct, every colour token has a dark pair, all `{path}` references resolve, and the three PRD journeys have narrated Key Flows with climaxes. Downstream consumers would still stall on a few gaps. Load-bearing decisions are still open: 4 `[ASSUMPTION]` tags and 13 PRD deltas that PM has not confirmed. Several Core surfaces have no visual or behavioural spec: the Create-event wizard, Timeline, Task detail and manual task creation. One dark-mode token pair fails AA contrast.

## 1. Flow coverage — adequate

What was checked: UJ-1..UJ-3 and FR-1..FR-22 from the PRD were mapped to KF-1..KF-4, and to the Component and State rows that cover them. For each flow the check looked for a named protagonist, numbered steps, a climax, and a failure path.

UJ-1 maps to KF-4, UJ-2 to KF-2 and UJ-3 to KF-3. KF-1 is new and is covered by D1. All four flows have a protagonist, numbered steps, a bold climax and a failure line.

### Findings

- **high** No pattern exists for creating a Task by hand, yet three flows rely on it. KF-1 failure says "Leah can create the task herself from the row". KF-4 failure says "You can add them yourself". The Decision page has "+ Add follow-up task". The fields, the Role/owner picker, the deadline input and where the entry point sits are all undefined (EXPERIENCE.md › Component Patterns; KF-1 l.202; KF-4 l.240). *Fix:* add a "Task create/edit" row with its fields, defaults and entry points, and name the control that starts it from a status-note row.
- **high** Nothing lets a user tie a Task to one Decision option (FR-11), but KF-2's failure path ("a task tied to the rooftop option → obsolete") depends on it. Adding or editing dependencies is also not specified, only listed (Task detail row l.108; KF-2 l.214). *Fix:* add behaviour for "Depends on…" and "Only if option X is chosen" inside Task detail.
- **high** The Create event wizard has no behavioural pattern. KF-4 is the flagship flow (SM-1), but back/next, skipping questions (FR-4 "skipping → Proposed Task"), validation, saving a draft or abandoning, and how the questionnaire branches are all missing (IA l.35; Component Patterns). *Fix:* add a "Create event wizard" row. This is a new component, so it needs a row in both files. Also add a state for an abandoned wizard.
- **medium** Log in and sign up (FR-1) and Role-holder onboarding (FR-1 invite link, SM-3 "understand within a minute") have no flow. KF-2 starts with Stine already holding an account (IA l.32–33). *Fix:* add a short KF, or extend KF-2 with the invite → create account → first Dashboard steps.
- **medium** The FR-5 shareable invite-link path for guests is not covered: an "unidentified guest" who confirms their name. KF-4 step 3 covers only pasting guests, and the Guest IA begins at the per-guest Magic link (IA l.52). *Fix:* add the invite-link entry and a name-confirm step to the Guest IA and RSVP flow.
- **medium** Two parts of FR-12 have no home: the "delegated vs pending" indicator per Task, and the Organizer's filter for "pending (undelegated) only". My tasks lists undelegated tasks but gives no Dashboard filter (Dashboard sections l.103). *Fix:* state where the filter lives, or record a delta that My tasks satisfies it.
- **medium** FR-21 lets a Role-holder send announcements scoped to their own Role. The Announcement composer's recipient picker does not say how it is scoped for someone who isn't the Organizer (l.114). *Fix:* add an RBAC rule to the composer row.
- **medium** KF-2 step 5 says "Venue confirmation is flagged as a priority because other tasks depend on it". No component, state or token defines a "priority" flag (KF-2 l.210). *Fix:* define it, for example as a Task row variant or a Needs you rule, or drop it from the flow.
- **low** FR-16's data-change source, "a late RSVP shifting a catering count → Proposed Task", appears only as a notification and a Needs you row, not as a proposal (State Patterns l.137). *Fix:* say whether this is an intentional delta or route it through a Proposal row.
- **low** The FR-6 rule that the Organizer "can recategorize a Task afterward" has no control in Task detail. *Fix:* add a Role field, editable by the Organizer.

## 2. Token completeness — adequate

What was checked: every YAML token, every `{path}` reference in the components and prose, whether each colour has a light/dark pair, and a spot re-computation of contrast.

All 19 colour tokens have `-dark` pairs, and every `{colors.*}`, `{rounded.*}`, `{spacing.*}`, `{typography.*}` and `{components.*}` reference resolves. Contrast is stated for body, muted, primary and status text.

### Findings

- **high** `decide-button` and `notification-badge` hard-code `foreground: '#FFFFFF'` with no dark pair. In dark mode, white on `status-decision-dark` `#D08CF2` computes to about **2.4:1**, which fails AA on the loudest button on screen. White on `badge` `#FF3B30` / `#FF453A` is about 3.5:1 / 3.4:1 on small numerals (DESIGN.md l.126–137). *Fix:* add `status-decision-foreground` and `badge-foreground` tokens with dark pairs (e.g. `#000000` on the dark decision purple), and state the contrast for these two combinations.
- **medium** Several shadcn tokens the pair relies on are never defined or derived: `ring` (the focus ring, which is load-bearing for the a11y floor), `destructive` (used for the "Destructive toast") and `input`. The comment "derive from these" doesn't say how (DESIGN.md l.8; EXPERIENCE.md l.142). *Fix:* either give `ring` and `destructive` hex and dark values (and say whether destructive equals `status-overdue`), or name the derivation rule. State focus-ring contrast against `background` and `card`.
- **medium** No non-text contrast (WCAG 1.4.11) is stated for status outlines and icons. The `at-risk` border `#C9A227` on white computes to about 2.4:1. That is saved by the text label, but consumers need to know the label is mandatory for exactly that reason (DESIGN.md l.194, l.199). *Fix:* add one line on non-text contrast, or darken `at-risk` for the outline and icon.
- **low** Only `large-title-desktop` carries `fontFamily`, so the other typography tokens resolve with no family. `section-label` has no `lineHeight` and its uppercase styling is prose-only (DESIGN.md l.50–84). *Fix:* add a shared `fontFamily` to each role (or a `note: inherits system stack`), and add `textTransform`.
- **low** Type tokens are px, while the a11y floor requires "rem-based type" (EXPERIENCE.md l.166). *Fix:* state the px→rem conversion rule in DESIGN.md › Typography.
- **low** Shadows are literals in prose with no token: the card hairline and the decision lift (l.229). This is fine under the spec, but the decision-lift colour depends on mode. *Fix:* optional `components.decision-card.shadow` entry.

## 3. Component coverage — thin

What was checked: every component name in both files, looking for a visual row in DESIGN.md › Components **and** a behavioural row in EXPERIENCE.md › Component Patterns.

About 11 components are covered in both files. Roughly 10 behavioural patterns have no visual spec, and several visual variants have no owner.

### Findings

- **high** **Timeline** is a Core, novel visualisation (FR-20) and has no DESIGN.md spec. Lane anatomy, task node, nested subtask, decision-point marker, blocked and obsolete rendering, the edge fade and phone behaviour are all missing (EXPERIENCE.md l.113; DESIGN.md › Components). *Fix:* add a Timeline entry with its tokens.
- **high** **Task detail** has no visual spec: the Accept button, the status control, the Help area, Report a problem, and the phone bottom action bar mentioned in Responsive l.175. *Fix:* add a DESIGN.md entry.
- **medium** These have behaviour only, with no visuals: Decision page (option cards), RSVP flow (one question per screen plus progress indicator), Announcement composer and feed, Volunteer response, Landing page editor, Guest Dashboard (Resolved for you, requests and replies), Account offer, the Delegate picker and banners (unpublished, pre-publish). *Fix:* add a short DESIGN.md entry for each, or state that it uses shadcn X as-is.
- **medium** Task row variants are defined visually only for Blocked and Obsolete. Overdue, Waiting, Decision, Done, "Not yet accepted" and **Problem reported** (red, new under D7) have no row spec (DESIGN.md l.246). *Fix:* add a variant table for Task row (icon, colour token and word for each).
- **low** Component names drift between the files: "Request button (guest)" vs "Send a request", "Section header" vs "Dashboard sections", "Guest summary tiles" vs "summary tiles", and "Landing page (guest)" has no matching behavioural row. *Fix:* use one name per component in both files.
- **low** "Guest row" and "Section header" have visual rows but only implied behaviour. *Fix:* fold them explicitly into the Guests tab and Dashboard sections rows.

## 4. State coverage — adequate

What was checked: every IA surface (16 team and 7 guest), looking for empty, first-load, error, offline and permission states.

Global states are good: skeletons, offline, save failed, permission denied, role revoked, and AI slow or failed.

### Findings

- **medium** No **load failure** state exists. Save failed is covered, but a failed fetch on All events, Dashboard or Task detail is not. *Fix:* add a global "Couldn't load" state with *Retry*.
- **medium** Log in, Sign up and the Invite link have no error states: wrong password, unverified email (FR-1), weak password, an expired or used invite, or an invite to an email that already has an account. *Fix:* add rows.
- **medium** Team & Roles has no state for someone who has been invited but has not yet registered. Delegating to that pending person is also undefined. *Fix:* add a "pending invite" state.
- **medium** A person who is both a **Guest and a Role-holder in the same Event** has no defined state, although the PRD glossary allows it. Nothing says which experience their event card opens, or whether they RSVP (Event card l.101). *Fix:* add the rule.
- **low** Empty states are missing for Guests (no guests yet), Timeline (no tasks), Announcements (empty feed), Landing page editor (no guest-labelled tasks), Guest Dashboard (nothing resolved yet, no requests) and a filter with no matches. *Fix:* add one line each.
- **low** Guest states are missing for: after RSVP *No* (what they can still see), event deleted or cancelled, and event date passed. *Fix:* add rows.
- **low** Browser push permission denied (Notification preferences) and concurrent edits (Organizer and Role lead on the same task) are uncovered. *Fix:* add rows.

## 5. Visual reference coverage — adequate

What was checked: files in `.working/`, inline links and the spines-win statement. `color-themes-1/2/3.html` are linked in DESIGN.md › Colors, `directions-1.html` in Layout, and `ia-2026-09-28-v2.excalidraw` in EXPERIENCE.md › IA. All links resolve.

### Findings

- **medium** "Spine wins on conflict" appears only in EXPERIENCE.md › IA and names only "mock or wireframe". The linked `directions-1.html` (40px phone rows) and `color-themes-*.html` (obsolete `#8E8E93`) are known to conflict with DESIGN.md (44px, `#6E6E73`, see memlog l.98). *Fix:* move the rule to one place in Foundation that covers both spines and every `.working/` file, or add it to DESIGN.md too.
- **low** `.working/ia-2026-09-28.excalidraw` (v1) is orphaned. It has been superseded, so this is harmless. *Fix:* delete it or mark it superseded.
- **low** `mockups/` and `wireframes/` don't exist yet, and no key-screen links are present. This is expected. *Fix:* link the mocks inline from IA and Components once they are rendered.

## 6. Bloat & overspecification — strong

Both files are lean, and shadcn defaults are inherited instead of restated.

### Findings

- **low** PRD Deltas D13 (due-date move) is not a UX decision (EXPERIENCE.md l.260). *Fix:* move it to the memlog or a PM note.
- **low** The PRD Deltas section is not part of the required shape. It is useful as a PM handoff but will go stale inside the spine. *Fix:* keep it, but mark it as a temporary section to remove once PM folds the deltas into the PRD.

## 7. Inheritance discipline — thin

What was checked: that sources resolve (the PRD, brief and addendum all exist), that UJ names are used verbatim, that the glossary matches, that component names match across files, and that `[ASSUMPTION]` and PRD delta status is clear.

### Findings

- **high** Load-bearing decisions are uncommitted. Four `[ASSUMPTION]` tags remain: the 48h escalation, Report a problem, offline queueing and no shortcuts (l.135, 136, 141, 147). All 13 PRD deltas state "needs PM confirmation before architecture". D4 (PIN removal), D2 (Role lead), D7 (Report a problem) and D3 (Landing page = Run of Show) change the auth and data model. *Fix:* resolve the tags, get PM sign-off on D1–D12, and record the result.
- **high** FR-22 / PRD Open Question 3: the Landing page editor drafts from "confirmed tasks that have a guest-facing label". Task detail has no field for a guest-facing label, a public/private flag or a scheduled time-of-day (l.116 vs l.108). *Fix:* add these fields to Task detail, or state that they are set only in the Landing page editor.
- **medium** The status vocabulary diverges from FR-8 without a delta. The Task detail control omits "blocked" (it is implicitly derived from dependencies) and shortens the label to "Waiting on external". "Overdue" and "Problem reported" are extra states (l.108). *Fix:* add a delta: "Blocked and Overdue are computed, not settable; Problem is a flag".
- **medium** Key Flows never cite UJ-1/2/3 by ID, so a consumer can't trace KF-4 → UJ-1 and the others. *Fix:* add "(realizes UJ-1)" to each KF heading.
- **medium** Run of Show vs Landing page is inconsistent. The glossary says Landing page "contains the Run of Show", the IA says "Landing page (= Run of Show)" and the sidebar says "Landing page & Run of Show" (l.22, 42, 55). *Fix:* pick one relationship and use it everywhere.
- **medium** Counting rules are ambiguous. The event card is "Urgent (any overdue or act-now)", but "act-now" is undefined: does it include decisions, reported problems or unaccepted tasks? The badge counts "not-yet-opened" on the Event card but "unaccepted plus overdue" in the Sidebar (l.100–101). *Fix:* define the Urgent, At risk and badge counts precisely in one place.
- **medium** Pre-assignment is undefined during the wizard. A proposal ✓ "creates the task… pre-assigned (Role lead or named owner)", but in KF-4 the review (step 5) happens before Build team (step 6), when no holders exist yet (l.106). *Fix:* state that the owner becomes the Role (PRD FR-7 allows this) until the team is built.
- **low** The glossary claims to be "PRD §3 verbatim" but gives names only, and "Proposed Task" mostly appears as "✦ proposal" in the body. *Fix:* either inline the definitions or drop "verbatim", and use "Proposed Task" in behavioural rules.

## 8. Shape fit — strong

DESIGN.md follows the canonical order: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. Its frontmatter follows the spec (`name`, `description`, `colors`, `typography`, `rounded`, `spacing`, `components`). EXPERIENCE.md has all eight required sections plus the optional Responsive & Platform and Inspiration sections, matching the shadcn example.

### Findings

- **low** PRD Deltas comes after Key Flows, whereas the examples end with Key Flows. *Fix:* optional, move it to an appendix or the memlog.

## Mechanical notes

- Findings by severity: **critical 0 · high 8 · medium 19 · low 16**.
- Checked `.working/` files: `color-themes-1.html`, `color-themes-2.html`, `color-themes-3.html`, `directions-1.html`, `ia-2026-09-28.excalidraw` (orphan), `ia-2026-09-28-v2.excalidraw`.
- Contrast values were re-computed with the WCAG relative-luminance formula: white on `#D08CF2` ≈ 2.4:1, white on `#FF3B30` ≈ 3.5:1, white on `#FF453A` ≈ 3.4:1, `#C9A227` on `#FFFFFF` ≈ 2.4:1, white on `#7D3C98` ≈ 7.1:1 (passes).
- All frontmatter `sources` paths resolve. Every `{path.to.token}` reference in both files resolves.
- Neither DESIGN.md nor EXPERIENCE.md was edited.
