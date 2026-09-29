---
name: Arrangly
description: Calm, Apple-clean event-planning web app. shadcn/ui on React + Tailwind; this DESIGN.md specifies the brand-layer delta over shadcn defaults.
status: draft
updated: 2026-09-28
colors:
  # Light = "Warm Sky" (warm paper surfaces + one blue accent). Dark = "Clear Sky" (Apple-dark).
  # Every token has a -dark pair. shadcn mapping: background, card, foreground, muted-foreground,
  # border, input, ring, primary(-foreground) map 1:1; popover = card; destructive = status-overdue.
  background: '#FAF7F2'
  background-dark: '#000000'
  card: '#FFFFFF'
  card-dark: '#1C1C1E'
  sidebar: '#F3EEE6'
  sidebar-dark: '#0F0F10'
  foreground: '#231F1A'
  foreground-dark: '#F5F5F7'
  muted-foreground: '#75695C'
  muted-foreground-dark: '#98989D'
  border: '#EDE6DB'            # decorative hairlines only — never a control boundary
  border-dark: '#38383A'
  input: '#8C8175'             # form-control boundaries (inputs, checkbox, switch off) — ≥3:1
  input-dark: '#7C7C80'
  ring: '#0066CC'              # focus ring, 2px + 2px offset in background colour
  ring-dark: '#4DA3FF'
  primary: '#0066CC'
  primary-dark: '#4DA3FF'
  primary-foreground: '#FFFFFF'
  primary-foreground-dark: '#000000'
  primary-soft: '#E8F1FB'
  primary-soft-dark: '#0B2A4A'
  destructive: '#C4001A'
  destructive-dark: '#FF6961'
  # Status — meaning is fixed across both modes; every use pairs colour with icon + word.
  status-done: '#1F7A35'
  status-done-dark: '#30D158'
  status-waiting: '#A04A00'
  status-waiting-dark: '#FF9F0A'
  status-overdue: '#C4001A'
  status-overdue-dark: '#FF6961'
  status-decision: '#7D3C98'
  status-decision-dark: '#D08CF2'
  status-decision-foreground: '#FFFFFF'
  status-decision-foreground-dark: '#000000'
  status-decision-soft: '#F4EAF8'
  status-decision-soft-dark: '#2E1F38'
  status-blocked-row: '#F1ECE4'
  status-blocked-row-dark: '#141416'
  status-obsolete: '#6E6E73'
  status-obsolete-dark: '#8E8E93'
  at-risk: '#9A7A14'           # outline + count circle (≥3:1 non-text)
  at-risk-dark: '#E0B84A'
  at-risk-text: '#8A6A00'
  at-risk-text-dark: '#E0B84A'
  badge: '#D70015'
  badge-dark: '#D70015'
  badge-foreground: '#FFFFFF'
  badge-foreground-dark: '#FFFFFF'
typography:
  # All roles use the system stack below (SF Pro on Apple devices). Sizes are authored in px
  # for readability and shipped as rem (px ÷ 16) so browser text size is respected.
  large-title-desktop:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: 34px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  large-title-phone:
    fontFamily: '{typography.large-title-desktop.fontFamily}'
    fontSize: 26px
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: -0.02em
  headline:
    fontFamily: '{typography.large-title-desktop.fontFamily}'
    fontSize: 17px
    fontWeight: '600'
    lineHeight: '1.3'
  body-desktop:
    fontFamily: '{typography.large-title-desktop.fontFamily}'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.45'
  body-phone:
    fontFamily: '{typography.large-title-desktop.fontFamily}'
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.45'
  subhead:
    fontFamily: '{typography.large-title-desktop.fontFamily}'
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.35'
  section-label:
    fontFamily: '{typography.large-title-desktop.fontFamily}'
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0.06em
    textTransform: uppercase
  caption:
    fontFamily: '{typography.large-title-desktop.fontFamily}'
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.3'
rounded:
  sm: 8px
  md: 12px
  lg: 16px
  full: 9999px
