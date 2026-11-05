begin;
select plan(33);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stranger-b@example.test'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'lead-c@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'holder-d@example.test'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'holder-f@example.test');

insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at) values
  ('5a000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('5a000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now(), now());

insert into public.roles (id, event_id, key, active) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'venue', true),
  ('6a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000002', 'venue', true);

-- C leads Venue; D and F hold it
insert into public.role_members (id, event_id, role_id, user_id, name, joined_at, is_lead) values
  ('7a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now(), true),
  ('7a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', now(), false),
  ('7a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Finn', now(), false);
insert into public.role_member_contacts (role_member_id, event_id, email)
select m.id, m.event_id, u.email from public.role_members m join auth.users u on u.id = m.user_id;

-- 1 accept path; 2 role-owned; 3 dismissed; 4 obsolete; 5 done; 6 proposed; 7 cancelled Event;
-- 8 stale boundary exactly 48h; 9 already accepted; 10 re-delegated
insert into public.tasks (id, event_id, role_id, title, deadline, lifecycle, obsolete, status, owner_user_id, delegated_at) values
  ('8a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'One', current_date + 9, 'active', false, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now()),
  ('8a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Two', current_date + 9, 'active', false, 'not_started', null, null),
  ('8a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Dismissed', current_date + 9, 'dismissed', false, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now() - interval '3 days'),
  ('8a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Obsolete', current_date + 9, 'active', true, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now() - interval '3 days'),
  ('8a000000-0000-0000-0000-000000000005', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Done', current_date + 9, 'active', false, 'done', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now() - interval '3 days'),
  ('8a000000-0000-0000-0000-000000000006', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Proposed', current_date + 9, 'proposed', false, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now() - interval '3 days'),
  ('8a000000-0000-0000-0000-000000000007', '5a000000-0000-0000-0000-000000000002', '6a000000-0000-0000-0000-000000000004', 'Cancelled', current_date + 9, 'active', false, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now()),
  ('8a000000-0000-0000-0000-000000000008', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Boundary', current_date + 9, 'active', false, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now() - interval '48 hours'),
  ('8a000000-0000-0000-0000-000000000009', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Accepted', current_date + 9, 'active', false, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now() - interval '3 days'),
  ('8a000000-0000-0000-0000-000000000010', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Moved', current_date + 9, 'active', false, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now() - interval '3 days');
insert into public.tasks (id, event_id, role_id, title, deadline, owner_user_id, delegated_at) values
  ('8a000000-0000-0000-0000-000000000011', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Gate', current_date + 9, 'dddddddd-dddd-dddd-dddd-dddddddddddd', now());
update public.tasks set accepted_at = now() where id = '8a000000-0000-0000-0000-000000000009';

-- Attributes and grants
select ok((select prosecdef and proconfig @> array['search_path=""'] from pg_proc
  where oid = 'public.tasks_accept(uuid, timestamptz)'::regprocedure), 'tasks_accept is security definer with an empty search_path');
select ok(has_function_privilege('authenticated', 'public.tasks_accept(uuid, timestamptz)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.tasks_accept(uuid, timestamptz)', 'EXECUTE'),
  'tasks_accept is granted to authenticated only');

-- 48-hour rule, read as the table owner so the view sees every row
select is((select stale_unaccepted from public.task_state where id = '8a000000-0000-0000-0000-000000000001'), false, 'a fresh delegation is not stale');
select is((select stale_unaccepted from public.task_state where id = '8a000000-0000-0000-0000-000000000008'), false, 'exactly 48 hours is not stale');
update public.tasks set delegated_at = now() - interval '48 hours 1 second' where id = '8a000000-0000-0000-0000-000000000008';
select is((select stale_unaccepted from public.task_state where id = '8a000000-0000-0000-0000-000000000008'), true, '48 hours and a second is stale');
select is((select stale_unaccepted from public.task_state where id = '8a000000-0000-0000-0000-000000000003'), false, 'a dismissed Task is never stale');
select is((select stale_unaccepted from public.task_state where id = '8a000000-0000-0000-0000-000000000004'), false, 'an obsolete Task is never stale');
select is((select stale_unaccepted from public.task_state where id = '8a000000-0000-0000-0000-000000000005'), false, 'a done Task is never stale');
select is((select stale_unaccepted from public.task_state where id = '8a000000-0000-0000-0000-000000000009'), false, 'an accepted Task is never stale');
select is((select stale_unaccepted from public.task_state where id = '8a000000-0000-0000-0000-000000000002'), false, 'a Role-owned Task is never stale');
select results_eq(
  $$select id::text, accepted from public.task_state where id in ('8a000000-0000-0000-0000-000000000001', '8a000000-0000-0000-0000-000000000009', '8a000000-0000-0000-0000-000000000002') order by id$$,
  $$values ('8a000000-0000-0000-0000-000000000001', false), ('8a000000-0000-0000-0000-000000000002', false), ('8a000000-0000-0000-0000-000000000009', true)$$,
  'accepted follows owner and accepted_at');

-- Denied callers
set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select throws_ok($$select public.tasks_accept('8a000000-0000-0000-0000-000000000001',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'))$$,
  '42501', null, 'the lead cannot accept for the owner');
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select throws_ok($$select public.tasks_accept('8a000000-0000-0000-0000-000000000001',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'))$$,
  '42501', null, 'the Organizer cannot accept for the owner');
select throws_ok($$select public.tasks_accept('8a000000-0000-0000-0000-000000000002',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'))$$,
  '42501', null, 'nobody can accept a Role-owned Task');
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok($$select public.tasks_accept('8a000000-0000-0000-0000-000000000001', now())$$,
  '42501', null, 'a stranger cannot accept');
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select throws_ok($$select public.tasks_accept('8a000000-0000-0000-0000-000000000001',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'))$$,
  '42501', null, 'another holder of the Role cannot accept');

-- The owner
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select throws_ok($$select public.tasks_accept('8a000000-0000-0000-0000-000000000001', now() - interval '1 day')$$,
  '40001', null, 'a stale updated_at is refused');
select lives_ok($$select public.tasks_accept('8a000000-0000-0000-0000-000000000001',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'))$$,
  'the owner accepts');
select is((select accepted_at is not null from public.tasks where id = '8a000000-0000-0000-0000-000000000001'), true, 'accepted_at is set');
select results_eq(
  $$select from_user, to_user, by_user, kind from public.task_assignment_log where task_id = '8a000000-0000-0000-0000-000000000001'$$,
  $$values (null::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'accepted')$$,
  'one accepted row is logged');
select is(
  public.tasks_accept('8a000000-0000-0000-0000-000000000001', now() - interval '1 day'),
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'),
  'a repeat returns the current updated_at even with a stale expected');
select is((select count(*) from public.task_assignment_log where task_id = '8a000000-0000-0000-0000-000000000001'), 1::bigint,
  'the repeat writes no second row');

-- accept_first (tasks_set_status, 55007) is lifted by accepting
select throws_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000011',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000011'), 'in_progress')$$,
  '55007', null, 'the owner cannot set a status before accepting');
select public.tasks_accept('8a000000-0000-0000-0000-000000000011',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000011'));
select lives_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000011',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000011'), 'in_progress')$$,
  'the owner can set a status after accepting');

-- Task states and read-only Events
select throws_ok($$select public.tasks_accept('8a000000-0000-0000-0000-000000000003',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000003'))$$,
  '22023', null, 'a dismissed Task is refused');
select throws_ok($$select public.tasks_accept('8a000000-0000-0000-0000-000000000004',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000004'))$$,
  '22023', null, 'an obsolete Task is refused');
select throws_ok($$select public.tasks_accept('8a000000-0000-0000-0000-000000000005',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000005'))$$,
  '22023', null, 'a done Task is refused');
select throws_ok($$select public.tasks_accept('8a000000-0000-0000-0000-000000000006',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000006'))$$,
  '22023', null, 'a proposed Task is refused');
select throws_ok($$select public.tasks_accept('8a000000-0000-0000-0000-000000000007',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000007'))$$,
  '55000', null, 'a cancelled Event is read-only');

-- Re-delegation: the former owner loses the right and the clock restarts
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select lives_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000010', 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000010'))$$,
  'the lead moves a Task that was delegated three days ago');
select is((select delegated_at > now() - interval '1 minute' and accepted_at is null from public.tasks where id = '8a000000-0000-0000-0000-000000000010'),
  true, 'the clock restarted and acceptance was reset');
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select throws_ok($$select public.tasks_accept('8a000000-0000-0000-0000-000000000010',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000010'))$$,
  '42501', null, 'the former owner cannot accept after re-delegation');
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select lives_ok($$select public.tasks_accept('8a000000-0000-0000-0000-000000000010',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000010'))$$,
  'the new owner accepts');

select * from finish();
rollback;
