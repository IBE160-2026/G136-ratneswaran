begin;
select plan(100);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stranger-b@example.test'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'lead-c@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'holder-d@example.test'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'lead-e@example.test'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'owner-f@example.test');

-- Live (1), cancelled (2)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at) values
  ('5a000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('5a000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now(), now());

-- 1 venue, 2 guests, 3 program (inactive) on the live Event; 4 venue on the cancelled one
insert into public.roles (id, event_id, key, active) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'venue', true),
  ('6a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'guests', true),
  ('6a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', 'program', false),
  ('6a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000002', 'venue', true);

-- C leads Venue, D and F hold it, E leads Guests
insert into public.role_members (id, event_id, role_id, user_id, name, joined_at, is_lead) values
  ('7a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now(), true),
  ('7a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', now(), false),
  ('7a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Eli', now(), true),
  ('7a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Finn', now(), false);
insert into public.role_member_contacts (role_member_id, event_id, email)
select m.id, m.event_id, u.email from public.role_members m join auth.users u on u.id = m.user_id;

-- 01 parent, 02 parent owned by F, 03 and 04 plain Venue Tasks, 05 Guests Task, 06 dismissed Venue Task,
-- 07 Task in the cancelled Event, 08 Program Task (inactive Role)
insert into public.tasks (id, event_id, role_id, title, deadline, lifecycle, owner_user_id) values
  ('9a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Parent', current_date + 10, 'active', null),
  ('9a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Owned parent', current_date + 10, 'active', 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
  ('9a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Plain Q', current_date + 10, 'active', null),
  ('9a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Plain R', current_date + 20, 'active', null),
  ('9a000000-0000-0000-0000-000000000005', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002', 'Guests task', current_date + 10, 'active', null),
  ('9a000000-0000-0000-0000-000000000006', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Dismissed', current_date + 10, 'dismissed', null),
  ('9a000000-0000-0000-0000-000000000007', '5a000000-0000-0000-0000-000000000002', '6a000000-0000-0000-0000-000000000004', 'Cancelled event task', current_date + 10, 'active', null),
  ('9a000000-0000-0000-0000-000000000008', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000003', 'Program task', current_date + 10, 'active', null);

-- Attributes and grants
select ok(
  (select bool_and(prosecdef and proconfig @> array['search_path=""']) from pg_proc
   where oid in ('public.tasks_create(uuid, uuid, text, text, date, integer, uuid)'::regprocedure,
                 'public.tasks_promote_subtask(uuid, timestamptz)'::regprocedure,
                 'public.tasks_move_to_role(uuid, timestamptz, uuid)'::regprocedure,
                 'public.tasks_add_dependency(uuid, uuid)'::regprocedure,
                 'public.tasks_remove_dependency(uuid, uuid)'::regprocedure)),
  'the five mutation functions are security definer with an empty search_path');
select ok(
  has_function_privilege('authenticated', 'public.tasks_create(uuid, uuid, text, text, date, integer, uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.tasks_promote_subtask(uuid, timestamptz)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.tasks_move_to_role(uuid, timestamptz, uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.tasks_add_dependency(uuid, uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.tasks_remove_dependency(uuid, uuid)', 'EXECUTE'),
  'authenticated can execute the five mutation functions');
select ok(
  not has_function_privilege('anon', 'public.tasks_create(uuid, uuid, text, text, date, integer, uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.tasks_promote_subtask(uuid, timestamptz)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.tasks_move_to_role(uuid, timestamptz, uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.tasks_add_dependency(uuid, uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.tasks_remove_dependency(uuid, uuid)', 'EXECUTE'),
  'anon cannot execute any of them');
select ok(not has_function_privilege('authenticated', 'public.tasks_may_link(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.tasks_check_parent()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.tasks_check_dependency()', 'EXECUTE'),
  'authenticated cannot execute the helper and trigger functions');
select is((select count(*) from pg_proc where proname = 'tasks_create'), 1::bigint,
  'the old tasks_create signature is gone');

-- Triggers and CHECKs, as postgres
select lives_ok($$insert into public.tasks (id, event_id, role_id, title, deadline, parent_task_id) values
  ('9b000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Sub 1', current_date + 5, '9a000000-0000-0000-0000-000000000001')$$,
  'a Subtask under an active parent in the same Role is accepted');
select throws_ok($$insert into public.tasks (event_id, role_id, title, deadline, parent_task_id) values
  ('5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Nested', current_date + 5, '9b000000-0000-0000-0000-000000000001')$$,
  '23514', 'one_level_only', 'a Subtask of a Subtask is rejected');
select throws_ok($$insert into public.tasks (event_id, role_id, title, deadline, parent_task_id) values
  ('5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002', 'Wrong role', current_date + 5, '9a000000-0000-0000-0000-000000000001')$$,
  '23514', 'parent_must_share_role', 'a parent in another Role is rejected');
select throws_ok($$insert into public.tasks (event_id, role_id, title, deadline, parent_task_id) values
  ('5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Under dismissed', current_date + 5, '9a000000-0000-0000-0000-000000000006')$$,
  '23514', 'parent_not_active', 'a dismissed parent is rejected');
select throws_ok($$update public.tasks set parent_task_id = '9a000000-0000-0000-0000-000000000003' where id = '9a000000-0000-0000-0000-000000000001'$$,
  '23514', 'has_subtasks', 'a Task with Subtasks cannot become a Subtask');
select lives_ok($$update public.tasks set parent_task_id = '9a000000-0000-0000-0000-000000000001' where id = '9a000000-0000-0000-0000-000000000003'$$,
  'a plain Task can become a Subtask');
select lives_ok($$update public.tasks set parent_task_id = null where id = '9a000000-0000-0000-0000-000000000003'$$,
  'and be cleared again');
select throws_ok($$update public.tasks set parent_task_id = id where id = '9a000000-0000-0000-0000-000000000003'$$,
  '23514', null, 'a Task cannot be its own parent');

select throws_ok($$insert into public.task_dependencies values ('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000003')$$,
  '23514', null, 'a self dependency is rejected');
select throws_ok($$insert into public.task_dependencies values ('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000005')$$,
  '23514', 'dependency_must_share_role', 'a dependency across Roles is rejected');
select throws_ok($$insert into public.task_dependencies values ('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000006')$$,
  '23514', 'dependency_needs_active_tasks', 'a dependency on a dismissed Task is rejected');
select throws_ok($$insert into public.task_dependencies values ('9a000000-0000-0000-0000-000000000006', '9a000000-0000-0000-0000-000000000003')$$,
  '23514', 'dependency_needs_active_tasks', 'a dismissed Task cannot depend on anything');
select lives_ok($$insert into public.task_dependencies values ('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000004')$$,
  'Q waits for R');
select throws_ok($$insert into public.task_dependencies values ('9a000000-0000-0000-0000-000000000004', '9a000000-0000-0000-0000-000000000003')$$,
  '23514', 'dependency_cycle', 'R waiting for Q is a cycle');
select lives_ok($$insert into public.task_dependencies values ('9a000000-0000-0000-0000-000000000004', '9a000000-0000-0000-0000-000000000001')$$,
  'R waits for the parent');
select throws_ok($$insert into public.task_dependencies values ('9a000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-000000000003')$$,
  '23514', 'dependency_cycle', 'a longer cycle is rejected too');
delete from public.task_dependencies;

-- RLS on task_dependencies
insert into public.task_dependencies values
  ('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000004');
set local role authenticated;
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select is((select count(*) from public.task_dependencies), 1::bigint, 'a holder of the Role sees its dependency rows');
select throws_ok($$insert into public.task_dependencies values ('9a000000-0000-0000-0000-000000000004', '9a000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'a direct insert is denied');
select throws_ok($$delete from public.task_dependencies$$, '42501', null, 'a direct delete is denied');
select throws_ok($$update public.tasks set parent_task_id = '9a000000-0000-0000-0000-000000000001' where id = '9a000000-0000-0000-0000-000000000003'$$,
  '42501', null, 'a direct write of parent_task_id is denied');
set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select is((select count(*) from public.task_dependencies), 0::bigint, 'a holder of another Role sees none');
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is((select count(*) from public.task_dependencies), 0::bigint, 'a stranger sees none');
reset role;
delete from public.task_dependencies;
delete from public.tasks where id = '9b000000-0000-0000-0000-000000000001';

-- tasks_create with a parent
set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select lives_ok($$select public.tasks_create('9b000000-0000-0000-0000-000000000011', '6a000000-0000-0000-0000-000000000001', 'Sub A', null, current_date + 3, null, '9a000000-0000-0000-0000-000000000001')$$,
  'the lead adds a Subtask');
select results_eq(
  $$select parent_task_id, role_id, event_id, lifecycle from public.tasks where id = '9b000000-0000-0000-0000-000000000011'$$,
  $$values ('9a000000-0000-0000-0000-000000000001'::uuid, '6a000000-0000-0000-0000-000000000001'::uuid,
    '5a000000-0000-0000-0000-000000000001'::uuid, 'active')$$,
  'the Subtask is active and has the parent and its Role');
select lives_ok($$select public.tasks_create('9b000000-0000-0000-0000-000000000012', null, 'Sub B', null, null, 7, '9a000000-0000-0000-0000-000000000001')$$,
  'the Role may be left out; it comes from the parent');
select is((select role_id from public.tasks where id = '9b000000-0000-0000-0000-000000000012'), '6a000000-0000-0000-0000-000000000001'::uuid,
  'and the Subtask has the parent''s Role');
select lives_ok($$select public.tasks_create('9b000000-0000-0000-0000-000000000011', '6a000000-0000-0000-0000-000000000001', 'Again', null, current_date + 9, null, '9a000000-0000-0000-0000-000000000001')$$,
  'a repeat call raises nothing');
select is((select count(*) from public.tasks where id = '9b000000-0000-0000-0000-000000000011' and title = 'Sub A'), 1::bigint,
  'a repeat call creates nothing');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'x', null, current_date, null, '9b000000-0000-0000-0000-000000000011')$$,
  '23514', 'one_level_only', 'a Subtask of a Subtask is rejected');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'x', null, current_date, null, '9a000000-0000-0000-0000-000000000006')$$,
  '23514', 'parent_not_active', 'a dismissed parent is rejected');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000002', 'x', null, current_date, null, '9a000000-0000-0000-0000-000000000001')$$,
  '23514', 'parent_must_share_role', 'a Role other than the parent''s is rejected');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'x', null, current_date, null, '9a000000-0000-0000-0000-000000000007')$$,
  '42501', null, 'a parent in another Event looks like one the caller may not use');

set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select lives_ok($$select public.tasks_create('9b000000-0000-0000-0000-000000000013', '6a000000-0000-0000-0000-000000000001', 'Owner sub', null, current_date + 3, null, '9a000000-0000-0000-0000-000000000002')$$,
  'the holder who owns the parent adds a Subtask');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'x', null, current_date, null, '9a000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'a holder who does not own the parent is denied');
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'x', null, current_date, null, '9a000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'another holder is denied');
set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'x', null, current_date, null, '9a000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'the lead of another Role is denied');
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$select public.tasks_create('9b000000-0000-0000-0000-000000000014', '6a000000-0000-0000-0000-000000000001', 'Organizer sub', null, current_date + 3, null, '9a000000-0000-0000-0000-000000000001')$$,
  'the Organizer adds a Subtask');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000004', 'x', null, current_date, null, '9a000000-0000-0000-0000-000000000007')$$,
  '55000', null, 'a cancelled Event is refused');
