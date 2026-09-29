---
name: Arrangly
status: final
sources:
  - {planning_artifacts}/prds/prd-Arrangly-2026-09-22/prd.md
  - {planning_artifacts}/briefs/brief-Arrangly-2026-09-20/brief.md
  - {planning_artifacts}/briefs/brief-Arrangly-2026-09-20/addendum.md
updated: 2026-09-29
---

# Arrangly — Experience Spine

## Foundation

- **Form factor:** multi-surface responsive web, not a native app (PRD §5). The **Organizer** plans mainly on **desktop**. **Role-holders** and **Guests** use it mainly on **phone**: design target 375px, reflow floor 320px.
- **UI system:** shadcn/ui on React + Tailwind. [DESIGN.md](DESIGN.md) is the visual identity reference and owns the brand-layer delta. This spine specifies behaviour only. Where it says nothing, shadcn's default behaviour applies.
- **The spines win on conflict.** Every file in `.working/`, `mockups/`, `wireframes/` and `imports/` is illustrative only.
- **Two experiences:**
  - **Team experience:** the Organizer and every Role-holder use the same app, sidebar and surfaces. What differs is scope. RBAC (PRD FR-2) decides which Roles, tasks, guest fields and actions each person sees. Anything out of scope is **not rendered** (the server enforces it too).
  - **Guest experience:** a separate, simplified side, styled like the wedding site Zola, with only what a Guest needs.
- **One account, many hats.** The same person can be Organizer of one Event, Role-holder in another and Guest in a third. All of them appear under **All events**.
  - A person who is **both Guest and Role-holder in the same Event** gets one event card, which opens the **team experience**. It includes a "Your invitation" card (RSVP + landing page link) at the top of their Dashboard until they answer.
- **Language:** follows the device/browser language. **Norwegian Bokmål (`nb`) and English (`en`)** are supported, with English as the fallback, and there's a manual override in Profile & Settings.
  - Dates and times are localised (*lør. 24. okt., 19:00* / *Sat Oct 24, 7:00 PM*).
  - Emails use the recipient's saved language if known, otherwise the Organizer's.
- **Glossary:** all PRD §3 terms keep their PRD meaning (including Role lead, Landing page and Problem, added 2026-09-29). UX convention: "✦" marks anything AI produced, in the UI and in this spine.

## Information Architecture

Map: [wireframes/ia.excalidraw](wireframes/ia.excalidraw) (open at excalidraw.com). Key-screen mocks are linked per surface below.

**Team experience**

| Surface | Reached from | Purpose | Tier |
|---|---|---|---|
| Log in / Sign up | App open | Email + password, verified email (FR-1) | Core |
| Invite → Create account | Role-holder invite link | Name/email pre-filled; lands on the event's Dashboard | Core |
| **All events** (home) · [mock](mockups/key-all-events-phone.html) | Login · sidebar (bottom of event group) | Cards for every event you're in, as Organizer, Role-holder or Guest; last card is *Create new event* | Core |
| Create event wizard | *Create new event* card | 6 steps: Questionnaire → Guests → Description → Review ✦ → Team → Publish (FR-4/5/6) | Core |
| Dashboard · [mock](mockups/key-dashboard-desktop.html) | Event card · sidebar | Needs you › At risk › On track, scoped to the viewer (FR-19) | Core |
| My tasks | Sidebar | Tasks assigned to you. For the Organizer, also everything not yet delegated, with a *Not delegated* filter (FR-12) | Core |
| Guests | Sidebar | Summary tiles + guest list; remind; import | Core (import = Target) |
| Timeline · [mock](mockups/key-timeline-desktop.html) | Sidebar | One swimlane per Role, read-only, horizontal scroll + List view (FR-20) | Core |
| Team & Roles | Sidebar | Organizer: activate Roles, assign/revoke, set Role lead, resend invites. Others: who's who | Core |
| Announcements | Sidebar | Flat feed + compose; optional *Ask for volunteers* (FR-21) | Core |
| Landing page | Sidebar | Draft → Organizer reviews → Publish. The Program section is the Run of Show (FR-22) | Core |
| Event settings | Sidebar (Organizer) | Dates, RSVP due date, Roles on/off, cancel/delete event | Core |
| Task detail · [mock](mockups/key-task-detail-phone.html) | Any task row | **Full page.** Scope, deadline, status, dependencies, subtasks, help | Core |
| Decision | Decision card · *Decide* | **Full page.** Context + options → pick → *+ Add follow-up task* (FR-10/11) | Core |
| Profile & Settings | Sidebar footer (avatar) | Name, email, password, Appearance, Language, Notifications | Core |

