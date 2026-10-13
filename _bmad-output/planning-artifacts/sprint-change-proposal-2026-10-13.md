---
title: Sprint Change Proposal — privilege model, guest data and Epic 7 scope
date: 2026-10-13
status: approved
scope: moderate (architecture wording + epics + PRD tier notes)
branch: plan/correct-course-privilege-and-scope
---

# Sprint Change Proposal — privilege model, guest data and Epic 7 scope

## 1. Issue summary

**Trigger.** Writing Epics 4 and 6–11 left eight points open that each epic flagged for `bmad-correct-course`, and the owner moved four Epic 7 stories out of Core on 2026-10-13. The owner reviewed all points and confirmed the recommended choices below; this proposal records them and applies them to the documents.

**Type.** Planning corrections. No code exists, so nothing is rolled back.

**Evidence.** Each point is quoted in the epic that raised it: Story 4.1, Story 6.1, Stories 7.7 and 7.8, Story 8.3 and Story 10.3 in `epics.md`.

## 2. Decisions

| # | Point | Decision |
| --- | --- | --- |
| C1 | How `tasks_*` functions write tables `authenticated` cannot write (Epic 4) | The AD-2 functions are **mutation functions**: `security definer`, `search_path = ''`, granted to `authenticated`, revoked from `public` and `anon`. Each authorises from `auth.uid()` and the AD-3 helpers before any write. `tasks_create` joins the AD-2 list. |
| C2 | `ai_reserve` and AD-5's "revoke from `authenticated`" (Epic 6) | `ai_reserve` is a mutation function under C1, with the ledger arguments `(feature, event_id, subject_id, request_key, worst_case_microusd)`. A pgTAP allow and deny per feature key. |
| C3 | How Server Actions call revoked functions (Epic 7) | They do not. Server Actions call mutation functions under the user's session. Only system functions (`notifications_emit`, purge hooks, retention job, token exchange) stay revoked from `authenticated`, and no Server Action calls them. |
| C4 | `guests` / `guest_contacts` split (Stories 7.7, 2.9) | Adopted. Story 2.9 stores the email in `guest_contacts` (Organizer-only) with the unique `(event_id, lower(email))` constraint there. |
| C5 | Auth users deleted in SQL or through the Admin API (Stories 7.8, 7.9) | In SQL, inside `guests_delete_guest_data`. The secret key now has three places in AD-5: invite exchange, invitee creation, notification delivery. |
| C6 | `route-request` has no session (Story 8.3) | There is no system caller. The call runs as a step of the submitting Server Action under the Guest's own session, and `ai_reserve` authorises `route-request` for the Guest who owns the request, once per request. |
| C7 | Stories 4.10 and 4.11 call the outbox without a gate (Epic 10) | Story 4.5 creates a no-op `notifications_emit` stub with the final signature; Story 3.1 (Target 3) replaces it. Stories 4.5, 4.8, 4.10 and 4.11 never change when the outbox arrives. |
| C8 | Role-holders reading other Roles' Tasks (Epic 4) | Not changed. FR2, NFR1 and AD-3 stand. |

## 3. Impact analysis

**Epics.** Stories 4.1, 4.5, 4.10, 4.11, 6.1, 7.7, 7.8, 7.9, 8.3, 10.3, 2.9, 1.7 and 11.6 and the carry-forward notes of Epics 4, 6, 7, 8 and 10 changed wording. No story was added or removed.

**Architecture.** AD-2 gains `tasks_create`. AD-5 now names two kinds of definer function and drops auth-user deletion from the secret-key list. AD-9's `ai_reserve` signature and the `route-request` caller change. AD-11 marks automatic retention Target 2 and states that the auth user is deleted in SQL. The module table gains `guest_contacts`.

**PRD.** FR-3 (shared link and optional account → Target 3), FR-15 (allergies, food, hotel and automatic deletion → Target 2), SM-4, UJ-3's Core path, §6.1 and §6.2 changed to match the Epic 7 move.

**UX.** `EXPERIENCE.md` and `DESIGN.md` still describe the allergy, hotel and account screens. They are Target now and need no edit until that work starts.

**Consequences of moving Stories 7.2, 7.4, 7.6 and 7.9 (owner decision, same day).**
- Core collects no health data, so it needs no consent screen, no `guest_food` or `guest_hotel` and no retention job.
- Core deletes guest data only on request (Story 7.8) or when the Event is deleted. The decision to delete a cancelled Event's guest data 15 days after cancellation moves with Story 7.9. The Privacy notice (Story 1.7) says so.
- The flagship scenario's allergy step is Target 2. SM-4 is reworded accordingly.

**Technical.** None yet. These are the rules every Core migration must follow from Story 1.1.

## 4. Recommended approach

Direct adjustment. The edits are wording and tier notes in existing documents, with no new story. Effort is under an hour, risk is low, and the schedule is unchanged. The change removes four stories from Core, which helps the 2026-12-15 freeze.

## 5. Handoff

**Scope: moderate.** The Developer agent applies these rules from Story 1.1 on. The owner reviews this PR.

**Not edited here, owner action.** `AGENTS.md` still says the secret key has four places and that `security definer` is limited to a list; both change with C1 and C5. Update it with `bmad-project-context` after this PR is merged, because it is an instruction file and not a planning document.

**Success criteria.**
- No epic carries an open `bmad-correct-course` point; Story 11.6 lists these eight decisions.
- Story 4.1's pgTAP tests show a direct PostgREST write is denied while the mutation function succeeds.
- A grep for `SUPABASE_SECRET_KEY` in the first built Core stories finds only the three places in AD-5.