spacing:
  # Tailwind 4-based scale inherited. Named tokens set the two densities.
  card-pad-desktop: 16px
  card-pad-phone: 12px
  section-gap-desktop: 14px
  section-gap-phone: 10px
  row-min-desktop: 48px
  row-min-phone: 44px
  touch-target: 44px
  sidebar-width: 240px
  content-max-width: 960px
  timeline-day: 24px
  timeline-lane: 112px
  timeline-role-column: 170px
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.full}'
  focus-ring:
    color: '{colors.ring}'
    width: 2px
    offset: 2px
  input:
    border: '1px solid {colors.input}'
    radius: '{rounded.sm}'
  sidebar-item-active:
    background: '{colors.primary-soft}'
    foreground: '{colors.primary}'
    fontWeight: '600'
    indicator: '3px leading bar in {colors.primary}'
    radius: '{rounded.sm}'
  event-card:
    background: '{colors.card}'
    border: '1.5px solid {colors.border}'
    radius: '{rounded.md}'
  event-card-urgent:
    border: '1.5px solid {colors.status-overdue}'
  event-card-at-risk:
    border: '1.5px solid {colors.at-risk}'
  create-event-card:
    background: '{colors.primary-soft}'
    foreground: '{colors.primary}'
    border: '2.5px solid {colors.primary}'
    radius: '{rounded.md}'
  count-circle:
    size: 40px
    border: '2px solid {colors.border}'
    radius: '{rounded.full}'
  notification-badge:
    background: '{colors.badge}'
    foreground: '{colors.badge-foreground}'
    minSize: 20px
    radius: '{rounded.full}'
  decision-card:
    background: '{colors.status-decision-soft}'
    border: '1.5px solid {colors.status-decision}'
    radius: '{rounded.lg}'
    shadow: '0 4px 14px rgba(125,60,152,.16) (light only)'
  decide-button:
    background: '{colors.status-decision}'
    foreground: '{colors.status-decision-foreground}'
    radius: '{rounded.full}'
  decision-option-card:
    background: '{colors.card}'
    border: '1px solid {colors.input}'
    borderSelected: '2px solid {colors.status-decision}'
    radius: '{rounded.md}'
  proposal-row:
    background: '{colors.primary-soft}'
    radius: '{rounded.lg}'
  confirm-button:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    size: 34px
    hitArea: '{spacing.touch-target}'
    radius: '{rounded.full}'
  blocked-row:
    background: '{colors.status-blocked-row}'
    foreground: '{colors.muted-foreground}'
  obsolete-row:
    foreground: '{colors.status-obsolete}'
    textDecoration: line-through
  accept-banner:
    background: '{colors.primary-soft}'
    radius: '{rounded.md}'
  action-bar-phone:
    background: '{colors.card}'
    border: '1px solid {colors.border} (top)'
  timeline-task:
    height: 40px
    radius: 10px
    border: '1px solid {colors.border}'
  timeline-decision-marker:
    shape: diamond
    color: '{colors.status-decision}'
  timeline-today-line:
    color: '{colors.primary}'
    width: 2px
  guest-summary-tile:
    background: '{colors.card}'
    radius: '{rounded.md}'
---

# Arrangly — Design Spine

**The spines win on conflict.** Any mock, wireframe or exploration in `.working/`, `mockups/` or `imports/` is illustrative. Where it differs from this file or [EXPERIENCE.md](EXPERIENCE.md), the spine is the contract. For example, the early theme explorations use a different obsolete grey and 40px phone rows.

## Brand & Style

Arrangly takes the weight of an event off the organizer's shoulders, and it should look the part: **calm, clean, and instantly familiar**. The visual reference is Apple's own platforms. That means system type, soft neutral surfaces, grouped rounded cards, one quiet accent, and nothing that has to be learned. The personality lives in the warmth of the light mode (warm paper instead of cold grey) and in a handful of human moments. It never comes from decoration.

The design follows eight principles adapted from Apple's Human Interface Guidelines (source: [Apple HIG — Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)):