**Guest experience**

| Surface | Reached from | Purpose | Tier |
|---|---|---|---|
| Magic link | Personal invite email | Identifies the Guest (FR-3) | Core |
| Shared invite link | Link the Organizer shares (FR-5) | Guest types their name + email → gets their own magic link → RSVP | Core |
| RSVP flow | Magic link (first visit, until answered) | Yes/No → plus-one → allergies & food → hotel → other needs (FR-15) | Core |
| Confirmation | RSVP submit | Warm confirmation; optional *Create an Arrangly account* | Core |
| Landing page · [mock](mockups/key-landing-phone.html) | After RSVP · magic link · All events | About · Program (Run of Show) · Location · Menu · Practical info | Core |
| Guest Dashboard | Landing page · magic link | My RSVP · Resolved for you · My requests + replies · *Send a request* | Core |
| Registry | Landing page | Gift wish-list | Stretch |
| Seating chart | Landing page | Where you sit | Stretch (not in PRD) |

**Navigation**

- Desktop has a left sidebar in a `nav` landmark labelled with the event name. It holds the event group (Dashboard · My tasks · Guests · Timeline · Team & Roles · Announcements · Landing page · Event settings · **All events**), with the profile at the bottom.
- Below 1024px the sidebar becomes a `Sheet` sliding in from the **right**, opened by a menu button at the **top right**. The button comes after the `h1` in DOM order.
- Task detail and Decision are full pages with a back control that returns to the exact scroll position.
- The Guest experience has no sidebar. It's a single scroll with a sticky *Send a request* bar on phone.

## Voice and Tone

Microcopy. The brand voice lives in DESIGN.md › Brand & Style. There are two registers:

- **Quiet & plain** on working surfaces: status labels, Dashboard rows, Timeline, task metadata, Guests tab.
- **Warm & reassuring** at human moments: confirmations, empty states, onboarding, success, and the whole Guest side.

| Moment | Say | Don't say |
|---|---|---|
| Overdue row | "Overdue 1 day" | "Uh-oh! This task is late!" |
| Blocked row | "Waits for: venue access" | "Blocked" (without naming the blocker) |
| ✦ Proposed Task | "Create task: Send food order details to caterer" | "AI thinks you should maybe…" |
| Proposal source | "From caterer note · Catering · Peter · due Wed 14 Oct" | Unattributed suggestions |
| Publish success | "Invitations are on their way to 80 guests." | "Event published successfully." |
| RSVP yes | "You're on the list, Chris! We'll send the details closer to the day." | "RSVP received." |
| Empty My tasks | "You're all caught up. Nothing needs you right now." | "No tasks found." |
| AI draft handoff | "Draft ready. It opens in your own mail app, and Arrangly never sends it for you." | "Email sent!" |
| Approximate AI info | "Approximate: check with the venue" | Presenting estimates as fact |
| Request reply | "Leah answered: Babies are welcome!" | "Your ticket has been resolved." |
| Load failed | "Couldn't load this. Check your connection and try again." | "Error 500" |

Rules:

- Use names, not roles, when a person is known ("Peter sent 3 options").
- Verbs on buttons: *Decide*, *Accept*, *Delegate*, *Publish*, *Send a request*, *I can help*, *Report a problem*.
- No emojis in interface strings. Emojis are fine inside text people write themselves.
- Norwegian strings are written natively, not machine-literal. *Kommer du?*, not *Vil du delta på arrangementet?*
- Icon-only buttons always have a localised accessible name: "Confirm: {title}" / "Bekreft: {tittel}", "Dismiss: {title}" / "Avvis: {tittel}", "Menu" / "Meny", "Back" / "Tilbake".

