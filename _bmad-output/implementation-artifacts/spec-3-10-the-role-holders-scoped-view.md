---
title: 'Story 3.10: The Role-holder''s scoped view'
type: 'feature'
created: '2026-11-02'
status: 'done'
baseline_commit: '271898e2f4e65085879d952ffbc3d4565638d272'
route: 'dispatch'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A joined Role-holder can already read the Event (3.7) but sees the Organizer's whole sidebar, can open Guests and Settings by URL, and cannot see who else is on the Team. `holds_role` does not exist yet.

**Approach:** Add `holds_role(role_id)` and widen the read policies for joined holders. Render the sidebar by viewer, show Team & Roles read-only, and show the no-access page on Organizer-only routes. All events labels the holder's Role.

## Boundaries & Constraints

**Always:**
- `public.holds_role(p_role_id uuid) returns boolean`: `STABLE`, `security invoker`, `search_path = ''`, true only for a joined `role_members` row of `auth.uid()`; executable by `authenticated`. pgTAP covers true and false.
- `role_members_select` and `roles_select` let a joined holder read every row of their own Event. `role_members` compares `user_id = (select auth.uid())` directly (AD-3). Holders never read `role_membership_log`, `guests`, `guest_contacts` or `invite_tokens`; pgTAP proves a holder of any Role reads no `guests` row.
- A pending (not joined) invitee reads nothing new.
- `events_select_member` also requires `cancelled_at is null`, so a cancelled Event leaves the Team's lists. Deletion already cascades.
- Sidebar items by viewer: Organizer sees all; a holder sees Overview, Team & Roles and All events. Unrendered items, not disabled ones.
- Guests, Event settings and the setup wizard render the existing no-access page for a non-Organizer, with no data fetched. The database stays the boundary.
- Team & Roles for a holder: Roles with name, holders ("Invited · not joined yet" marked) and lead. No invite form, switches, Revoke, *New link*, *Correct email* or Access history. Holders do not see other people's emails.
- All events: a holder's card shows their Role label(s) in place of "Organizer".
- Text in `messages/{en,nb}.json`. No names or emails in logs.

**Decisions (owner, 2026-11-02):** the no-access message reads "Ask the Organizer if you need it" without a name, so no new function exposes it. The role-revoked toast and redirect are deferred again; a revoked person reaches the no-access page.

**Decision (owner, 2026-11-02, after review):** a holder must not read other people's email at the database level either. The email moves from `role_members` to an Organizer-only table `role_member_contacts` (one row per `role_members` row, `select` for `is_organizer` only, no direct-write grant), after the `guest_contacts` pattern. `events_invite_to_role`, the join exchange (email comparison), Correct email, and the Organizer's Team page read and write it there. pgTAP proves `select email` is denied to a holder and allowed to the Organizer.

**Never:** Task data (Epic 4); Role-specific pages; a write grant on any table; matching on email in a policy.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Joined holder opens Team | holder, any Role | all Roles, holders, leads, no emails or controls | — |
| Holder opens /guests or /settings | joined holder | no-access page, no data | — |
| Pending invitee | `joined_at` null | reads nothing | — |
| Cancelled Event | holder | Event absent from All events | page: no-access |
| Holder of two Roles | — | card shows both labels | — |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20261026120000_role_members.sql` -- `role_members_select`, log policy; `20261019170000_roles.sql` -- `roles_select` ("Epic 3 widens this with holds_role"); `20261027120000_invite_join.sql:199` -- `events_select_member`.
- `supabase/tests/role_members.test.sql`, `invite_join.test.sql` -- pgTAP fixture style.
- `src/components/app-nav.tsx` -- sidebar; needs the viewer's kind. `app/events/[eventId]/load-event.ts` -- shared loader.
- `app/events/[eventId]/{guests,settings,setup}/page.tsx`, `team/page.tsx`, `not-found.tsx` (the no-access text, `events.noAccess`).
- `app/events/page.tsx`, `app/events/event-card.tsx`, `src/modules/events/list.ts` -- All events and card.
- `e2e/team-revoke.spec.ts`, `e2e/invite-join.spec.ts`, `e2e/support.ts` -- Playwright seeding; add the team part of UJ-1.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/migrations/20261030120000_holder_scoped_view.sql` -- `holds_role`; widen `role_members_select` and `roles_select`; `events_select_member` excludes cancelled.
- [x] `supabase/tests/holder_scoped_view.test.sql` -- helper true and false; holder reads team and roles; denied `guests`, `guest_contacts`, log; pending invitee denied; cancelled Event hidden.
- [x] `supabase/migrations/20261030130000_role_member_contacts.sql` -- create and backfill `role_member_contacts`, drop `role_members.email`, update every function and policy that reads it; `supabase/tests` for them adjusted.
- [x] Review patches: root layout throws on a failed organizer query; draft card hides *Continue setup* from non-Organizers; pgTAP grant test for `is_team_member`; pgTAP cross-Event isolation (a holder reads nothing of an Event they are not on); e2e holder visits `/setup/description` and `/setup/guests`.
- [x] `src/types/database.ts` -- regenerate with `supabase gen types`.
- [x] Sidebar, page guards, holder Team view and All events label as in Boundaries.
- [x] `messages/en.json`, `messages/nb.json` -- new keys.
- [x] `e2e/holder-view.spec.ts` -- team part of UJ-1: holder sees Role label, Team, trimmed sidebar, no-access on `/guests` and `/settings`.

