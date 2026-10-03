# PRD Quality Review — Arrangly (Finalize pass after UX deltas D1–D16)

Run 2026-09-29. Previous review: `review-rubric.md` (2026-09-25). Inputs checked: `prd.md`, `.memlog.md`, UX `EXPERIENCE.md` (for gaps it already answers).

## Overall verdict
The PRD holds up: FRs are testable, IDs are stable, the Core/Target/Stretch cut is honest and the UX deltas landed cleanly. What's at risk is small but architecture-relevant: two undefined concepts (the Event's language, how a guest's free text is routed to a Role), one glossary contradiction (Guest vs dual role), and a Vision line that still promises venue search Core no longer ships. Core also grew by nine items without a feasibility re-check against the new deadline.

## Decision-readiness — adequate
Decisions are stated as decisions (FR-11 spawn-after-decision, FR-13 manual entry, D15 late-change rule). Trade-offs are named. The one unacknowledged tension is §6.1's UX-pass additions: Core grew substantially while the deadline moved 20 days, with no re-triage.

### Findings
- **high** Core growth not re-triaged (§6.1) — nine additions (Landing page, Role lead, Accept, Problem, requests+reply, volunteers, web push, localisation, AI About) listed with no feasibility note, unlike the earlier FR-13/FR-21 cuts. *Fix:* add a `[NOTE FOR PM]` naming which additions would move to Target first if Core slips (candidates: web push, AI About, volunteer response) — or record that the owner accepts the risk.

## Substance over theater — strong
No persona furniture; journeys drive FRs. §4.7's history paragraph is borderline but justifies a Core keep.

## Strategic coherence — adequate
Thesis (roles as access model, order/timing first-class, AI as assistant) carries through.

### Findings
- **high** Vision promises Core doesn't ship (§1) — "searching for real venues" is Target (FR-13, §6.2). *Fix:* replace with "drafting the guest-facing invitation text" (FR-22).

## Done-ness clarity — adequate

### Findings
- **high** Guest free-text routing unspecified (FR-16) — "whoever owns the relevant area (guest welfare, catering, booking)" doesn't say how a Role is chosen. UX marks it ✦ (AI), so it is also an unlisted AI call (§4.9 Cost). *Fix:* state that Arrangly ✦ suggests the owning Role, falling back to the Organizer when unsure; the Organizer can re-route; add it to the §4.9 cost list and OQ1.
- **medium** "Event's language" undefined (§4.9, FR-22) — no FR sets it. *Fix:* add to FR-4: Event language (nb/en), defaults to the Organizer's UI language, editable in Event settings.
- **medium** Notification grouping unbounded (FR-23) — "close together". *Fix:* bound it, or state the window is an architecture decision (add to OQ).
- **medium** Who replies to a Guest request (FR-16) — UJ-3 shows Leah; the FR is silent. *Fix:* the Organizer or a holder of the owning Role.
- **low** FR-15 "within the same session, no delay" — adjective; acceptable for course stakes.

## Scope honesty — strong
Non-Goals do real work; Target/Stretch items name their source FR.

### Findings
- **low** Stretch header says "unchanged from the brief" but lists the seating chart as new (§6.2). *Fix:* drop "(unchanged from the brief)".
- **low** Target duplicates: "Announcements beyond FR-21's flat feed" and "Two-way threaded messaging, read receipts". *Fix:* merge.
- **low** `[NOTE FOR PM]` in §6.2 is a pointer, not a tension. *Fix:* plain sentence.

## Downstream usability — adequate

### Findings
- **medium** Glossary contradiction: Guest (§3) is "a person … who has not been assigned a Role", but Role and FR-18 allow a Guest to hold a Role in the same Event. *Fix:* "A person invited to attend an Event. A Guest may also hold a Role; as a Guest they use only the RSVP flow, Guest Dashboard and Landing page."
- **medium** FR-12 "pending" vs Role lead default — Role-owned Tasks default to the Role lead (§3), yet UX shows "Not delegated" when *no person* owns it. *Fix:* FR-12: "pending = owned by a Role with no person assigned".
- **low** "My tasks" (FR-12) and "defined group" (FR-21) are used without definition. *Fix:* FR-21 "a custom group the Organizer defines"; My tasks is a UX term, so gloss it inline.
- **low** FR-16 "guest welfare, catering, booking" aren't Branch Pool names. *Fix:* use Guests, Food & Beverage, Travel & Logistics.

## Shape fit — strong
Journey-led, chain-top shape fits a multi-persona consumer product.

## Mechanical notes
- FR-1…FR-23 contiguous; FR-23 sits before FR-22 by feature grouping (fine).
- No open `[ASSUMPTION]` tags; §9 consistent.
- Memlog line 6 still says deadline 2026-11-30; superseded by line 37 (append-only, no action).
- Previous review files (`review-rubric.md`, `review-feasibility.md`) are from 2026-09-25 and predate D1–D16.
