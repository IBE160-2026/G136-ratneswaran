begin;
select plan(48);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stranger-b@example.test'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'lead-c@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'holder-d@example.test'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'lead-e@example.test'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'holder-f@example.test'),
  ('11111111-1111-1111-1111-111111111111', 'pending-p@example.test');

insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at) values
  ('5a000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('5a000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now(), now());

insert into public.roles (id, event_id, key, active) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'venue', true),
  ('6a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'guests', true),
  ('6a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000002', 'venue', true);

-- C leads Venue, D and F hold Venue, P is pending in Venue; E leads Guests
insert into public.role_members (id, event_id, role_id, user_id, name, joined_at, is_lead) values
  ('7a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now(), true),
  ('7a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', now(), false),
  ('7a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Eli', now(), true),
  ('7a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Finn', now(), false),
  ('7a000000-0000-0000-0000-000000000005', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Pia', null, false);
insert into public.role_member_contacts (role_member_id, event_id, email)
select m.id, m.event_id, u.email from public.role_members m join auth.users u on u.id = m.user_id;

-- 1 lead path; 2 organizer path; 3 dismissed; 4 obsolete; 5 done; 6 proposed; 7 cancelled Event; 8 self and repeat
insert into public.tasks (id, event_id, role_id, title, deadline, lifecycle, obsolete, status) values
  ('8a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'One', current_date + 9, 'active', false, 'not_started'),
  ('8a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Two', current_date + 9, 'active', false, 'not_started'),
  ('8a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Dismissed', current_date + 9, 'dismissed', false, 'not_started'),
  ('8a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Obsolete', current_date + 9, 'active', true, 'not_started'),
  ('8a000000-0000-0000-0000-000000000005', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Done', current_date + 9, 'active', false, 'done'),
  ('8a000000-0000-0000-0000-000000000006', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Proposed', current_date + 9, 'proposed', false, 'not_started'),
  ('8a000000-0000-0000-0000-000000000007', '5a000000-0000-0000-0000-000000000002', '6a000000-0000-0000-0000-000000000004', 'Cancelled', current_date + 9, 'active', false, 'not_started'),
  ('8a000000-0000-0000-0000-000000000008', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Eight', current_date + 9, 'active', false, 'not_started');

-- Attributes and grants
select ok((select prosecdef and proconfig @> array['search_path=""'] from pg_proc
  where oid = 'public.tasks_delegate(uuid, uuid, timestamptz)'::regprocedure), 'tasks_delegate is security definer with an empty search_path');
select ok(has_function_privilege('authenticated', 'public.tasks_delegate(uuid, uuid, timestamptz)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.tasks_delegate(uuid, uuid, timestamptz)', 'EXECUTE'),
  'tasks_delegate is granted to authenticated only');
select ok(not has_function_privilege('authenticated', 'public.notifications_emit(uuid, text, uuid, public.recipient_spec[])', 'EXECUTE')
  and not has_function_privilege('anon', 'public.notifications_emit(uuid, text, uuid, public.recipient_spec[])', 'EXECUTE'),
  'the notifications_emit stub is revoked from authenticated and anon');
select ok(has_function_privilege('postgres', 'public.notifications_emit(uuid, text, uuid, public.recipient_spec[])', 'EXECUTE'),
  'the notifications_emit stub can still be called by the system');
select ok(not has_function_privilege('authenticated', 'public.task_assignment_log_guard()', 'EXECUTE'),
  'authenticated cannot execute the log trigger function');
select ok(has_table_privilege('authenticated', 'public.task_assignment_log', 'SELECT')
  and not has_table_privilege('authenticated', 'public.task_assignment_log', 'INSERT')
  and not has_table_privilege('authenticated', 'public.task_assignment_log', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.task_assignment_log', 'DELETE'),
  'authenticated may only select from the log');
select throws_ok($$insert into public.task_assignment_log (task_id, kind) values
  ('8a000000-0000-0000-0000-000000000001', 'revoked')$$, '23514', null, 'an unknown kind is rejected');

-- The lead delegates to a joined holder
set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select lives_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'))$$,
  'the lead delegates to a joined holder');
select results_eq(
  $$select owner_user_id, delegated_at is not null, accepted_at is not null from public.tasks where id = '8a000000-0000-0000-0000-000000000001'$$,
  $$values ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, true, true)$$, 'the owner is set and counts as accepted');
select results_eq(
  $$select from_user, to_user, by_user, kind from public.task_assignment_log where task_id = '8a000000-0000-0000-0000-000000000001'$$,
  $$values (null::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'delegated')$$,
  'one delegated row is logged');
select is(
  public.tasks_delegate('8a000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001')),
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'),
  'the same owner again returns the current updated_at');
select is((select count(*) from public.task_assignment_log where task_id = '8a000000-0000-0000-0000-000000000001'), 1::bigint,
  'the repeat writes no second row');
select lives_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'))$$,
  'the lead moves the Task to another holder');
select results_eq(
  $$select from_user, to_user from public.task_assignment_log where task_id = '8a000000-0000-0000-0000-000000000001' order by created_at desc limit 1$$,
  $$values ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)$$,
  'the log remembers who held it before');
select is((select count(*) from public.task_assignment_log where task_id = '8a000000-0000-0000-0000-000000000001'), 2::bigint,
  'the log holds both hand-overs');

-- The lead's target limits
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'))$$,
  '42501', null, 'the lead cannot pick a pending invitee');
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'))$$,
  '42501', null, 'the lead cannot pick a holder of another Role only');
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'))$$,
  '42501', null, 'the lead cannot pick someone outside the Event');
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000002', null,
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'))$$,
  '42501', null, 'a null target is refused');