## Component Patterns

Behavioural rules. Visual specs are in DESIGN.md › Components.

**Counting rules**, used everywhere. They're defined here once:

- **Urgent** = the viewer's tasks that are overdue, have a Problem reported, or are Decision Tasks awaiting the viewer.
- **At risk** = the viewer's tasks that are waiting on external or blocked.
- **Open** = not done and not obsolete.
- **New** = assigned to the viewer and not yet opened.

| Component | Use | Behavioural rules |
|---|---|---|
| Sidebar | Team experience | Items the viewer's Role can't reach are not rendered. The My tasks badge = **New** + **Urgent** count. `aria-current="page"` on the active item. On phone it's a `Sheet`: focus is trapped while open, the first item gets focus, `Esc` and navigation close it, and focus returns to the menu button. |
| Event card | All events | The whole card is one link, named "Lucas's 40th, Sat 24 Oct, Organizer, 3 open tasks, 1 overdue, 1 new task". Opens the Dashboard (team) or the Landing page (guest-only). The count circle = **Open**. The badge = **New**, and it clears when each task is opened. **Urgent** > 0 → urgent state + "N overdue" (or "N need you"). Otherwise **At risk** > 0 → at-risk state + "N at risk". Guest-only cards show the RSVP state instead of a count. |
| Create-new-event card | All events | Always last. Starts the wizard. |
| Create event wizard | Organizer | Six steps with a step caption ("Step 3 of 6"). *Back* and *Next* on every step, and every answer can be changed later. Questions can be skipped ("Not sure yet"), and a skipped question that matters (e.g. venue) produces a ✦ Proposed Task (FR-4). Guests step: paste/type rows, validated inline (email format, duplicates). *Import .xlsx/.csv* is Target. Review ✦: Proposed Tasks are grouped by Role, and each has ✓ / ✕ / edit. Tasks confirmed here are **owned by their Role** until Team is built, then go to the Role lead (FR-7). Progress auto-saves as a **draft event**, shown on All events as "Draft · continue setup". Leaving mid-way loses nothing. |
| Dashboard sections | Dashboard | Fixed order: **Needs you** (decisions → Problems → ✦ Proposed Tasks → overdue → not yet accepted), **At risk** (waiting → blocked), **On track** (summary per Role + guest numbers). Soonest deadline first within a section. Empty sections collapse to one quiet line. A *Show dismissed (n)* link under Needs you lists dismissed Proposed Tasks with *Restore*. |
| Decision card | Dashboard, My tasks | Always first in Needs you. *Decide* opens the Decision page. It never auto-dismisses. |
| Decision page | Full page | Context, then options as a **radio group** (arrow keys move, one choice). *Confirm decision* records it (FR-10). *+ Add follow-up task* opens Task create inline, so the decider can create and assign in the same action. Tasks tied to an unchosen option become obsolete (FR-11). *Change decision* re-runs this idempotently. |
| Proposed Task row (✦) | Dashboard, wizard | ✓ creates the task in its Role, owned by the Role lead or named owner (or the Role, during the wizard), with the computed deadline. ✕ dismisses it to *Show dismissed*. Both give an *Undo* toast. The title can be edited inline before ✓. It always shows its source. Nothing becomes active without ✓ (FR-6/16). **Focus:** after the row leaves, focus moves to the next row's primary action. If there's none, to the previous one. If the section is empty, to the section heading. On *Undo*, focus returns to the restored row's ✓. |
| Task row | Everywhere tasks list | Tapping anywhere opens Task detail. The status word is always visible. The subhead names the owner ("Peter"), or reads **Not delegated** when no person owns it yet, independent of status (FR-12). The Organizer's "pending only" filter is *Not delegated* in My tasks. Blocked rows only open. Obsolete rows are hidden by default behind *Show obsolete (n)*. A task that others depend on shows "Blocks N tasks", which is the priority cue in KF-2. |
| Task create / edit | *+ New task* (Dashboard, My tasks, Role view) · *Create task* on any status note · *+ Add follow-up task* (Decision) | Fields: Title\*, Role\* (defaults to context), Owner (person or the Role; defaults to the Role lead), Deadline\* (date, or "N days before the event"), Description, Parent task (same Role only, FR-7), **Depends on…** (task picker), **Only if option… is chosen** (appears when the task depends on an open Decision Task; FR-11). The Organizer can change Role later (FR-6 recategorise); Subtasks must be promoted first (FR-7). Created tasks need *Accept* by their owner. |
| Task detail | Full page | New for the assignee → **Accept** (the Organizer sees "Not yet accepted" until then). Status control: **Not started · In progress · Waiting on external · Done**, with an optional note. *Blocked* and *Overdue* are computed, not settable. **Help:** ✦ *Draft email*, *Add options → Send for decision*. **Delegate** (Organizer, Role lead). **Report a problem** (owner) → note → raises a Problem. **Guest program** (Organizer): *Show on guest program* switch + guest-facing label + time of day (feeds the Landing page Program; PRD FR-7/FR-22). History lists every change, with *Remove* on tasks created from ✓ (the undo that has no time limit). |
| Delegate | Task detail, My tasks | A people picker (`Command`) of the task's Role. The Organizer can pick anyone and change the Role. Invited-but-unregistered people are listed as "Invite pending", and delegating to them notifies them when they join. History and status are kept (FR-7). The new owner must *Accept*. |
| ✦ Draft email | Task detail | Drafts with event date, headcount and occasion (FR-14), shown for review, then *Open in mail app* (`mailto:`). Arrangly never sends it. |
| Options entry | Task detail | Named options, each with type and notes (FR-13, manual in Core). *Send for decision* creates a Decision Task for the Organizer (or the chosen decider). |
| Guests tab | Team | **Guests tab summary tiles** on top (Guests · Food · Hotel · Unanswered requests). Tiles are toggle buttons (`aria-pressed`) that filter the list and announce "Showing 16 pending guests". Guest rows show food, allergies and requests as bullets. Multi-select → *Remind* (FR-17), with a confirmation dialog. Fields outside the viewer's Role aren't rendered (PRD §4.9). Import is Target: file → map columns → preview → add. |
| Timeline | Team | One lane per active Role, tasks ordered by dependency then deadline. Subtasks sit inside their parent. Decision points are visible before they're resolved. Read-only in Core. **Keyboard/screen reader:** the scroll area is `role="region"`, `aria-label="Timeline"`, `tabindex="0"`, so arrow keys scroll. Each lane is a labelled list in order. Each task is a link named "{title}, {dates}, {status}, waits for {x}", and focusing it scrolls it into view. **List view** toggle: the same data as grouped task rows (also the phone default). |
| Announcement composer | Announcements | Recipient picker: the Organizer can pick person / Role / whole team / custom group. A Role-holder can only pick their own Role(s) or people in them (FR-21). Optional **Ask for volunteers** switch. *Send* asks for confirmation and delivers in-app plus through the recipients' channels. No replies. |
| Volunteer response | Announcement | *I can help* appears on volunteer announcements. After tapping it reads "You offered to help" and can be withdrawn. The sender sees responders in order, each with *Assign to task*, which opens Delegate prefilled. |
| Landing page editor | Organizer | **About is ✦ written for the Organizer:** on first open, Arrangly drafts a warm, flowing invitation text (not a list) from the questionnaire, the event description, dress code and the guest-program tasks, in the event's language. The Organizer can edit freely, *Rewrite* with a tone hint (warmer / shorter / more formal) or *Write it myself*. The draft is marked ✦ in the editor only; guests see just the published text. Sections: About, Program (drafted from tasks with *Show on guest program* on, ordered by time), Location, Menu, Practical info. *Preview as guest* → *Publish*. After publishing, edits show "Unpublished changes" until *Publish update*. |
| RSVP flow | Guest | One question per screen: a `fieldset` whose question is the `h1`, and focus moves there on each step. *Back* is always available. *No* ends the flow warmly. Progress counts only applicable steps ("Question 2 of 4") and updates when branching. Allergies are checkboxes plus "Other". Errors are inline (`aria-invalid` + `aria-describedby`). Answers can be edited later from the Guest Dashboard. |
| Send a request | Guest | Free text → routed like "other needs" (FR-16) to the owning Role as a ✦ Proposed Task, always visible to the Organizer. The reply appears under the request, with a notification. One reply, no thread. |
| Account offer | Guest confirmation | Only if the email has no account: *Create an Arrangly account* (password) or *Not now*. Declining keeps access by email (enter email → new magic link). |
| Landing page | Guest | Shows only the last published version: About, Program (the Run of Show: guest labels + times, never Role detail), Location, Menu, Practical info. Before first publish, Guests see RSVP and Guest Dashboard only. Readable after the event date. Reached from the magic link after RSVP, and from the Guest Dashboard. |
| Notification preferences | Profile & Settings | Per channel: In-app (always on), Email, Push (web push; asks browser permission when switched on), SMS (**Target**, disabled "Coming later"). |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| First load | All events, Dashboard, lists | `Skeleton` in the final layout shape. No spinners on full pages. |
| Load failed | Any surface | Inline card: "Couldn't load this. Check your connection and try again." + *Retry* (`role="alert"`). Cached content stays visible if present. |
| No events yet | All events | Warm: "Let's plan something." Only the Create-new-event card shows. |
| Draft event | All events | Card reads "Draft · continue setup" and reopens the wizard at the last step. |
| Nothing needs you | Dashboard › Needs you | One quiet line: "Nothing needs you right now." |
| All caught up | My tasks | "You're all caught up. Nothing needs you right now." |
| No guests yet | Guests | "No guests yet. Add them by name and email, or share an invite link." + actions. |
| No tasks yet | Timeline | "The timeline fills in as tasks are added." + *New task*. |
| Empty feed | Announcements | "No announcements yet." + *New announcement* (for those allowed to send). |
| Nothing on the program | Landing page editor | "Switch on *Show on guest program* for tasks guests should see, like dinner or speeches." |
| Nothing resolved / no requests | Guest Dashboard | "Nothing here yet. Anything we sort out for you will show up here." / "Need something? Send a request." |
| Filter with no matches | Guests, lists | "No guests match this filter." + *Clear filter*. |
| Event not yet published | Dashboard (Organizer) | Top banner: "Only your team can see this event. Publish to send invitations." + *Publish*. |
| Landing page unpublished | Guest side | Guests see RSVP and Guest Dashboard only: "The program will appear here closer to the day." |
| Unpublished changes | Landing page editor | Muted banner: "Guests still see the last published version." + *Publish update*. |
| Waiting on AI | Wizard review, Draft email, Landing page About | Progress line (`role="status"`) "Drafting tasks from your description…", then "7 tasks proposed". Past 20s: "Taking longer than usual" + *Keep waiting* / *Skip and add tasks myself*. |
| AI failed / cap reached | Wizard, Draft email, Landing page About | "Couldn't draft this right now. You can add tasks yourself." The flow continues, never blocks (PRD §4.9). |
| Not yet accepted | Task detail / Dashboard | The *Accept* banner is prominent for the owner. The Organizer sees "Not yet accepted". After **48h** the task joins the Organizer's Needs you. |
| Problem reported | Task detail → Dashboard | The owner taps **Report a problem** and adds a note ("Ola broke his arm, one bartender short"). It appears red (`flag`) in the Organizer's and Role lead's Needs you, with the note. *Resolve problem* clears it. Distinct from Blocked, which is grey and dependency-only. |
| Invite pending | Team & Roles | "Invite sent · not joined yet" + *Resend invite*. Pending people can be assigned tasks. |
| RSVP change after due date | Organizer / owning Roles | Needs you row: "Chris changed RSVP to No (after 1 Oct)", with notifications to the Organizer and affected Roles. Before the due date, counts update quietly. |
| After RSVP No | Guest | "Thanks for letting us know, Chris." Still reachable: landing page, and *Change my answer*. |
| Event cancelled / deleted | Guest, Team | Guests: "This event has been cancelled." plus the Organizer's note. Team: the event disappears from All events after a notification. |
| Event date passed | Guest, Team | Guests: "Thanks for coming!" and the landing page stays readable. Team: the event moves to "Past events" on All events (read-only). |
| Magic link expired / invalid | Guest | "This link has expired. We can send you a fresh one." + email field (FR-3). |
| Auth errors | Log in / Sign up / Invite | Wrong email or password: "Email or password doesn't match." Unverified email: "Check your inbox to verify your email." + *Resend*. Weak password: an inline rule list. Used or expired invite: "This invite has already been used. Log in instead." Invite to an email that already has an account: log in, then join. |
| Permission denied | Any team route | Not in navigation. A direct URL shows "You don't have access to this part of the event. Ask {Organizer} if you need it." (Server enforces, FR-2.) |
| Role revoked mid-session | Team | `role="alert"` toast "Your access to {Role} was changed by {Organizer}", then redirect to Dashboard. |
| Concurrent edit | Task detail | Last save wins, and the other person gets a toast: "Peter just updated this task." + *See changes*. |
| Offline | Global | `role="alert"` once: "You're offline. Changes will save when you're back." Status changes queue. AI actions are disabled with "Needs a connection." |
| Save failed | Any write | `role="alert"` toast "Couldn't save. Trying again." The input is kept, with *Retry*. |
| Push blocked | Notification preferences | Switch off + "Blocked in browser settings" and how to allow it. Never re-prompt automatically. iOS: explains *Add to Home Screen* first. |
| Obsolete tasks | Lists, Timeline | Hidden behind *Show obsolete (n)*. When shown: strikethrough + the word "Obsolete". Never deleted. |

