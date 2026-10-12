---
title: Sprint Change Proposal — Core scope reduction
date: 2026-10-12
status: approved
scope: major (PRD MVP review + architecture)
branch: plan/core-scope
---

# Sprint Change Proposal — Core scope reduction

## 1. Issue summary

**Trigger.** Instructor feedback on the product brief (`briefs/brief-Arrangly-2026-09-20/tilbakemelding-product-brief.md`, 2026-10-06): "Core is too big for one person … move items to Target now, not when it gets urgent." It names the team matrix, announcements, Run of Show and AI suggestions as candidates. It also flags the transactional outbox as advanced for one developer.

**Type.** Strategic re-scope (MVP review). No code exists yet, so nothing is rolled back.

**Evidence.**
- Epics 1–5 hold 52 stories. Epics 6–11 are unwritten and estimated at 35–45 more, about 90 in total.
- From 2026-10-13 to the feature freeze on 2026-12-15 there are about 9 weeks. Realistic solo pace, with pgTAP, Vitest and Playwright per story, is 4–6 stories a week, or 36–54 stories.
- PRD §6.1 already notes that the UX pass grew Core "by more than the 20 extra days cover".

## 2. Decisions taken (2026-10-12)

| # | Decision | Choice |
| --- | --- | --- |
| D1 | Core epics | 1, 2, 3 (invitations without app email), 4 (trimmed), 5, 7 (trimmed), 11 |
| D2 | Target order | T1 AI task suggestions (Epic 6 FR6 + Stories 4.13–4.14) → T2 Accept step, Problem flag, decisions and obsolete-marking (4.6, 4.8, 4.10–4.12) → T3 application email, notifications and announcements (3.1–3.4, Epic 10, FR17) → T4 guest requests (Epic 8), Landing page + Run of Show (Epic 9), AI-drafted email (FR14) |
| D3 | Application email | Out of Core. Invitations are links the inviter copies and shares. Only Supabase Auth emails (one-time codes, confirmations, resets) are sent in Core. |
| D4 | Timeline | Stays in Core (5.6–5.8). It is the only timeline once Run of Show moves to Target. |
| D5 | Feature freeze | **2026-12-15**, fixed. No new features after it; only fixes, README, test plan and launch checks. |

## 3. Impact analysis

### Epic impact

| Epic | Core | Moves to Target |
| --- | --- | --- |
| 1 Account and app shell | 1.1–1.9 | — |
| 2 Event and guest list | 2.1–2.10 | — |
| 3 Team and email → **Team and invitations** | 3.5–3.10 | 3.1–3.4 (outbox, delivery, email language, retry) → T3 |
| 4 Tasks and decisions | 4.1–4.5, 4.7, 4.9 | 4.6, 4.8, 4.10–4.12 → T2; 4.13–4.14 → T1 |
| 5 Dashboard and Timeline | 5.1–5.9, with the rendering of Target-fed items gated (see below) | — |
| 6 AI assistant | — | whole epic → T1 |
| 7 Guests | invitation by link, RSVP, Guest Dashboard, data deletion | FR17 manual reminder → T3 |
| 8 Guest requests | — | whole epic → T4 |
| 9 Landing page and Run of Show | — | whole epic → T4 |
| 10 Announcements and channels | — | whole epic → T3 |
| 11 Ready for launch | all | — |

Core ends at about 52 stories (E1 9, E2 10, E3 6, E4 7, E5 9, E7 about 7, E11 about 4).

**Dependencies resolved by this proposal:**
- 3.6 queued the invitation email through `notifications_emit`. In Core it shows the invitation link with *Copy link*.
- 3.7 sent a one-time code by app email. In Core the code is sent by Supabase Auth (`signInWithOtp` + `verifyOtp`, email OTP, no magic link).
- 4.5 emitted `task_assigned`. In Core it emits nothing; the new owner sees the Task in *My tasks* and on the Dashboard.
- Epic 5 shows Decision cards, Problems, Proposed Tasks and not-yet-accepted rows. In Core, the sections render only what Core stories produce; each Target item appears when its story ships, with no placeholder.
- Epic 7 guest invitations: per-guest *Copy link*, plus the `shared_event` link, where the Guest's email is verified with a Supabase Auth one-time code instead of an emailed personal token.

