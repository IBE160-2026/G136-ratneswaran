begin;
select plan(48);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stranger-b@example.test'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'holder-c@example.test'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'other-e@example.test'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'owner-f@example.test'),
  ('99999999-9999-9999-9999-999999999999', 'pending-g@example.test');


-- Live (1), draft (2), cancelled (3), ended (4)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at) values
  ('59000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('59000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Draft',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', null, null),
  ('59000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), now()),
  ('59000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Over',
   now() - interval '2 days', now() - interval '1 day', 'Europe/Oslo', 'en', now() - interval '3 days', null);

insert into public.guests (event_id, name) values ('59000000-0000-0000-0000-000000000001', 'Guest only');

-- 1 venue active, 2 guests active, 3 program inactive (live); 4 draft venue; 5 cancelled venue; 6 ended venue
insert into public.roles (id, event_id, key, active) values
  ('69000000-0000-0000-0000-000000000001', '59000000-0000-0000-0000-000000000001', 'venue', true),
  ('69000000-0000-0000-0000-000000000002', '59000000-0000-0000-0000-000000000001', 'guests', true),
  ('69000000-0000-0000-0000-000000000003', '59000000-0000-0000-0000-000000000001', 'program', false),
  ('69000000-0000-0000-0000-000000000004', '59000000-0000-0000-0000-000000000002', 'venue', true),
  ('69000000-0000-0000-0000-000000000005', '59000000-0000-0000-0000-000000000003', 'venue', true),
  ('69000000-0000-0000-0000-000000000006', '59000000-0000-0000-0000-000000000004', 'venue', true);

-- C holds Venue on every Event; E holds Guests; F joined only to Guests and owns a Venue Task
insert into public.role_members (id, event_id, role_id, user_id, name, joined_at) values
  ('79000000-0000-0000-0000-000000000001', '59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now()),
  ('79000000-0000-0000-0000-000000000002', '59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Eli', now()),
  ('79000000-0000-0000-0000-000000000003', '59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000002', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Finn', now()),
  ('79000000-0000-0000-0000-000000000004', '59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000003', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now()),
  ('79000000-0000-0000-0000-000000000005', '59000000-0000-0000-0000-000000000002', '69000000-0000-0000-0000-000000000004', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now()),
  ('79000000-0000-0000-0000-000000000006', '59000000-0000-0000-0000-000000000003', '69000000-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now()),
  ('79000000-0000-0000-0000-000000000007', '59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999', 'Gus', null);
insert into public.role_member_contacts (role_member_id, event_id, email)
select m.id, m.event_id, u.email from public.role_members m join auth.users u on u.id = m.user_id;

-- T1 live Venue (owner F), T2 live Program (inactive Role), T3 draft Venue, T4 cancelled Venue, T5 ended Venue,
-- T6 live Guests, proposed without a deadline
insert into public.tasks (id, event_id, role_id, title, deadline, owner_user_id, lifecycle) values
  ('89000000-0000-0000-0000-000000000001', '59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', 'Book hall', current_date + 5, 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'active'),
  ('89000000-0000-0000-0000-000000000002', '59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000003', 'Plan speeches', current_date + 5, null, 'active'),
  ('89000000-0000-0000-0000-000000000003', '59000000-0000-0000-0000-000000000002', '69000000-0000-0000-0000-000000000004', 'Draft task', current_date + 5, null, 'active'),
  ('89000000-0000-0000-0000-000000000004', '59000000-0000-0000-0000-000000000003', '69000000-0000-0000-0000-000000000005', 'Cancelled task', current_date + 5, null, 'active'),
  ('89000000-0000-0000-0000-000000000005', '59000000-0000-0000-0000-000000000004', '69000000-0000-0000-0000-000000000006', 'Ended task', current_date - 1, null, 'active'),
  ('89000000-0000-0000-0000-000000000006', '59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000002', 'Seat plan', null, null, 'proposed'),
  ('89000000-0000-0000-0000-000000000007', '59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', 'Pending owner', current_date + 5, '99999999-9999-9999-9999-999999999999', 'active');

-- CHECK
select throws_ok(
  $$insert into public.tasks (event_id, role_id, title, lifecycle) values
    ('59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', 'x', 'active')$$,
  '23514', null, 'an active Task without a deadline is rejected'
);
select lives_ok(
  $$insert into public.tasks (event_id, role_id, title, lifecycle) values
    ('59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', 'x', 'proposed')$$,
  'a proposed Task without a deadline is accepted'
);
select throws_ok(
  $$insert into public.tasks (event_id, role_id, title, deadline, status) values
    ('59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', 'x', current_date, 'blocked')$$,
  '23514', null, 'an unknown status is rejected'
);
select throws_ok(
  $$insert into public.tasks (event_id, role_id, title, deadline) values
    ('59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', '  ', current_date)$$,
  '23514', null, 'a blank title is rejected'
);
delete from public.tasks where title = 'x';

-- Reads
create temp view visible with (security_invoker = true) as select title from public.tasks;
grant select on visible to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select is((select count(*) from visible), 7::bigint, 'the Organizer sees every Task, draft, cancelled, ended and inactive Role included');

set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select results_eq($$select title from visible order by title$$, $$values ('Book hall'), ('Pending owner')$$,
  'a Role holder sees their Role''s Tasks only: not the inactive Role''s or the draft''s');
select is((select count(*) from visible where title = 'Cancelled task'), 0::bigint,
  'a joined holder of the cancelled Event''s Role does not see its Task');

set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select results_eq($$select title from visible order by title$$, $$values ('Book hall'), ('Seat plan')$$,
  'a Task owner sees the Task they own outside their Role, plus their own Role''s');

set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select results_eq($$select title from visible$$, $$values ('Seat plan')$$, 'a holder of another Role does not see Venue Tasks');

set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is((select count(*) from visible), 0::bigint, 'a Guest-only or unrelated user sees nothing');
set local request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';
select is((select count(*) from visible), 0::bigint, 'an owner without a joined membership sees nothing');
reset role;

set local role anon;
select throws_ok($$select * from public.tasks$$, '42501', null, 'anon cannot select tasks');
reset role;

-- Inactive Role: visible again once reactivated
update public.roles set active = true where id = '69000000-0000-0000-0000-000000000003';
set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select ok((select count(*) from visible where title = 'Plan speeches') = 1, 'a reactivated Role''s Task is visible to its holder again');
reset role;
update public.roles set active = false where id = '69000000-0000-0000-0000-000000000003';

-- Draft Event: publish makes it visible to the holder
update public.events set published_at = now() where id = '59000000-0000-0000-0000-000000000002';
set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select ok((select count(*) from visible where title = 'Draft task') = 1, 'a published Event''s Task is visible to its holder');
reset role;
update public.events set published_at = null where id = '59000000-0000-0000-0000-000000000002';

-- Direct writes
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select throws_ok(
  $$insert into public.tasks (event_id, role_id, title, deadline) values
    ('59000000-0000-0000-0000-000000000001', '69000000-0000-0000-0000-000000000001', 'y', current_date)$$,
  '42501', null, 'INSERT is denied'
);
select throws_ok($$delete from public.tasks where id = '89000000-0000-0000-0000-000000000001'$$, '42501', null, 'DELETE is denied');
select throws_ok($$update public.tasks set status = 'done' where id = '89000000-0000-0000-0000-000000000001'$$, '42501', null, 'status is not writable');
select throws_ok($$update public.tasks set owner_user_id = null where id = '89000000-0000-0000-0000-000000000001'$$, '42501', null, 'owner_user_id is not writable');
select throws_ok($$update public.tasks set accepted_at = now() where id = '89000000-0000-0000-0000-000000000001'$$, '42501', null, 'accepted_at is not writable');
select throws_ok($$update public.tasks set delegated_at = now() where id = '89000000-0000-0000-0000-000000000001'$$, '42501', null, 'delegated_at is not writable');
select throws_ok($$update public.tasks set role_id = '69000000-0000-0000-0000-000000000002' where id = '89000000-0000-0000-0000-000000000001'$$, '42501', null, 'role_id is not writable');
select throws_ok($$update public.tasks set lifecycle = 'dismissed' where id = '89000000-0000-0000-0000-000000000001'$$, '42501', null, 'lifecycle is not writable');
select throws_ok($$update public.tasks set obsolete = true where id = '89000000-0000-0000-0000-000000000001'$$, '42501', null, 'obsolete is not writable');
select throws_ok($$update public.tasks set event_id = '59000000-0000-0000-0000-000000000002' where id = '89000000-0000-0000-0000-000000000001'$$, '42501', null, 'event_id is not writable');

-- Title edit: allowed for the Organizer on a live Event, updated_at advances, refused on cancelled and ended
reset role;
create temp table before_edit as select updated_at from public.tasks where id = '89000000-0000-0000-0000-000000000001';
grant select on before_edit to authenticated;
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$update public.tasks set title = 'Book the hall' where id = '89000000-0000-0000-0000-000000000001'$$, 'the Organizer edits a title');
select is((select title from public.tasks where id = '89000000-0000-0000-0000-000000000001'), 'Book the hall', 'the title changed');
select ok((select t.updated_at > b.updated_at from public.tasks t, before_edit b where t.id = '89000000-0000-0000-0000-000000000001'), 'updated_at advanced');
select throws_ok($$update public.tasks set title = 'z' where id = '89000000-0000-0000-0000-000000000004'$$, '55000', null, 'a cancelled Event refuses a title edit');
select throws_ok($$update public.tasks set title = 'z' where id = '89000000-0000-0000-0000-000000000005'$$, '55000', null, 'an ended Event refuses a title edit');

set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
update public.tasks set title = 'Holder edit' where id = '89000000-0000-0000-0000-000000000001';
reset role;
select is((select title from public.tasks where id = '89000000-0000-0000-0000-000000000001'), 'Book the hall', 'a holder''s title edit changes nothing');

-- No-op update keeps updated_at; an owner who is not the Organizer cannot edit the title
reset role;
create temp table before_noop as select updated_at from public.tasks where id = '89000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
update public.tasks set title = 'Book the hall' where id = '89000000-0000-0000-0000-000000000001';
reset role;
select is((select t.updated_at from public.tasks t where t.id = '89000000-0000-0000-0000-000000000001'),
  (select updated_at from before_noop), 'a no-op update keeps updated_at');
set local role authenticated;
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
update public.tasks set title = 'Owner edit' where id = '89000000-0000-0000-0000-000000000001';
reset role;
select is((select title from public.tasks where id = '89000000-0000-0000-0000-000000000001'), 'Book the hall', 'a Task owner''s title edit changes nothing');

-- Helpers
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$select public.tasks_assert_writable('59000000-0000-0000-0000-000000000001')$$, 'tasks_assert_writable accepts a live Event');
select throws_ok($$select public.tasks_assert_writable('59000000-0000-0000-0000-000000000003')$$, '55000', null, 'tasks_assert_writable refuses a cancelled Event');
select throws_ok($$select public.tasks_assert_writable('59000000-0000-0000-0000-000000000004')$$, '55000', null, 'tasks_assert_writable refuses an ended Event');
select throws_ok($$select public.tasks_assert_writable('59000000-0000-0000-0000-0000000000ff')$$, '55000', null, 'tasks_assert_writable refuses an unknown Event');
select lives_ok(
  $$select public.tasks_check_expected('89000000-0000-0000-0000-000000000001', (select updated_at from public.tasks where id = '89000000-0000-0000-0000-000000000001'))$$,
  'tasks_check_expected accepts the current updated_at');
select throws_ok(
  $$select public.tasks_check_expected('89000000-0000-0000-0000-000000000001', now() - interval '1 day')$$,
  '40001', 'concurrent_edit', 'tasks_check_expected refuses a stale updated_at');
reset role;
set local role anon;
select throws_ok($$select public.tasks_assert_writable('59000000-0000-0000-0000-000000000001')$$, '42501', null, 'anon cannot execute the helpers');
select throws_ok($$select public.tasks_check_expected('89000000-0000-0000-0000-000000000001', now())$$, '42501', null, 'anon cannot execute tasks_check_expected');
select throws_ok($$select * from public.task_state$$, '42501', null, 'anon cannot select task_state');
reset role;
select ok(not has_function_privilege('authenticated', 'public.tasks_touch_updated_at()', 'EXECUTE'), 'authenticated cannot execute tasks_touch_updated_at');

-- task_state
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select results_eq(
  $$select is_delegated, is_pending from public.task_state where id in ('89000000-0000-0000-0000-000000000001', '89000000-0000-0000-0000-000000000002') order by id$$,
  $$values (true, false), (false, true)$$, 'task_state derives delegated and pending from the owner');
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is((select count(*) from public.task_state), 0::bigint, 'task_state honours the caller''s RLS');
reset role;

-- Privilege model: the direct write is denied, a definer function that authorises from auth.uid() succeeds
create function public.tasks_test_set_status(p_task_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_event_id uuid;
begin
  select event_id into v_event_id from public.tasks where id = p_task_id;
  if not public.is_organizer(v_event_id) then raise exception 'denied' using errcode = '42501'; end if;
  update public.tasks set status = 'done' where id = p_task_id;
end; $$;
revoke execute on function public.tasks_test_set_status(uuid) from public, anon;
grant execute on function public.tasks_test_set_status(uuid) to authenticated;

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select throws_ok($$update public.tasks set status = 'done' where id = '89000000-0000-0000-0000-000000000001'$$, '42501', null, 'the direct status write is denied');
select lives_ok($$select public.tasks_test_set_status('89000000-0000-0000-0000-000000000001')$$, 'the definer function writes status');
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select throws_ok($$select public.tasks_test_set_status('89000000-0000-0000-0000-000000000001')$$, '42501', null, 'the definer function refuses a non-Organizer');
reset role;
select is((select status from public.tasks where id = '89000000-0000-0000-0000-000000000001'), 'done', 'the status changed through the function only');

select * from finish();
rollback;
