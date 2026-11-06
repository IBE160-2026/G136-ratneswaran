begin;
select plan(13);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'organizer-b@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'holder-d@example.test'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'holder-e@example.test'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'guest-f@example.test');

insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at) values
  ('59500000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now());

insert into public.roles (id, event_id, key, active) values
  ('69500000-0000-0000-0000-000000000001', '59500000-0000-0000-0000-000000000001', 'venue', true),
  ('69500000-0000-0000-0000-000000000002', '59500000-0000-0000-0000-000000000001', 'guests', true);

-- D leads Venue, E holds Guests; F is only a Guest of the Event
insert into public.role_members (event_id, role_id, user_id, name, joined_at, is_lead) values
  ('59500000-0000-0000-0000-000000000001', '69500000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', now(), true),
  ('59500000-0000-0000-0000-000000000001', '69500000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Erik', now(), false);
insert into public.role_member_contacts (role_member_id, event_id, email)
select m.id, m.event_id, u.email from public.role_members m join auth.users u on u.id = m.user_id;
insert into public.guests (event_id, name) values ('59500000-0000-0000-0000-000000000001', 'Frida');

-- Venue: A owns an overdue, an unaccepted and a waiting-on-external Task. Guests: E owns one; one is blocked by it.
insert into public.tasks (id, event_id, role_id, title, deadline, owner_user_id, accepted_at, status) values
  ('89500000-0000-0000-0000-000000000001', '59500000-0000-0000-0000-000000000001', '69500000-0000-0000-0000-000000000001', 'overdue', current_date - 3, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now(), 'in_progress'),
  ('89500000-0000-0000-0000-000000000002', '59500000-0000-0000-0000-000000000001', '69500000-0000-0000-0000-000000000001', 'unaccepted', current_date + 9, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, 'not_started'),
  ('89500000-0000-0000-0000-000000000003', '59500000-0000-0000-0000-000000000001', '69500000-0000-0000-0000-000000000001', 'waiting', current_date + 9, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now(), 'waiting_external'),
  ('89500000-0000-0000-0000-000000000004', '59500000-0000-0000-0000-000000000001', '69500000-0000-0000-0000-000000000002', 'E task', current_date + 9, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', now(), 'in_progress'),
  ('89500000-0000-0000-0000-000000000005', '59500000-0000-0000-0000-000000000001', '69500000-0000-0000-0000-000000000002', 'blocked', current_date + 9, null, null, 'not_started');
insert into public.task_dependencies (task_id, depends_on_id)
values ('89500000-0000-0000-0000-000000000005', '89500000-0000-0000-0000-000000000004');

-- 50 more Events for B, one Task each
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at)
select ('59500000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'E' || n,
  now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now()
from generate_series(101, 150) n;
insert into public.roles (id, event_id, key, active)
select ('69500000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, ('59500000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, 'venue', true
from generate_series(101, 150) n;
insert into public.tasks (event_id, role_id, title, deadline, owner_user_id, accepted_at)
select ('59500000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, ('69500000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'T' || n, current_date + 9, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now()
from generate_series(101, 150) n;

select has_index('public', 'tasks', 'tasks_event_owner_idx', 'tasks has the (event_id, owner_user_id) index');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select results_eq(
  $$select open_count, new_count, overdue_count, need_you_count, at_risk_count from public.events_card_counts()$$,
  $$values (3, 1, 1, 2, 2)$$,
  'the Organizer counts own open, new, overdue, need-you, and blocked or waiting at-risk Tasks of every Role');

set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select results_eq(
  $$select open_count, new_count, overdue_count, need_you_count, at_risk_count from public.events_card_counts()$$,
  $$values (0, 0, 1, 1, 1)$$,
  'the lead of Venue counts its Role scope and sees nothing of Guests');

set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select results_eq(
  $$select event_id::text, open_count, new_count, overdue_count, need_you_count, at_risk_count from public.events_card_counts()$$,
  $$values ('59500000-0000-0000-0000-000000000001', 1, 0, 0, 0, 0)$$,
  'a plain holder counts only the Task they own, not the blocked one or any other Role');

set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select is((select count(*) from public.events_card_counts()), 0::bigint, 'a Guest-only user gets no rows');

set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is((select count(*) from public.events_card_counts()), 50::bigint, 'one call returns a row for each of 50 Events');
select is(
  (select count(*) from public.events_card_counts() where event_id = '59500000-0000-0000-0000-000000000001'),
  0::bigint, 'another Organizer''s Event is not returned');

reset role;
update public.tasks set status = 'done' where id = '89500000-0000-0000-0000-000000000001';
update public.roles set active = false where id = '69500000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select results_eq(
  $$select open_count, need_you_count, at_risk_count from public.events_card_counts()$$,
  $$values (0, 0, 1)$$,
  'done Tasks and Tasks of an inactive Role are not counted');

-- A stale unaccepted Task of someone else counts for those who manage the Role, not for a plain holder;
-- an obsolete and a dismissed Task count for nobody.
reset role;
insert into public.tasks (event_id, role_id, title, deadline, owner_user_id, delegated_at, accepted_at, obsolete, lifecycle) values
  ('59500000-0000-0000-0000-000000000001', '69500000-0000-0000-0000-000000000002', 'stale', current_date + 9, 'ffffffff-ffff-ffff-ffff-ffffffffffff', now() - interval '3 days', null, false, 'active'),
  ('59500000-0000-0000-0000-000000000001', '69500000-0000-0000-0000-000000000002', 'obsolete', current_date + 9, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, now(), true, 'active'),
  ('59500000-0000-0000-0000-000000000001', '69500000-0000-0000-0000-000000000002', 'dismissed', current_date + 9, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null, now(), false, 'dismissed');
set local role authenticated;
select results_eq(
  $$select open_count, new_count, overdue_count, need_you_count, at_risk_count from public.events_card_counts()$$,
  $$values (0, 0, 0, 1, 1)$$,
  'the Organizer needs the stale Task; the obsolete and dismissed Tasks are not counted');
set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select results_eq(
  $$select open_count, new_count, overdue_count, need_you_count, at_risk_count from public.events_card_counts()$$,
  $$values (1, 0, 0, 0, 0)$$,
  'a plain holder does not count another person''s stale Task');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select * from public.events_card_counts()$$, '42501', null, 'anon cannot call events_card_counts');

reset role;
select is(
  (select proconfig from pg_proc where proname = 'events_card_counts'),
  array['search_path=""'], 'the function pins an empty search_path');
select is(
  (select prosecdef from pg_proc where proname = 'events_card_counts'),
  false, 'the function is security invoker');

select * from finish();
rollback;
