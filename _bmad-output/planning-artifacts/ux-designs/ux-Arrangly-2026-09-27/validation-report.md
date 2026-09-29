# Validation Report — Arrangly

- **DESIGN.md:** `/Users/aumgaran/Downloads/Arrangly/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/DESIGN.md`
- **EXPERIENCE.md:** `/Users/aumgaran/Downloads/Arrangly/_bmad-output/planning-artifacts/ux-designs/ux-Arrangly-2026-09-27/EXPERIENCE.md`
- **Run at:** 2026-09-28T22:27

## Overall verdict

This spine pair is **adequate, not yet a clean contract**. The shape is correct, every colour token has a dark pair, all `{path}` references resolve, and the three PRD journeys have narrated Key Flows with climaxes. Downstream consumers would still stall on a few gaps. Load-bearing decisions are still open: 4 `[ASSUMPTION]` tags and 13 PRD deltas that PM has not confirmed. Several Core surfaces have no visual or behavioural spec: the Create-event wizard, Timeline, Task detail and manual task creation. One dark-mode token pair fails AA contrast.

Accessibility reviewer: **Not ready. Fix before build.** The intent is strong: status is never colour-only, there is undo instead of confirm dialogs, reduced motion is respected, `lang` is set, and focus moves to the title on full pages. But one component spec fails contrast outright in dark mode (Decide button), the notification badge fails text contrast in both modes, and the input, switch and focus-ring specs are silent or inherit near-invisible borders. The 5s undo toast is not reachable by screen-reader or keyboard users. The Timeline and the reflow target (375px, not 320px) are also under-specified. Most fixes are one line in a spine.

## Category verdicts

- Flow coverage — adequate
- Token completeness — adequate
- Component coverage — thin
- State coverage — adequate
- Visual reference coverage — adequate
- Bloat & overspecification — strong
- Inheritance discipline — thin
- Shape fit — strong

## Findings by severity

### Critical (1)

