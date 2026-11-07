begin;
select plan(14);

-- supabase/seed.sql is loaded by `supabase start` and `db reset`; the Playwright flagship spec re-applies it.
select is((select count(*) from public.tasks where event_id = 'f1a90000-0000-4000-8000-0000000000e1'), 13::bigint,
  'the flagship Event holds 13 Tasks');
select is((select count(*) from public.roles where event_id = 'f1a90000-0000-4000-8000-0000000000e1' and active), 4::bigint,
  'four Roles are active');

create temp view flagship as
  select s.*, t.status, t.lifecycle, t.parent_task_id
  from public.task_state s join public.tasks t on t.id = s.id
  where s.event_id = 'f1a90000-0000-4000-8000-0000000000e1';

select is((select count(*) from flagship where lifecycle = 'active' and status = 'done'), 2::bigint, 'two Tasks are done');
select is((select count(*) from flagship where overdue), 2::bigint, 'two Tasks are overdue');
select is((select count(*) from flagship where blocked), 1::bigint, 'one Task is blocked');
select is((select count(*) from flagship where status = 'waiting_external'), 1::bigint, 'one Task waits on external');
select is((select count(*) from flagship where stale_unaccepted), 1::bigint, 'one delegated Task is unaccepted after 48 hours');
select is((select count(*) from flagship where parent_task_id is not null), 1::bigint, 'one Subtask');
select is((select count(*) from flagship where lifecycle = 'proposed' and not overdue and not blocked and not stale_unaccepted),
  1::bigint, 'the Proposed Task exists and is in no derived state');

select is((select count(*) from auth.users where id::text like 'f1a90000-%' and email not like '%@example.com'), 0::bigint,
  'every seeded email is fictional');

set local role authenticated;

set local request.jwt.claims = '{"sub": "f1a90000-0000-4000-8000-0000000000a2", "role": "authenticated"}';
select is((select count(*) from public.task_state where event_id = 'f1a90000-0000-4000-8000-0000000000e1'), 5::bigint,
  'the Venue holder reads the five Venue Tasks');
select is((select count(*) from public.task_state where role_id <> 'f1a90000-0000-4000-8000-0000000000b1'
  and event_id = 'f1a90000-0000-4000-8000-0000000000e1'), 0::bigint, 'the Venue holder reads no other Role');

set local request.jwt.claims = '{"sub": "f1a90000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select is((select count(*) from public.task_state where event_id = 'f1a90000-0000-4000-8000-0000000000e1'), 13::bigint,
  'the Organizer reads every Task');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select count(*) from public.tasks$$, '42501', null, 'anon cannot read Tasks');

select * from finish();
rollback;
