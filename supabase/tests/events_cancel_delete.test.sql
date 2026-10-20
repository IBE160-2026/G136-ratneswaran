begin;
select plan(35);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b@example.test');

-- A's Events: published future (1, 2, 3), published ended (4), draft (5), past draft (6)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at)
select id::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Party', now() + starts, now() + starts + interval '4 hours',
  'Europe/Oslo', 'en', published
from (values
  ('10000000-0000-0000-0000-000000000001', interval '7 days', now()),
  ('10000000-0000-0000-0000-000000000002', interval '7 days', now()),
  ('10000000-0000-0000-0000-000000000003', interval '7 days', now()),
  ('10000000-0000-0000-0000-000000000004', interval '-30 days', now()),
  ('10000000-0000-0000-0000-000000000005', interval '7 days', null),
  ('10000000-0000-0000-0000-000000000006', interval '-30 days', null)
) as v (id, starts, published);
insert into public.roles (event_id, key)
select e.id, k.key from public.events e cross join unnest(enum_range(null::public.role_key)) as k (key)
where e.organizer_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

-- Function attributes and grants
select ok(
  (select bool_and(prosecdef and proconfig @> array['search_path=""']) from pg_proc
   where oid in ('public.events_cancel(uuid, text)'::regprocedure, 'public.events_delete(uuid)'::regprocedure)),
  'events_cancel and events_delete are security definer with an empty search_path'
);
select ok(
  has_function_privilege('authenticated', 'public.events_cancel(uuid, text)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.events_cancel(uuid, text)', 'EXECUTE')
    and not has_function_privilege('public', 'public.events_cancel(uuid, text)', 'EXECUTE'),
  'only authenticated can execute events_cancel'
);
select ok(
  has_function_privilege('authenticated', 'public.events_delete(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.events_delete(uuid)', 'EXECUTE')
    and not has_function_privilege('public', 'public.events_delete(uuid)', 'EXECUTE'),
  'only authenticated can execute events_delete'
);
select ok(
  not has_function_privilege('authenticated', 'public.events_refuse_read_only()', 'EXECUTE')
    and not has_function_privilege('anon', 'public.events_refuse_read_only()', 'EXECUTE'),
  'nobody executes the read-only trigger function directly'
);
select is(
  (select array_agg(attname::text order by attname) from pg_attribute
   where attrelid = 'public.events'::regclass and attnum > 0 and not attisdropped
     and has_column_privilege('authenticated', attrelid, attnum, 'UPDATE')),
  array['description', 'name'],
  'authenticated gets no grant on cancellation_note or cancelled_at'
);
select is_empty(
  $$select conrelid::regclass::text from pg_constraint
    where contype = 'f' and confrelid = 'public.events'::regclass and confdeltype <> 'c'$$,
  'every foreign key to events is ON DELETE CASCADE'
);
select isnt_empty(
  $$select 1 from pg_constraint where contype = 'f' and confrelid = 'public.events'::regclass$$,
  'the foreign key check sees at least one foreign key'
);