select lives_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'Plain', null, current_date + 3)$$,
  'without a parent the Story 4.2 rules still hold');
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'x', null, current_date)$$,
  '42501', null, 'and a holder who is not the lead still cannot create a top-level Task');

-- tasks_promote_subtask
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select throws_ok($$select public.tasks_promote_subtask('9b000000-0000-0000-0000-000000000011', now() - interval '1 day')$$,
  '40001', null, 'a stale expected is refused');
select lives_ok($$select public.tasks_promote_subtask('9b000000-0000-0000-0000-000000000011', (select updated_at from public.tasks where id = '9b000000-0000-0000-0000-000000000011'))$$,
  'the lead promotes a Subtask');
select is((select parent_task_id from public.tasks where id = '9b000000-0000-0000-0000-000000000011'), null::uuid,
  'it is a top-level Task');
select lives_ok($$select public.tasks_promote_subtask('9b000000-0000-0000-0000-000000000011', now() - interval '1 day')$$,
  'a repeat is a no-op, even with a stale expected');
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select throws_ok($$select public.tasks_promote_subtask('9b000000-0000-0000-0000-000000000013', (select updated_at from public.tasks where id = '9b000000-0000-0000-0000-000000000013'))$$,
  '42501', null, 'the owner who is not the lead cannot promote');
