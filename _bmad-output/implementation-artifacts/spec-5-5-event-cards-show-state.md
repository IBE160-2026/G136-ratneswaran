---
title: 'Event cards show state'
type: 'feature'
created: '2026-11-06'
status: 'done'
baseline_revision: '017c5e9d60bc1e924960c1293f8e48d322a763e1'
review_loop_iteration: 0
followup_review_recommended: false
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-5-4-dashboard-housekeeping.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-Arrangly-2026-09-29/ARCHITECTURE-SPINE.md'
warnings: []
deferred:
  - 'Decisions addressed to the viewer (card count and "N need you" part): Decision Tasks are Target (Story 4.8+); the function returns no decision column until then.'
  - 'Guest-only card RSVP state: Epic 7; the card is unchanged for guests.'
---

<intent-contract>

## Intent

**Problem:** *All events* shows only name, date and role. An Organizer or Role-holder cannot see which Event needs them before opening it (Story 5.5, UX-DR6); the card has an empty slot where the count circle goes.

**Approach:** One new invoker SQL function `events_card_counts()` groups `task_state` joined to `tasks` by Event under the viewer's RLS, with an index on `tasks (event_id, owner_user_id)`. The page calls it once. The card shows the Open count circle, a New badge and an urgent or at-risk line, and its link name carries the counts.

## Boundaries & Constraints

**Always:**
- One query for all Events (no per-card query). Counts come only from rows the viewer's RLS lets them read (`security invoker`, no `SUPABASE_SECRET_KEY`).
- Per Event, over live Tasks (`lifecycle = 'active'`, not obsolete, status not `done`, Role active):
  - **open** = Tasks the viewer owns; **new** = of those, `accepted_at is null` (does not clear on opening).
  - **scope** = every live open Task for the Organizer; Tasks of Roles the viewer leads plus owned Tasks for others (same scope as `classifyDashboard`).
  - **overdue** = in-scope `task_state.overdue`; **need_you** = distinct in-scope Tasks that are overdue, or stale-unaccepted (Organizer or lead only), or owned and not accepted (the Dashboard *Needs you* set); **at_risk** = in-scope Tasks not in need_you that are `waiting_external` or `task_state.blocked`.
- Card: count circle = open (shown even at 0); badge = new when > 0; when need_you > 0 the urgent line reads "N overdue" if overdue > 0, else "N need you"; otherwise when at_risk > 0 the at-risk line "N at risk". Status is icon plus word, never colour alone.
- The card stays one link; its accessible name is "name, date, who, N open tasks[, N overdue | N need you | N at risk][, N new tasks]", e.g. "Lucas's 40th, Sat 24 Oct, Organizer, 3 open tasks, 1 overdue, 1 new task".
- Counts show only on a published, not past, not cancelled card. A draft, cancelled or past card shows no counts (cancelled keeps its "Cancelled" label). An Event with no readable Task shows open 0 and no badge or line.
- All text in `messages/nb.json` and `messages/en.json`. `src/types/database.ts` is regenerated, never hand-edited.

**Never:**
- No decision count, Decision card or Proposed Task data; no guest RSVP state; no change to the empty state "Let's plan something."
- Do not change `classifyDashboard`, `task_state`, or Task RLS. No `SUPABASE_SECRET_KEY`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Organizer, mixed | 3 own open Tasks (1 overdue, 1 unaccepted) | circle 3, badge "1 new", urgent "1 overdue"; name "…, Organizer, 3 open tasks, 1 overdue, 1 new task" | none |
| Holder, own Task only | holds Role; owns 2 open accepted Tasks; other Role's Tasks exist | counts only own and RLS-readable Tasks; no other Role's numbers | none |
| At risk only | Organizer, one blocked Task, nothing overdue/unaccepted | "1 at risk", no urgent line | none |
| Need you, not overdue | owned unaccepted, not overdue | urgent line "1 need you" | none |
| Cancelled / past / draft | any Tasks | no counts, no circle number | none |
| 50 Events | 50 Events with Tasks | one `rpc` call; 50 rows | page throws "Could not load events" on error |
| Guest-only / no Tasks | no Task rows readable | no row returned; card shows open 0 and no badge | none |

</intent-contract>

## Code Map