### Artifact conflicts

| Artifact | Sections |
| --- | --- |
| PRD | §6.1 Core, §6.2 Target (ordered), `[NOTE FOR PM]`, UJ-1/UJ-2 Core path notes |
| Epics | Epic List, NFR7/8/9/13, Epic 3/7/10 descriptions, tier lines on moved stories, ACs in 3.6, 3.7, 4.5, Core notes in Epic 5, release-tier section |
| Architecture | AD-4 (invite delivery, fresh links), AD-5 (delivery route and `notifications_emit` become Target), AD-7/AD-8/AD-10 marked Target with the Core rule, Capability map |
| UX | EXPERIENCE.md: a release-scope note (invite = *Copy link*; Target items hidden until shipped) |
| Other | `docs/refleksjonsnotater.md` and `docs/ki-logg.md` entries; project memory |

**Technical impact.** Core no longer needs `pg_net`, Vault secrets, the delivery route, `DELIVERY_SECRET`, pg_cron retries, nodemailer SMTP or VAPID keys. Supabase Auth SMTP (Gmail) is still required for one-time codes, confirmations and resets, with the Auth email rate limit raised.

## 4. Recommended approach

**MVP review** (checklist 4.3): reduce Core, keep each FR working where it stays, and keep Target fully specified so it can be built in order once Core is stable.
- **Effort:** medium (document edits only).
- **Risk:** low for the plan. The remaining risk is the late freeze; see §6.
- **Timeline:** Core fits 9 weeks at 6 stories a week. Re-check after Epic 1 with measured pace.

Not viable: direct adjustment alone (keeps about 90 stories), or rollback (nothing built).

## 5. Detailed change proposals

### 5.1 PRD

**§6.1 In Scope (Core). Replace the bullet list, the "Added to Core by the UX pass" paragraph and the `[NOTE FOR PM]` with:**

```markdown
- Accounts & RBAC: FR-1, FR-2, FR-3 (invitations are links the inviter shares; no application email)
- Event setup: FR-4, FR-5 (link/manual only). Tasks are created by hand; AI task suggestions (FR-6) are Target 1.
- Team & tasks: FR-7, FR-8 (manual states, computed Blocked and Overdue), FR-9, FR-12 (delegation and its history)
- Task execution support: FR-13 (manual venue-option entry)
- Guest experience: FR-15, FR-18
- Organizer dashboard & timeline (static, sequential, non-branching, horizontally scrollable): FR-19, FR-20
- Norwegian + English localisation (§4.9)

Core sends no application email. Supabase Auth's own emails (one-time codes, confirmations, password resets) are the only email in Core.

Re-scoped 2026-10-12 (sprint-change-proposal-2026-10-12.md) to a Core one developer can finish and stabilise before the feature freeze on 2026-12-15. Everything moved out stays specified in §6.2 and is built in that order once Core is stable.
```

**§6.2 Out of Scope for MVP. Insert before "Target — build if Core is stable:":**

```markdown
**Target, in build order:**
1. AI task suggestions: FR-6, with Proposed Tasks from questionnaire gaps.
2. Accept step and 48-hour rule (FR-8/FR-12), Problem flag (FR-8), Decision Tasks and obsolete-marking (FR-10, FR-11).
3. Application email and notifications: the outbox, in-app/email/web push channels (FR-23), announcements with *Ask for volunteers* (FR-21), manual guest reminder (FR-17), and emailed invitations.
4. Guest requests with one reply (FR-16), Landing page with Run of Show and AI-drafted About (FR-22), AI-drafted external communication (FR-14).
```

The existing Target and Stretch lists stay below this as items after step 4.

**§2.3 UJ-1 / UJ-2:** add after each journey: "*Core path:* the Organizer adds Tasks by hand and shares invitation links; AI-proposed Tasks (UJ-1) and the Accept step and option search (UJ-2) arrive with Target 1–2."