set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select throws_ok($$select public.tasks_promote_subtask('9b000000-0000-0000-0000-000000000012', now())$$,
  '42501', null, 'the lead of another Role cannot promote');

-- tasks_add_dependency and tasks_remove_dependency
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select lives_ok($$select public.tasks_add_dependency('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000004')$$,
  'the lead adds a dependency');
select lives_ok($$select public.tasks_add_dependency('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000004')$$,
  'a repeat add raises nothing');
select is((select count(*) from public.task_dependencies), 1::bigint, 'a repeat add writes no second row');
select throws_ok($$select public.tasks_add_dependency('9a000000-0000-0000-0000-000000000004', '9a000000-0000-0000-0000-000000000003')$$,
  '23514', 'dependency_cycle', 'a cycle is rejected through the function');
select throws_ok($$select public.tasks_add_dependency('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000005')$$,
  '23514', null, 'a dependency across Roles is rejected through the function');
select throws_ok($$select public.tasks_add_dependency('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000006')$$,
  '23514', null, 'a dependency on a dismissed Task is rejected through the function');
select throws_ok($$select public.tasks_add_dependency('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000003')$$,
  '23514', null, 'a self dependency is rejected through the function');
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select throws_ok($$select public.tasks_add_dependency('9a000000-0000-0000-0000-000000000004', '9a000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'a holder who does not own the Task is denied');
select throws_ok($$select public.tasks_remove_dependency('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000004')$$,
  '42501', null, 'and cannot remove one either');
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select lives_ok($$select public.tasks_add_dependency('9a000000-0000-0000-0000-000000000002', '9a000000-0000-0000-0000-000000000001')$$,
  'the holder who owns the Task adds a dependency');
select lives_ok($$select public.tasks_remove_dependency('9a000000-0000-0000-0000-000000000002', '9a000000-0000-0000-0000-000000000001')$$,
  'and removes it');
set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select throws_ok($$select public.tasks_add_dependency('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'the lead of another Role is denied');
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$select public.tasks_remove_dependency('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000004')$$,
  'the Organizer removes a dependency');
select lives_ok($$select public.tasks_remove_dependency('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000004')$$,
  'a repeat remove is a no-op');
select is((select count(*) from public.task_dependencies), 0::bigint, 'no rows are left');
select throws_ok($$select public.tasks_add_dependency('9a000000-0000-0000-0000-000000000007', '9a000000-0000-0000-0000-000000000007')$$,
  '55000', null, 'a cancelled Event is refused');

-- tasks_move_to_role: 11 plain with an owner, 12 with a Subtask, 13 a Subtask, 14 with a dependency
reset role;
insert into public.tasks (id, event_id, role_id, title, deadline, owner_user_id, delegated_at, accepted_at) values
  ('9c000000-0000-0000-0000-000000000011', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Movable', current_date + 10, 'dddddddd-dddd-dddd-dddd-dddddddddddd', now(), now()),
  ('9c000000-0000-0000-0000-000000000012', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Has sub', current_date + 10, null, null, null),
  ('9c000000-0000-0000-0000-000000000014', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Has link', current_date + 10, null, null, null);
insert into public.tasks (id, event_id, role_id, title, deadline, parent_task_id) values
  ('9c000000-0000-0000-0000-000000000013', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Is sub', current_date + 10, '9c000000-0000-0000-0000-000000000012');
insert into public.task_dependencies values
  ('9c000000-0000-0000-0000-000000000014', '9a000000-0000-0000-0000-000000000003');
set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select throws_ok($$select public.tasks_move_to_role('9c000000-0000-0000-0000-000000000011', (select updated_at from public.tasks where id = '9c000000-0000-0000-0000-000000000011'), '6a000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'the lead cannot move a Task');
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select throws_ok($$select public.tasks_move_to_role('9c000000-0000-0000-0000-000000000011', now() - interval '1 day', '6a000000-0000-0000-0000-000000000002')$$,
  '40001', null, 'a stale expected is refused');
select throws_ok($$select public.tasks_move_to_role('9c000000-0000-0000-0000-000000000013', (select updated_at from public.tasks where id = '9c000000-0000-0000-0000-000000000013'), '6a000000-0000-0000-0000-000000000002')$$,
  '22023', 'promote_first', 'a Subtask is refused');
select throws_ok($$select public.tasks_move_to_role('9c000000-0000-0000-0000-000000000012', (select updated_at from public.tasks where id = '9c000000-0000-0000-0000-000000000012'), '6a000000-0000-0000-0000-000000000002')$$,
  '55006', 'has_links', 'a Task with Subtasks is refused');
select throws_ok($$select public.tasks_move_to_role('9c000000-0000-0000-0000-000000000014', (select updated_at from public.tasks where id = '9c000000-0000-0000-0000-000000000014'), '6a000000-0000-0000-0000-000000000002')$$,
  '55006', 'has_links', 'a Task with a dependency is refused');
select throws_ok($$select public.tasks_move_to_role('9a000000-0000-0000-0000-000000000003', (select updated_at from public.tasks where id = '9a000000-0000-0000-0000-000000000003'), '6a000000-0000-0000-0000-000000000002')$$,
  '55006', null, 'and so is a Task others depend on');
select throws_ok($$select public.tasks_move_to_role('9c000000-0000-0000-0000-000000000011', (select updated_at from public.tasks where id = '9c000000-0000-0000-0000-000000000011'), '6a000000-0000-0000-0000-000000000003')$$,
  '22023', 'target_role_unavailable', 'an inactive target Role is refused');
select throws_ok($$select public.tasks_move_to_role('9c000000-0000-0000-0000-000000000011', (select updated_at from public.tasks where id = '9c000000-0000-0000-0000-000000000011'), '6a000000-0000-0000-0000-000000000004')$$,
  '22023', 'target_role_unavailable', 'a Role in another Event is refused');
select lives_ok($$select public.tasks_move_to_role('9c000000-0000-0000-0000-000000000011', (select updated_at from public.tasks where id = '9c000000-0000-0000-0000-000000000011'), '6a000000-0000-0000-0000-000000000002')$$,
  'the Organizer moves a plain Task');
select results_eq(
  $$select role_id, owner_user_id, delegated_at, accepted_at from public.tasks where id = '9c000000-0000-0000-0000-000000000011'$$,
  $$values ('6a000000-0000-0000-0000-000000000002'::uuid, null::uuid, null::timestamptz, null::timestamptz)$$,
  'it is in the new Role with no owner, delegation or acceptance');

-- task_state: Q waits for open R
reset role;
select is((select blocked from public.task_state where id = '9a000000-0000-0000-0000-000000000003'), false, 'a Task with no dependency is not blocked');
insert into public.task_dependencies values
  ('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000004');
select results_eq(
  $$select blocked, blocked_by, blocked_by_count from public.task_state where id = '9a000000-0000-0000-0000-000000000003'$$,
  $$values (true, '9a000000-0000-0000-0000-000000000004'::uuid, 0::bigint)$$,
  'Q waiting for open R is blocked by R');
select is((select blocks_count from public.task_state where id = '9a000000-0000-0000-0000-000000000004'), 1::bigint, 'R blocks one Task');
update public.tasks set status = 'done' where id = '9a000000-0000-0000-0000-000000000003';
select is((select blocks_count from public.task_state where id = '9a000000-0000-0000-0000-000000000004'), 0::bigint, 'a Done dependent is not counted');
update public.tasks set status = 'not_started' where id = '9a000000-0000-0000-0000-000000000003';
insert into public.task_dependencies values
  ('9a000000-0000-0000-0000-000000000003', '9a000000-0000-0000-0000-000000000001');
select results_eq(
  $$select blocked_by, blocked_by_count from public.task_state where id = '9a000000-0000-0000-0000-000000000003'$$,
  $$values ('9a000000-0000-0000-0000-000000000001'::uuid, 1::bigint)$$,
  'with two blockers the earlier deadline is named and the other is counted');
update public.tasks set status = 'done' where id = '9a000000-0000-0000-0000-000000000001';
select results_eq(
  $$select blocked_by, blocked_by_count from public.task_state where id = '9a000000-0000-0000-0000-000000000003'$$,
  $$values ('9a000000-0000-0000-0000-000000000004'::uuid, 0::bigint)$$,
  'a Done blocker no longer blocks');
select is((select blocks_count from public.task_state where id = '9a000000-0000-0000-0000-000000000001'), 0::bigint, 'and a Done Task blocks nobody');
update public.tasks set obsolete = true where id = '9a000000-0000-0000-0000-000000000004';
select is((select blocked from public.task_state where id = '9a000000-0000-0000-0000-000000000003'), false, 'an obsolete blocker no longer blocks');
update public.tasks set obsolete = false where id = '9a000000-0000-0000-0000-000000000004';
update public.tasks set lifecycle = 'dismissed' where id = '9a000000-0000-0000-0000-000000000004';
select is((select blocked from public.task_state where id = '9a000000-0000-0000-0000-000000000003'), false, 'a dismissed blocker no longer blocks');
select is((select blocks_count from public.task_state where id = '9a000000-0000-0000-0000-000000000004'), 0::bigint, 'and blocks nobody');
update public.tasks set lifecycle = 'active' where id = '9a000000-0000-0000-0000-000000000004';
update public.tasks set status = 'not_started' where id = '9a000000-0000-0000-0000-000000000001';
delete from public.task_dependencies;

-- Dismiss and restore
insert into public.tasks (id, event_id, role_id, title, deadline, parent_task_id) values
  ('9d000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Open sub', current_date + 3, '9a000000-0000-0000-0000-000000000003');
set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select throws_ok($$select public.tasks_dismiss('9a000000-0000-0000-0000-000000000003', (select updated_at from public.tasks where id = '9a000000-0000-0000-0000-000000000003'))$$,
  '55006', 'has_open_children', 'dismiss is refused while a Subtask is active');
select lives_ok($$select public.tasks_dismiss('9d000000-0000-0000-0000-000000000001', (select updated_at from public.tasks where id = '9d000000-0000-0000-0000-000000000001'))$$,
  'the Subtask itself can be dismissed');
select lives_ok($$select public.tasks_dismiss('9a000000-0000-0000-0000-000000000003', (select updated_at from public.tasks where id = '9a000000-0000-0000-0000-000000000003'))$$,
  'and then the parent');
select throws_ok($$select public.tasks_restore('9d000000-0000-0000-0000-000000000001', (select updated_at from public.tasks where id = '9d000000-0000-0000-0000-000000000001'))$$,
  '22023', 'parent_not_active', 'a Subtask under a dismissed parent cannot be restored');
select lives_ok($$select public.tasks_restore('9a000000-0000-0000-0000-000000000003', (select updated_at from public.tasks where id = '9a000000-0000-0000-0000-000000000003'))$$,
  'the parent is restored');
select lives_ok($$select public.tasks_restore('9d000000-0000-0000-0000-000000000001', (select updated_at from public.tasks where id = '9d000000-0000-0000-0000-000000000001'))$$,
  'and then the Subtask');
select lives_ok($$select public.tasks_add_dependency('9a000000-0000-0000-0000-000000000004', '9a000000-0000-0000-0000-000000000003')$$,
  'R waits for Q');
select throws_ok($$select public.tasks_dismiss('9a000000-0000-0000-0000-000000000003', (select updated_at from public.tasks where id = '9a000000-0000-0000-0000-000000000003'))$$,
  '55006', 'has_open_children', 'dismiss is refused while an active Task waits on it');
select lives_ok($$select public.tasks_dismiss('9a000000-0000-0000-0000-000000000004', (select updated_at from public.tasks where id = '9a000000-0000-0000-0000-000000000004'))$$,
  'the dependent can be dismissed');
select is((select count(*) from public.task_dependencies where task_id = '9a000000-0000-0000-0000-000000000004'), 1::bigint,
  'a dismissed Task keeps its own dependency rows');
select lives_ok($$select public.tasks_dismiss('9d000000-0000-0000-0000-000000000001', (select updated_at from public.tasks where id = '9d000000-0000-0000-0000-000000000001'))$$,
  'the Subtask is dismissed again');
select lives_ok($$select public.tasks_dismiss('9a000000-0000-0000-0000-000000000003', (select updated_at from public.tasks where id = '9a000000-0000-0000-0000-000000000003'))$$,
  'now the blocker can be dismissed');
select is((select blocks_count from public.task_state where id = '9a000000-0000-0000-0000-000000000003'), 0::bigint,
  'a dismissed Task blocks nobody');

select * from finish();
rollback;