| # | Principle | For Arrangly |
|---|---|---|
| P1 | Purpose: *Lead, don't chase* | Every screen answers "what needs me now?" |
| P2 | Agency: *AI proposes, people decide* | Every ✦ suggestion is individually confirmable; mistakes are reversible |
| P3 | Responsibility: *Show only what your role needs* | RBAC is felt in the UI; health data stays with the Role that needs it |
| P4 | Familiarity: *Borrow what people know* | Standard web/Apple patterns; one status vocabulary everywhere |
| P5 | Flexibility: *Meet each person where they are* | Desktop for organizers, phone for helpers and guests; never colour-only |
| P6 | Simplicity: *Every element earns its place* | Guests never see planning machinery; clear now / next / later |
| P7 | Craft: *Care about the details* | Precise words, considered states, restrained motion |
| P8 | Delight: *Make it human* | Warmth at publish, RSVP, done, resolved. Quiet on working screens |

Arrangly inherits shadcn/ui wholesale. This file specifies only the brand layer: palette, system type, the two densities, softer corners, and the Arrangly-specific components below.

## Colors

One brand colour, fixed status meanings, and warm neutrals. Explored in [color-themes-1](.working/color-themes-1.html) → [2](.working/color-themes-2.html) → final [color-themes-3](.working/color-themes-3.html).

- **Primary blue (`{colors.primary}` / `{colors.primary-dark}`)** is the only brand colour, the same in both modes. It's used for primary buttons, the active sidebar item, links, the focus ring (`{colors.ring}`), the ✦ Proposed Task tint (`{colors.primary-soft}`) and the Create-new-event card. Don't use it for status.
- **Warm Sky surfaces (light):** warm paper `{colors.background}`, white cards, a warm-beige sidebar, and warm greys for secondary text. **Clear Sky surfaces (dark):** true black, `#1C1C1E` cards, Apple's dark greys. Dark mode deliberately matches what Apple users already expect.
- **`{colors.border}` is decorative only.** Anything a user must see to operate (inputs, checkboxes, switch-off state, option cards) uses `{colors.input}`.
- **Status colours are semantic and fixed.** Each is always paired with its icon and a word:

| Meaning | Token | Icon (Lucide) | Word (en / nb) |
|---|---|---|---|
| Needs a decision | `{colors.status-decision}` | `circle-help` | Needs your decision / Trenger din beslutning |
| Overdue / act now | `{colors.status-overdue}` | `circle-alert` | Overdue N days / Forfalt N dager |
| Problem reported | `{colors.status-overdue}` | `flag` | Problem reported / Problem meldt |
| Waiting on someone outside | `{colors.status-waiting}` | `hourglass` | Waiting on {party} / Venter på {part} |
| Blocked by a dependency | `{colors.status-blocked-row}` tint + muted | `lock` | Waits for: {task} / Venter på: {oppgave} |
| Not yet accepted | `{colors.muted-foreground}` | `user-round` | Not yet accepted / Ikke akseptert ennå |
| In progress | `{colors.primary}` | `circle-dot` | In progress / Pågår |
| Done | `{colors.status-done}` | `circle-check` | Done / Ferdig |
| Obsolete | `{colors.status-obsolete}` + strikethrough | `minus-circle` | Obsolete / Utgått |
| Event at risk (aggregate) | `{colors.at-risk}` outline, `{colors.at-risk-text}` label | none | N at risk / N i faresonen |
| New item (count) | `{colors.badge}` | none | iPhone-style number badge |

**Red means act, grey means wait, purple means decide.** Blocked items are never red.

**Contrast (WCAG 2.2 AA, measured with the WCAG formula).** Pairs marked ⚠ sit close to the floor, so don't lighten them.