**[Accessibility]** The Decide button is white text on `status-decision-dark` `#D08CF2` in dark mode, which is **2.41:1**. (§ DESIGN.md › components.decide-button; SC 1.4.3)
The Decide button is white text on `status-decision-dark` `#D08CF2` in dark mode, which is **2.41:1**. `decide-button.foreground` is hard-coded `#FFFFFF`, so builders will ship this on the loudest control on the Dashboard
Fix: add `decide-foreground: '#FFFFFF'` / `decide-foreground-dark: '#000000'` (black on #D08CF2 = 8.72:1) and reference the token in the component. Audit every other hard-coded `#FFFFFF` foreground the same way.

### High (17)

**[Flow coverage]** No pattern exists for creating a Task by hand, yet three flows rely on it. (§ EXPERIENCE.md › Component Patterns; KF-1 l.202; KF-4 l.240)
No pattern exists for creating a Task by hand, yet three flows rely on it. KF-1 failure says "Leah can create the task herself from the row". KF-4 failure says "You can add them yourself". The Decision page has "+ Add follow-up task". The fields, the Role/owner picker, the deadline input and where the entry point sits are all undefined
Fix: add a "Task create/edit" row with its fields, defaults and entry points, and name the control that starts it from a status-note row.

**[Flow coverage]** Nothing lets a user tie a Task to one Decision option (FR-11), but KF-2's failure path ("a task tied to the rooftop option → obsolete") depends on it. (§ Task detail row l.108; KF-2 l.214)
Nothing lets a user tie a Task to one Decision option (FR-11), but KF-2's failure path ("a task tied to the rooftop option → obsolete") depends on it. Adding or editing dependencies is also not specified, only listed
Fix: add behaviour for "Depends on…" and "Only if option X is chosen" inside Task detail.

**[Flow coverage]** The Create event wizard has no behavioural pattern. (§ IA l.35; Component Patterns)
The Create event wizard has no behavioural pattern. KF-4 is the flagship flow (SM-1), but back/next, skipping questions (FR-4 "skipping → Proposed Task"), validation, saving a draft or abandoning, and how the questionnaire branches are all missing
Fix: add a "Create event wizard" row. This is a new component, so it needs a row in both files. Also add a state for an abandoned wizard.

**[Token completeness]** `decide-button` and `notification-badge` hard-code `foreground: '#FFFFFF'` with no dark pair. (§ DESIGN.md l.126–137)
`decide-button` and `notification-badge` hard-code `foreground: '#FFFFFF'` with no dark pair. In dark mode, white on `status-decision-dark` `#D08CF2` computes to about **2.4:1**, which fails AA on the loudest button on screen. White on `badge` `#FF3B30` / `#FF453A` is about 3.5:1 / 3.4:1 on small numerals
Fix: add `status-decision-foreground` and `badge-foreground` tokens with dark pairs (e.g. `#000000` on the dark decision purple), and state the contrast for these two combinations.

**[Component coverage]** **Timeline** is a Core, novel visualisation (FR-20) and has no DESIGN.md spec. (§ EXPERIENCE.md l.113; DESIGN.md › Components)
**Timeline** is a Core, novel visualisation (FR-20) and has no DESIGN.md spec. Lane anatomy, task node, nested subtask, decision-point marker, blocked and obsolete rendering, the edge fade and phone behaviour are all missing
Fix: add a Timeline entry with its tokens.

**[Component coverage]** **Task detail** has no visual spec: the Accept button, the status control, the Help area, Report a problem, and the phone bottom action bar mentioned in Responsive l.175.
**Task detail** has no visual spec: the Accept button, the status control, the Help area, Report a problem, and the phone bottom action bar mentioned in Responsive l.175.
Fix: add a DESIGN.md entry.

**[Inheritance discipline]** Load-bearing decisions are uncommitted.
Load-bearing decisions are uncommitted. Four `[ASSUMPTION]` tags remain: the 48h escalation, Report a problem, offline queueing and no shortcuts (l.135, 136, 141, 147). All 13 PRD deltas state "needs PM confirmation before architecture". D4 (PIN removal), D2 (Role lead), D7 (Report a problem) and D3 (Landing page = Run of Show) change the auth and data model.
Fix: resolve the tags, get PM sign-off on D1–D12, and record the result.

**[Inheritance discipline]** FR-22 / PRD Open Question 3: the Landing page editor drafts from "confirmed tasks that have a guest-facing label". (§ l.116 vs l.108)
FR-22 / PRD Open Question 3: the Landing page editor drafts from "confirmed tasks that have a guest-facing label". Task detail has no field for a guest-facing label, a public/private flag or a scheduled time-of-day
Fix: add these fields to Task detail, or state that they are set only in the Landing page editor.

**[Accessibility]** The notification badge is white on `#FF3B30`, which is **3.55:1**, and white on `#FF453A` in dark mode, which is **3.41:1**. (§ DESIGN.md › colors.badge, components.notification-badge; SC 1.4.3)
The notification badge is white on `#FF3B30`, which is **3.55:1**, and white on `#FF453A` in dark mode, which is **3.41:1**. The badge carries a number (small text), so 4.5:1 applies
Fix: use `badge: '#D70015'` (5.38:1 with white). For dark mode, use `#D70015` too or pick a red that reaches ≥4.5 with white. Correct the "measured" contrast paragraph to list the badge.

**[Accessibility]** Input, checkbox and switch boundaries inherit `border` `#EDE6DB`, which is **1.24:1** on the card and **1.16:1** on the background. (§ DESIGN.md › Colors, "Unlisted shadcn tokens … derive from these"; SC 1.4.11)
Input, checkbox and switch boundaries inherit `border` `#EDE6DB`, which is **1.24:1** on the card and **1.16:1** on the background. In dark mode `#38383A` on `#1C1C1E` is **1.45:1**. shadcn derives `input` from `border`, so RSVP fields, the switch's off state and checkboxes would be hard to see
Fix: add an explicit `input` / `input-dark` token for form-control boundaries at ≥3:1 (e.g. `#8C8175`, 3.81:1 on white and 3.57:1 on the background; dark e.g. `#7A7A80`, 3.99:1 on the card). Keep `border` only for decorative card hairlines.

**[Accessibility]** The focus indicator is not specified anywhere. (§ DESIGN.md › Colors; EXPERIENCE.md › Accessibility Floor; SC 2.4.7, 2.4.11, 1.4.11)
The focus indicator is not specified anywhere. `ring` "derives" from unnamed tokens, and on the tinted surfaces (primary-soft, decision-soft, blocked tint) and the dark card a default ring can fall below 3:1. For example, light primary on the dark card is 3.06:1, which is borderline
Fix: add `ring: {colors.primary}` / `ring-dark: {colors.primary-dark}` with a 2px ring and a 2px offset in the page background colour. State that it must be visible on every tinted row. Never use `outline: none` without this.

**[Accessibility]** The undo toast is 5s and is the **only** undo path. (§ EXPERIENCE.md › Interaction Primitives, Accessibility Floor; SC 2.2.1, 4.1.3, 2.1.1)
The undo toast is 5s and is the **only** undo path. `aria-live="polite"` is queued behind other speech and often isn't read before it expires. "Extended while focused" is useless because nothing moves focus to it, and keyboard users can't reach it in 5s. Undo is also offered for delegate, status change and mark done
Fix: (a) set a toast minimum of 10s, pause on hover or focus, and make it persist while any toast is focused. (b) Add a documented shortcut to jump to the toast region (e.g. `F6` or `Alt+T`, as in sonner's `hotkey`). (c) **Add a timeless undo path**: each task created from ✓ gets *Undo* / *Remove* in Task detail history, and dismissed proposals appear under *Show dismissed (n)* in Needs you with *Restore*. Once undo is no longer time-bound, 2.2.1 no longer applies.

**[Accessibility]** Focus is lost when a proposal row animates out after ✓ or ✕, and when a task leaves a list after status changes. (§ EXPERIENCE.md › Component Patterns › Proposal row; Interaction Primitives; SC 2.4.3)
Focus is lost when a proposal row animates out after ✓ or ✕, and when a task leaves a list after status changes. Focus falls to `<body>`, so screen-reader and keyboard users lose their place
Fix: after a row leaves, move focus to the next row's primary action, or to the previous one, or to the section header if the section is now empty. On Undo, restore the row and return focus to its ✓ button.

**[Accessibility]** The ✓ confirm button is **30px**, which contradicts the spine's own 44×44 floor. (§ DESIGN.md › components.confirm-button; EXPERIENCE.md › Interaction Primitives; SC 2.5.8, 4.1.2, 2.5.3)
The ✓ confirm button is **30px**, which contradicts the spine's own 44×44 floor. The ✕ ghost button has no size, and both are icon-only with no specified accessible name
Fix: keep the 30px visual but give it a 44×44 hit area on phone (≥24×24 spacing on desktop). Specify `aria-label="Confirm: {title}"` / `"Dismiss: {title}"` (nb: "Bekreft: …" / "Avvis: …"). Apply the same rule to the menu button ("Menu" / "Meny"), the back control and the decision option pills.

**[Accessibility]** Reflow is targeted at 375px and "200% zoom", but WCAG 1.4.10 requires **320 CSS px** (1280px at 400%) without 2D scroll. (§ DESIGN.md › Layout & Spacing; EXPERIENCE.md › Foundation, Accessibility Floor, Responsive; SC 1.4.10, 1.4.4)
Reflow is targeted at 375px and "200% zoom", but WCAG 1.4.10 requires **320 CSS px** (1280px at 400%) without 2D scroll. Norwegian's +30% string length plus one-row layouts (decision card title row plus Decide, option pills "on one row", proposal row action column, event card with count circle) will overflow at 320px
Fix: change the floor to "works at 320 CSS px and 400% zoom". Specify wrap behaviour: decision-card pills wrap and Decide drops below the title under ~360px; the proposal row's ✓/✕ stack under the text. Sticky bars (Send a request, Task detail action bar) must un-stick or collapse when the viewport height is below ~400px.

**[Accessibility]** The Timeline's keyboard and screen-reader model is undefined. (§ EXPERIENCE.md › Component Patterns › Timeline; SC 2.1.1, 1.3.1, 1.3.2, 2.4.3)
The Timeline's keyboard and screen-reader model is undefined. The spec only says "horizontal scroll with visible edge fade; tapping a task opens it". Swimlanes, dependency order and decision markers are purely spatial
Fix: make the scroll container `role="region"` with `aria-label="Timeline"` and `tabindex="0"` so arrow keys scroll it. Make each lane a labelled list (`<ul aria-label="Venue">`) in deadline or dependency order, with task items as links. Focusing an item scrolls it fully out of the edge fade (`scrollIntoView({inline:'nearest'})`). Each item's name includes date, status and "waits for X" or "decision point". Add a **List view** toggle (grouped by Role, linear), which also covers 1.4.10.

**[Accessibility]** The forms and RSVP error pattern is not specified: no required or optional marking, no inline error, no error summary, and no focus handling between the one-question screens. (§ EXPERIENCE.md › RSVP flow, Accessibility Floor, State Patterns › Save failed; SC 3.3.1, 3.3.2, 3.3.3, 1.3.1, 2.4.3)
The forms and RSVP error pattern is not specified: no required or optional marking, no inline error, no error summary, and no focus handling between the one-question screens. The "Question 2 of 5" total is unstable because *No* ends the flow and plus-one is conditional
Fix: each question is a `<fieldset>` with its question as `<legend>` or `<h1>`. Focus moves to that heading on every step. Errors go inline via `aria-describedby`, with `aria-invalid`, and the message is re-announced. Show a visible *Back* control. The progress label counts only remaining applicable steps and updates when branching. Allergies use checkboxes plus an "Other" text field.

### Medium (30)

**[Flow coverage]** Log in and sign up (FR-1) and Role-holder onboarding (FR-1 invite link, SM-3 "understand within a minute") have no flow. (§ IA l.32–33)
Log in and sign up (FR-1) and Role-holder onboarding (FR-1 invite link, SM-3 "understand within a minute") have no flow. KF-2 starts with Stine already holding an account
Fix: add a short KF, or extend KF-2 with the invite → create account → first Dashboard steps.

**[Flow coverage]** The FR-5 shareable invite-link path for guests is not covered: an "unidentified guest" who confirms their name. (§ IA l.52)
The FR-5 shareable invite-link path for guests is not covered: an "unidentified guest" who confirms their name. KF-4 step 3 covers only pasting guests, and the Guest IA begins at the per-guest Magic link
Fix: add the invite-link entry and a name-confirm step to the Guest IA and RSVP flow.

**[Flow coverage]** Two parts of FR-12 have no home: the "delegated vs pending" indicator per Task, and the Organizer's filter for "pending (undelegated) only". (§ Dashboard sections l.103)
Two parts of FR-12 have no home: the "delegated vs pending" indicator per Task, and the Organizer's filter for "pending (undelegated) only". My tasks lists undelegated tasks but gives no Dashboard filter
Fix: state where the filter lives, or record a delta that My tasks satisfies it.

**[Flow coverage]** FR-21 lets a Role-holder send announcements scoped to their own Role. (§ l.114)
FR-21 lets a Role-holder send announcements scoped to their own Role. The Announcement composer's recipient picker does not say how it is scoped for someone who isn't the Organizer
Fix: add an RBAC rule to the composer row.

**[Flow coverage]** KF-2 step 5 says "Venue confirmation is flagged as a priority because other tasks depend on it". (§ KF-2 l.210)
KF-2 step 5 says "Venue confirmation is flagged as a priority because other tasks depend on it". No component, state or token defines a "priority" flag
Fix: define it, for example as a Task row variant or a Needs you rule, or drop it from the flow.

**[Token completeness]** Several shadcn tokens the pair relies on are never defined or derived: `ring` (the focus ring, which is load-bearing for the a11y floor), `destructive` (used for the "Destructive toast") and `input`. (§ DESIGN.md l.8; EXPERIENCE.md l.142)
Several shadcn tokens the pair relies on are never defined or derived: `ring` (the focus ring, which is load-bearing for the a11y floor), `destructive` (used for the "Destructive toast") and `input`. The comment "derive from these" doesn't say how
Fix: either give `ring` and `destructive` hex and dark values (and say whether destructive equals `status-overdue`), or name the derivation rule. State focus-ring contrast against `background` and `card`.

**[Token completeness]** No non-text contrast (WCAG 1.4.11) is stated for status outlines and icons. (§ DESIGN.md l.194, l.199)
No non-text contrast (WCAG 1.4.11) is stated for status outlines and icons. The `at-risk` border `#C9A227` on white computes to about 2.4:1. That is saved by the text label, but consumers need to know the label is mandatory for exactly that reason
Fix: add one line on non-text contrast, or darken `at-risk` for the outline and icon.

**[Component coverage]** These have behaviour only, with no visuals: Decision page (option cards), RSVP flow (one question per screen plus progress indicator), Announcement composer and feed, Volunteer response, Landing page editor, Guest Dashboard (Resolved for you, requests and replies), Account offer, the Delegate picker and banners (unpublished, pre-publish).
These have behaviour only, with no visuals: Decision page (option cards), RSVP flow (one question per screen plus progress indicator), Announcement composer and feed, Volunteer response, Landing page editor, Guest Dashboard (Resolved for you, requests and replies), Account offer, the Delegate picker and banners (unpublished, pre-publish).
Fix: add a short DESIGN.md entry for each, or state that it uses shadcn X as-is.

**[Component coverage]** Task row variants are defined visually only for Blocked and Obsolete. (§ DESIGN.md l.246)
Task row variants are defined visually only for Blocked and Obsolete. Overdue, Waiting, Decision, Done, "Not yet accepted" and **Problem reported** (red, new under D7) have no row spec
Fix: add a variant table for Task row (icon, colour token and word for each).

**[State coverage]** No **load failure** state exists.
No **load failure** state exists. Save failed is covered, but a failed fetch on All events, Dashboard or Task detail is not.
Fix: add a global "Couldn't load" state with *Retry*.

**[State coverage]** Log in, Sign up and the Invite link have no error states: wrong password, unverified email (FR-1), weak password, an expired or used invite, or an invite to an email that already has an account.
Log in, Sign up and the Invite link have no error states: wrong password, unverified email (FR-1), weak password, an expired or used invite, or an invite to an email that already has an account.
Fix: add rows.

**[State coverage]** Team & Roles has no state for someone who has been invited but has not yet registered.
Team & Roles has no state for someone who has been invited but has not yet registered. Delegating to that pending person is also undefined.
Fix: add a "pending invite" state.

**[State coverage]** A person who is both a **Guest and a Role-holder in the same Event** has no defined state, although the PRD glossary allows it. (§ Event card l.101)
A person who is both a **Guest and a Role-holder in the same Event** has no defined state, although the PRD glossary allows it. Nothing says which experience their event card opens, or whether they RSVP
Fix: add the rule.

**[Visual reference coverage]** "Spine wins on conflict" appears only in EXPERIENCE.md › IA and names only "mock or wireframe". (§ 44px, `#6E6E73`, see memlog l.98)
"Spine wins on conflict" appears only in EXPERIENCE.md › IA and names only "mock or wireframe". The linked `directions-1.html` (40px phone rows) and `color-themes-*.html` (obsolete `#8E8E93`) are known to conflict with DESIGN.md
Fix: move the rule to one place in Foundation that covers both spines and every `.working/` file, or add it to DESIGN.md too.

**[Inheritance discipline]** The status vocabulary diverges from FR-8 without a delta. (§ l.108)
The status vocabulary diverges from FR-8 without a delta. The Task detail control omits "blocked" (it is implicitly derived from dependencies) and shortens the label to "Waiting on external". "Overdue" and "Problem reported" are extra states
Fix: add a delta: "Blocked and Overdue are computed, not settable; Problem is a flag".

**[Inheritance discipline]** Key Flows never cite UJ-1/2/3 by ID, so a consumer can't trace KF-4 → UJ-1 and the others.
Key Flows never cite UJ-1/2/3 by ID, so a consumer can't trace KF-4 → UJ-1 and the others.
Fix: add "(realizes UJ-1)" to each KF heading.

**[Inheritance discipline]** Run of Show vs Landing page is inconsistent. (§ l.22, 42, 55)
Run of Show vs Landing page is inconsistent. The glossary says Landing page "contains the Run of Show", the IA says "Landing page (= Run of Show)" and the sidebar says "Landing page & Run of Show"
Fix: pick one relationship and use it everywhere.

**[Inheritance discipline]** Counting rules are ambiguous. (§ l.100–101)
Counting rules are ambiguous. The event card is "Urgent (any overdue or act-now)", but "act-now" is undefined: does it include decisions, reported problems or unaccepted tasks? The badge counts "not-yet-opened" on the Event card but "unaccepted plus overdue" in the Sidebar
Fix: define the Urgent, At risk and badge counts precisely in one place.

**[Inheritance discipline]** Pre-assignment is undefined during the wizard. (§ l.106)
Pre-assignment is undefined during the wizard. A proposal ✓ "creates the task… pre-assigned (Role lead or named owner)", but in KF-4 the review (step 5) happens before Build team (step 6), when no holders exist yet
Fix: state that the owner becomes the Role (PRD FR-7 allows this) until the team is built.

**[Accessibility]** The at-risk mustard outline `#C9A227` is **2.42:1** on white and **2.26:1** on `#FAF7F2`. (§ DESIGN.md › colors.at-risk, event-card-at-risk; SC 1.4.11)
The at-risk mustard outline `#C9A227` is **2.42:1** on white and **2.26:1** on `#FAF7F2`. Because "N at risk" text also carries the state this is not a strict 1.4.11 failure, but the mustard count circle and outline are the at-a-glance signal and are invisible to low-vision users. `at-risk-text` on the background is also only 4.74
Fix: raise `at-risk` light to ≥3:1 on the background (e.g. `#A07F00`, 3.55:1 on the background and 3.8:1 on white), or make the outline decorative and state that the label is the sole required cue. The dark value `#E0B84A` is fine.

**[Accessibility]** The "measured" contrast paragraph is inaccurate. (§ DESIGN.md › Colors › Contrast; SC 1.4.3)
The "measured" contrast paragraph is inaccurate. "Every status text colour ≥ 5.0 on its surface" is false: obsolete on the background is **4.75**, at-risk-text on the background is **4.74**, muted on the sidebar is **4.62**, primary on primary-soft (proposal title and active sidebar item) is **4.88**, muted on decision-soft (decision subhead) is **4.57**, and muted on primary-soft (proposal subhead) is **4.68**. All still pass, but builders will trust the claim and lighten them
Fix: replace the claim with a pair table (text token × surface token → ratio) that includes the tinted surfaces. Mark the ≤4.7 pairs "do not lighten".

**[Accessibility]** The obsolete row relies on strikethrough and muted colour. (§ DESIGN.md › Task row › Obsolete; EXPERIENCE.md › State Patterns › Obsolete; SC 1.3.1, 1.4.1)
The obsolete row relies on strikethrough and muted colour. Screen readers do not announce `line-through` (CSS) and mostly ignore `<s>`/`<del>`. The spine does not require the status word "Obsolete" on the row
Fix: the obsolete row shows the `minus-circle` icon plus the visible status word "Obsolete" / "Utgått", like every other state. Strikethrough is decorative. The row's accessible name includes "obsolete, option not chosen: {option}".

**[Accessibility]** Dynamic content is not announced. (§ EXPERIENCE.md › State Patterns, Accessibility Floor; SC 4.1.3)
Dynamic content is not announced. Results appearing after "Drafting tasks…", new proposals, rows collapsing out, "Show obsolete" and Guests tile filters change the page silently. Save-failed and role-revoked toasts are urgent but polite
Fix: use `role="status"` on the AI progress line and announce the outcome ("7 tasks proposed"). After a filter or toggle, announce the count ("Showing 16 pending guests"). Use `role="alert"` for *Couldn't save*, *Role revoked* and *Offline*. Keep `polite` for undo toasts. Never announce every realtime row insertion; debounce to "2 new items in Needs you".

**[Accessibility]** The sidebar active item is effectively colour-only. (§ DESIGN.md › components.sidebar-item-active; SC 1.4.1, 1.4.11)
The sidebar active item is effectively colour-only. `primary-soft` on the `sidebar` background is **1.01:1** (the tint is invisible), and the blue text against normal foreground text differs by only **2.94:1**
Fix: add a non-colour cue (600 weight plus a 3px leading bar in primary, or a filled icon) and `aria-current="page"`.

**[Accessibility]** Decision page "options as selectable cards, one choice" has no semantics or selected-state spec (§ EXPERIENCE.md › Decision page; SC 4.1.2, 1.4.11, 1.4.1)
Decision page "options as selectable cards, one choice" has no semantics or selected-state spec
Fix: use a `radiogroup` of native radios styled as cards, with arrow-key navigation. The selected state gets a `circle-check` icon plus a ≥3:1 border (decision purple), not just a tint.

**[Accessibility]** The Guests summary "coming / declined / pending as a segmented bar" relies on colour segments (§ DESIGN.md › Guest summary tiles; SC 1.4.1, 1.1.1)
The Guests summary "coming / declined / pending as a segmented bar" relies on colour segments
Fix: always print the numbers with words beside the bar ("60 coming · 4 declined · 16 pending"). The bar is `aria-hidden`. Tiles that filter the list are buttons with `aria-pressed`.

**[Accessibility]** There is no bypass mechanism. (§ EXPERIENCE.md › Navigation; SC 2.4.1)
There is no bypass mechanism. On desktop, 9+ sidebar links precede the content on every page
Fix: add a "Skip to content" / "Hopp til innhold" link as the first focusable element, with landmarks `nav` (labelled "Event") and `main`.

**[Accessibility]** SPA route changes: only Task detail and Decision move focus. (§ EXPERIENCE.md › Accessibility Floor; SC 2.4.2, 2.4.3, 4.1.3)
SPA route changes: only Task detail and Decision move focus. Sidebar navigation, the wizard steps and Guest pages don't specify focus or `<title>`
Fix: every route sets `document.title` to "{Surface} – {Event} – Arrangly" and moves focus to the large-title `h1` (`tabindex="-1"`). Each wizard step does the same, with "Step 3 of 6".

**[Accessibility]** The top-right menu Sheet: the side it slides from, the trap and the ARIA are unspecified, and the button's DOM position relative to the title determines focus order (§ DESIGN.md › Layout; EXPERIENCE.md › Navigation, Sidebar; SC 2.4.3, 4.1.2)
The top-right menu Sheet: the side it slides from, the trap and the ARIA are unspecified, and the button's DOM position relative to the title determines focus order
Fix: the Sheet slides from the **right** (matching the trigger). The trigger has `aria-expanded`, `aria-controls` and the label "Menu" / "Meny". Focus is trapped while open, and the first item gets focus on open. Place the trigger after the `h1` in the DOM, or put it in a `header` landmark first, consistently on every page.

**[Accessibility]** Sticky and bottom bars (*Send a request*, the Task detail action bar) and bottom toasts can cover focused elements when tabbing (§ EXPERIENCE.md › Responsive; SC 2.4.11)
Sticky and bottom bars (*Send a request*, the Task detail action bar) and bottom toasts can cover focused elements when tabbing
Fix: add `scroll-padding-bottom` equal to the bar height, and stack toasts above sticky bars, not over them.

### Low (21)

**[Flow coverage]** FR-16's data-change source, "a late RSVP shifting a catering count → Proposed Task", appears only as a notification and a Needs you row, not as a proposal (§ State Patterns l.137)
FR-16's data-change source, "a late RSVP shifting a catering count → Proposed Task", appears only as a notification and a Needs you row, not as a proposal
Fix: say whether this is an intentional delta or route it through a Proposal row.

**[Flow coverage]** The FR-6 rule that the Organizer "can recategorize a Task afterward" has no control in Task detail.
The FR-6 rule that the Organizer "can recategorize a Task afterward" has no control in Task detail.
Fix: add a Role field, editable by the Organizer.

**[Token completeness]** Only `large-title-desktop` carries `fontFamily`, so the other typography tokens resolve with no family. (§ DESIGN.md l.50–84)
Only `large-title-desktop` carries `fontFamily`, so the other typography tokens resolve with no family. `section-label` has no `lineHeight` and its uppercase styling is prose-only
Fix: add a shared `fontFamily` to each role (or a `note: inherits system stack`), and add `textTransform`.

**[Token completeness]** Type tokens are px, while the a11y floor requires "rem-based type" (§ EXPERIENCE.md l.166)
Type tokens are px, while the a11y floor requires "rem-based type"
Fix: state the px→rem conversion rule in DESIGN.md › Typography.

**[Token completeness]** Shadows are literals in prose with no token: the card hairline and the decision lift (l.229).
Shadows are literals in prose with no token: the card hairline and the decision lift (l.229). This is fine under the spec, but the decision-lift colour depends on mode.
Fix: optional `components.decision-card.shadow` entry.

**[Component coverage]** Component names drift between the files: "Request button (guest)" vs "Send a request", "Section header" vs "Dashboard sections", "Guest summary tiles" vs "summary tiles", and "Landing page (guest)" has no matching behavioural row.
Component names drift between the files: "Request button (guest)" vs "Send a request", "Section header" vs "Dashboard sections", "Guest summary tiles" vs "summary tiles", and "Landing page (guest)" has no matching behavioural row.
Fix: use one name per component in both files.

**[Component coverage]** "Guest row" and "Section header" have visual rows but only implied behaviour.
"Guest row" and "Section header" have visual rows but only implied behaviour.
Fix: fold them explicitly into the Guests tab and Dashboard sections rows.

**[State coverage]** Empty states are missing for Guests (no guests yet), Timeline (no tasks), Announcements (empty feed), Landing page editor (no guest-labelled tasks), Guest Dashboard (nothing resolved yet, no requests) and a filter with no matches.
Empty states are missing for Guests (no guests yet), Timeline (no tasks), Announcements (empty feed), Landing page editor (no guest-labelled tasks), Guest Dashboard (nothing resolved yet, no requests) and a filter with no matches.
Fix: add one line each.

**[State coverage]** Guest states are missing for: after RSVP *No* (what they can still see), event deleted or cancelled, and event date passed.
Guest states are missing for: after RSVP *No* (what they can still see), event deleted or cancelled, and event date passed.
Fix: add rows.

**[State coverage]** Browser push permission denied (Notification preferences) and concurrent edits (Organizer and Role lead on the same task) are uncovered.
Browser push permission denied (Notification preferences) and concurrent edits (Organizer and Role lead on the same task) are uncovered.
Fix: add rows.

**[Visual reference coverage]** `.working/ia-2026-09-28.excalidraw` (v1) is orphaned.
`.working/ia-2026-09-28.excalidraw` (v1) is orphaned. It has been superseded, so this is harmless.
Fix: delete it or mark it superseded.

**[Visual reference coverage]** `mockups/` and `wireframes/` don't exist yet, and no key-screen links are present.
`mockups/` and `wireframes/` don't exist yet, and no key-screen links are present. This is expected.
Fix: link the mocks inline from IA and Components once they are rendered.

**[Bloat & overspecification]** PRD Deltas D13 (due-date move) is not a UX decision (§ EXPERIENCE.md l.260)
PRD Deltas D13 (due-date move) is not a UX decision
Fix: move it to the memlog or a PM note.

**[Bloat & overspecification]** The PRD Deltas section is not part of the required shape.
The PRD Deltas section is not part of the required shape. It is useful as a PM handoff but will go stale inside the spine.
Fix: keep it, but mark it as a temporary section to remove once PM folds the deltas into the PRD.

**[Inheritance discipline]** The glossary claims to be "PRD §3 verbatim" but gives names only, and "Proposed Task" mostly appears as "✦ proposal" in the body.
The glossary claims to be "PRD §3 verbatim" but gives names only, and "Proposed Task" mostly appears as "✦ proposal" in the body.
Fix: either inline the definitions or drop "verbatim", and use "Proposed Task" in behavioural rules.

**[Shape fit]** PRD Deltas comes after Key Flows, whereas the examples end with Key Flows.
PRD Deltas comes after Key Flows, whereas the examples end with Key Flows.
Fix: optional, move it to an appendix or the memlog.

**[Accessibility]** Mixed-language content: document-level `lang` is covered, but user-written text (announcements, notes, requests, AI drafts) may be in the other language, and the language picker options should be in their own language (§ EXPERIENCE.md › Foundation, Accessibility Floor; SC 3.1.1, 3.1.2)
Mixed-language content: document-level `lang` is covered, but user-written text (announcements, notes, requests, AI drafts) may be in the other language, and the language picker options should be in their own language
Fix: use `lang="nb"` (not `no`) and `lang="en"`. Picker options are "Norsk (bokmål)" `lang="nb"` / "English" `lang="en"`. Tag the ✦ Draft email with the language it was generated in. Accept that free text people write stays untagged, since that is an allowed limitation. Update `<html lang>` immediately on manual override.

**[Accessibility]** Localised abbreviated dates ("lør. (§ EXPERIENCE.md › Foundation; SC 1.3.1)
Localised abbreviated dates ("lør. 24. okt.") read poorly in screen readers
Fix: wrap dates in `<time datetime>`. Give the deadline/metadata subheads an `aria-label` with the full form where abbreviations are used.

**[Accessibility]** Section labels are "uppercase". (§ DESIGN.md › Typography › Section label)
Section labels are "uppercase". If the strings are authored in caps, screen readers may spell them out
Fix: author them in sentence case and use `text-transform: uppercase`. Make them `h2` with the count pill inside, e.g. "Needs you, 3".

**[Accessibility]** Count circle and card borders: the neutral count-circle border `#EDE6DB` is 1.24:1, and the card hairline 1.16:1. (§ DESIGN.md › count-circle; SC 1.1.1)
Count circle and card borders: the neutral count-circle border `#EDE6DB` is 1.24:1, and the card hairline 1.16:1. This is acceptable only because they are decorative. The count circle still needs a name
Fix: give it `aria-label="3 open tasks"`, and have the card link's name read "Lucas's 40th, Sat 24 Oct, Organizer, 3 open tasks, 1 overdue, 1 new task".

**[Accessibility]** Push permission: asking on enable is correct, but the iOS "Add to Home Screen" requirement and the denial state are unspecified (§ EXPERIENCE.md › Notification preferences, Responsive)
Push permission: asking on enable is correct, but the iOS "Add to Home Screen" requirement and the denial state are unspecified
Fix: if the browser permission is `denied`, show the switch off, with the text "Blocked in browser settings" plus how-to steps. Never re-prompt automatically. Explain the iOS step before the switch, in text rather than an icon.

## Reviewer files

- `review-rubric.md`
- `review-accessibility.md`