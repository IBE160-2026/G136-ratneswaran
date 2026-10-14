---
title: Sprint Change Proposal — abuse-limiter buckets per flow
date: 2026-10-15
status: approved
scope: minor (one new story, one architecture sentence, one sprint-status line)
branch: plan/limiter-buckets
---

# Sprint Change Proposal — abuse-limiter buckets per flow

## 1. Issue summary

**Trigger.** Story 1.4's migration limits `abuse_counters.bucket` with a check constraint to `signup_ip` and `signup_email`. Story 1.5 (PR #27) added resend-verification and forgot-password, and with no migration allowed in that story they had to spend the same two buckets as sign-up.

**Effect.** The 3-per-hour email budget is shared by three flows, so a person who signs up, resends and asks for a reset is refused on the fourth request. Because callers choose the key, one person can also spend another's email budget for password reset (the same weakness the owner accepted for sign-up under limiter option C, now reaching an existing account).

**Evidence.** `spec-1-5-log-in-log-out-and-reset-password.md` (first deferred item and the Review Triage Log), `deferred-work.md` (Story 1.5 entry), `docs/refleksjonsnotater.md` (2026-10-15), and `supabase/migrations/20261014230000_abuse_limiter.sql`.

**Type.** Implementation gap in a finished story. Nothing is rolled back.

## 2. Impact analysis

- **Epics.** Epic 1 gains Story 1.10. Stories 3.5, 3.6, 3.7 and 7.x already say "reusing the Epic 1 limiter" and stay valid: each adds its own flow name instead of borrowing sign-up's.
- **PRD.** No change. NFR10's numbers (5 per minute per IP, 3 per hour per email or token) are unchanged and now hold per flow.
- **Architecture.** AD-21 gains one rule: each public flow counts in its own bucket.
- **UX.** No change.
- **Code (for Story 1.10).** One migration, `src/modules/auth/actions.ts` (`limit()` takes a flow name), tests, regenerated `src/types/database.ts`. `docs/` and Story 1.5 are not touched.
- **Sprint status.** One new line for 1.10; the Story 1.5 PR is not blocked.

## 3. Recommended approach

**Direct adjustment** (new story). Rejected alternatives:

- Fold into Story 3.5: leaves the shared-bucket weakness on password reset until Epic 3 is built.
- Fold into Story 1.9: mixes a profile UI story with a security schema change.
- Roll back Story 1.5: nothing in it is wrong; it only inherited a constraint.

Effort: small (one migration, one helper signature, tests). Risk: low; the migration keeps existing rows and only loosens the constraint. Timeline: build it before Epic 3 starts; Epic 1 stays Core and inside the 2026-12-15 freeze.

## 4. Detailed change proposals

### 4.1 `epics.md` — Epic 1 list (line 297)

OLD: `| 1 Account and app shell | 1.1–1.9 | — |`
NEW: `| 1 Account and app shell | 1.1–1.10 | — |`

### 4.2 `epics.md` — new story after Story 1.9

NEW:

```markdown
### Story 1.10: Per-flow abuse-limiter buckets

As the owner,
I want each public flow to count in its own limiter bucket,
So that sign-up traffic cannot lock someone out of password recovery.

**Acceptance Criteria:**

**Given** `abuse_counters`
**When** the migration runs
**Then** the check that limits `bucket` to `signup_ip` and `signup_email` is replaced by a shape check (lowercase letters, digits and underscore, at most 32 characters), existing rows are kept, `src/types/database.ts` is regenerated, and a pgTAP test proves one accepted and one refused bucket name (AD-15, AD-16).

**Given** sign-up, resend verification and forgot password
**When** each calls the limiter
**Then** it counts in its own `<flow>_ip` and `<flow>_email` buckets with the unchanged limits (5 per minute per IP, 3 per hour per email), and the shared `limit()` helper takes the flow name so later flows add their own (AD-21, NFR10).

**Given** a person who signs up, resends the verification and asks for a reset within an hour
**When** each request is made
**Then** none is refused because of another flow's use, and a Vitest test asserts the bucket name each action sends.

**Given** the limiter
**When** this story is done
**Then** login still has no app-level limiter (Auth throttles it) and purging old counter rows stays with the Target 2 retention job.
```

### 4.3 `ARCHITECTURE-SPINE.md` — AD-21

OLD: ends after the three limits (5 per minute per IP; 3 per hour per email or token; 10 guest requests per Guest per day).
NEW: adds under the rule: "Each public flow counts in its own bucket (`<flow>_ip`, `<flow>_email`), so one flow's traffic never spends another flow's budget."

### 4.4 `sprint-status.yaml` — after `1-9-profile-and-settings`

NEW: `  1-10-per-flow-limiter-buckets: backlog`

Rationale for all four: one story, one rule, one tracking line, no other document changes.

## 5. Implementation handoff

**Scope: minor.** The Developer agent implements Story 1.10 from `epics.md` after the owner merges PR #27 (it edits the same `limit()` helper). Success: the three Story 1.5 flows use their own buckets, no migration other than the constraint change, pgTAP allow and deny pass, and the deferred item is closed in `deferred-work.md`.

## 6. Checklist outcome

Trigger and context: done. Epic impact: Epic 1 extended, no reorder. Artifact conflicts: AD-21 only. Path: direct adjustment. PRD, UX: not applicable.
