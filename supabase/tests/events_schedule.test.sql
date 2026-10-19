begin;
select plan(28);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b@example.test');

create temp table created (id uuid);
grant select, insert on created to authenticated;

-- Function attributes, grants and the single writer
select ok(
  (select prosecdef and proconfig @> array['search_path=""'] from pg_proc
   where oid = 'public.events_update_schedule(uuid, timestamp, timestamp, text, date, text)'::regprocedure),
  'events_update_schedule is security definer with an empty search_path'
);
select ok(
  has_function_privilege('authenticated',
    'public.events_update_schedule(uuid, timestamp, timestamp, text, date, text)', 'EXECUTE')
    and not has_function_privilege('anon',
      'public.events_update_schedule(uuid, timestamp, timestamp, text, date, text)', 'EXECUTE')
    and not has_function_privilege('public',
      'public.events_update_schedule(uuid, timestamp, timestamp, text, date, text)', 'EXECUTE'),
  'only authenticated can execute events_update_schedule'
);
select is(
  (select array_agg(attname::text order by attname) from pg_attribute
   where attrelid = 'public.events'::regclass and attnum > 0 and not attisdropped
     and has_column_privilege('authenticated', attrelid, attnum, 'UPDATE')),
  array['name'],
  'authenticated gets no schedule column grant'
);
select ok(
  (select prosrc ~ 'perform public\.events_update_schedule\('
      and prosrc !~ '(starts_at|ends_at|time_zone|rsvp_due_date|language)\s*='
   from pg_proc where proname = 'events_save_questionnaire'),
  'the questionnaire writes the schedule columns only through events_update_schedule'
);

-- A creates an Event and answers step 1
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
insert into created select public.events_create();
select public.events_save_questionnaire((select id from created), 'birthday', '2027-06-01 18:00',
  'Europe/Oslo', 240, 80, false, true, '2027-05-20', 'invite_link', 'en', '{}');
select results_eq(
  $$select starts_at, ends_at, duration_minutes, rsvp_due_date, language
    from public.events where id = (select id from created)$$,
  $$values ('2027-06-01 16:00Z'::timestamptz, '2027-06-01 20:00Z'::timestamptz, 240,
    '2027-05-20'::date, 'en'::text)$$,
  'the questionnaire save gives the same schedule as before'
);

-- Save: start and end move, duration follows
select lives_ok(
  $$select public.events_update_schedule((select id from created), '2027-06-02 17:00', '2027-06-03 01:30',
    'Europe/Oslo', '2027-05-25', 'nb')$$,
  'A moves start and end'
);
select results_eq(
  $$select starts_at, ends_at, time_zone, duration_minutes, rsvp_due_date, language
    from public.events where id = (select id from created)$$,
  $$values ('2027-06-02 15:00Z'::timestamptz, '2027-06-02 23:30Z'::timestamptz, 'Europe/Oslo'::text, 510,
    '2027-05-25'::date, 'nb'::text)$$,
  'both instants, the duration, the due date and the language nb are saved'
);
select is(
  (select event_type || '/' || guest_count || '/' || rsvp_wanted from public.events
   where id = (select id from created)),
  'birthday/80/true',
  'the other answers are untouched'
);

-- Time zone change: the same wall clock in the new zone
select public.events_update_schedule((select id from created), '2027-06-02 17:00', '2027-06-03 01:30',
  'America/New_York', '2027-05-25', 'nb');
select results_eq(
  $$select starts_at, ends_at from public.events where id = (select id from created)$$,
  $$values ('2027-06-02 21:00Z'::timestamptz, '2027-06-03 05:30Z'::timestamptz)$$,
  'the instants follow the new zone''s wall clock'
);

