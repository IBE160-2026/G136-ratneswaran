begin;
select plan(45);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stranger-b@example.test'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'lead-c@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'owner-d@example.test'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'other-role-e@example.test'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'holder-f@example.test');

insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at) values
  ('5b000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('5b000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now(), now()),
  ('5b000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Draft',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', null, null);

insert into public.roles (id, event_id, key, active) values
  ('6b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', 'venue', true),
  ('6b000000-0000-0000-0000-000000000002', '5b000000-0000-0000-0000-000000000001', 'guests', true),
  ('6b000000-0000-0000-0000-000000000003', '5b000000-0000-0000-0000-000000000002', 'venue', true),
  ('6b000000-0000-0000-0000-000000000004', '5b000000-0000-0000-0000-000000000003', 'venue', true);

-- C leads Venue; D and F hold it; E holds Guests
insert into public.role_members (event_id, role_id, user_id, name, joined_at, is_lead) values
  ('5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', now(), true),
  ('5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', now(), false),
  ('5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Finn', now(), false),
  ('5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Erik', now(), false);
insert into public.role_member_contacts (role_member_id, event_id, email)
select m.id, m.event_id, u.email from public.role_members m join auth.users u on u.id = m.user_id;

-- 1 owned by D; 2 done; 3 obsolete; 4 proposed; 5 dismissed; 6 cancelled Event; 7 draft Event;
-- 8 owned by the lead C; 9 Role-owned
insert into public.tasks (id, event_id, role_id, title, deadline, lifecycle, obsolete, status, owner_user_id, delegated_at) values
  ('8b000000-0000-0000-0000-000000000001', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'One', current_date + 9, 'active', false, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now()),
  ('8b000000-0000-0000-0000-000000000002', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Done', current_date + 9, 'active', false, 'done', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now()),
  ('8b000000-0000-0000-0000-000000000003', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Obsolete', current_date + 9, 'active', true, 'not_started', 'dddddddd-dddd-dddd-dddd-dddddddddddd', now()),
  ('8b000000-0000-0000-0000-000000000004', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Proposed', current_date + 9, 'proposed', false, 'not_started', null, null),
  ('8b000000-0000-0000-0000-000000000005', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Dismissed', current_date + 9, 'dismissed', false, 'not_started', null, null),
  ('8b000000-0000-0000-0000-000000000006', '5b000000-0000-0000-0000-000000000002', '6b000000-0000-0000-0000-000000000003', 'Cancelled', current_date + 9, 'active', false, 'not_started', null, null),
  ('8b000000-0000-0000-0000-000000000007', '5b000000-0000-0000-0000-000000000003', '6b000000-0000-0000-0000-000000000004', 'Draft', current_date + 9, 'active', false, 'not_started', null, null),
  ('8b000000-0000-0000-0000-000000000008', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Lead owns', current_date + 9, 'active', false, 'not_started', 'cccccccc-cccc-cccc-cccc-cccccccccccc', now()),
  ('8b000000-0000-0000-0000-000000000009', '5b000000-0000-0000-0000-000000000001', '6b000000-0000-0000-0000-000000000001', 'Role owned', current_date + 9, 'active', false, 'not_started', null, null);

-- A recording stand-in for the stub, inside this transaction only
create table public.emit_log (event_id uuid, kind text, subject uuid, recipients public.recipient_spec[]);
create or replace function public.notifications_emit(
  p_event_id uuid, p_kind text, p_subject_ref uuid, p_recipients public.recipient_spec[]
) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.emit_log values (p_event_id, p_kind, p_subject_ref, p_recipients);
end;
$$;

-- Attributes and grants
select ok((select bool_and(prosecdef and proconfig @> array['search_path=""']) from pg_proc
  where oid in ('public.tasks_report_problem(uuid, text)'::regprocedure, 'public.tasks_resolve_problem(uuid, text)'::regprocedure)),
  'both functions are security definer with an empty search_path');
select ok(has_function_privilege('authenticated', 'public.tasks_report_problem(uuid, text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.tasks_resolve_problem(uuid, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.tasks_report_problem(uuid, text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.tasks_resolve_problem(uuid, text)', 'EXECUTE'),
  'both functions are granted to authenticated only');
select ok(not has_table_privilege('authenticated', 'public.problems', 'INSERT')
  and not has_table_privilege('authenticated', 'public.problems', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.problems', 'DELETE')
  and has_table_privilege('authenticated', 'public.problems', 'SELECT')
  and not has_table_privilege('anon', 'public.problems', 'SELECT'),
  'authenticated may only select; anon gets nothing');

-- Denied callers
set local role authenticated;
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select throws_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000001', 'No')$$,
  '42501', null, 'a plain holder who does not own the Task cannot report');
set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select throws_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000001', 'No')$$,
  '42501', null, 'a holder of another Role cannot report');
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000001', 'No')$$,
  '42501', null, 'a non-member cannot report');
select throws_ok($$select public.tasks_report_problem('00000000-0000-0000-0000-000000000000', 'No')$$,
  '42501', null, 'an unknown Task is refused the same way');
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select throws_ok($$select public.tasks_resolve_problem('8b000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'a plain holder cannot resolve');
set local role anon;
select throws_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000001', 'No')$$,
  '42501', null, 'anon cannot call report');

-- The owner reports
set local role authenticated;
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select lives_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000001', '  Caterer cancelled  ')$$,
  'the owner reports a problem');
select is((select count(*)::int from public.problems where task_id = '8b000000-0000-0000-0000-000000000001' and resolved_at is null),
  1, 'one open Problem exists');
select is((select note from public.problems where task_id = '8b000000-0000-0000-0000-000000000001'), 'Caterer cancelled', 'the note is trimmed');
select is((select count(*)::int from public.emit_log), 1, 'one notification was emitted');
select results_eq($$select kind, subject = (select id from public.problems limit 1) from public.emit_log$$,
  $$values ('problem_reported', true)$$, 'the kind is problem_reported and the subject is the Problem id');
select is((select (select count(*)::int from unnest(recipients) r where r.id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc'))
  from public.emit_log), 2, 'the Organizer and the lead are recipients');
select is((select cardinality(recipients) from public.emit_log), 2, 'and nobody else, the owner excluded');
select is((select to_jsonb(emit_log) ? 'note' from public.emit_log), false, 'the emit call carries no note');

-- Repeat
select is((select public.tasks_report_problem('8b000000-0000-0000-0000-000000000001', 'Again')),
  (select id from public.problems where task_id = '8b000000-0000-0000-0000-000000000001'), 'a repeat returns the existing id');
select is((select count(*)::int from public.problems), 1, 'a repeat adds no row');
select is((select count(*)::int from public.emit_log), 1, 'a repeat emits nothing');
select is((select has_problem from public.task_state where id = '8b000000-0000-0000-0000-000000000001'), true, 'has_problem is true');

-- Bad notes
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select throws_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000009', '   ')$$,
  '23514', null, 'a blank note is refused');
select throws_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000009', repeat('x', 501))$$,
  '23514', null, 'a note over 500 characters is refused');

-- The lead reports on a done Task; the lead owns another, so the Organizer alone is notified
select lives_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000002', 'Late')$$, 'the lead reports on a done Task');
select lives_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000008', 'Mine')$$, 'the lead reports on their own Task');
select is((select cardinality(recipients) from public.emit_log order by ctid desc limit 1), 1, 'the reporter lead is excluded');

-- Lifecycle refusals
select throws_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000003', 'x')$$, '22023', null, 'an obsolete Task is refused');
select throws_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000004', 'x')$$, '22023', null, 'a proposed Task is refused');
select throws_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000005', 'x')$$, '22023', null, 'a dismissed Task is refused');

-- The Organizer: who is also the one notified is excluded; a draft emits nothing
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000009', 'Organizer flags')$$, 'the Organizer reports');
select is((select (select string_agg(r.id::text, ',') from unnest(recipients) r) from public.emit_log order by ctid desc limit 1),
  'cccccccc-cccc-cccc-cccc-cccccccccccc', 'the lead alone is notified');
select lives_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000007', 'Draft note')$$, 'a draft Event allows the report');
select is((select count(*)::int from public.emit_log), 4, 'but a draft emits nothing');
select throws_ok($$select public.tasks_report_problem('8b000000-0000-0000-0000-000000000006', 'x')$$, '55000', null, 'a cancelled Event is read-only');

-- Direct writes
select throws_ok($$insert into public.problems (task_id, note) values ('8b000000-0000-0000-0000-000000000009', 'x')$$, '42501', null, 'a direct insert is denied');
select throws_ok($$update public.problems set note = 'x'$$, '42501', null, 'a direct update is denied');
select throws_ok($$delete from public.problems$$, '42501', null, 'a direct delete is denied');

-- Visibility follows the Task
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select is((select count(*)::int from public.problems where task_id = '8b000000-0000-0000-0000-000000000001'), 1, 'a Role holder reads the Problem');
set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select is((select count(*)::int from public.problems), 0, 'a holder of another Role reads none');

-- Resolve
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select lives_ok($$select public.tasks_resolve_problem('8b000000-0000-0000-0000-000000000001', '  Rebooked  ')$$, 'the lead resolves');
select results_eq($$select resolved_by::text, resolution_note, resolved_at is not null from public.problems where task_id = '8b000000-0000-0000-0000-000000000001'$$,
  $$values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Rebooked', true)$$, 'who, the trimmed note and when are stored');
select is((select has_problem from public.task_state where id = '8b000000-0000-0000-0000-000000000001'), false, 'has_problem is false after resolving');
select lives_ok($$select public.tasks_resolve_problem('8b000000-0000-0000-0000-000000000001', 'Again')$$, 'a repeat resolve is quiet');
select is((select resolution_note from public.problems where task_id = '8b000000-0000-0000-0000-000000000001'), 'Rebooked', 'and changes nothing');

-- An obsolete Task shows no flag
reset role;
update public.tasks set obsolete = true where id = '8b000000-0000-0000-0000-000000000008';
select is((select has_problem from public.task_state where id = '8b000000-0000-0000-0000-000000000008'), false, 'an obsolete Task has no problem flag');

select * from finish();
rollback;
