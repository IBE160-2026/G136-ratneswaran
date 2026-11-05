begin;
select plan(10);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'holder-d@example.test'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'holder-e@example.test');

insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at) values
  ('59000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now());

insert into public.roles (id, event_id, key, active) values
  ('69000000-0000-0000-0000-000000000001', '59000000-0000-0000-0000-000000000001', 'venue', true),
  ('69000000-0000-0000-0000-000000000002', '59000000-0000-0000-0000-000000000001', 'guests', true);

-- D holds Venue, E holds Guests
insert into public.role_members (event_id, role_id, user_id, name, joined_at) values
  ('59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', now()),
  ('59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Erik', now());
insert into public.role_member_contacts (role_member_id, event_id, email)
select m.id, m.event_id, u.email from public.role_members m join auth.users u on u.id = m.user_id;

-- 1 pending; 2 owned and overdue; 3 owned, done and past deadline; 4 obsolete, owned; 5 blocked by 1
insert into public.tasks (id, event_id, role_id, title, deadline, obsolete, status, owner_user_id, delegated_at) values
  ('89000000-0000-0000-0000-000000000001', '59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', 'Pending', current_date + 9, false, 'not_started', null, null),
  ('89000000-0000-0000-0000-000000000002', '59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', 'Late', current_date - 3, false, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now()),
  ('89000000-0000-0000-0000-000000000003', '59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', 'Done late', current_date - 3, false, 'done', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now()),
  ('89000000-0000-0000-0000-000000000004', '59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', 'Obsolete', current_date + 9, true, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now()),
  ('89000000-0000-0000-0000-000000000005', '59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', 'Waiting', current_date + 9, false, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now());
insert into public.task_dependencies (task_id, depends_on_id)
values ('89000000-0000-0000-0000-000000000005', '89000000-0000-0000-0000-000000000001');

-- Read as the table owner so the view sees every row
select is((select blocked from public.task_state where id = '89000000-0000-0000-0000-000000000005'), true, 'a Task with an open dependency is blocked');
select is((select blocked from public.task_state where id = '89000000-0000-0000-0000-000000000001'), false, 'a Task without one is not');
select is((select overdue from public.task_state where id = '89000000-0000-0000-0000-000000000002'), true, 'an open Task past its deadline is overdue');
select is((select overdue from public.task_state where id = '89000000-0000-0000-0000-000000000003'), false, 'a done Task is not overdue');
select results_eq(
  $$select id::text, is_delegated, is_pending from public.task_state where id in ('89000000-0000-0000-0000-000000000001', '89000000-0000-0000-0000-000000000002') order by id$$,
  $$values ('89000000-0000-0000-0000-000000000001', false, true), ('89000000-0000-0000-0000-000000000002', true, false)$$,
  'is_delegated and is_pending follow the owner');
select results_eq(
  $$select id::text from public.task_state where obsolete order by id$$,
  $$values ('89000000-0000-0000-0000-000000000004')$$,
  'obsolete is exposed');

-- A holder sees their own Role's rows
set local role authenticated;
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select is((select count(*) from public.task_state), 5::bigint, 'the holder of the Role sees its rows');

-- The holder of another Role sees none
set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select is((select count(*) from public.task_state), 0::bigint, 'the holder of another Role sees none');

-- The Organizer sees all
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select is((select count(*) from public.task_state), 5::bigint, 'the Organizer sees every row');

-- A stranger sees none
set local request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';
select is((select count(*) from public.task_state), 0::bigint, 'a stranger sees none');

select * from finish();
rollback;
