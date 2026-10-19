begin;
select plan(24);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b@example.test');

create temp table created (id uuid);
grant select, insert on created to authenticated;

-- Schema, grants and function attributes
select is(
  (select array_agg(attname::text order by attname) from pg_attribute
   where attrelid = 'public.events'::regclass and attnum > 0 and not attisdropped
     and has_column_privilege('authenticated', attrelid, attnum, 'UPDATE')),
  array['name'],
  'authenticated still may update only name'
);
select ok(
  (select prosecdef from pg_proc where proname = 'events_save_questionnaire'),
  'events_save_questionnaire is security definer'
);
select ok(
  (select proconfig @> array['search_path=""'] from pg_proc where proname = 'events_save_questionnaire'),
  'events_save_questionnaire sets an empty search_path'
);
select ok(
  not has_function_privilege('anon',
    (select oid from pg_proc where proname = 'events_save_questionnaire'), 'execute'),
  'anon cannot execute events_save_questionnaire'
);
select ok(
  not has_function_privilege('public',
    (select oid from pg_proc where proname = 'events_save_questionnaire'), 'execute'),
  'public cannot execute events_save_questionnaire'
);

-- A creates an event
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
insert into created select public.events_create();

-- Full answers
select lives_ok(
  $$select public.events_save_questionnaire((select id from created), 'birthday', '2027-06-01 18:00',
    'Europe/Oslo', 240, 80, false, true, '2027-05-20', 'invite_link', 'nb', '{}')$$,
  'A saves a full questionnaire'
);
select results_eq(
  $$select event_type, starts_at, ends_at, time_zone, duration_minutes, guest_count, venue_known,
    rsvp_wanted, rsvp_due_date, guest_list_method, language, unknown_answers
    from public.events where id = (select id from created)$$,
  $$values ('birthday'::text, '2027-06-01 16:00Z'::timestamptz, '2027-06-01 20:00Z'::timestamptz,
    'Europe/Oslo'::text, 240, 80, false, true, '2027-05-20'::date, 'invite_link'::text, 'nb'::text, '{}'::text[])$$,
  'each answer is its own column and ends_at is start plus duration'
);

-- Not sure yet
select lives_ok(
  $$select public.events_save_questionnaire((select id from created), 'birthday', '2027-06-01 18:00',
    'Europe/Oslo', 240, null, null, true, '2027-05-20', 'manual', 'nb', '{guest_count,venue_known}')$$,
  'A saves with two questions marked not sure yet'
);
select results_eq(
  $$select guest_count, venue_known, unknown_answers from public.events where id = (select id from created)$$,
  $$values (null::integer, null::boolean, '{guest_count,venue_known}'::text[])$$,
  'unknown answers are null values plus their keys'
);

-- RSVP no
select lives_ok(
  $$select public.events_save_questionnaire((select id from created), 'birthday', '2027-06-01 18:00',
    'Europe/Oslo', 240, 80, true, false, null, 'manual', 'nb', '{}')$$,
  'A saves RSVP wanted no without a due date'
);
select throws_ok(
  $$select public.events_save_questionnaire((select id from created), 'birthday', '2027-06-01 18:00',
    'Europe/Oslo', 240, 80, true, false, '2027-05-20', 'manual', 'nb', '{}')$$,
  '23514', null, 'a due date without RSVP wanted is rejected'
);

-- Invalid input
select throws_ok(
  $$select public.events_save_questionnaire((select id from created), 'birthday', '2027-06-01 18:00',
    'Europe/Oslo', 240, 80, true, true, '2027-06-02', 'manual', 'nb', '{}')$$,
  '23514', null, 'a due date after the Event day is rejected'
);
select lives_ok(
  $$select public.events_save_questionnaire((select id from created), 'birthday', '2027-06-01 23:30',
    'Europe/Oslo', 240, 80, true, true, '2027-06-01', 'manual', 'nb', '{}')$$,
  'a due date on the Event''s local day is accepted'
);
select throws_ok(
  $$select public.events_save_questionnaire((select id from created), 'birthday', '2027-06-01 18:00',
    'Europe/Oslo', 240, 0, true, true, '2027-05-20', 'manual', 'nb', '{}')$$,
  '23514', null, 'guest count 0 is rejected'
);
select throws_ok(
  $$select public.events_save_questionnaire((select id from created), 'birthday', '2027-06-01 18:00',
    'Europe/Oslo', 240, 5, true, true, '2027-05-20', 'manual', 'nb', '{guest_count}')$$,
  '23514', null, 'a value and its unknown key together are rejected'
);
select throws_ok(
  $$select public.events_save_questionnaire((select id from created), 'birthday', '2027-06-01 18:00',
    'Europe/Oslo', 240, 5, true, true, '2027-05-20', 'manual', 'nb', '{bogus}')$$,
  '23514', null, 'an unknown key outside the questionnaire is rejected'
);
select throws_ok(
  $$select public.events_save_questionnaire((select id from created), 'concert', '2027-06-01 18:00',
    'Europe/Oslo', 240, 5, true, true, '2027-05-20', 'manual', 'nb', '{}')$$,
  '23514', null, 'an event type outside the list is rejected'
);
select throws_ok(
  $$select public.events_save_questionnaire((select id from created), 'birthday', '2027-06-01 18:00',
    'Mars/Base', 240, 5, true, true, '2027-05-20', 'manual', 'nb', '{}')$$,
  '22023', null, 'an unknown time zone is rejected'
);
select throws_ok(
  $$select public.events_save_questionnaire((select id from created), 'birthday', '2027-06-01 18:00',
    null, 240, 5, true, true, null, 'manual', 'nb', '{}')$$,
  '22023', null, 'a start time without a time zone is rejected'
);

-- Direct writes stay closed
select throws_ok(
  $$update public.events set guest_count = 10 where id = (select id from created)$$,
  '42501', null, 'A cannot write a questionnaire column directly'
);

-- Other user B
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok(
  $$select public.events_save_questionnaire((select id from created), 'party', '2027-07-01 18:00',
    'Europe/Oslo', 60, 1, true, false, null, 'manual', 'en', '{}')$$,
  '42501', null, 'B cannot answer A''s questionnaire'
);

set local request.jwt.claims = '{"role": "authenticated"}';
select throws_ok(
  $$select public.events_save_questionnaire((select id from created), 'party', '2027-07-01 18:00',
    'Europe/Oslo', 60, 1, true, false, null, 'manual', 'en', '{}')$$,
  '42501', null, 'a caller without a user is refused'
);

set local role anon;
select throws_ok(
  $$select public.events_save_questionnaire('00000000-0000-0000-0000-000000000000', null, null,
    null, null, null, null, null, null, null, null, null)$$,
  '42501', null, 'anon is denied events_save_questionnaire'
);

reset role;
select is(
  (select event_type || '/' || guest_count from public.events where id = (select id from created)),
  'birthday/80',
  'B''s and the failed calls left A''s answers unchanged'
);

select * from finish();
rollback;
