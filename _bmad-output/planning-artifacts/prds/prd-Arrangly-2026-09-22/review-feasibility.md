---
title: Arrangly PRD — Technical/Schedule Feasibility Review
reviewer: ad-hoc feasibility reviewer
date: 2026-09-25
scope: /Users/aumgaran/Downloads/Arrangly/_bmad-output/planning-artifacts/prds/prd-Arrangly-2026-09-22/prd.md, §6.1 Core FRs
---

# Feasibility Review — Arrangly PRD

## Overall Verdict

As currently scoped, the 22 FRs in Core (§6.1) are not realistically completable solo, alongside coursework, in ~9-10 weeks, even with AI-assisted development — FR-13 is correctly the single biggest individual risk (and for a sharper reason than the PRD gives: it isn't just integration cost, it's that the capacity data it promises to filter on generally doesn't exist in live venue/places APIs), but cutting FR-13 alone does not create enough slack to make the rest of Core safe; the data model underlying FR-2/6/7/20 is standard and low-risk on its own, the real concentration of risk is the Timeline rendering (FR-20) and the decision-branching semantics (FR-10/11, which the PRD's own worked example contradicts), and Messaging (FR-21) is the best second candidate to descope since the PRD itself says its model is still undecided and no success metric depends on it. Recommendation: move FR-13 to Target (as already flagged) **and** shrink or move FR-21, resolve the FR-10/11 branching ambiguity before building it, and explicitly cap the Timeline's UI ambition — that combination is what actually protects a guaranteed working demo by 2026-11-30.

## Findings

### 1. FR-13 — AI venue search: capacity filter is a data-availability problem, not just an integration-cost problem
**Severity:** critical
**Risk:** The PRD frames FR-13's risk as "integration cost (API availability, cost per call, rate limits)" to be assessed later. The sharper problem: mainstream live venue/places data sources (Google Places, Yelp Fusion, OpenStreetMap/Overpass, etc.) do not expose a structured "capacity" field at all. FR-13's testable consequence — "capacity figure sufficient to filter by guest count" — cannot be honestly satisfied by querying any of these APIs; it would require either fabricating/inferring capacity via an LLM reading unstructured listing text (unreliable, and easy to get visibly wrong in a graded demo), or the manual-entry fallback becoming the *normal* path rather than the described degradation case. This risk doesn't go away by moving to Target and doing it later with more time — more time doesn't manufacture a capacity field that doesn't exist upstream.
**Suggested fix:** Move to Target (matches the PRD's own instinct in §6.2's note). Core ships only the manual venue-entry path that FR-13 already describes as its fallback — which costs nothing extra since it's already speced. If AI venue search is attempted in Target/Stretch, drop the capacity-filter promise from the testable consequence and relabel it as a best-effort, LLM-inferred, clearly-flagged-as-approximate figure — not a reliable filter.

### 2. Overall Core scope — FR-13 is not the only thing that needs to move
**Severity:** high
**Risk:** Summing realistic solo build effort across the Core clusters (auth/RBAC, questionnaire + AI task suggestion, task/dependency/decision data model, guest flows, dashboard, Timeline UI, messaging, run-of-show) — plus the course's own graded overhead of documenting AI usage and QA throughout, not just building — comfortably exceeds the working days available in 9-10 weeks split with coursework, even after removing FR-13. Treating FR-13 as the only lever leaves the rest of Core still over-committed.
**Suggested fix:** Descope a second item. FR-21 (Messaging) is the best candidate: the PRD's own note in §4.7 says its thread model, read receipts, and notification delivery are "undecided — defer to UX," it realizes no journey on its own line, and none of the Success Metrics in §7 depend on it. Move it to Target, or shrink Core to a single flat per-Event announcement feed (no per-Role/per-person threading, no read receipts) rather than the full model implied by FR-21's consequences.