- `supabase/migrations/20261105140000_task_state_obsolete.sql` -- latest `task_state` columns (`overdue`, `blocked`, `stale_unaccepted`, `obsolete`); view has no owner or status, so join `tasks`.
- `supabase/migrations/20261103120000_tasks.sql` -- `tasks` columns and RLS; `role_members.is_lead` from `20261028120000_role_lead.sql`; `is_organizer(event_id)` helper.
- `src/modules/tasks/dashboard.ts:39` -- `classifyDashboard` rules the SQL mirrors (read-only).
- `src/modules/events/list.ts` -- `EventCard`, `isPast`, `isDraft`; add nothing here unless needed.
- `app/events/page.tsx`, `app/events/event-card.tsx` -- the page and card (empty `size-10` slot at the end of the card is the count circle's place).
- `supabase/tests/task_state_scope.test.sql` -- pgTAP pattern (roles, `set local request.jwt.claims`).
- `src/modules/events/list.test.ts`, `e2e/events-list.spec.ts`, `e2e/support.ts` (`seed`, `psql`, `signedIn`) -- test patterns.

## Tasks & Acceptance

**Execution:**
- `supabase/migrations/20261106120000_events_card_counts.sql` -- index `tasks (event_id, owner_user_id)`; `public.events_card_counts()` `language sql stable security invoker set search_path = ''` returning `(event_id, open_count, new_count, overdue_count, need_you_count, at_risk_count)`; `revoke ... from public, anon`, `grant execute to authenticated` -- one grouped query (AD-1, AD-3)
- `supabase/tests/events_card_counts.test.sql` -- pgTAP: Organizer counts, holder scope (allow), other Role and Guest-only see nothing (deny), anon denied, 50 Events returned by one call, index exists
- `src/types/database.ts` -- regenerate with `supabase gen types`
- `src/modules/events/card-state.ts` -- `CardCounts` type, `loadCardCounts(supabase)` (one `rpc`, throws on error, returns `Map<eventId, CardCounts>`), `cardState(counts)` returning `{ urgent: "overdue"|"needYou"|null, atRisk }` -- the single home of the card rules
- `src/modules/events/card-state.test.ts` -- Vitest: matrix rows, 50 Events cause exactly one `rpc` call
- `app/events/page.tsx` -- load counts once; pass `counts` to each `EventCard`
- `app/events/event-card.tsx` -- circle, New badge, urgent or at-risk line, accessible name; no counts for draft, past or cancelled
- `messages/nb.json`, `messages/en.json` -- `events.card.*` keys (plural-aware)
- `e2e/events-list.spec.ts` -- card shows counts and accessible name for the Organizer; cancelled card shows none

**Acceptance Criteria:**
- Given *All events*, when it loads, then one `events_card_counts()` call returns counts for every visible Event and a test with 50 Events shows the call count stays one.
- Given a card with Tasks, when it renders, then the circle is Open, the badge is New, and the urgent or at-risk line follows the rules above; the link name includes name, date, role, open, overdue and new counts.
- Given a cancelled, past or draft Event, then no counts show.
- Given a viewer, then counts cover only Tasks RLS lets them read (pgTAP).
- Given a viewer with no Events, then the empty state is unchanged.

## Spec Change Log

## Review Triage Log

### 2026-11-06 — Review pass
- verdicts: 21 findings — high 0, medium 4, low 13, false 4, maybe-false 0 (blind 9, edge 5, verification gap 3, intent 4)
- findings:
  - `[low]` `reject` Circle shows "0 open" beside "1 overdue" for a lead or an Organizer who owns nothing (blind) — Story AC1 defines Open as the viewer's own open Tasks and urgent as the Dashboard *Needs you* set; the accessible name states both. A wider Open would contradict the AC.
  - `[low]` `reject` A failed count read breaks the whole page (blind) — the page already throws "Could not load events" on a failed events read; silent zero counts would be misleading, so the same error boundary applies.
  - `[low]` `reject` The `(event_id, owner_user_id)` index is unproven by EXPLAIN (blind) — the AC requires the index and pgTAP proves it exists; planner choice on a tiny table is not decidable here.
  - `[false]` `reject` "Under the viewer's RLS" is not demonstrated (blind) — `task_state` is `security_invoker` (`20261105140000_task_state_obsolete.sql`) and `tasks` RLS applies to the join; pgTAP proves the lead, plain holder and Guest-only scopes.
  - `[medium]` `patch` SQL branches untested: stale-unaccepted for managers, obsolete, dismissed (blind) — added two pgTAP cases with a stale Task of another owner (counts for the Organizer, not for a plain holder) plus an obsolete and a dismissed Task (counted for nobody); plan 13.
  - `[medium]` `patch` E2E covers only overdue and new (blind) — added an e2e test for the "N need you" and "N at risk" cards (see the verification-gap row).
  - `[low]` `reject` "Need you" shares the overdue tone and icon (blind) — one urgent line with one word per case is what UX-DR6 asks for; the word differs.
  - `[false]` `reject` New badge has no padding (blind) — `STATUSES.newItem.tone` includes `px-2 py-0.5`.
  - `[low]` `reject` SQL duplicates `classifyDashboard`, no ki-logg entry, spec untracked (blind) — the AC requires one grouped SQL query, so the rules cannot run in TS; the function comment names the source, and the choice is offered as a reflection entry. ki-logg and spec are added at finalization, outside the reviewed diff.
  - `[low]` `reject` Count failure blanks the page (edge) — same as the second row.
  - `[false]` `reject` rpc returns `data` null (edge) — the generated type is non-null and Supabase returns `[]` for an empty set.
  - `[false]` `reject` `overdue`, `blocked` or `stale_unaccepted` may be NULL (edge) — in `task_state` they are `is not null` expressions or `coalesce`d, never NULL; the owner flags are coalesced in the function.
  - `[low]` `reject` "0 open" with an urgent line (edge) — same as the first row.
  - `[low]` `reject` Undated published card name is untested (edge) — `filter(Boolean)` drops the missing date; the format is unchanged.
  - `[medium]` `patch` need-you and at-risk render branches unverified (verification gap) — e2e test "a card says 'need you' … 'at risk'" seeds an unaccepted and a waiting Task and asserts text and accessible name.
  - `[medium]` `patch` stale-unaccepted manager rule never exercised (verification gap) — covered by the new pgTAP case above.
  - `[low]` `reject` Page-level consequence of a throwing count read (verification gap, other findings) — same as the second row.
  - `[low]` `reject` Constant-query evidence is mocked (intent) — the AC accepts "a Vitest or SQL test"; the page has exactly one `rpc` call and pgTAP shows one call returns 50 rows.
  - `[low]` `reject` Open is owned-only while overdue is scope-wide (intent) — same as the first row.
  - `[low]` `defer` Decisions addressed to the viewer have no column (intent) — Decision Tasks are Target (Story 4.8+); listed in `deferred`.
  - `[low]` `reject` Holder and lead card views are tested in pgTAP only (intent) — AC4 asks for pgTAP; the Organizer card test covers the rendering.

## Design Notes

`task_state` carries no owner or status, so the function joins `tasks` on `id`; both are read under the viewer's RLS (`security invoker`). Lead is `role_members.is_lead` with `joined_at is not null` for `auth.uid()`.

## Verification

**Commands:**
- `supabase db reset && supabase test db` -- expected: all pgTAP files pass
- `pnpm lint && pnpm format:check && pnpm test && pnpm exec tsc --noEmit` -- expected: pass
- `pnpm test:e2e --workers=1; git checkout AGENTS.md` -- expected: pass

## Auto Run Result

Status: done. Summary: *All events* cards show state. `events_card_counts()` (invoker SQL, one grouped query, index `tasks (event_id, owner_user_id)`) feeds an Open circle, a New badge, an "N overdue" / "N need you" line or an "N at risk" line, and an accessible name with the counts. Draft, past and cancelled cards show none.

Files changed:
- `supabase/migrations/20261106120000_events_card_counts.sql` -- index and function.
- `supabase/tests/events_card_counts.test.sql` -- pgTAP (13): scopes, 50 Events in one call, stale, obsolete, dismissed, anon, invoker.
- `src/types/database.ts` -- regenerated.
- `src/modules/events/card-state.ts`, `card-state.test.ts` -- loader (one rpc), card rules, Vitest.
- `app/events/page.tsx`, `app/events/event-card.tsx`, `messages/nb.json`, `messages/en.json` -- rendering and text.
- `e2e/events-list.spec.ts` -- counts, need you, at risk, cancelled card.
- `docs/ki-logg.md` -- Story 5.5 entry.

Review: patches applied 4 (all medium: stale, obsolete and dismissed pgTAP; need-you and at-risk e2e); deferred 1 (decision count, Target); the rest rejected with the reasons above. Follow-up review recommended: false (patched mediums: 4, none high; the count of two or more mediums is tests only, no production change).

Verification: `supabase db reset`, `supabase test db` (28 files, PASS), `pnpm lint`, `pnpm format:check`, `pnpm test` (420), `pnpm exec tsc --noEmit` and `pnpm test:e2e --workers=1` (110) passed after the patches.

Residual risk: the SQL repeats the Dashboard section rules and can drift from `classifyDashboard`; a lead sees "0 open tasks" with an urgent line by the AC's definition of Open; decisions, Proposed Tasks and guest RSVP state are not built (Target, Epic 7).