| Text / element | On | Light | Dark |
|---|---|---|---|
| foreground | background | 15.3 | 19.3 |
| muted-foreground | card | 5.3 | 5.9 |
| muted-foreground | sidebar | 4.6 ⚠ | — |
| muted-foreground | primary-soft (proposal subhead) | 4.7 ⚠ | — |
| muted-foreground | status-decision-soft | 4.6 ⚠ | — |
| muted-foreground | status-blocked-row | 4.5 ⚠ | 6.4 |
| primary | background / card | 5.2 / 5.6 | 8.0 / 6.5 |
| primary | primary-soft (proposal title, active nav) | 4.9 ⚠ | — |
| primary-foreground | primary | 5.6 | 8.0 |
| status-decision-foreground | status-decision (Decide) | 7.1 | 8.7 |
| badge-foreground | badge | 5.4 | 5.4 |
| status-done / waiting / overdue | card | 5.4 / 6.0 / 6.3 | 8.4 / 8.3 / 6.0 |
| status-decision | status-decision-soft | 6.1 | 6.4 |
| status-obsolete | card / background | 5.1 / 4.8 ⚠ | 5.2 |
| at-risk-text | card / background | 5.1 / 4.7 ⚠ | 9.0 |
| **Non-text (≥3:1):** input | card / background | 3.8 / 3.6 | 4.1 |
| at-risk outline | card / background | 4.1 / 3.8 | 9.0 |
| status-overdue outline, status-decision outline | background | 5.8, 6.6 | 6.0, 8.7 |
| ring | card / background | 5.6 / 5.2 | 6.5 / 8.0 |

## Typography

The system font stack (SF Pro on Apple devices) replaces shadcn's default sans, so text looks native on iPhone and Mac. Sizes ship as rem, so browser text size is respected.

- **Large title** opens every surface as its `h1`: `{typography.large-title-desktop}` (34px/700) on desktop, `{typography.large-title-phone}` (26px/700) on phone.
- **Headline** `{typography.headline}` is for card titles and the decision card title.
- **Body** is `{typography.body-desktop}` / `{typography.body-phone}`. **Subhead** `{typography.subhead}` is for metadata (dates, owners). **Caption** is for legends.
- **Section label** `{typography.section-label}` is uppercase via CSS only, for Dashboard sections and sidebar groups. Strings are authored in sentence case ("Needs you") and rendered as `h2`.
- There's no decorative display face.

## Layout & Spacing

There are two densities, chosen per form factor ([directions-1](.working/directions-1.html)):

| | Desktop, **Airy** | Phone, **Balanced** |
|---|---|---|
| Title | large-title-desktop | large-title-phone |
| Card padding | `{spacing.card-pad-desktop}` | `{spacing.card-pad-phone}` |
| Section gap | `{spacing.section-gap-desktop}` | `{spacing.section-gap-phone}` |
| Row min-height | `{spacing.row-min-desktop}` | `{spacing.row-min-phone}` |
| Card radius | `{rounded.lg}` | `{rounded.md}` |

- Desktop has a left sidebar (`{spacing.sidebar-width}`) and content up to `{spacing.content-max-width}`. The **Timeline** is the one surface allowed to use the full window width.
- Phone uses a single column with 16px side gutters. The design target is 375px, and it **must reflow at 320px (400% zoom) with no two-way scrolling**. The sidebar becomes a sheet that slides in from the **right**, opened by a menu button (three lines) at the top right.
- **Wrap rules at narrow widths** (<360px, or long Norwegian strings):
  - The decision card's Decide button drops below the title, and option pills wrap.
  - The proposal row's ✓/✕ stack under the text.
  - The event card's count circle stays top-right while the text wraps.
  - Labels wrap before truncating, and there are no fixed-width buttons.

## Elevation & Depth

Surfaces are mostly flat and tonal, as in Apple's grouped lists. Cards get a hairline shadow (`0 1px 2px rgba(0,0,0,.05)`). Exactly one element per screen may lift: the **decision card** (`{components.decision-card}` shadow, light only). Nothing else competes with it. Dark mode drops the shadows and relies on card/background contrast. Toasts and the phone action bar sit above content, and toasts stack **above** sticky bars, never over them.

## Shapes

