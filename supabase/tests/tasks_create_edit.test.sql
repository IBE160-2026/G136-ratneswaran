begin;
select plan(66);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stranger-b@example.test'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'lead-c@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'holder-d@example.test'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'lead-e@example.test');

-- Live (1), cancelled (2), draft without a start (3)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at) values
  ('5a000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('5a000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now(), now()),
  ('5a000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Undated',
   null, null, null, 'en', null, null);

-- 1 venue active, 2 guests active, 3 program inactive (live); 4 venue on the cancelled Event; 5 venue on the undated one
insert into public.roles (id, event_id, key, active) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'venue', true),
  ('6a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'guests', true),
  ('6a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', 'program', false),
  ('6a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000002', 'venue', true),
  ('6a000000-0000-0000-0000-000000000005', '5a000000-0000-0000-0000-000000000003', 'venue', true);

-- C leads Venue and D holds it; E leads Guests and Program; C also leads the cancelled and undated Venue
insert into public.role_members (id, event_id, role_id, user_id, name, joined_at, is_lead) values
  ('7a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now(), true),
  ('7a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', now(), false),
  ('7a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Eli', now(), true),
  ('7a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Eli', now(), true),
  ('7a000000-0000-0000-0000-000000000005', '5a000000-0000-0000-0000-000000000002', '6a000000-0000-0000-0000-000000000004', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now(), true),
  ('7a000000-0000-0000-0000-000000000006', '5a000000-0000-0000-0000-000000000003', '6a000000-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now(), true);
insert into public.role_member_contacts (role_member_id, event_id, email)
select m.id, m.event_id, u.email from public.role_members m join auth.users u on u.id = m.user_id;

-- Attributes and grants
select ok(
  (select bool_and(prosecdef and proconfig @> array['search_path=""']) from pg_proc
   where oid in ('public.tasks_create(uuid, uuid, text, text, date, integer)'::regprocedure,
                 'public.tasks_set_deadline(uuid, timestamptz, date, integer)'::regprocedure,
                 'public.tasks_dismiss(uuid, timestamptz)'::regprocedure,
                 'public.tasks_restore(uuid, timestamptz)'::regprocedure,
                 'public.tasks_recalculate_deadlines(uuid)'::regprocedure)),
  'the five functions are security definer with an empty search_path');
select ok(not has_function_privilege('authenticated', 'public.tasks_recalculate_deadlines(uuid)', 'EXECUTE'),
  'authenticated cannot execute tasks_recalculate_deadlines');
select ok(not has_function_privilege('anon', 'public.tasks_recalculate_deadlines(uuid)', 'EXECUTE'),
  'anon cannot execute tasks_recalculate_deadlines');
select ok(not has_function_privilege('authenticated', 'public.tasks_set_lifecycle(uuid, timestamptz, text, text)', 'EXECUTE'),
  'authenticated cannot execute tasks_set_lifecycle');
select ok(has_function_privilege('authenticated', 'public.tasks_create(uuid, uuid, text, text, date, integer)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.tasks_create(uuid, uuid, text, text, date, integer)', 'EXECUTE'),
  'tasks_create is granted to authenticated only');
select ok(not has_function_privilege('authenticated', 'public.tasks_guest_program_organizer_only()', 'EXECUTE'),
  'authenticated cannot execute the guest-program trigger function');

-- CHECKs, as postgres
select throws_ok($$insert into public.tasks (event_id, role_id, title, deadline, days_before) values
  ('5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'x', current_date, 366)$$,
  '23514', null, 'days_before 366 is rejected by the CHECK');
select throws_ok($$insert into public.tasks (event_id, role_id, title, deadline, days_before) values
  ('5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'x', current_date, -1)$$,
  '23514', null, 'days_before -1 is rejected by the CHECK');
select throws_ok($$insert into public.tasks (event_id, role_id, title, deadline, show_on_guest_program) values
  ('5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'x', current_date, true)$$,
  '23514', null, 'a shown Task needs a guest label');
select throws_ok($$insert into public.tasks (event_id, role_id, title, deadline, guest_label) values
  ('5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'x', current_date, repeat('a', 81))$$,
  '23514', null, 'a guest label over 80 characters is rejected');
select throws_ok($$insert into public.tasks (event_id, role_id, title, deadline) values
  ('5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', repeat('a', 121), current_date)$$,
  '23514', null, 'a title over 120 characters is rejected');
select throws_ok($$insert into public.tasks (event_id, role_id, title, description, deadline) values
  ('5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'x', repeat('a', 2001), current_date)$$,
  '23514', null, 'a description over 2000 characters is rejected');

-- tasks_create
set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select lives_ok($$select public.tasks_create('8a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', '  Book hall ', ' Ask about parking ', current_date + 5)$$,
  'the lead of a Role creates a Task');
select results_eq(
  $$select title, description, deadline, days_before, lifecycle, status, owner_user_id, created_by, event_id from public.tasks where id = '8a000000-0000-0000-0000-000000000001'$$,
  $$values ('Book hall', 'Ask about parking', current_date + 5, null::smallint, 'active', 'not_started', null::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '5a000000-0000-0000-0000-000000000001'::uuid)$$,
  'the Task is active, not started and pending, with the Event taken from the Role');
select lives_ok($$select public.tasks_create('8a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Again', null, current_date + 9)$$,
  'a repeat call with the same id raises nothing');
select is((select count(*) from public.tasks where id = '8a000000-0000-0000-0000-000000000001' and title = 'Book hall'), 1::bigint,
  'a repeat call creates nothing');

select lives_ok($$select public.tasks_create('8a000000-0000-0000-0000-000000000002', '6a000000-0000-0000-0000-000000000001', 'Send save the date', null, null, 14)$$,
  'a Task can be due N days before the start');
select results_eq(
  $$select deadline, days_before from public.tasks where id = '8a000000-0000-0000-0000-000000000002'$$,
  $$select ((select starts_at from public.events where id = '5a000000-0000-0000-0000-000000000001') at time zone 'Europe/Oslo')::date - 14, 14::smallint$$,
  'deadline is the start date minus 14 and both are stored');
select lives_ok($$select public.tasks_create('8a000000-0000-0000-0000-000000000003', '6a000000-0000-0000-0000-000000000001', 'Late already', null, current_date - 1)$$,
  'a past date is accepted');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'x', null, null, -1)$$,
  '22023', null, 'days before -1 is refused');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'x', null, null, 366)$$,
  '22023', null, 'days before 366 is refused');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'x')$$,
  '22023', null, 'no deadline is refused');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', '   ', null, current_date)$$,
  '23514', null, 'a blank title is refused');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000005', 'x', null, null, 3)$$,
  '22023', null, 'days before on an Event without a start is refused');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000004', 'x', null, current_date)$$,
  '55000', null, 'a cancelled Event is refused');

