# PRD Quality Review — Arrangly (2026-09-22)

## Overall verdict

This PRD is unusually disciplined for the format it inhabits: nearly every FR carries testable consequences, the glossary is applied consistently, IDs are contiguous, and open items are tagged honestly rather than smoothed over. The main risk isn't sloppiness, it's that the PRD's single highest-feasibility-risk item (FR-13, live venue search) and its cost-control guardrail are both left unresolved while the entire rest of the surface area is committed to Core against a fixed, non-negotiable deadline (2026-11-30). Downstream usability and shape fit are strong; the PRD is buildable as written, but the org should not treat FR-13's "kept in Core, revisit later" framing as a resolved decision.

## Decision-readiness — strong

Trade-offs are named with what's given up, not hedged. FR-3's `[NOTE FOR PM]` states plainly that a 4-digit PIN is "a materially weak sole credential (10,000 combinations, no inherent lockout)" and accepts it as "a deliberate UX tradeoff for launch" — a real concession, not a smoothed-over consideration. §6.2's `[NOTE FOR PM]` explicitly re-triages the "first thing to cut if Core is at risk" from the brief's original team-matrix item to FR-13, with reasoning given. Open Questions in §8 are genuinely unresolved (e.g. OQ1 on Decision Task reversal semantics, OQ3 on whether FR-13 stays Core) rather than rhetorical.

No findings — this dimension has no fixable defect, only the cross-dimension risk noted under Scope Honesty below.

## Substance over theater — strong

Three personas (Organizer, Role-holder, Guest), each with a distinct JTBD and a full UJ that drives specific FRs — no persona theater. The differentiation claims in §1 ("roles are the access model," "order and timing are first-class," AI as "a working assistant throughout") are each cashed out in concrete FRs (FR-2 RBAC, FR-7/FR-10/FR-11 dependency and decision logic, FR-6/FR-13/FR-14 AI features) rather than left as unsupported claims. No generic NFR boilerplate ("must be scalable/secure/reliable") appears anywhere — the two NFR call-outs present (FR-3 PIN weakness, FR-13 feasibility risk) are both quantified and product-specific.

### Findings
- **low** Vague mobile-web bound (§5) — "the Guest side required to work well on phone browsers" has no bound (viewport range, browser support matrix, or a defined acceptance check). *Fix:* Either state a concrete target (e.g. "usable at 375px width in current Safari/Chrome mobile") or tag it `[ASSUMPTION]` and index it.

## Strategic coherence — adequate

The thesis is stated and consistent: event-as-managed-project with roles as the access boundary and AI embedded throughout. §0 is unusually candid that MVP scope decisions were driven by course-grading logic ("stay ambitious rather than solo-scaled-down... a complete, demonstrable product is guaranteed") rather than pure product logic — that's honest framing, not a backlog dressed up as strategy. Counter-metrics (SM-C1, SM-C2) are present and specifically target the failure modes of their paired metrics (rubber-stamped AI suggestions, Dashboard noise from uncompleted tasks), which is exactly what this dimension wants to see.

### Findings
- **medium** Core scope is nearly the entire feature set (§6.1) — Core covers FR-1 through FR-22 in full or near-full; Target defers only five narrow items (bulk import, backward-planned timeline, automated role-holder reminders, guest info page, visual forking) and Stretch is explicitly aspirational. With a fixed exam deadline (2026-11-30) and FR-13 flagged as the PRD's own highest-risk item, the Core/Target tiering carries little actual load-shedding capacity if Core turns out to be too large for a solo builder. *Fix:* Either name one or two additional "next to cut" items beyond FR-13 (a fallback ladder, not just a single swap), or accept explicitly that the tiering is aspirational documentation rather than a real de-scoping mechanism.

## Done-ness clarity — strong

Every one of the 22 FRs carries a "Consequences (testable)" block with concrete, checkable conditions (e.g. FR-2: "rejected server-side (not just hidden in the UI)"; FR-11: "visually distinct (e.g. greyed out / filtered)... not deleted"). This is the dimension the rubric asks to be unforgiving on, and the PRD holds up under that scrutiny — vague terms like "handles gracefully" or "reasonable performance" do not appear.

### Findings
- **low** FR-13's "configurable radius" (§4.4) doesn't state a default value or who configures it (Organizer per-Event, Role-holder per-search, or a system constant). *Fix:* Name the default and the configuration owner, or tag as `[ASSUMPTION]` and index it in §9.

## Scope honesty — adequate