**Acceptance Criteria:**
- Given a joined holder, when they open the Organizer-only pages, then they see the no-access message and no data.
- Given the Organizer cancels the Event, when a holder opens All events, then it is gone.

## Implementation Notes

First pass is in the working tree (copy: `out/3-10-first-pass.patch`). KEEP: `holds_role`, `is_team_member`, policy widening, `organizerOnly`, `holder-team.tsx`, sidebar by viewer, card Role labels, messages, e2e. Extend it; do not re-derive.

## Spec Change Log

- Review 1 (intent_gap): holders read `role_members.email` via the API. Resolved by the owner: Organizer-only `role_member_contacts`. Avoids a UI-only guard. KEEP the list in Implementation Notes.

## Review Triage Log

| Finding | Verdict | Evidence |
|---------|---------|----------|
| Holder reads others' `role_members.email` over PostgREST (blind, edge-case) | medium | RLS is row-level and `grant select` is table-wide; the widened policy returns whole rows. The UI column list is the only guard. Fix needs a new surface the spec does not settle: intent_gap. |
| `is_team_member` re-enters its own policy (blind, edge-case) | maybe-false | The inner query's `user_id = auth.uid()` is a leakproof uuid equality planned before the policy, and the 5-row holder pgTAP passes. Would need a plan under a larger table to settle; fragile by design, defer. |
| `is_team_member` has no grant test, dead `holds_role` (blind) | low | `holds_role` is required by the spec; grant test is a direct addition. Patch with the pgTAP additions. |
| Root layout ignores the query error (blind, edge-case) | medium | `organized` is `undefined` on error, so an Organizer silently gets the holder sidebar. Patch: throw. |
| Stale `organizedEventIds` after create, extra query per request, row cap (blind, edge-case) | maybe-false | Redirect after create re-renders the layout; cap needs more than 1000 Events. Not reproduced. |
| Draft card shows "Continue setup" to a holder (blind) | medium | `events_select_member` allows drafts; the link ends on no-access. Patch: hide for non-Organizers. |
| Setup sub-pages not tested as holder (verification-gap) | medium | Removing `organizerOnly` there keeps e2e green. Patch. |
| No cross-Event isolation pgTAP case (verification-gap, blind) | medium | Dropping `event_id = p_event_id` keeps all tests green. Patch. |
| Roles/Team rows still readable after cancel (verification-gap) | low | Event itself is hidden; rows only reachable by id. Reject: no everyday harm. |
| Label order, null name, inactive-Role members, hint shown to strangers, migration `drop policy` form, `loadEvent` fetch before guard, Organizer-path regression, `.first()` nav (various) | low | Cosmetic or covered by existing Organizer pgTAP; none cause a demonstrated wrong outcome. Rejected. |
| Missing ki-logg, unchecked tasks (blind) | false | Written after review by the workflow, not part of the diff under review. |