### 5.2 Epics (`epics.md`)

**NFRs**
- NFR7 and NFR8: append "**Target 3** (ships with the outbox)."
- NFR9: replace "Playwright covers UJ-1, UJ-2, UJ-3" with "Playwright covers the Core paths of UJ-1, UJ-2 and UJ-3".
- NFR13: replace with "NFR13 (PRD §6): Release scope. Core is fixed by sprint-change-proposal-2026-10-12; feature freeze 2026-12-15. Target is built in the order of PRD §6.2 only once Core is stable, and each Target step leaves every Core FR working."

**Epic List**
- Epic 3 title → "Team and invitations". Description → "An Organizer invites people to Roles with a link they share themselves, appoints a Role lead, changes or revokes access, and a Role-holder sees only their Role. Application email (outbox and delivery, Stories 3.1–3.4) is Target 3."
- Epic 6, 8, 9, 10: prefix the description with "**Target 1**", "**Target 4**", "**Target 4**", "**Target 3**".
- Epic 7: append "Guests are invited by a personal link the Organizer copies, or by the shared Event link with email verified by a Supabase Auth one-time code. The manual reminder (FR17) is Target 3."

**New section after the Epic List: "Release tiers"**, listing the Core and Target table from §3 of this proposal and the freeze date.

**Tier lines.** Under the heading of each moved story, add `**Tier:** Target N — see Release tiers.`: 3.1–3.4 (T3), 4.6 (T2), 4.8 (T2), 4.10–4.12 (T2), 4.13–4.14 (T1).

**Story 3.6**

```
OLD: I want to invite a person to a Role by email,
NEW: I want to invite a person to a Role with a link I share,

OLD: …a pending membership and a `role_holder` token are created, and an email is queued through `notifications_emit` (FR1, FR2)
NEW: …a pending membership and a `role_holder` token are created, and the invitation link is shown once with *Copy link* and the text "Send this link to {name}" (FR1, FR2)

OLD: …the old token is revoked and a new link is sent (*Resend*).
NEW: …the old token is revoked and a new link is shown (*New link*).

OLD: …it shows "Invite sent · not joined yet" with *Resend*, and "Couldn't deliver" with the option to correct the address and send again.
NEW: …it shows "Invited · not joined yet" with *New link* and *Correct email*.
```

Add: "**Target 3:** with the outbox, the invitation is also emailed and the list gains "Couldn't deliver"."

**Story 3.7**

```
OLD: …a one-time code is sent to that email, and I can only set a password after entering it…
NEW: …a one-time code is sent to that email by Supabase Auth (email OTP, never a magic link), and I can only set a password after entering it…

OLD: …or an expiry message with a way to request a fresh link, answered identically whether or not the email exists (AD-4).
NEW: …or an expiry message telling me to ask the Organizer for a new link; nothing on the page reveals whether the email has an account (AD-4).
```

**Story 4.5:** the AC "a delegation to someone else in a published Event … `notifications_emit` queues one `task_assigned` …" becomes "**Target 3:** …" and Core adds "**Then** no notification is emitted in Core; the new owner sees the Task in *My tasks* and on the Dashboard."

**Story 4.5, the Accept step in Core:** without Story 4.6 nobody could accept a delegated Task, so the owner could never change its status (Story 4.4).

```
OLD: **Then** `owner_user_id` and `delegated_at = now()` are set, `accepted_at` is cleared, and a `delegated` log row is written
NEW: **Then** `owner_user_id` and `delegated_at = now()` are set, `accepted_at = now()` in Core (delegation counts as accepted), and a `delegated` log row is written
**And** **Target 2:** Story 4.6 changes this to clear `accepted_at` and adds the Accept step and the 48-hour rule.
```

**Story 3.10:** "a notification to `team(event)` is queued through the outbox" → "**Target 3:** a notification to `team(event)` is queued through the outbox". Core keeps "the Event leaves the Team's lists".

