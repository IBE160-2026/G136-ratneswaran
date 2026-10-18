begin;
select plan(43);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b@example.test');

-- Holds the id A's events_create returns, so B's tests can name an event B cannot see.
create temp table created (id uuid);
grant select, insert on created to authenticated;

-- Schema, grants and function attributes
select ok(
  (select relrowsecurity from pg_class where oid = 'public.events'::regclass),
  'RLS is enabled on events'
);
select col_not_null('public', 'events', 'organizer_id', 'organizer_id is not null');
select is(
  (select array_agg(attname::text order by attname) from pg_attribute
   where attrelid = 'public.events'::regclass and attnum > 0 and not attisdropped
     and has_column_privilege('authenticated', attrelid, attnum, 'UPDATE')),
  array['name'],
  'authenticated may update only name'
);
select is(
  (select provolatile::text from pg_proc where oid = 'public.is_organizer(uuid)'::regprocedure),
  's',
  'is_organizer is stable'
);
select ok(
  (select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.events_create()'::regprocedure),
  'events_create sets an empty search_path'
);
select ok(
  (select proconfig @> array['search_path=""'] from pg_proc where oid = 'public.is_organizer(uuid)'::regprocedure),
  'is_organizer sets an empty search_path'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.events_create()'::regprocedure),
  'events_create is security definer'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.is_organizer(uuid)'::regprocedure),
  'is_organizer is security invoker'
);
select ok(not has_function_privilege('anon', 'public.events_create()', 'execute'), 'anon cannot execute events_create');
select ok(not has_function_privilege('anon', 'public.is_organizer(uuid)', 'execute'), 'anon cannot execute is_organizer');
select ok(not has_function_privilege('public', 'public.events_create()', 'execute'), 'public cannot execute events_create');
select ok(not has_function_privilege('public', 'public.is_organizer(uuid)', 'execute'), 'public cannot execute is_organizer');
select is(
  (select count(*) from pg_constraint
   where contype = 'f' and confrelid = 'auth.users'::regclass and confdeltype not in ('c', 'n')),
  0::bigint,
  'no foreign key to auth.users blocks deleting a user'
);

-- Create
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
insert into created select public.events_create();
select isnt((select id from created), null, 'A creates an event and gets its id');

reset role;
select results_eq(
  $$select organizer_id, published_at from public.events where id = (select id from created)$$,
  $$values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, null::timestamptz)$$,
  'the new event belongs to A and is unpublished'
);

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated"}';
select throws_ok('select public.events_create()', '42501', null, 'events_create refuses a caller without a user');

set local role anon;
select throws_ok('select public.events_create()', '42501', null, 'anon is denied events_create');
select throws_ok('select count(*) from public.events', '42501', null, 'anon cannot read events');
select throws_ok($$update public.events set name = 'x'$$, '42501', null, 'anon cannot update events');
select throws_ok(
  $$select public.is_organizer('00000000-0000-0000-0000-000000000000')$$,
  '42501', null, 'anon is denied is_organizer'
);

-- Organizer A
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select is(
  (select count(*) from public.events where id = (select id from created)),
  1::bigint,
  'A sees their event'
);
select ok(public.is_organizer((select id from created)), 'is_organizer is true for A');
select throws_ok(
  $$insert into public.events (organizer_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')$$,
  '42501', null, 'A cannot insert directly'
);
select throws_ok(
  $$update public.events set organizer_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  '42501', null, 'A cannot move ownership'
);
select throws_ok('delete from public.events', '42501', null, 'A cannot delete directly');
update public.events set name = 'Party' where id = (select id from created);
select is(
  (select name from public.events where id = (select id from created)),
  'Party',
  'A can rename their event'
);

-- Other user B
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is(
  (select count(*) from public.events where id = (select id from created)),
  0::bigint,
  'B does not see A''s event'
);
select ok(not public.is_organizer((select id from created)), 'is_organizer is false for B');
update public.events set name = 'Hijacked' where id = (select id from created);

reset role;
select is(
  (select name from public.events where id = (select id from created)),
  'Party',
  'B''s rename changes nothing'
);

-- As owner RLS does not filter, so these prove is_organizer checks organizer_id itself.
select ok(not public.is_organizer((select id from created)), 'is_organizer is false for B without RLS');
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select ok(public.is_organizer((select id from created)), 'is_organizer is true for A without RLS');

-- Constraints
select throws_ok(
  $$update public.events set starts_at = '2027-06-01 18:00Z', time_zone = 'Europe/Oslo',
    language = 'nb', published_at = now() where id = (select id from created)$$,
  '23514', null, 'publishing without ends_at is rejected'
);
select throws_ok(
  $$update public.events set name = null, starts_at = '2027-06-01 18:00Z', ends_at = '2027-06-02 02:00Z',
    time_zone = 'Europe/Oslo', language = 'nb', published_at = now() where id = (select id from created)$$,
  '23514', null, 'publishing without name is rejected'
);
select throws_ok(
  $$update public.events set ends_at = '2027-06-02 02:00Z',
    time_zone = 'Europe/Oslo', language = 'nb', published_at = now() where id = (select id from created)$$,
  '23514', null, 'publishing without starts_at is rejected'
);
select throws_ok(
  $$update public.events set starts_at = '2027-06-01 18:00Z', ends_at = '2027-06-02 02:00Z',
    language = 'nb', published_at = now() where id = (select id from created)$$,
  '23514', null, 'publishing without time_zone is rejected'
);
select throws_ok(
  $$update public.events set starts_at = '2027-06-01 18:00Z', ends_at = '2027-06-02 02:00Z',
    time_zone = 'Europe/Oslo', published_at = now() where id = (select id from created)$$,
  '23514', null, 'publishing without language is rejected'
);
select throws_ok(
  $$update public.events set name = '' where id = (select id from created)$$,
  '23514', null, 'an empty name is rejected'
);
select throws_ok(
  $$update public.events set name = '   ' where id = (select id from created)$$,
  '23514', null, 'a blank name is rejected'
);
select throws_ok(
  $$update public.events set starts_at = '2027-06-01 18:00Z', ends_at = '2027-06-01 12:00Z',
    time_zone = 'Europe/Oslo', language = 'nb', published_at = now() where id = (select id from created)$$,
  '23514', null, 'publishing with ends_at before starts_at is rejected'
);
select lives_ok(
  $$update public.events set starts_at = '2027-06-01 18:00Z', ends_at = '2027-06-02 02:00Z',
    time_zone = 'Europe/Oslo', language = 'nb', published_at = now() where id = (select id from created)$$,
  'publishing a complete event is accepted'
);
select throws_ok(
  $$update public.events set language = 'de' where id = (select id from created)$$,
  '23514', null, 'language must be nb or en'
);
select throws_ok(
  format($$update public.events set name = %L where id = (select id from created)$$, repeat('a', 201)),
  '23514', null, 'name over 200 characters is rejected'
);

delete from auth.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is(
  (select count(*) from public.events where organizer_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint,
  'deleting A from auth.users removes A''s events'
);

select * from finish();
rollback;