### 3. FR-10/FR-11 — the decision-branching example in the PRD contradicts itself, and the underlying model is under-specified
**Severity:** high
**Risk:** UJ-2's edge case says "if Leah had picked the rooftop bar instead, the hotel-branch tasks (room booking) would be marked obsolete" — implying tasks are already tied to the *not-yet-chosen* option before the decision resolves. But the same journey's climax has the room-booking task created only *after* Leah's decision ("Leah's decision comes back... plus a new task (book 8 single + 2 double rooms)"). FR-10/FR-11 as written don't say how or when option-tied tasks are supposed to exist in order to be marked obsolete — the one concrete example in the PRD is spawn-after-decision, not pre-existing-per-option. Building against this ambiguity risks implementing the wrong mechanic (e.g., a full pre-declared-tasks-per-option model) when every concrete scenario in the document only needs spawn-only-after-decision. This compounds with Open Question 1 (reversal), which the PRD explicitly hasn't resolved either.
**Suggested fix:** Resolve before implementation, not during architecture. Recommend the simpler model: Decision Tasks spawn new Tasks only after resolution (matches every worked example); "obsolete marking" applies only to the narrow case where an Organizer manually pre-created a Task under a specific not-yet-decided option in advance — not a general pre-declared-branch-tree. Keep reversal (Open Question 1) to "re-run the same spawn/obsolete logic idempotently," not a full undo/redo history — that's a much smaller state machine and still satisfies the testable consequences as written.

### 4. FR-20 — Timeline rendering is under-stated as "just remove the fork," but the remaining scope is itself several days of custom UI/algorithm work
**Severity:** medium
**Risk:** §6.2 frames the Target deferral as isolating "only" the visual fork, implying the rest of the Timeline is simple. But what's left in Core — one swimlane per active Role, Tasks/Subtasks rendered in dependency order within a lane, nested Subtask positioning, and visible (unresolved) Decision Task points — is a non-trivial per-lane topological-sort-plus-nested-layout problem, not something a drop-in Gantt/timeline library gives for free out of the box for this exact shape (Role-scoped lanes + Subtask nesting + decision markers). It's easy to under-budget this as "the easy part now that forking is gone."
**Suggested fix:** No tier change — FR-20 is load-bearing for UJ-2 and SM-5 and shouldn't move. Instead, explicitly cap ambition for Core: a static, server-computed, read-only render (simple topological sort, ties broken by deadline), no drag-and-drop, no zoom/pan, no live editing from the Timeline view. Treat any interactivity beyond "click a Task to open it" as Target.

### 5. FR-22 — Run of Show depends on Task fields that don't exist yet in the model
**Severity:** medium
**Risk:** FR-22 generates the guest-facing schedule "from the Event's confirmed Tasks and timing," but the Task model defined in §3/FR-7 has a deadline, owner, status, and dependencies — no guest-facing display name, no public/private flag, and no time-of-day distinct from a deadline. Without these, there's no way to know which Tasks (or which of their fields) are safe/appropriate to surface to a Guest, or what time to show for "dinner" vs. a deadline that's really "confirm caterer by Friday."
**Suggested fix:** No tier change — add the missing attributes (guest-facing label, public/private flag, scheduled time-of-day) to the Task or a lightweight "Schedule Item" concept during architecture/data-model design now, rather than discovering the gap mid-build when FR-22 is implemented.

### 6. Open Question 2 (AI cost-control guardrail) is a schedule risk, not just a policy question
**Severity:** medium
**Risk:** Three separate Core features make live AI calls (FR-6 task suggestion, FR-13 venue search if kept, FR-14 email drafting) against what the PRD itself calls a personal/course budget, with no caps defined. Left undecided until "architecture assesses," this risks either a mid-build cost surprise that stalls development, or the developer avoiding real calls during testing (to save budget) and only discovering integration bugs at the live demo — the worst possible time for a graded exam.
**Suggested fix:** Define hard per-feature call caps and a mocking/fixture strategy for development *before* building the AI-touching FRs, not deferred alongside the rest of "architecture."

### 7. FR-2/FR-6/FR-7 data model itself — not the risk driver
**Severity:** low
**Risk:** None beyond ordinary build time. The underlying schema (per-Event Role instantiation from a Branch Pool template, self-referential Task/Subtask, many-to-many Task dependencies, Role-scoped RBAC) is standard relational modeling that AI-assisted scaffolding (ORM + codegen) handles well. The task explicitly asked whether this combination is "more Target-shaped than it looks" — it isn't; the CRUD/data-model layer is fine as Core.
**Suggested fix:** No change needed. The actual risk in this cluster is concentrated in FR-20's rendering (Finding 4) and FR-10/11's branching semantics (Finding 3), not the base data model.

### 8. FR-3 — guest PIN
**Severity:** low
**Risk:** None beyond what the PRD already accepts. The 4-digit PIN is correctly scoped as a known, accepted weak-security tradeoff with hardening (rate-limiting/lockout) explicitly deferred to architecture rather than being treated as a Core-blocking fix.
**Suggested fix:** No change needed.