**Story 4.4:** prefix the "Accept this task first" AC with "**Target 2:**". In Core no delegated Task is unaccepted, so the rule never applies.

**Story 4.9:**
- "'New' Tasks (not yet accepted) first" → "'New' Tasks (not yet accepted, Target 2) first".
- The badge counts "Urgent (owned and overdue)" in Core; the New count and "with an open Problem" are Target 2.
- Playwright: "join → open Event → see the assigned Task" in Core; "→ Accept" is Target 2.
- The view's pgTAP asserts `blocked`, `overdue`, `is_delegated`, `is_pending` and `obsolete` in Core; Stories 4.6 and 4.8 add `stale_unaccepted` and `has_problem` with their assertions.

**Epic 5, new note under the Epic 5 heading:**

```markdown
**Core scope (sprint-change-proposal-2026-10-12):** Decision cards, Problems, ✦ Proposed Tasks and not-yet-accepted rows come from Target stories (4.6, 4.8, 4.10–4.14). Until those ship, the Dashboard renders and tests only Core items (overdue, blocked, waiting, done, open), shows no placeholder for the rest, and the flagship seed in 5.9 holds only Core states. Each Target story adds its row type, its seed rows and its assertions.
```

**Carry-forwards:** add to the release-criteria carry-forwards: "Epic 7 (Core): per-guest *Copy link* and the shared Event link with Supabase Auth one-time code; FR17 reminder is Target 3."

### 5.3 Architecture (`ARCHITECTURE-SPINE.md`)

- **AD-4 Rule, add:** "**Delivery in Core:** invitation links are shown to the inviter to share; no application email. A `shared_event` Guest verifies their email with a Supabase Auth one-time code (email OTP) before a personal guest token is issued. *Fresh links* in Core come from the inviter; the emailed fresh link is Target 3."
- **AD-5:** mark "the notification delivery route" and `notifications_emit` as "(Target 3)".
- **AD-7, AD-8, AD-10, headings:** append "— Target 3". Add to AD-10: "**In Core:** only Supabase Auth emails (one-time codes, confirmations, resets) are sent; Server Actions never send email."
- **Capability map:** FR-6, FR-10/11, FR-14, FR-16, FR-17, FR-21, FR-22, FR-23 rows get "(Target n)".

### 5.4 UX (`EXPERIENCE.md`)

Add at the top, under the title:

```markdown
> **Release scope (2026-10-12):** Core ships the flows for Organizer, Role-holder and Guest without application email: invitations show *Copy link*. Decision, Problem, Accept, Proposed-Task, announcement, notification and Landing-page patterns below are Target and appear only when their story ships. See PRD §6.
```

### 5.5 Process documents

- `docs/refleksjonsnotater.md`: new entry "Core redusert etter tilbakemelding" (choice, why, trade-off).
- `docs/ki-logg.md`: new entry for this correct-course run.

## 6. Risk: feature freeze on 2026-12-15

After the freeze, 5 days remain for the work sensors weigh most (README from a fresh clone, test plan, stabilisation, demo project awake). Mitigations, all inside Core:
- Run the README fresh-clone test **twice before the freeze**: once at the end of Epic 5 and again by 2026-12-08, not only after it.
- Keep `docs/testplan.md` filled in per epic, not at the end.
- Treat 2026-12-08 as a checkpoint. If Core is not complete then, stop starting new Core stories and finish what is open.

## 7. Implementation handoff

- **Scope: Major.** The PRD MVP and architecture change.
- **PM (John):** PRD §6 and UJ notes. **Architect (Winston):** AD-4/5/7/8/10 and the map. **UX (Sally):** release-scope note. Applied in this run by the developer agent on `plan/core-scope`, then reviewed by the owner in one PR.
- **Next:** continue `bmad-create-epics-and-stories` at Epic 6 with the tiers above. Epics 6, 8, 9 and 10 are written as Target. Epic 7 and 11 are written as Core.
- **Success criteria:** PRD, epics, architecture and UX agree on Core; every moved story carries a Tier line; no Core story depends on a Target story; the PR passes the Process check.