select lives_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000008', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000008'))$$,
  'the lead delegates to themself');
select results_eq(
  $$select owner_user_id, accepted_at is not null from public.tasks where id = '8a000000-0000-0000-0000-000000000008'$$,
  $$values ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, true)$$, 'self-delegation is accepted at once');
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now() - interval '1 day')$$,
  '40001', null, 'a stale updated_at is refused');

-- Task states
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000003'))$$,
  '22023', null, 'a dismissed Task is refused');
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000004', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000004'))$$,
  '22023', null, 'an obsolete Task is refused');
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000005', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000005'))$$,
  '22023', null, 'a done Task is refused');
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000006', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000006'))$$,
  '22023', null, 'a proposed Task is refused');

-- Denied callers
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000002', 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'))$$,
  '42501', null, 'a non-lead holder cannot delegate');
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'))$$,
  '42501', null, 'the owner who is not the lead cannot hand the Task on');
set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'))$$,
  '42501', null, 'the lead of another Role cannot delegate');
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'))$$,
  '42501', null, 'a stranger cannot delegate');

-- The log: reads follow Task visibility, writes are denied
select is((select count(*) from public.task_assignment_log), 0::bigint, 'a stranger sees no log rows');
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select is((select count(*) from public.task_assignment_log where task_id = '8a000000-0000-0000-0000-000000000001'), 2::bigint,
  'a holder of the Role sees the log');
select throws_ok($$insert into public.task_assignment_log (task_id, kind) values ('8a000000-0000-0000-0000-000000000001', 'delegated')$$,
  '42501', null, 'a direct insert is denied');
select throws_ok($$update public.task_assignment_log set kind = 'accepted'$$, '42501', null, 'a direct update is denied');
select throws_ok($$delete from public.task_assignment_log$$, '42501', null, 'a direct delete is denied');

-- The Organizer: any Team member, joined or pending, or themself
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'))$$,
  'the Organizer delegates to a pending invitee');
select lives_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'))$$,
  'the Organizer delegates across Roles');
select lives_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'))$$,
  'the Organizer delegates to themself');
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'))$$,
  '42501', null, 'the Organizer cannot pick someone outside the Event');
select throws_ok($$select public.tasks_delegate('8a000000-0000-0000-0000-000000000007', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000007'))$$,
  '55000', null, 'a cancelled Event is read-only');
select is((select count(*) from public.task_assignment_log where task_id = '8a000000-0000-0000-0000-000000000002'), 3::bigint,
  'the Organizer path logged three hand-overs');
select is((select owner_user_id from public.tasks where id = '8a000000-0000-0000-0000-000000000002'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'the Organizer now owns the Task');

-- The trigger: only an FK action may touch a row
reset role;
select throws_ok($$update public.task_assignment_log set kind = 'accepted' where task_id = '8a000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'even the table owner cannot rewrite a log row');
select lives_ok($$delete from auth.users where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'$$,
  'deleting a user still works with log rows pointing at them');
select is((select count(*) from public.task_assignment_log where task_id = '8a000000-0000-0000-0000-000000000001' and to_user is null), 1::bigint,
  'the user column was nulled and the row kept');
select is((select count(*) from public.task_assignment_log where task_id = '8a000000-0000-0000-0000-000000000001'), 2::bigint,
  'no log row was lost');
select lives_ok($$delete from public.tasks where id = '8a000000-0000-0000-0000-000000000001'$$, 'deleting a Task cascades to its log');
select is((select count(*) from public.task_assignment_log where task_id = '8a000000-0000-0000-0000-000000000001'), 0::bigint,
  'the cascade removed the log rows');

select * from finish();
rollback;