The corners are soft and Apple-like:

- `{rounded.lg}` (16px) for desktop cards, the decision card and proposal rows.
- `{rounded.md}` (12px) for phone cards, event cards and decision option cards.
- `{rounded.sm}` (8px) for sidebar items and inputs.
- `{rounded.full}` for buttons, pills, count circles and badges.
- 10px for Timeline task bars.

The Timeline decision marker is the one non-rounded shape: a diamond. There are no sharp corners anywhere else.

## Components

These shadcn components are used as they come: `Button` (secondary/outline/ghost), `Card`, `Dialog`, `Sheet`, `DropdownMenu`, `Tabs`, `Toast` (sonner), `Avatar`, `Separator`, `Skeleton`, `Checkbox`, `Switch`, `Input`, `Textarea`, `Select`, `RadioGroup`, `Command` (people picker). The exceptions are their border (`{components.input}`) and focus (`{components.focus-ring}`). Icons are **Lucide**, line style only, at 1.75px stroke. **No emojis in the interface.** Emojis are fine in text people write themselves.

These use shadcn as-is, with brand tokens: Announcement composer (`Card` + `Textarea` + `Command` recipient picker + `Switch` "Ask for volunteers"), Announcement feed (`Card` list), Delegate picker (`Command` in a `Dialog`), banners (unpublished event, unpublished changes: `Card` in `{colors.primary-soft}` or muted), Account offer (`Card` + `Button`), Landing page editor (`Card` sections + `Input`/`Textarea`), Guests import (`Dialog` with a column-mapping `Select`).

Arrangly-specific components. Key-screen mocks: [Dashboard](mockups/key-dashboard-desktop.html) · [Timeline](mockups/key-timeline-desktop.html) · [All events](mockups/key-all-events-phone.html) · [Task detail](mockups/key-task-detail-phone.html) · [Landing page + Guest Dashboard](mockups/key-landing-phone.html).