-- Rejected schedules
select throws_ok(
  $$select public.events_update_schedule((select id from created), '2027-06-02 17:00', '2027-06-02 17:00',
    'Europe/Oslo', null, 'nb')$$,
  '23514', null, 'an end equal to the start is rejected'
);
select throws_ok(
  $$select public.events_update_schedule((select id from created), '2027-06-02 17:00', '2027-06-02 16:00',
    'Europe/Oslo', null, 'nb')$$,
  '23514', null, 'an end before the start is rejected'
);
select lives_ok(
  $$select public.events_update_schedule((select id from created), '2027-06-02 17:00', '2027-06-16 17:00',
    'Europe/Oslo', null, 'nb')$$,
  'exactly 14 days is accepted'
);
select throws_ok(
  $$select public.events_update_schedule((select id from created), '2027-06-02 17:00', '2027-06-16 17:01',
    'Europe/Oslo', null, 'nb')$$,
  '23514', null, 'more than 14 days is rejected'
);
select throws_ok(
  $$select public.events_update_schedule((select id from created), '2027-06-02 17:00', '2027-06-02 20:00',
    'Europe/Oslo', '2027-06-03', 'nb')$$,
  '23514', null, 'a due date after the start''s local day is rejected'
);
select throws_ok(
  $$select public.events_update_schedule((select id from created), '2027-06-02 17:00', '2027-06-02 20:00',
    'Europe/Oslo', null, 'de')$$,
  '23514', null, 'a language outside nb and en is rejected'
);
select throws_ok(
  $$select public.events_update_schedule((select id from created), '2027-06-02 17:00', '2027-06-02 20:00',
    'Mars/Base', null, 'nb')$$,
  '22023', null, 'an unknown time zone is rejected'
);
select throws_ok(
  $$select public.events_update_schedule((select id from created), null, '2027-06-02 20:00',
    null, null, 'nb')$$,
  '22023', null, 'an end without a time zone is rejected'
);

-- Unknown answers: setting the start and end clears "Not sure yet"
select public.events_save_questionnaire((select id from created), 'birthday', null,
  'Europe/Oslo', null, 80, false, true, null, 'invite_link', 'en', '{starts_at,duration,rsvp_due_date}');
select lives_ok(
  $$select public.events_update_schedule((select id from created), '2027-06-01 18:00', '2027-06-01 22:00',
    'Europe/Oslo', '2027-05-20', 'en')$$,
  'A sets the schedule of a draft with unknown answers'
);
select results_eq(
  $$select starts_at, duration_minutes, unknown_answers from public.events where id = (select id from created)$$,
  $$values ('2027-06-01 16:00Z'::timestamptz, 240, '{}'::text[])$$,
  'the starts_at, duration and rsvp_due_date keys are removed'
);
select lives_ok(
  $$select public.events_update_schedule((select id from created), null, null, null, null, null)$$,
  'a draft may be cleared'
);
select is(
  (select duration_minutes from public.events where id = (select id from created)),
  null::integer,
  'clearing the start and end clears the duration'
);

-- Direct writes stay closed
select throws_ok(
  $$update public.events set starts_at = now() where id = (select id from created)$$,
  '42501', null, 'A cannot write starts_at directly'
);
select throws_ok(
  $$update public.events set language = 'nb' where id = (select id from created)$$,
  '42501', null, 'A cannot write language directly'
);

-- Other user B
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok(
  $$select public.events_update_schedule((select id from created), '2027-07-01 18:00', '2027-07-01 20:00',
    'Europe/Oslo', null, 'en')$$,
  '42501', null, 'B cannot change A''s schedule'
);
select throws_ok(
  $$update public.events set starts_at = now() where id = (select id from created)$$,
  '42501', null, 'B cannot write starts_at directly'
);

set local role anon;
select throws_ok(
  $$select public.events_update_schedule('00000000-0000-0000-0000-000000000000', null, null, null, null, null)$$,
  '42501', null, 'anon is denied events_update_schedule'
);

reset role;
select is(
  (select starts_at from public.events where id = (select id from created)),
  null::timestamptz,
  'B''s and anon''s calls left A''s cleared schedule unchanged'
);

-- The CHECK holds for every writer
update public.events set starts_at = '2027-06-01 16:00Z', ends_at = '2027-06-01 20:00Z', time_zone = 'Europe/Oslo'
where id = (select id from created);
select throws_ok(
  $$update public.events set ends_at = starts_at where id = (select id from created)$$,
  '23514', null, 'events_starts_before_ends rejects an end at the start'
);

select * from finish();
rollback;