-- Other user B and anon are refused
set local role authenticated;
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok(
  $$select public.events_cancel('10000000-0000-0000-0000-000000000001', null)$$,
  '42501', null, 'B cannot cancel A''s Event'
);
select throws_ok(
  $$select public.events_delete('10000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'B cannot delete A''s Event'
);
set local role anon;
select throws_ok(
  $$select public.events_cancel('10000000-0000-0000-0000-000000000001', null)$$,
  '42501', null, 'anon is denied events_cancel'
);
select throws_ok(
  $$select public.events_delete('10000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'anon is denied events_delete'
);

-- A cancels
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok(
  $$select public.events_cancel('10000000-0000-0000-0000-000000000001', ' Rain ')$$,
  'A cancels a published future Event'
);
select results_eq(
  $$select cancelled_at is not null, cancellation_note from public.events
    where id = '10000000-0000-0000-0000-000000000001'$$,
  $$values (true, 'Rain'::text)$$,
  'cancelled_at is set and the trimmed note saved'
);
select public.events_cancel('10000000-0000-0000-0000-000000000002', '  ');
select is(
  (select cancellation_note from public.events where id = '10000000-0000-0000-0000-000000000002'),
  null,
  'a blank note is stored as null'
);
select throws_ok(
  format($$select public.events_cancel('10000000-0000-0000-0000-000000000003', %L)$$, repeat('x', 501)),
  '23514', null, 'a note over 500 characters is rejected'
);
select throws_ok(
  $$select public.events_cancel('10000000-0000-0000-0000-000000000005', null)$$,
  '55000', null, 'a draft cannot be cancelled'
);
select throws_ok(
  $$select public.events_cancel('10000000-0000-0000-0000-000000000001', null)$$,
  '55000', null, 'a cancelled Event cannot be cancelled again'
);
select throws_ok(
  $$select public.events_cancel('10000000-0000-0000-0000-000000000004', null)$$,
  '55000', null, 'an ended published Event cannot be cancelled'
);
select throws_ok(
  $$update public.events set cancellation_note = 'x' where id = '10000000-0000-0000-0000-000000000003'$$,
  '42501', null, 'A cannot write cancellation_note directly'
);

-- A cancelled Event is read-only for every writer
select throws_ok(
  $$select public.events_update_schedule('10000000-0000-0000-0000-000000000001', '2027-06-01 18:00',
    '2027-06-01 22:00', 'Europe/Oslo', null, 'en')$$,
  '55000', null, 'the schedule of a cancelled Event cannot change'
);
select throws_ok(
  $$select public.events_save_questionnaire('10000000-0000-0000-0000-000000000001', 'birthday',
    '2027-06-01 18:00', 'Europe/Oslo', 240, 80, false, false, null, 'manual', 'en', '{}')$$,
  '55000', null, 'the questionnaire of a cancelled Event cannot change'
);
select throws_ok(
  $$select public.events_set_role_active(
    (select id from public.roles where event_id = '10000000-0000-0000-0000-000000000001' and key = 'venue'), true)$$,
  '55000', null, 'a Role of a cancelled Event cannot be switched'
);
select throws_ok(
  $$update public.events set name = 'Renamed' where id = '10000000-0000-0000-0000-000000000001'$$,
  '55000', null, 'a cancelled Event cannot be renamed'
);

-- An ended published Event is read-only, a past draft and a future Event are not
select throws_ok(
  $$select public.events_update_schedule('10000000-0000-0000-0000-000000000004', '2027-06-01 18:00',
    '2027-06-01 22:00', 'Europe/Oslo', null, 'en')$$,
  '55000', null, 'the schedule of an ended published Event cannot change'
);
select throws_ok(
  $$select public.events_set_role_active(
    (select id from public.roles where event_id = '10000000-0000-0000-0000-000000000004' and key = 'venue'), true)$$,
  '55000', null, 'a Role of an ended published Event cannot be switched'
);
select lives_ok(
  $$select public.events_update_schedule('10000000-0000-0000-0000-000000000006', '2027-06-01 18:00',
    '2027-06-01 22:00', 'Europe/Oslo', null, 'en')$$,
  'a past draft stays editable'
);
select lives_ok(
  $$select public.events_set_role_active(
    (select id from public.roles where event_id = '10000000-0000-0000-0000-000000000003' and key = 'venue'), true)$$,
  'a Role of a future published Event can be switched'
);
select lives_ok(
  $$update public.events set name = 'Renamed' where id = '10000000-0000-0000-0000-000000000003'$$,
  'a future published Event can be renamed'
);

-- Delete: direct DELETE stays closed, the function removes the Event in any state with its Roles
select throws_ok(
  $$delete from public.events where id = '10000000-0000-0000-0000-000000000003'$$,
  '42501', null, 'A cannot delete an Event directly'
);
select throws_ok(
  $$delete from public.roles where event_id = '10000000-0000-0000-0000-000000000003'$$,
  '42501', null, 'A cannot delete a Role directly'
);
select lives_ok(
  $$select public.events_delete('10000000-0000-0000-0000-000000000003')$$,
  'A deletes a published Event'
);
select lives_ok(
  $$select public.events_delete('10000000-0000-0000-0000-000000000001')$$,
  'A deletes a cancelled Event'
);
select lives_ok(
  $$select public.events_delete('10000000-0000-0000-0000-000000000005')$$,
  'A discards a draft'
);

reset role;
select is(
  (select count(*) from public.events where id in
    ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003',
     '10000000-0000-0000-0000-000000000005')),
  0::bigint,
  'the deleted Events are gone'
);
select is(
  (select count(*) from public.roles where event_id in
    ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003',
     '10000000-0000-0000-0000-000000000005')),
  0::bigint,
  'their Roles went with them'
);

select * from finish();
rollback;