## Interaction Primitives

- **Touch and mouse first.** Keyboard is fully supported, but there are no power-user shortcuts in Core except the toast hotkey below. The audience is amateur organizers.
- **Tap targets** are ≥ 44×44px on phone (Apple HIG). On desktop they're ≥ 24×24px, with spacing.
- **Undo instead of "Are you sure?"**
  - ✓ / ✕ on Proposed Tasks, Mark done, Delegate and status changes get an *Undo* toast.
  - Toasts last **10s**, pause on hover or focus, and can be reached with **F6** (or `Alt+T`).
  - Every undoable action also has a **timeless** path: *Show dismissed* → *Restore*, the task history → *Remove* or revert.
  - Confirmation dialogs are only for irreversible or outward actions: **Publish**, **Send announcement**, **Remind guests**, **Revoke role**, **Cancel/Delete event**.
- **Optimistic updates** for status changes and ✓/✕, reverted with a toast on failure.
- **Motion:** 150–250ms ease-out. Rows collapse out, new tasks fade in at their destination, and the sheet slides from the right. `prefers-reduced-motion` → cross-fades only. No confetti. Delight comes from words and a single check animation on *Done* and *Publish*.
- **No drag and drop in Core** (Timeline is read-only, FR-20). No hover-only affordances. No infinite scroll.
- **Notifications:** new task, decision result, new decision request, Problem reported, post-deadline RSVP change, announcement, request reply. Each goes through the user's channels. In-app is always on. Several realtime additions are grouped into one notification: "2 new items in Needs you".

