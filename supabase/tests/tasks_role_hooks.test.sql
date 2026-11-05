begin;
select plan(50);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'holder-c@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'pending-d@example.test'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'lead-f@example.test'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'draft-e@example.test');

-- Live (1), draft (2), cancelled (3)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at) values
  ('5b000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('5b000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Draft',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', null, null),
  ('5b000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now(), now());

insert into public.roles (id, event_id, key, active) values
  ('6b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'venue', true),
  ('6b000000-0000-0000-0000-000000000002', '5b000000-0000-0000-0000-000000000001', 'guests', true),
  ('6b000000-0000-0000-0000-000000000003', '5b000000-0000-0000-0000-000000000001', 'program', true),
  ('6b000000-0000-0000-0000-000000000004', '5b000000-0000-0000-0000-000000000002', 'venue', true),
  ('6b000000-0000-0000-0000-000000000005', '5b000000-0000-0000-0000-000000000003', 'venue', true);

-- Venue: F leads, C holds, D pending. Guests: D and the Organizer A hold. Draft venue: E. Cancelled venue: C.
insert into public.role_members (id, event_id, role_id, user_id, name, joined_at, is_lead) values
  ('7b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Finn', now(), true),
  ('7b000000-0000-0000-0000-000000000002', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now(), false),
  ('7b000000-0000-0000-0000-000000000003', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', null, false),
  ('7b000000-0000-0000-0000-000000000004', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', null, false),
  ('7b000000-0000-0000-0000-000000000005', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Alma', now(), false),
  ('7b000000-0000-0000-0000-000000000006', '5b000000-0000-0000-0000-000000000002', '6b000000-0000-0000-0000-000000000004', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Eli', now(), false),
  ('7b000000-0000-0000-0000-000000000007', '5b000000-0000-0000-0000-000000000003', '6b000000-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now(), false),
  ('7b000000-0000-0000-0000-000000000008', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now(), false);
insert into public.role_member_contacts (role_member_id, event_id, email)
select m.id, m.event_id, u.email from public.role_members m join auth.users u on u.id = m.user_id;

-- Venue: 1 and 7 move; 2 done, 3 obsolete, 4 dismissed, 5 proposed stay unowned; 6 owned by the previous lead;
-- 10 is D's finished Task, 13 is the Organizer's. Guests: 8 owned by D, 9 unowned. Program: 11 owned by D.
insert into public.tasks (id, event_id, role_id, title, deadline, lifecycle, obsolete, status, owner_user_id, delegated_at, accepted_at) values
  ('8b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'One', current_date + 9, 'active', false, 'not_started', null, null, null),
  ('8b000000-0000-0000-0000-000000000002', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Done', current_date + 9, 'active', false, 'done', null, null, null),
  ('8b000000-0000-0000-0000-000000000003', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Obsolete', current_date + 9, 'active', true, 'not_started', null, null, null),
  ('8b000000-0000-0000-0000-000000000004', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Dismissed', current_date + 9, 'dismissed', false, 'not_started', null, null, null),
  ('8b000000-0000-0000-0000-000000000005', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Proposed', current_date + 9, 'proposed', false, 'not_started', null, null, null),
  ('8b000000-0000-0000-0000-000000000006', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Former lead', current_date + 9, 'active', false, 'not_started', 'ffffffff-ffff-ffff-ffff-ffffffffffff', now() - interval '3 days', null),
  ('8b000000-0000-0000-0000-000000000007', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Seven', current_date + 9, 'active', false, 'in_progress', null, null, null),
  ('8b000000-0000-0000-0000-000000000008', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000002', 'Guests D', current_date + 9, 'active', false, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now(), null),
  ('8b000000-0000-0000-0000-000000000009', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000002', 'Guests open', current_date + 9, 'active', false, 'not_started', null, null, null),
  ('8b000000-0000-0000-0000-000000000010', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'D done', current_date + 9, 'active', false, 'done', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now(), now()),
  ('8b000000-0000-0000-0000-000000000011', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000003', 'Program D', current_date + 9, 'active', false, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now(), null),
  ('8b000000-0000-0000-0000-000000000013', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Organizer', current_date + 9, 'active', false, 'not_started', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now(), null),
  ('8b000000-0000-0000-0000-000000000015', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000002', 'Organizer guests', current_date + 9, 'active', false, 'not_started', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now(), now()),
  ('8b000000-0000-0000-0000-000000000020', '5b000000-0000-0000-0000-000000000002', '6b000000-0000-0000-0000-000000000004', 'Draft', current_date + 9, 'active', false, 'not_started', null, null, null);

-- The outbox is a no-op stub until Story 3.1; record its calls for this test only (rolled back).
create table public.emit_probe (event_id uuid, kind text, subject uuid, recipients public.recipient_spec[]);
create or replace function public.notifications_emit(p_event_id uuid, p_kind text, p_subject_ref uuid, p_recipients public.recipient_spec[])
returns void language sql security definer set search_path = ''
as $$ insert into public.emit_probe values (p_event_id, p_kind, p_subject_ref, p_recipients) $$;

create temp view owners as select id, owner_user_id, delegated_at, accepted_at from public.tasks;
create temp view log_rows as select task_id, from_user, to_user, by_user, kind from public.task_assignment_log;
grant select on owners, log_rows, public.emit_probe to authenticated;

-- Attributes and grants
select ok((select bool_and(prosecdef and proconfig @> array['search_path=""']) from pg_proc
  where oid in ('public.tasks_assign_role_owned_to_lead(uuid)'::regprocedure, 'public.tasks_release_owner(uuid, uuid)'::regprocedure)),
  'both hooks are security definer with an empty search_path');
select ok(not has_function_privilege('authenticated', 'public.tasks_assign_role_owned_to_lead(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.tasks_assign_role_owned_to_lead(uuid)', 'EXECUTE')
  and not has_function_privilege('public', 'public.tasks_assign_role_owned_to_lead(uuid)', 'EXECUTE'),
  'tasks_assign_role_owned_to_lead is not executable by clients');
select ok(not has_function_privilege('authenticated', 'public.tasks_release_owner(uuid, uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.tasks_release_owner(uuid, uuid)', 'EXECUTE')
  and not has_function_privilege('public', 'public.tasks_release_owner(uuid, uuid)', 'EXECUTE'),
  'tasks_release_owner is not executable by clients');
select ok(has_function_privilege('authenticated', 'public.events_set_role_lead(uuid, uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.events_revoke_role(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.events_set_role_lead(uuid, uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.events_revoke_role(uuid)', 'EXECUTE'),
  'the two events functions keep their grants');

set local role authenticated;

-- Non-Organizer and direct hook calls are denied
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select throws_ok($$select public.events_set_role_lead('6b000000-0000-0000-0000-000000000001', '7b000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'a holder cannot set the lead');
select throws_ok($$select public.events_revoke_role('7b000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'a holder cannot revoke');
select throws_ok($$select public.tasks_assign_role_owned_to_lead('6b000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'authenticated cannot call the assign hook');
select throws_ok($$select public.tasks_release_owner('6b000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd')$$,
  '42501', null, 'authenticated cannot call the release hook');
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select throws_ok($$select public.events_set_role_lead('6b000000-0000-0000-0000-000000000001', '7b000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'the lead cannot set the lead');
select throws_ok($$select public.events_revoke_role('7b000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'the lead cannot revoke');

-- New lead C: only the open Role-owned Tasks move
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$select public.events_set_role_lead('6b000000-0000-0000-0000-000000000001', '7b000000-0000-0000-0000-000000000002')$$,
  'the Organizer makes C lead');
select results_eq(
  $$select id::text from owners where owner_user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' order by id$$,
  $$values ('8b000000-0000-0000-0000-000000000001'), ('8b000000-0000-0000-0000-000000000007')$$,
  'the two open Role-owned Tasks go to the lead');
select results_eq(
  $$select id::text from owners where owner_user_id is null and id in ('8b000000-0000-0000-0000-000000000002', '8b000000-0000-0000-0000-000000000003', '8b000000-0000-0000-0000-000000000004', '8b000000-0000-0000-0000-000000000005', '8b000000-0000-0000-0000-000000000009') order by id$$,
  $$values ('8b000000-0000-0000-0000-000000000002'), ('8b000000-0000-0000-0000-000000000003'), ('8b000000-0000-0000-0000-000000000004'), ('8b000000-0000-0000-0000-000000000005'), ('8b000000-0000-0000-0000-000000000009')$$,
  'done, obsolete, dismissed, proposed and other-Role Tasks stay unowned');
select is((select owner_user_id from owners where id = '8b000000-0000-0000-0000-000000000006'), 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid,
  'the previous lead keeps their own Task');
select is((select count(*) from owners where id in ('8b000000-0000-0000-0000-000000000001', '8b000000-0000-0000-0000-000000000007')
  and accepted_at is null and delegated_at > now() - interval '1 minute'), 2::bigint,
  'moved Tasks are unaccepted with a fresh delegated_at');
select results_eq(
  $$select task_id::text, from_user, to_user, by_user, kind from log_rows where task_id in ('8b000000-0000-0000-0000-000000000001', '8b000000-0000-0000-0000-000000000007') order by task_id$$,
  $$values ('8b000000-0000-0000-0000-000000000001', null::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'delegated'),
    ('8b000000-0000-0000-0000-000000000007', null::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'delegated')$$,
  'each moved Task gets one delegated row');
select results_eq(
  $$select kind, subject::text, recipients::text from public.emit_probe$$,
  $$values ('task_assigned', '6b000000-0000-0000-0000-000000000001', '{"(user,cccccccc-cccc-cccc-cccc-cccccccccccc)"}')$$,
  'exactly one task_assigned goes to the lead with the Role as subject');

-- Repeat and clear move nothing and emit nothing
reset role;
insert into public.tasks (id, event_id, role_id, title, deadline) values
  ('8b000000-0000-0000-0000-000000000014', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Late', current_date + 9);
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$select public.events_set_role_lead('6b000000-0000-0000-0000-000000000001', '7b000000-0000-0000-0000-000000000002')$$,
  'setting the same lead again is fine');
select is((select owner_user_id from owners where id = '8b000000-0000-0000-0000-000000000014'), null, 'a repeat moves nothing');
select lives_ok($$select public.events_set_role_lead('6b000000-0000-0000-0000-000000000001', null)$$, 'the Organizer clears the lead');
select is((select owner_user_id from owners where id = '8b000000-0000-0000-0000-000000000014'), null, 'a clear moves nothing');
select is((select count(*) from public.emit_probe), 1::bigint, 'a repeat and a clear emit nothing');

-- A pending invitee becomes lead and receives the Tasks; C keeps theirs
select lives_ok($$select public.events_set_role_lead('6b000000-0000-0000-0000-000000000001', '7b000000-0000-0000-0000-000000000003')$$,
  'the Organizer makes pending D lead');
select is((select owner_user_id from owners where id = '8b000000-0000-0000-0000-000000000014'), 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
  'a pending lead receives the unowned Task');
select is((select owner_user_id from owners where id = '8b000000-0000-0000-0000-000000000001'), 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  'the replaced lead keeps their Tasks');
select results_eq(
  $$select kind, subject::text, recipients::text from public.emit_probe where recipients::text like '%dddddddd%'$$,
  $$values ('task_assigned', '6b000000-0000-0000-0000-000000000001', '{"(user,dddddddd-dddd-dddd-dddd-dddddddddddd)"}')$$,
  'the pending lead gets exactly one task_assigned for the Role');

-- Draft Event: Tasks move, no notification
select lives_ok($$select public.events_set_role_lead('6b000000-0000-0000-0000-000000000004', '7b000000-0000-0000-0000-000000000006')$$,
  'a lead is set on a draft Event');
select is((select owner_user_id from owners where id = '8b000000-0000-0000-0000-000000000020'), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
  'the draft Task moved');
select is((select count(*) from public.emit_probe), 2::bigint, 'a draft Event emits nothing');

-- Published Event, Role with no open Role-owned Task: the lead is set, nothing moves, nothing is emitted
select lives_ok($$select public.events_set_role_lead('6b000000-0000-0000-0000-000000000003', '7b000000-0000-0000-0000-000000000008')$$,
  'a lead is set on a Role with nothing to move');
select is((select count(*) from public.emit_probe), 2::bigint, 'zero moved Tasks emit nothing');
select is((select count(*) from log_rows where kind = 'delegated'), 4::bigint, 'zero moved Tasks log nothing');

-- Read-only Event
select throws_ok($$select public.events_set_role_lead('6b000000-0000-0000-0000-000000000005', '7b000000-0000-0000-0000-000000000007')$$,
  '55000', null, 'set lead refuses a cancelled Event');
select throws_ok($$select public.events_revoke_role('7b000000-0000-0000-0000-000000000007')$$,
  '55000', null, 'revoke refuses a cancelled Event');

-- Revoke the Organizer's own Guests row: their Tasks stay
select lives_ok($$select public.events_revoke_role('7b000000-0000-0000-0000-000000000005')$$, 'the Organizer revokes their own Role row');
select is((select owner_user_id from owners where id = '8b000000-0000-0000-0000-000000000013'), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'the Organizer keeps their Task');
select results_eq(
  $$select owner_user_id is null, delegated_at is null, accepted_at is null from owners where id = '8b000000-0000-0000-0000-000000000015'$$,
  $$values (true, true, true)$$, 'the Organizer''s Task in the revoked Role is released');
select is((select count(*) from log_rows where kind = 'released' and from_user = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 1::bigint,
  'one released row for the Organizer');

-- Revoke D (lead of Venue, still on Guests): Venue Tasks go, Guests and Program Tasks stay
select lives_ok($$select public.events_revoke_role('7b000000-0000-0000-0000-000000000003')$$, 'the Organizer revokes D from Venue');
select is((select count(*) from public.role_members where role_id = '6b000000-0000-0000-0000-000000000001' and is_lead), 0::bigint,
  'the lead flag went with the row');
select results_eq(
  $$select id::text, owner_user_id is null, delegated_at is null, accepted_at is null from owners where id in ('8b000000-0000-0000-0000-000000000010', '8b000000-0000-0000-0000-000000000014') order by id$$,
  $$values ('8b000000-0000-0000-0000-000000000010', true, true, true), ('8b000000-0000-0000-0000-000000000014', true, true, true)$$,
  'D''s Venue Tasks, a done one included, are released');
select results_eq(
  $$select task_id::text, from_user, to_user, by_user from log_rows where kind = 'released' and from_user = 'dddddddd-dddd-dddd-dddd-dddddddddddd' order by task_id$$,
  $$values ('8b000000-0000-0000-0000-000000000010', 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, null::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
    ('8b000000-0000-0000-0000-000000000014', 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, null::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid)$$,
  'one released row per Task');
select is((select count(*) from owners where owner_user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 2::bigint,
  'D keeps the Tasks of the Role they still hold and of a Role without membership');

-- Revoke D's last Role: everything in the Event is released
select lives_ok($$select public.events_revoke_role('7b000000-0000-0000-0000-000000000004')$$, 'the Organizer revokes D from Guests');
select is((select count(*) from owners where owner_user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 0::bigint,
  'D owns no Task of the Event any more');
select is((select count(*) from log_rows where kind = 'released' and from_user = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 4::bigint,
  'four released rows in all');

-- The former holder reads nothing and writes nothing
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select is((select count(*) from public.tasks where event_id = '5b000000-0000-0000-0000-000000000001'), 0::bigint,
  'the former holder reads no Task of the Event');
select throws_ok($$select public.tasks_accept('8b000000-0000-0000-0000-000000000010', now())$$, '42501', null, 'accept is denied');
select throws_ok($$select public.tasks_delegate('8b000000-0000-0000-0000-000000000010', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now())$$,
  '42501', null, 'delegate is denied');
select throws_ok($$select public.tasks_set_status('8b000000-0000-0000-0000-000000000011', now(), 'in_progress')$$,
  '42501', null, 'set status is denied on a Task they owned in another Role');

select * from finish();
rollback;
