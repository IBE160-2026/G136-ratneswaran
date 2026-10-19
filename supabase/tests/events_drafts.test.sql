begin;
select plan(18);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b@example.test');

create temp table drafts (tag text, id uuid);
grant select, insert on drafts to authenticated;

-- A new events column must be added to the blank-draft test in events_create, or an answered draft could be reused.
select is(
  (select array_agg(attname::text order by attname) from pg_attribute
   where attrelid = 'public.events'::regclass and attnum > 0 and not attisdropped),
  array['created_at', 'duration_minutes', 'ends_at', 'event_type', 'guest_count', 'guest_list_method', 'id',
    'language', 'name', 'organizer_id', 'published_at', 'rsvp_due_date', 'rsvp_wanted', 'starts_at',
    'time_zone', 'unknown_answers', 'venue_known'],
  'events has exactly the columns events_create checks for a blank draft'
);

-- A creates twice: one blank draft
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
insert into drafts select 'first', public.events_create();
insert into drafts select 'again', public.events_create();
select is(
  (select id from drafts where tag = 'again'),
  (select id from drafts where tag = 'first'),
  'a second create returns the blank draft'
);
select is((select count(*) from public.events), 1::bigint, 'A has one draft after two creates');
select ok(
  exists (select 1 from pg_locks where locktype = 'advisory' and pid = pg_backend_pid()
    and ((classid::bigint << 32) | objid::bigint) = hashtextextended('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0)),
  'create took the lock keyed on the Organizer'
);
select ok(
  not exists (select 1 from pg_locks where locktype = 'advisory' and pid = pg_backend_pid()
    and ((classid::bigint << 32) | objid::bigint) = hashtextextended('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 0)),
  'the lock is not shared with another Organizer'
);

-- Other user B gets their own draft
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
insert into drafts select 'b', public.events_create();
select isnt(
  (select id from drafts where tag = 'b'),
  (select id from drafts where tag = 'first'),
  'B does not get A''s draft'
);
select is(
  (select count(*) from public.events where id = (select id from drafts where tag = 'first')),
  0::bigint,
  'B cannot read A''s draft'
);
select throws_ok(
  $$select public.events_save_questionnaire((select id from drafts where tag = 'first'), 'party',
    '2027-07-01 18:00', 'Europe/Oslo', 60, 5, true, false, null, 'manual', 'en', '{}')$$,
  '42501', null, 'B cannot save into A''s draft'
);

-- Two tabs: a rename and a step save keep each other's columns
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
update public.events set name = 'Party' where id = (select id from drafts where tag = 'first');
select public.events_save_questionnaire((select id from drafts where tag = 'first'), 'party',
  '2027-07-01 18:00', 'Europe/Oslo', 60, 5, true, false, null, 'manual', 'en', '{}');
select is(
  (select name from public.events where id = (select id from drafts where tag = 'first')),
  'Party',
  'a questionnaire save keeps the name'
);
update public.events set name = 'Party 2' where id = (select id from drafts where tag = 'first');
select results_eq(
  $$select event_type, guest_count, language from public.events where id = (select id from drafts where tag = 'first')$$,
  $$values ('party'::text, 5, 'en'::text)$$,
  'a rename keeps the questionnaire answers'
);

-- An answered draft is not reused
insert into drafts select 'second', public.events_create();
select isnt(
  (select id from drafts where tag = 'second'),
  (select id from drafts where tag = 'first'),
  'create after an answered draft adds a new draft'
);
select is((select count(*) from public.events), 2::bigint, 'A now has two drafts');
insert into drafts select 'second-again', public.events_create();
select is(
  (select id from drafts where tag = 'second-again'),
  (select id from drafts where tag = 'second'),
  'the new blank draft is reused in turn'
);

-- A named but otherwise blank draft is not blank
update public.events set name = 'Named' where id = (select id from drafts where tag = 'second');
insert into drafts select 'third', public.events_create();
select isnt(
  (select id from drafts where tag = 'third'),
  (select id from drafts where tag = 'second'),
  'a draft with a name is not reused'
);

-- A draft cannot be published while incomplete
reset role;
select throws_ok(
  $$update public.events set published_at = now() where id = (select id from drafts where tag = 'third')$$,
  '23514', null, 'a blank draft cannot be published'
);
select throws_ok(
  $$update public.events set published_at = now() where id = (select id from drafts where tag = 'second')$$,
  '23514', null, 'a named draft without times cannot be published'
);

-- A published Event is never reused
update public.events set name = 'Done', starts_at = '2027-07-01 16:00Z', ends_at = '2027-07-01 20:00Z',
  time_zone = 'Europe/Oslo', language = 'en', published_at = now() where id = (select id from drafts where tag = 'third');
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
insert into drafts select 'fourth', public.events_create();
select isnt((select id from drafts where tag = 'fourth'), (select id from drafts where tag = 'third'), 'a published Event is not reused');
select is(
  (select count(*) from public.events where published_at is null and name is null),
  1::bigint,
  'exactly one blank draft exists'
);

select * from finish();
rollback;