## Accessibility Floor

Behavioural. Visual contrast lives in DESIGN.md › Colors (measured pair table).

- WCAG 2.2 AA on every surface. Reflow works at **320 CSS px / 400% zoom** with no two-way scrolling (the Timeline's List view covers 1.4.10).
- A **"Skip to content"** / "Hopp til innhold" link comes first. Landmarks: `nav` (event), `main`, `header`.
- **Status is never colour-only.** Every state has an icon and a word. Strikethrough is decorative. Obsolete rows say "Obsolete", and their accessible name includes "option not chosen: {option}".
- Every route sets `document.title` to "{Surface} – {Event} – Arrangly" and moves focus to its `h1` (`tabindex="-1"`). Wizard steps and RSVP questions do the same.
- The focus ring is always visible (DESIGN.md `{components.focus-ring}`), including on tinted rows. Sticky bars use `scroll-padding-bottom`, so focused elements are never hidden behind them.
- **Live regions:**
  - `role="status"` for AI progress, filter results and list changes (debounced).
  - `role="alert"` for save failed, load failed, role revoked and offline.
  - Undo toasts are `polite`.
- Section headings are `h2` with their count ("Needs you, 3"). Badges read "1 new task". Count circles read "3 open tasks".
- Decision options are a native radio group. Summary tiles are toggle buttons. The segmented guest bar is `aria-hidden`, and its numbers are printed.
- Forms: visible labels, required fields marked, inline errors with `aria-invalid` + `aria-describedby`, and focus goes to the first error.
- Respect `prefers-reduced-motion`, `prefers-color-scheme` (the default until the user overrides it) and browser text size (rem).
- `lang="nb"` / `lang="en"` on `<html>`, updated immediately on override. Language picker options are written in their own language. ✦ drafts are tagged with the language they were generated in. Dates use `<time datetime>`, and abbreviated dates get a full-form accessible name.

## Responsive & Platform

| Width | Behaviour |
|---|---|
| ≥ 1024px | Airy density. Sidebar visible. Dashboard single column up to 960px. Timeline uses the full window. |
| 768–1023px | Airy density. Sidebar becomes a right-hand `Sheet`. |
| < 768px | Balanced density. Timeline opens in **List view** (lanes still available). One question per screen in RSVP. Sticky *Send a request* on the Guest side. Task detail actions sit in a bottom action bar. |
| < 360px / long Norwegian | Wrap rules from DESIGN.md › Layout & Spacing. Sticky bars stop sticking when the viewport is under ~400px tall. |

- Primary targets: desktop Safari/Chrome/Edge for the Organizer, mobile Safari/Chrome for Role-holders and Guests (PRD §5).
- Web push requires the user to enable it. On iOS it needs *Add to Home Screen*.
- Appearance: Light / Dark / System, defaulting to System.

## Inspiration & Anti-patterns

- **Lifted from Apple HIG:** the eight design principles (DESIGN.md › Brand & Style), large titles, grouped inset lists, 44px touch targets, notification badges.
- **Lifted from Apple Mail / Notes:** the left sidebar with sheet navigation on small screens.
- **Lifted from Zola:** the guest side as an event landing page (about, program, location, menu), with registry and seating chart as later additions.
- **Rejected: role-sorted dashboards.** Leah thinks in urgency, not in org charts.
- **Rejected: "Already done? / Want help?" questionnaires on tasks.** One *Accept*, then help is simply there.
- **Rejected: 4-digit PIN guest login.** Replaced by an optional real account or email magic link.
- **Rejected: emojis as interface icons.**
- **Rejected: red for blocked.** Red means *act now*, and blocked means *you can't act yet*.

## Key Flows

### KF-1 · Leah's glance (desktop) — Proposed Task from a status note (PRD FR-6)

1. Leah opens Arrangly. **All events** shows *Lucas's 40th*. She clicks it and the **Dashboard** opens.
2. At a glance: **On track**: Venue booked; Guests 60 coming · 4 declined · 16 pending; Catering booked. Under Catering is the caterer's status note: *"Caterer needs food preferences and allergies 10 days before delivery."*
3. In **Needs you**, a ✦ Proposed Task row: *Create task: Send food order details to caterer* · *From caterer note · Catering · Peter · due Wed 14 Oct*.
4. **Climax:** Leah clicks ✓. The row slides away, an *Undo* toast appears, and focus moves to the next row. The task is now under Catering, assigned to Peter, due 10 days before the event.
5. She closes the laptop without sending one message.

Failure: the AI couldn't read the note → no Proposed Task. Leah uses *Create task* on the note and gets Task create with Role = Catering prefilled.

### KF-2 · Stine gets the venue decided (phone) — realizes UJ-2

0. *First time:* Stine taps Leah's invite link, creates her account (name and email pre-filled) and lands on the Lucas's 40th Dashboard. Her one task is at the top of Needs you. (SM-3: she understands it within a minute.)
1. Stine gets a push notification: *"New task: Book venue, Lucas's 40th."* On **All events**, the card shows a red **1** badge on its count circle.
2. She opens the task (full page) and taps **Accept**. Leah's view changes from "Not yet accepted" to "Accepted".
3. In **Help** she taps *Add options*: Hotel Alexandra, Brasserie 45, Skybar rooftop, each with a note. Then *Send for decision*, choosing Leah.
4. Leah sees the purple **decision card** at the top of Needs you, taps **Decide**, picks **Hotel Alexandra** (rooftop bar as fallback in the note), and uses **+ Add follow-up task**: *Book 8 single + 2 double rooms* → Stine.
5. **Climax:** Stine's phone buzzes twice: *"Leah chose Hotel Alexandra"* and *"New task: Book 8 single + 2 double rooms."* *Confirm venue* shows "Blocks 3 tasks", so she knows it comes first.
6. She taps ✦ **Draft email**, reviews the enquiry (date, 80 guests, 40th birthday) and taps *Open in mail app*. She sends it from her own mail.
7. She sets the status to **Waiting on external** with the note "Asked hotel, waiting for reply." The row turns amber with an hourglass.

Failure: Leah had created *Room list for rooftop bar* with "Only if option: Skybar rooftop" → it becomes **Obsolete** (hidden by default), not deleted. If Leah changes the decision, it comes back.

### KF-3 · Chris RSVPs (phone, Norwegian) — realizes UJ-3

1. Chris taps the link in *"Leah inviterer deg til Lucas' 40-årsdag"*. There's no signup, and he's greeted by name in Norwegian (device language).
2. **RSVP first:** *Kommer du?* → **Ja**. Then one question per screen: plus-one (Maria), allergies & food (Maria vegetarian), hotel (yes), other needs: *"Henting på flyplassen for oss begge?"* (airport pickup for both).
3. **Confirmation:** *"Du står på listen, Chris!"* (you're on the list). His email already has an account, so there's no account offer, and the event appears under his All events.
4. The **Landing page** opens: about, program with times, location, menu.
5. Behind the scenes, his pickup need becomes a ✦ Proposed Task for **Travel & Logistics**. Martin confirms it.
6. **Climax:** a week later Martin marks it done with details. Chris's **Guest Dashboard → Resolved for you** shows *"Airport pickup: Taxi from OSL 16:30, Fri 23 Oct"*. He never asked twice.
7. Later he taps **Send a request**: *"Can we bring our baby?"* Leah's reply appears under it: *"Leah answered: Babies are welcome!"*

Failure: the link has expired → "This link has expired. We can send you a fresh one." Chris changes his RSVP to No after the due date → Leah and catering are notified.

### KF-4 · Leah sets up Lucas's 40th (desktop) — realizes UJ-1

1. **All events** → the tinted **Create new event** card.
2. **Questionnaire:** birthday, 80 guests, one evening, venue not booked, RSVP wanted, RSVP due Thu 1 Oct.
3. **Guests:** she pastes names and emails (Core). *Import .xlsx/.csv* is also offered (Target).
4. **Description:** *"40th for Lucas, dinner, speeches, a quiz and a DJ. Smart casual."*
5. **Review ✦:** Roles Venue, Food & Beverage, Entertainment, Guests and Travel & Logistics are activated, with Proposed Tasks including *Book venue* (venue not booked). She ✓s most, ✕s two, and edits one. Confirmed tasks belong to their Role for now.
6. **Team:** Stine → Venue (lead), Peter → Food & Beverage (lead), Martin → Entertainment (lead), Sheila → Decorations (subtask of Venue) and bar. Role-owned tasks go to the leads, and invite links go out.
7. **Climax:** **Publish** → confirm → *"Invitations are on their way to 80 guests."* The Dashboard opens, and the **Timeline** already shows one lane per Role.
8. Two weeks later, the **Guests** summary shows 16 pending, food *6 vegetarian · 2 nut allergy · 1 gluten-free*, 12 hotel rooms and 2 unanswered requests. She taps *Pending*, selects all and taps **Remind**.
9. A week before the event, Sheila taps **Report a problem** on *Bar staff*: *"Ola broke his arm, one bartender short."* It appears red in Leah's Needs you. Leah sends an **Announcement** to the whole team with **Ask for volunteers** on. Kari taps **I can help**, and Leah taps *Assign to task*.

Failure: AI drafting fails in step 5 → "Couldn't draft tasks right now. You can add them yourself." The review step opens Task create. If Leah closes the browser mid-wizard, All events shows "Draft · continue setup".
