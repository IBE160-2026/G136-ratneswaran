begin;
select plan(65);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stranger-b@example.test'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'lead-c@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'owner-d@example.test'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'lead-e@example.test'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'holder-f@example.test'),
  ('99999999-9999-9999-9999-999999999999', 'gone-g@example.test');

-- Live (1) and cancelled (2)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at) values
  ('5a000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('5a000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now(), now());

insert into public.roles (id, event_id, key, active) values
  ('6a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', 'venue', true),
  ('6a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', 'guests', true),
  ('6a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000002', 'venue', true);

-- C leads Venue, D owns and F holds there; E leads Guests
insert into public.role_members (id, event_id, role_id, user_id, name, joined_at, is_lead) values
  ('7a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now(), true),
  ('7a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', now(), false),
  ('7a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Eli', now(), true),
  ('7a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Finn', now(), false);
insert into public.role_member_contacts (role_member_id, event_id, email)
select m.id, m.event_id, u.email from public.role_members m join auth.users u on u.id = m.user_id;

-- 1 owned by D; 2 owned by D, delegated and not accepted; 3 dismissed; 4 obsolete; 5 on the cancelled Event;
-- 6 past deadline; 7 past deadline and done; 8 past deadline and dismissed; 9 past deadline and obsolete
insert into public.tasks (id, event_id, role_id, title, deadline, owner_user_id, lifecycle, obsolete, status, delegated_at) values
  ('8a000000-0000-0000-0000-000000000001', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Owned', current_date + 9, 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'active', false, 'not_started', null),
  ('8a000000-0000-0000-0000-000000000002', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Delegated', current_date + 9, 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'active', false, 'not_started', now()),
  ('8a000000-0000-0000-0000-000000000003', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Dismissed', current_date + 9, 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'dismissed', false, 'not_started', null),
  ('8a000000-0000-0000-0000-000000000004', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Obsolete', current_date + 9, 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'active', true, 'not_started', null),
  ('8a000000-0000-0000-0000-000000000005', '5a000000-0000-0000-0000-000000000002', '6a000000-0000-0000-0000-000000000004', 'Cancelled', current_date + 9, null, 'active', false, 'not_started', null),
  ('8a000000-0000-0000-0000-000000000006', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Late', current_date - 3, null, 'active', false, 'not_started', null),
  ('8a000000-0000-0000-0000-000000000007', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Late done', current_date - 3, null, 'active', false, 'done', null),
  ('8a000000-0000-0000-0000-000000000008', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Late dismissed', current_date - 3, null, 'dismissed', false, 'not_started', null),
  ('8a000000-0000-0000-0000-000000000009', '5a000000-0000-0000-0000-000000000001', '6a000000-0000-0000-0000-000000000001', 'Late obsolete', current_date - 3, null, 'active', true, 'not_started', null);

-- Attributes and grants
select ok(
  (select bool_and(prosecdef and proconfig @> array['search_path=""']) from pg_proc
   where oid in ('public.tasks_set_status(uuid, timestamptz, text, text)'::regprocedure,
                 'public.tasks_remove_status_note(uuid)'::regprocedure)),
  'both mutation functions are security definer with an empty search_path');
select ok(has_function_privilege('authenticated', 'public.tasks_set_status(uuid, timestamptz, text, text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.tasks_remove_status_note(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.tasks_set_status(uuid, timestamptz, text, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.tasks_remove_status_note(uuid)', 'EXECUTE'),
  'the mutation functions are granted to authenticated only');
select ok(not has_function_privilege('authenticated', 'public.status_history_guard()', 'EXECUTE'),
  'authenticated cannot execute the history trigger function');
select ok(has_table_privilege('authenticated', 'public.status_history', 'SELECT')
  and not has_table_privilege('authenticated', 'public.status_history', 'INSERT')
  and not has_table_privilege('authenticated', 'public.status_history', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.status_history', 'DELETE'),
  'authenticated may only select from status_history');

-- CHECKs, as postgres
select throws_ok($$insert into public.status_history (task_id, from_status, to_status) values
  ('8a000000-0000-0000-0000-000000000001', 'not_started', 'overdue')$$, '23514', null, 'overdue is not a status');
select throws_ok($$insert into public.status_history (task_id, from_status, to_status, note) values
  ('8a000000-0000-0000-0000-000000000001', 'not_started', 'done', repeat('a', 501))$$, '23514', null, 'a note over 500 characters is rejected');

-- tasks_set_status: the owner
set local role authenticated;
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select lives_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000001',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'), 'in_progress', '  Called the hall  ')$$,
  'the owner sets a status with a note');
select results_eq(
  $$select status from public.tasks where id = '8a000000-0000-0000-0000-000000000001'$$,
  $$values ('in_progress')$$, 'the status changed');
select results_eq(
  $$select from_status, to_status, note, changed_by from public.status_history where task_id = '8a000000-0000-0000-0000-000000000001'$$,
  $$values ('not_started', 'in_progress', 'Called the hall', 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid)$$,
  'one history row holds the trimmed note');
select is(
  public.tasks_set_status('8a000000-0000-0000-0000-000000000001',
    (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'), 'in_progress'),
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'),
  'the same status without a note returns the current updated_at');
select is((select count(*) from public.status_history where task_id = '8a000000-0000-0000-0000-000000000001'), 1::bigint,
  'the repeat writes no history row');
select lives_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000001',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'), 'in_progress', '   ')$$,
  'a blank note counts as no note');
select is((select count(*) from public.status_history where task_id = '8a000000-0000-0000-0000-000000000001'), 1::bigint,
  'a blank note writes nothing');
select lives_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000001',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'), 'in_progress', 'Still waiting')$$,
  'the same status with a note is accepted');
select results_eq(
  $$select from_status, to_status from public.status_history where task_id = '8a000000-0000-0000-0000-000000000001' and note = 'Still waiting'$$,
  $$values ('in_progress', 'in_progress')$$, 'the same status with a note writes a row with from = to');
select throws_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000001', now() - interval '1 day', 'done')$$,
  '40001', null, 'a stale updated_at is refused');
select throws_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000001',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'), 'overdue')$$,
  '22023', null, 'overdue is not settable');
