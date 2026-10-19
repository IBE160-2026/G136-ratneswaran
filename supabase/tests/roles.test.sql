begin;
select plan(26);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b@example.test');

create temp table created (tag text, id uuid);
grant select, insert on created to authenticated;

-- Schema, grants and function attributes
select is(
  enum_range(null::public.role_key)::text[],
  array['venue', 'guests', 'food_beverage', 'entertainment', 'travel_logistics', 'program'],
  'the Branch Pool has the six stable keys in display order'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.roles'::regclass),
  'RLS is enabled on roles'
);
select ok(
  not has_table_privilege('authenticated', 'public.roles', 'INSERT')
    and not has_table_privilege('authenticated', 'public.roles', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.roles', 'DELETE'),
  'authenticated has no direct write on roles'
);
select is(
  (select confdeltype::text from pg_constraint
   where conrelid = 'public.roles'::regclass and contype = 'f'),
  'c',
  'roles cascade with their Event'
);
select ok(
  (select prosecdef and proconfig @> array['search_path=""'] from pg_proc
   where oid = 'public.events_set_role_active(uuid, boolean)'::regprocedure),
  'events_set_role_active is security definer with an empty search_path'
);
select ok(
  not has_function_privilege('anon', 'public.events_set_role_active(uuid, boolean)', 'EXECUTE')
    and not has_function_privilege('public', 'public.events_set_role_active(uuid, boolean)', 'EXECUTE'),
  'anon and public cannot execute events_set_role_active'
);
select is(
  (select count(*) from pg_proc where proname = 'events_save_questionnaire'),
  1::bigint,
  'only the new events_save_questionnaire signature exists'
);

-- Create: six inactive rows
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
insert into created select 'a', public.events_create();
select is(
  (select count(*) from public.roles where event_id = (select id from created where tag = 'a')),
  6::bigint,
  'events_create adds every pool Role'
);
select is(
  (select count(*) from public.roles where active and event_id = (select id from created where tag = 'a')),
  0::bigint,
  'every new Role starts inactive'
);

-- First type: the birthday defaults
select public.events_save_questionnaire((select id from created where tag = 'a'), 'birthday',
  '2027-06-01 18:00', 'Europe/Oslo', 240, 80, true, false, null, 'manual', 'en', '{}',
  array['venue', 'guests', 'food_beverage', 'entertainment', 'program']::public.role_key[]);
select is(
  (select array_agg(key::text order by key) from public.roles
   where active and event_id = (select id from created where tag = 'a')),
  array['venue', 'guests', 'food_beverage', 'entertainment', 'program'],
  'the type answer activates its defaults'
);

-- Toggle: Program off by hand
select public.events_set_role_active(
  (select id from public.roles where key = 'program' and event_id = (select id from created where tag = 'a')),
  false
);
select ok(
  (select not active and toggled_at is not null from public.roles
   where key = 'program' and event_id = (select id from created where tag = 'a')),
  'the Organizer switches a Role and it is marked as toggled'
);

-- Type change: untoggled Roles follow, the toggled one stays
select public.events_save_questionnaire((select id from created where tag = 'a'), 'seminar',
  '2027-06-01 18:00', 'Europe/Oslo', 240, 80, true, false, null, 'manual', 'en', '{}',
  array['venue', 'guests', 'food_beverage', 'program', 'travel_logistics']::public.role_key[]);
select is(
  (select array_agg(key::text order by key) from public.roles
   where active and event_id = (select id from created where tag = 'a')),
  array['venue', 'guests', 'food_beverage', 'travel_logistics'],
  'a type change moves untoggled Roles and keeps the toggled Program off'
);

-- Null defaults leave Roles as they are
select public.events_save_questionnaire((select id from created where tag = 'a'), 'party',
  '2027-06-01 18:00', 'Europe/Oslo', 240, 80, true, false, null, 'manual', 'en', '{}');
select is(
  (select array_agg(key::text order by key) from public.roles
   where active and event_id = (select id from created where tag = 'a')),
  array['venue', 'guests', 'food_beverage', 'travel_logistics'],
  'a save without defaults leaves the Roles unchanged'
);
select throws_ok(
  $$select public.events_set_role_active(
    (select id from public.roles where key = 'venue' and event_id = (select id from created where tag = 'a')),
    null)$$,
  '22004', null, 'a Role must be switched on or off'
);

-- Direct writes are denied
select throws_ok(
  $$insert into public.roles (event_id, key) values ((select id from created where tag = 'a'), 'venue')$$,
  '42501', null, 'direct INSERT is denied'
);
select throws_ok(
  $$update public.roles set active = true where event_id = (select id from created where tag = 'a')$$,
  '42501', null, 'direct UPDATE is denied'
);
select throws_ok(
  $$delete from public.roles where event_id = (select id from created where tag = 'a')$$,
  '42501', null, 'direct DELETE is denied'
);
select throws_ok(
  $$select public.events_set_role_active(gen_random_uuid(), true)$$,
  '42501', null, 'an unknown Role is refused'
);

-- Empty defaults switch every untoggled Role off, and the toggled Program stays as it was
savepoint before_empty;
select public.events_save_questionnaire((select id from created where tag = 'a'), 'other',
  '2027-06-01 18:00', 'Europe/Oslo', 240, 80, true, false, null, 'manual', 'en', '{}',
  '{}'::public.role_key[]);
select is(
  (select count(*) from public.roles where active and event_id = (select id from created where tag = 'a')),
  0::bigint,
  'empty defaults switch every untoggled Role off'
);
rollback to savepoint before_empty;

-- Reuse guard: a fresh blank draft with a toggled Role is not handed back
insert into created select 'blank', public.events_create();
select public.events_set_role_active(
  (select id from public.roles where key = 'venue' and event_id = (select id from created where tag = 'blank')),
  true
);
insert into created select 'next', public.events_create();
select isnt(
  (select id from created where tag = 'next'),
  (select id from created where tag = 'blank'),
  'a draft with a toggled Role is not reused as blank'
);

-- Another user B, holding the id of A's Venue Role
insert into created
select 'a-venue', id from public.roles where key = 'venue' and event_id = (select id from created where tag = 'a');
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is(
  (select count(*) from public.roles where event_id = (select id from created where tag = 'a')),
  0::bigint,
  'B cannot read A''s Roles'
);
select throws_ok(
  $$select public.events_set_role_active((select id from created where tag = 'a-venue'), false)$$,
  '42501', null, 'B cannot switch A''s Role by id'
);
select throws_ok(
  $$select public.events_save_questionnaire((select id from created where tag = 'a'), 'party',
    '2027-06-01 18:00', 'Europe/Oslo', 240, 80, true, false, null, 'manual', 'en', '{}',
    array['venue']::public.role_key[])$$,
  '42501', null, 'B cannot set A''s Roles through the questionnaire save'
);

-- Event deleted: its Roles go with it
reset role;
select is(
  (select active from public.roles
   where key = 'venue' and event_id = (select id from created where tag = 'a')),
  true,
  'B''s attempts changed nothing'
);
delete from public.events where id = (select id from created where tag = 'a');
select is(
  (select count(*) from public.roles where event_id = (select id from created where tag = 'a')),
  0::bigint,
  'deleting the Event removes its Roles'
);
select is(
  (select count(*) from public.roles where event_id = (select id from created where tag = 'blank')),
  6::bigint,
  'other Events keep their Roles'
);

select * from finish();
rollback;