- **Sidebar.** On a `{colors.sidebar}` background: the app name, then the current event's group (Dashboard · My tasks · Guests · Timeline · Team & Roles · Announcements · Landing page · Event settings), with **All events** at the bottom of that group. The user's profile is pinned to the bottom. The active item is `{components.sidebar-item-active}` (tint, weight and a leading bar, so it isn't colour-only). My tasks shows a `{components.notification-badge}` count. Items outside your Role are not rendered.
- **Event card** (All events). The event name (headline), a subhead with date · your Role (or "Guest"), and a **count circle** (`{components.count-circle}`) on the right. States: neutral, **urgent** (`{components.event-card-urgent}`: circle and outline in `{colors.status-overdue}` plus "N overdue"), **at risk** (`{components.event-card-at-risk}` plus "N at risk"). A **notification badge** sits on the circle's top-right edge.
- **Create-new-event card.** The same size as an event card, `{components.create-event-card}`, with a centred `plus` icon and label. Always last.
- **Decision card.** `{components.decision-card}` with a title row: `circle-help` · title (headline) · subhead ("Peter sent 3 options · decide by Thu 1 Oct") · **Decide** (`{components.decide-button}`) right-aligned. The option pills are on one row below. It's slim.
- **Decision page options.** A radio group styled as `{components.decision-option-card}`. The selected card gets the `circle-check` icon plus a 2px decision-purple border, not just a tint.
- **Proposed Task row (✦).** `{components.proposal-row}` with `sparkles` in primary · title "Create task: …" · subhead naming source, Role, owner and due date · **✓** (`{components.confirm-button}`, 44px hit area) and **✕** (ghost, 44px hit area). Its action column lines up with the Decide button.
- **Section header.** `{typography.section-label}` `h2` plus a count pill. The *Needs you* pill is filled decision purple, the others muted.
- **Task row.** Status icon · title · status word right-aligned in the status colour (see the Colors status table for every variant). **Blocked:** the whole row tinted `{components.blocked-row}`, `lock`, "Waits for: {blocker}". **Obsolete:** `{components.obsolete-row}` plus the word "Obsolete", no tint. **Problem reported:** `flag` in `{colors.status-overdue}` plus the note excerpt. **Blocks others:** a muted subhead "Blocks 3 tasks" with `link` icon. This is the "priority" cue.
- **Task detail** (full page). Top to bottom:
  - A back control and the title (`h1`).
  - An **Accept banner** (`{components.accept-banner}`) with the primary *Accept* button, shown until the task is accepted.
  - A metadata list (Role, owner, deadline, dependencies, parent/subtasks) as a grouped inset card.
  - A **status control**: a segmented control on desktop, a full-width `Select` on phone. It has an optional note `Textarea`.
  - A **Help** card (`{colors.primary-soft}`) with ✦ *Draft email* and *Add options*.
  - A "Guest program" card (Organizer only): `Switch` + label + time.
  - The history list.
  - On phone the primary actions (Mark done / Delegate / Report a problem) sit in `{components.action-bar-phone}`, a sticky bar at the bottom with a safe-area inset.
- **Timeline.**
  - A sticky Role column (`{spacing.timeline-role-column}`) with the Role name (headline) and holders (subhead, lead marked). Lanes are `{spacing.timeline-lane}` tall on `{colors.card}`, with separators in `{colors.border}`.
  - The date axis is `{spacing.timeline-day}` per day, with week labels on Mondays.
  - Tasks are `{components.timeline-task}` bars from start to deadline, in two sub-rows per lane. Bars use the status styles: done = done-tinted, waiting = waiting outline, overdue = overdue outline and tint, blocked = blocked tint with a dashed border and "Waits for", not yet accepted = dashed border.
  - Subtasks nest inside their parent bar. Decision points are `{components.timeline-decision-marker}` diamonds: filled when open, outline when resolved, with a label.
  - Today is `{components.timeline-today-line}`. The event day is a `{colors.primary-soft}` column. Horizontal scroll has a 48px edge fade in `{colors.card}`.
  - The **List view** toggle renders the same data as grouped task rows.
- **RSVP question** (guest, phone). One question per screen: large title question, answer buttons as full-width option cards (`{components.decision-option-card}` style, primary border when selected), a *Back* text button, and a progress caption "Question 2 of 4".
- **Guest summary tiles** (Guests tab). A row of `{components.guest-summary-tile}` cards: Guests (numbers always printed; the segmented bar is decorative), Food (aggregated), Hotel, Unanswered requests. Tiles are toggle buttons (pressed = primary border).
- **Guest row.** Name · RSVP status word · plus-one. Beneath it, bullet points for food, allergies and requests (only the fields the viewer's Role may see).
- **Landing page (guest).** A hero with the event name (large title), date and place, then grouped cards: About · Program (time-stamped list, which is the Run of Show) · Location · Menu · Practical info.
- **Guest Dashboard.** Cards for My RSVP (with *Change*), Resolved for you (primary-soft tint, `circle-check`), My requests (each with its reply or "Waiting for an answer").
- **Send a request** (guest). A secondary button with the `message-circle-plus` icon. On phone it's in a sticky bottom bar on the landing page and Guest Dashboard.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Pair every status colour with its icon and a word | Communicate status by colour alone |
| Keep red for *act now*; grey tint for *blocked* | Colour blocked items red |
| Let the decision card be the only lifted element | Add shadows or tints to compete with it |
| Use token foregrounds (`status-decision-foreground`, `badge-foreground`) | Hard-code `#FFFFFF` on coloured fills |
| Use `{colors.input}` for anything a user must operate | Use `{colors.border}` as a control boundary |
| Always show the focus ring (`{components.focus-ring}`) | `outline: none` without a replacement |
| Use `{colors.primary}` as the single brand colour in both modes | Introduce a second brand colour or gradients |
| Use Lucide line icons at one stroke weight | Use emojis in navigation, labels, buttons or status |
| Airy on desktop, Balanced on phone; reflow down to 320px | Mix densities within one form factor, or fixed-width buttons |