select throws_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000001',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'), 'done', repeat('a', 501))$$,
  '23514', null, 'a note over 500 characters is refused');

-- Inactive Tasks and a read-only Event
select throws_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000003',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000003'), 'done')$$,
  '22023', null, 'a dismissed Task is refused');
select throws_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000004',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000004'), 'done')$$,
  '22023', null, 'an obsolete Task is refused');

-- Accept first
select throws_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000002',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'), 'done')$$,
  '55007', null, 'an owner who has not accepted is refused');
select is((select count(*) from public.status_history where task_id = '8a000000-0000-0000-0000-000000000002'), 0::bigint,
  'the refusal writes nothing');

-- Everyone else
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select throws_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000001',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'), 'done')$$,
  '42501', null, 'a holder who does not own the Task is denied');
set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select throws_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000001',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'), 'done')$$,
  '42501', null, 'the lead of another Role is denied');
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000001', now(), 'done')$$,
  '42501', null, 'a stranger is denied');

-- An unowned Task is not open to a holder, and an owner who lost the Role is denied
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select throws_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000006',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000006'), 'done')$$,
  '42501', null, 'a holder is denied on an unowned Task');
reset role;
update public.tasks set owner_user_id = '99999999-9999-9999-9999-999999999999' where id = '8a000000-0000-0000-0000-000000000006';
set local role authenticated;
set local request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';
select throws_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000006',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000006'), 'done')$$,
  '42501', null, 'an owner who no longer holds the Role is denied');

-- The lead and the Organizer pass accept-first
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select lives_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000002',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'), 'waiting_external', 'Asked the hotel')$$,
  'the lead sets the status of an unaccepted Task');
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000002',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000002'), 'done')$$,
  'the Organizer sets the status of an unaccepted Task');
