begin;
select plan(11);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'holder-d@example.test'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'holder-e@example.test'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'guest-f@example.test');

insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at) values
  ('59100000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now());

insert into public.roles (id, event_id, key, active) values
  ('69100000-0000-0000-0000-000000000001', '59100000-0000-0000-0000-000000000001', 'venue', true),
  ('69100000-0000-0000-0000-000000000002', '59100000-0000-0000-0000-000000000001', 'guests', true);

-- D holds Role A (Venue), E holds Role B (Guests); F is only a Guest of the Event
insert into public.role_members (event_id, role_id, user_id, name, joined_at) values
  ('59100000-0000-0000-0000-000000000001', '69100000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', now()),
  ('59100000-0000-0000-0000-000000000001', '69100000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Erik', now());
insert into public.role_member_contacts (role_member_id, event_id, email)
select m.id, m.event_id, u.email from public.role_members m join auth.users u on u.id = m.user_id;
insert into public.guests (event_id, name) values ('59100000-0000-0000-0000-000000000001', 'Frida');

-- 1 active and 2 proposed in Role A; 3 active in Role B
insert into public.tasks (id, event_id, role_id, title, deadline, lifecycle) values
  ('89100000-0000-0000-0000-000000000001', '59100000-0000-0000-0000-000000000001', '69100000-0000-0000-0000-000000000001', 'A active', current_date + 9, 'active'),
  ('89100000-0000-0000-0000-000000000002', '59100000-0000-0000-0000-000000000001', '69100000-0000-0000-0000-000000000001', 'A proposed', null, 'proposed'),
  ('89100000-0000-0000-0000-000000000003', '59100000-0000-0000-0000-000000000001', '69100000-0000-0000-0000-000000000002', 'B active', current_date + 9, 'active');

set local role authenticated;

set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select results_eq(
  $$select id::text from public.task_state order by id$$,
  $$values ('89100000-0000-0000-0000-000000000001'), ('89100000-0000-0000-0000-000000000002')$$,
  'the holder of Role A sees only Role A rows');

set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select results_eq(
  $$select id::text from public.task_state order by id$$,
  $$values ('89100000-0000-0000-0000-000000000003')$$,
  'the holder of Role B sees only Role B rows');
select is(
  (select count(*) from public.task_state where id = '89100000-0000-0000-0000-000000000002'),
  0::bigint, 'a Proposed Task in Role A is not returned to the holder of Role B');

set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select is((select count(*) from public.task_state), 0::bigint, 'a Guest-only user sees no rows');
select is(
  (select count(*) from public.task_state where id = '89100000-0000-0000-0000-000000000002'),
  0::bigint, 'a Proposed Task is not returned to a Guest-only user');

set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select is((select count(*) from public.task_state), 3::bigint, 'the Organizer sees every row');
select is(
  (select count(*) from public.task_state where id = '89100000-0000-0000-0000-000000000002'),
  1::bigint, 'the Organizer sees the Proposed Task');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select count(*) from public.task_state$$, '42501', null, 'anon cannot read task_state');
select throws_ok(
  $$select id from public.task_state where id = '89100000-0000-0000-0000-000000000002'$$,
  '42501', null, 'anon cannot read a Proposed Task');

reset role;
select is((select count(*) from public.task_state), 3::bigint, 'the table owner still sees every row');
select is((select count(*) from public.task_state where id = '89100000-0000-0000-0000-000000000002'), 1::bigint, 'the Proposed Task exists');

select * from finish();
rollback;