§5 Non-Goals is substantive and specific (no vendor marketplace, no face recognition, no calendar/payment integrations, not native mobile, not a generic PM tool) — it does real exclusionary work rather than being a throwaway list. The three `[ASSUMPTION]` tags (FR-8, FR-11, FR-21) all round-trip correctly into §9's index with no orphans in either direction. `[NOTE FOR PM]` callouts land at genuine tensions (FR-3, FR-13, §6.2, FR-21), not safe checkpoints.

### Findings
- **high** FR-13's feasibility risk is acknowledged but not resolved before the PRD ships to architecture. FR-13's own `[NOTE FOR PM]` calls it "the PRD's highest integration/feasibility risk," Open Question 2 asks for "the cost-control guardrail for AI tool calls... given this runs on a personal/course budget," and Open Question 3 asks whether FR-13 is even staying in Core — yet §6.1 lists FR-13 as Core scope with no fallback trigger or decision date attached. For a solo builder against a hard, non-negotiable deadline (§0: "due 2026-11-30"), shipping the PRD with its riskiest dependency both unresolved and load-bearing for Core is the kind of open item that should block, not just flag. *Fix:* Set an explicit go/no-go checkpoint (e.g. "if venue-search API integration isn't proven working by [date], FR-13 drops to Target and the manual-entry fallback in FR-13's own consequence becomes the Core behavior") before this PRD is treated as final.
- **medium** No privacy/handling requirement for health-adjacent guest data. FR-15/FR-16 collect and route "allergies" as freeform/structured guest data, and FR-19's Guests tab aggregates "compiled allergy/hotel data" for Role-holders to see — but no FR, NFR, or Non-Goal addresses retention, access scope, or handling of this sensitive category. It isn't flagged as an `[ASSUMPTION]` or deferred with a `[NOTE FOR PM]` either, so the omission reads as unnoticed rather than deliberately deferred. *Fix:* Add a one-line NFR or `[NOTE FOR PM]` scoping allergy data to the owning Role only (consistent with FR-2's RBAC model) and noting it's out of scope for formal compliance handling in v1.

## Downstream usability — strong

Glossary (§3) is comprehensive and every term (Event, Role, Role-holder, Subtask, Decision Task, Timeline, Run of Show, Guest Dashboard, Proposed Task, Magic Link) is used with consistent capitalization across all FRs and UJs — no drift found. FR IDs (FR-1…FR-22), UJ IDs (UJ-1…UJ-3), and SM IDs (SM-1…SM-5, SM-C1/C2) are contiguous with no gaps or duplicates. Internal cross-references resolve correctly (e.g. FR-16 "same rule as FR-6," FR-18 referencing FR-3, §7 SM-to-FR mappings) with one exception noted below.

### Findings
- See **Mechanical notes** for one broken cross-reference (FR-17 → §8).

## Shape fit — strong

This is a chain-top PRD (§0: feeds UX, architecture, epics/stories) for a consumer-facing, multi-stakeholder product (Organizer / Role-holder / Guest) — UJs with named protagonists are correctly load-bearing here, and all three UJs (Leah, Stine, Chris) carry named protagonists with full entry-state/path/climax/resolution/edge-case structure, not decorative summaries. The formality level (glossary, FR consequence blocks, assumptions index) is justified by the explicit downstream handoff rather than being over-formalized for a solo course project.

No findings.

## Mechanical notes

- **Broken cross-reference**: FR-17 (§4.5) states "no automatic time-based send in Core (see §8 re: role-holder reminders, which remain Target and unaffected by this decision)." §8 (Open Questions) contains no mention of role-holder reminders — that item actually lives in §6.2 ("Automated reminders to Role-holders" under Target). The reference should point to §6.2, not §8.
- Glossary discipline is otherwise clean: no case/plural drift found across Event, Role, Task, Subtask, Decision Task, Timeline, Run of Show, Dashboard vs. Guest Dashboard (kept distinct correctly), or Magic Link.
- ID continuity: FR-1…FR-22 contiguous and unique; UJ-1…UJ-3 contiguous; SM-1…SM-5 plus SM-C1/C2 contiguous. No gaps or duplicates found.
- Assumptions Index (§9) round-trips cleanly: all three inline `[ASSUMPTION]` tags (FR-8, FR-11, FR-21) are indexed, and all three index entries have a matching inline tag. No orphans either direction.
- UJ protagonists: all three UJs name a protagonist (Leah, Stine, Chris) and carry their context inline — no floating UJs.