select throws_ok($$select public.tasks_set_status('8a000000-0000-0000-0000-000000000005',
  (select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000005'), 'done')$$,
  '55000', null, 'a cancelled Event is refused');

-- Direct writes
select throws_ok($$insert into public.status_history (task_id, from_status, to_status) values
  ('8a000000-0000-0000-0000-000000000001', 'not_started', 'done')$$, '42501', null, 'a direct INSERT is denied');
select throws_ok($$update public.status_history set to_status = 'done'$$, '42501', null, 'a direct UPDATE is denied');
select throws_ok($$delete from public.status_history$$, '42501', null, 'a direct DELETE is denied');

-- Reading
select is((select count(*) from public.status_history where task_id = '8a000000-0000-0000-0000-000000000001'), 2::bigint,
  'the Organizer reads the history');
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select is((select count(*) from public.status_history where task_id = '8a000000-0000-0000-0000-000000000001'), 2::bigint,
  'a holder of the Role reads the history');
set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select is((select count(*) from public.status_history), 0::bigint, 'a holder of another Role reads none');

-- tasks_remove_status_note
select throws_ok($$select public.tasks_remove_status_note((select id from public.status_history where note = 'Called the hall'))$$,
  '42501', null, 'a holder of another Role cannot remove a note');
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select throws_ok($$select public.tasks_remove_status_note((select id from public.status_history where note = 'Called the hall'))$$,
  '42501', null, 'a holder who is not the author cannot remove a note');
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select throws_ok($$select public.tasks_remove_status_note((select id from public.status_history where note = 'Called the hall'))$$,
  '42501', null, 'the lead who is not the author cannot remove a note');
select throws_ok($$select public.tasks_remove_status_note(gen_random_uuid())$$, '42501', null,
  'an unknown note looks the same as a foreign one');

create temp table before_remove as
  select t.updated_at, h.created_at from public.tasks t, public.status_history h
  where t.id = '8a000000-0000-0000-0000-000000000001' and h.note = 'Called the hall';
grant select on before_remove to authenticated;

set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select lives_ok($$select public.tasks_remove_status_note((select id from public.status_history where note = 'Called the hall'))$$,
  'the author removes a note');
select results_eq(
  $$select note is null, note_removed_at is not null, created_at = (select created_at from before_remove), to_status
    from public.status_history where task_id = '8a000000-0000-0000-0000-000000000001' and to_status = 'in_progress' and from_status = 'not_started'$$,
  $$values (true, true, true, 'in_progress')$$, 'the row stays with its time, the text is gone and the removal is stamped');
select is((select updated_at from public.tasks where id = '8a000000-0000-0000-0000-000000000001'),
  (select updated_at from before_remove), 'removing a note does not move the Task');
create temp table removed_at as
  select note_removed_at from public.status_history
  where task_id = '8a000000-0000-0000-0000-000000000001' and to_status = 'in_progress' and from_status = 'not_started';
grant select on removed_at to authenticated;
select lives_ok($$select public.tasks_remove_status_note((select id from public.status_history
  where task_id = '8a000000-0000-0000-0000-000000000001' and from_status = 'not_started'))$$, 'a repeat is a no-op');
select is((select note_removed_at from public.status_history
  where task_id = '8a000000-0000-0000-0000-000000000001' and from_status = 'not_started'),
  (select note_removed_at from removed_at), 'the repeat keeps the first stamp');
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$select public.tasks_remove_status_note((select id from public.status_history where note = 'Asked the hotel'))$$,
  'the Organizer removes a note written by someone else');

-- The history trigger, as postgres
reset role;
select throws_ok($$update public.status_history set to_status = 'done' where note = 'Still waiting'$$,
  '42501', null, 'the trigger refuses a change of status');
select throws_ok($$update public.status_history set note = 'Edited' where note = 'Still waiting'$$,
  '42501', null, 'the trigger refuses an edited note');
select lives_ok($$update public.status_history set note = null, note_removed_at = now() where note = 'Still waiting'$$,
  'the trigger lets a note be removed');
insert into public.status_history (task_id, changed_by, from_status, to_status)
values ('8a000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999999', 'done', 'done');
select lives_ok($$delete from auth.users where id = '99999999-9999-9999-9999-999999999999'$$, 'a user who wrote history can be deleted');
select is((select count(*) from public.status_history where from_status = 'done' and to_status = 'done' and changed_by is null), 1::bigint,
  'the row stays with no author');

-- tasks_overdue_days: Oslo is UTC+1 on 10 March 2027 and UTC+2 from 28 March
select is(public.tasks_overdue_days('2027-03-10', 'Europe/Oslo', '2027-03-10 22:59:59+00'), null::integer,
  '23:59:59 local on the deadline day is not overdue');
select is(public.tasks_overdue_days('2027-03-10', 'Europe/Oslo', '2027-03-10 23:00:00+00'), 1,
  '00:00:00 the next day is overdue by 1 day');
select is(public.tasks_overdue_days('2027-03-10', 'Europe/Oslo', '2027-03-12 11:00:00+00'), 2, 'two days after is 2 days');
select is(public.tasks_overdue_days('2027-03-28', 'Europe/Oslo', '2027-03-28 21:59:59+00'), null::integer,
  'on the change-over day the boundary is still local midnight (before)');
select is(public.tasks_overdue_days('2027-03-28', 'Europe/Oslo', '2027-03-28 22:00:00+00'), 1,
  'on the change-over day the boundary is still local midnight (after)');
select is(public.tasks_overdue_days('2027-03-10', null, '2027-03-11 00:00:00+00'), 1, 'no time zone reads UTC');
select is(public.tasks_overdue_days(null, 'Europe/Oslo'), null::integer, 'no deadline is never overdue');

-- task_state
select results_eq(
  $$select overdue, overdue_days from public.task_state where id = '8a000000-0000-0000-0000-000000000006'$$,
  $$select true, ((now() at time zone 'Europe/Oslo')::date - (current_date - 3))$$,
  'an active past-deadline Task is overdue');
select is((select count(*) from public.task_state
  where id in ('8a000000-0000-0000-0000-000000000007', '8a000000-0000-0000-0000-000000000008', '8a000000-0000-0000-0000-000000000009')
    and (overdue or overdue_days is not null)), 0::bigint,
  'done, dismissed and obsolete Tasks are not overdue');
select is((select overdue from public.task_state where id = '8a000000-0000-0000-0000-000000000001'), false,
  'a Task with a future deadline is not overdue');

-- A note whose author was deleted is not open to a holder; a read-only Event refuses removal
reset role;
insert into public.status_history (id, task_id, changed_by, from_status, to_status, note) values
  ('9a000000-0000-0000-0000-000000000001', '8a000000-0000-0000-0000-000000000001', null, 'done', 'done', 'Orphan note'),
  ('9a000000-0000-0000-0000-000000000002', '8a000000-0000-0000-0000-000000000005', null, 'not_started', 'done', 'Frozen note');
set local role authenticated;
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select throws_ok($$select public.tasks_remove_status_note('9a000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'a holder cannot remove a note whose author was deleted');
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$select public.tasks_remove_status_note('9a000000-0000-0000-0000-000000000001')$$,
  'the Organizer removes a note whose author was deleted');
select throws_ok($$select public.tasks_remove_status_note('9a000000-0000-0000-0000-000000000002')$$,
  '55000', null, 'a note on a cancelled Event cannot be removed');
select ok(has_function_privilege('authenticated', 'public.tasks_overdue_days(date, text, timestamptz)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.tasks_overdue_days(date, text, timestamptz)', 'EXECUTE'),
  'tasks_overdue_days is granted to authenticated only');

select * from finish();
rollback;