set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'x', null, current_date)$$,
  '42501', null, 'a holder who is not the lead is denied');
set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'x', null, current_date)$$,
  '42501', null, 'the lead of another Role is denied');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000003', 'x', null, current_date)$$,
  '22023', null, 'the lead of an inactive Role is refused');
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'x', null, current_date)$$,
  '42501', null, 'a stranger is denied');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-0000000000ff', 'x', null, current_date)$$,
  '42501', null, 'an unknown Role looks the same as a foreign one');
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$select public.tasks_create('8a000000-0000-0000-0000-000000000004', '6a000000-0000-0000-0000-000000000002', 'Seat plan', null, current_date + 20)$$,
  'the Organizer creates a Task on any Role');
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000003', 'x', null, current_date)$$,
  '22023', null, 'the Organizer cannot create on an inactive Role');
reset role;
set local role anon;
select throws_ok($$select public.tasks_create(gen_random_uuid(), '6a000000-0000-0000-0000-000000000001', 'x', null, current_date)$$,
  '42501', null, 'anon cannot execute tasks_create');
reset role;

-- tasks_set_deadline
set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select lives_ok($$select public.tasks_set_deadline('8a000000-0000-0000-0000-000000000002',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'), current_date + 40)$$,
  'the lead sets a fixed date');
select is((select public.tasks_set_deadline('8a000000-0000-0000-0000-000000000002',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'), current_date + 40)),
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'),
  'tasks_set_deadline returns the new updated_at');
select results_eq($$select deadline, days_before from public.tasks where id = '8a000000-0000-0000-0000-000000000002'$$,
  $$values (current_date + 40, null::smallint)$$, 'a fixed date clears days_before');
select throws_ok($$select public.tasks_set_deadline('8a000000-0000-0000-0000-000000000002', now() - interval '1 day', current_date + 41)$$,
  '40001', 'concurrent_edit', 'a stale updated_at is refused');
select lives_ok($$select public.tasks_set_deadline('8a000000-0000-0000-0000-000000000002',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'), null, 7)$$,
  'the lead can switch to N days before');
select is((select days_before from public.tasks where id = '8a000000-0000-0000-0000-000000000002'), 7::smallint, 'days_before is stored again');
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select throws_ok($$select public.tasks_set_deadline('8a000000-0000-0000-0000-000000000002',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'), current_date)$$,
  '42501', null, 'a holder who is not the lead cannot set a deadline');
reset role;

-- tasks_dismiss and tasks_restore
set local role authenticated;
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select throws_ok($$select public.tasks_dismiss('8a000000-0000-0000-0000-000000000001',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'))$$,
  '42501', null, 'a holder who is not the lead cannot dismiss');
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select throws_ok($$select public.tasks_dismiss('8a000000-0000-0000-0000-000000000001', now() - interval '1 day')$$,
  '40001', 'concurrent_edit', 'dismiss refuses a stale updated_at');
create temp table seen as select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001';
grant select on seen to authenticated;
select lives_ok($$select public.tasks_dismiss('8a000000-0000-0000-0000-000000000001', (select updated_at from seen))$$, 'the lead dismisses');
select is((select lifecycle from public.tasks where id = '8a000000-0000-0000-0000-000000000001'), 'dismissed', 'the Task is dismissed, not deleted');
select lives_ok($$select public.tasks_dismiss('8a000000-0000-0000-0000-000000000001', (select updated_at from seen))$$,
  'a repeat dismiss with the old updated_at is a no-op');
select lives_ok($$select public.tasks_restore('8a000000-0000-0000-0000-000000000001',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'))$$, 'the lead restores');
select is((select lifecycle from public.tasks where id = '8a000000-0000-0000-0000-000000000001'), 'active', 'the Task is active again');
select lives_ok($$select public.tasks_restore('8a000000-0000-0000-0000-000000000001', now() - interval '1 day')$$,
  'restoring an active Task is a no-op');
reset role;
update public.tasks set lifecycle = 'proposed', deadline = null where id = '8a000000-0000-0000-0000-000000000003';
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select throws_ok($$select public.tasks_dismiss('8a000000-0000-0000-0000-000000000003',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000003'))$$,
  '22023', null, 'a proposed Task cannot be dismissed here');
reset role;
insert into public.tasks (id, event_id, role_id, title, deadline) values
  ('8a000000-0000-0000-0000-000000000005', '5a000000-0000-0000-0000-000000000002', '6a000000-0000-0000-0000-000000000004', 'Cancelled', current_date + 5);
set local role authenticated;
select throws_ok($$select public.tasks_dismiss('8a000000-0000-0000-0000-000000000005',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000005'))$$,
  '55000', null, 'a cancelled Event refuses dismiss');
reset role;

-- is_role_lead, and a lead's direct UPDATE on another Role's Task
set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select ok(public.is_role_lead('6a000000-0000-0000-0000-000000000001'), 'is_role_lead allows the lead of the Role');
select ok(not public.is_role_lead('6a000000-0000-0000-0000-000000000002'), 'is_role_lead denies the lead of another Role');
update public.tasks set title = 'Cross-role edit' where id = '8a000000-0000-0000-0000-000000000004';
reset role;
select is((select title from public.tasks where id = '8a000000-0000-0000-0000-000000000004'), 'Seat plan',
  'the lead of Venue cannot edit a Guests Task directly');

-- Direct edits: lead and Organizer allowed, other holder not, guest program Organizer-only
set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select lives_ok($$update public.tasks set title = 'Book the hall' where id = '8a000000-0000-0000-0000-000000000001'$$, 'the lead edits a title');
select throws_ok($$update public.tasks set guest_label = 'Dinner' where id = '8a000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'the lead cannot change the guest label');
select throws_ok($$update public.tasks set show_on_guest_program = true, guest_label = 'Dinner' where id = '8a000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'the lead cannot show a Task on the guest program');
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
update public.tasks set title = 'Holder edit' where id = '8a000000-0000-0000-0000-000000000001';
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$update public.tasks set show_on_guest_program = true, guest_label = 'Dinner', guest_time = '18:30' where id = '8a000000-0000-0000-0000-000000000001'$$,
  'the Organizer sets the guest program fields');
reset role;
select is((select title from public.tasks where id = '8a000000-0000-0000-0000-000000000001'), 'Book the hall',
  'a holder who is not the lead changes nothing');
select is((select guest_label from public.tasks where id = '8a000000-0000-0000-0000-000000000001'), 'Dinner', 'the guest label is stored');

-- Recalculation through events_update_schedule
update public.tasks set deadline = current_date + 3, days_before = null where id = '8a000000-0000-0000-0000-000000000004';
create temp table snap as select id, deadline, updated_at from public.tasks where event_id = '5a000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$select public.events_update_schedule('5a000000-0000-0000-0000-000000000001',
  (select starts_at at time zone 'Europe/Oslo' + interval '3 days' from public.events where id = '5a000000-0000-0000-0000-000000000001'),
  (select ends_at at time zone 'Europe/Oslo' + interval '3 days' from public.events where id = '5a000000-0000-0000-0000-000000000001'),
  'Europe/Oslo', null, 'en')$$, 'the Organizer moves the start');
reset role;
select results_eq(
  $$select deadline from public.tasks where id = '8a000000-0000-0000-0000-000000000002'$$,
  $$select ((select starts_at from public.events where id = '5a000000-0000-0000-0000-000000000001') at time zone 'Europe/Oslo')::date - 7$$,
  'a days_before Task moves with the start');
select is((select count(*) from public.tasks t join snap s using (id) where t.deadline is distinct from s.deadline), 1::bigint,
  'only the days_before Task moved; fixed dates are untouched');
create temp table snap2 as select id, updated_at from public.tasks where event_id = '5a000000-0000-0000-0000-000000000001';
select public.tasks_recalculate_deadlines('5a000000-0000-0000-0000-000000000001');
select is((select count(*) from public.tasks t join snap2 s using (id) where t.updated_at is distinct from s.updated_at), 0::bigint,
  'a second run changes nothing');
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select throws_ok($$select public.tasks_recalculate_deadlines('5a000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'authenticated cannot call tasks_recalculate_deadlines');
reset role;

-- A schedule moved into the past still saves; the read-only Tasks are skipped, not refused
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
create temp table before_past as select deadline from public.tasks where id = '8a000000-0000-0000-0000-000000000002';
grant select on before_past to authenticated;
select lives_ok($$select public.events_update_schedule('5a000000-0000-0000-0000-000000000001',
  (now() - interval '3 days') at time zone 'Europe/Oslo', (now() - interval '2 days') at time zone 'Europe/Oslo',
  'Europe/Oslo', null, 'en')$$, 'the Organizer saves a schedule in the past with a days_before Task');
reset role;
select is((select deadline from public.tasks where id = '8a000000-0000-0000-0000-000000000002'),
  (select deadline from before_past), 'the read-only Event''s days_before Task is not recalculated');

select * from finish();
rollback;
