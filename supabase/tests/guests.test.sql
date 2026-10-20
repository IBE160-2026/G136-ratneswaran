begin;
select plan(30);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b@example.test');

-- A's Events: open draft (1), cancelled published (2), ended published (3), second draft (4)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at)
values
  ('30000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lucas 40',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', null, null),
  ('30000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), now()),
  ('30000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Over',
   now() - interval '2 days', now() - interval '1 day', 'Europe/Oslo', 'en', now() - interval '3 days', null),
  ('30000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Other',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', null, null);

-- Attributes and grants
select ok(
  (select prosecdef and proconfig @> array['search_path=""'] from pg_proc
   where oid = 'public.guests_add(uuid, jsonb)'::regprocedure),
  'guests_add is security definer with an empty search_path'
);
select ok(
  has_function_privilege('authenticated', 'public.guests_add(uuid, jsonb)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.guests_add(uuid, jsonb)', 'EXECUTE')
    and not has_function_privilege('public', 'public.guests_add(uuid, jsonb)', 'EXECUTE'),
  'only authenticated can execute guests_add'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.guests'::regclass)
    and (select relrowsecurity from pg_class where oid = 'public.guest_contacts'::regclass),
  'RLS is on for guests and guest_contacts'
);
select ok(
  not has_table_privilege('authenticated', 'public.guests', 'INSERT, UPDATE, DELETE')
    and not has_table_privilege('authenticated', 'public.guest_contacts', 'INSERT, UPDATE, DELETE')
    and not has_any_column_privilege('authenticated', 'public.guests', 'UPDATE')
    and not has_any_column_privilege('authenticated', 'public.guest_contacts', 'UPDATE'),
  'authenticated has no direct write on guests or guest_contacts'
);
select ok(
  not has_table_privilege('anon', 'public.guests', 'SELECT')
    and not has_table_privilege('anon', 'public.guest_contacts', 'SELECT'),
  'anon cannot read guests or guest_contacts'
);

-- A adds guests
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select is(
  public.guests_add('30000000-0000-0000-0000-000000000001',
    '[{"name": " Ann Berg ", "email": "ann@x.no"}, {"name": "Bo", "email": "bo@x.no"}]'),
  '{}'::text[],
  'A adds two guests and nothing is skipped'
);
select results_eq(
  $$select g.name, c.email from public.guests g join public.guest_contacts c on c.guest_id = g.id
    where g.event_id = '30000000-0000-0000-0000-000000000001' order by g.name$$,
  $$values ('Ann Berg'::text, 'ann@x.no'::text), ('Bo', 'bo@x.no')$$,
  'A reads the trimmed names and their emails'
);
select is(
  public.guests_add('30000000-0000-0000-0000-000000000001',
    '[{"name": "Ann again", "email": "ANN@x.no"}, {"name": "Cia", "email": "cia@x.no"}]'),
  array['ANN@x.no'],
  'an email already on the list, in any case, is skipped and returned'
);
select is(
  (select count(*) from public.guests where event_id = '30000000-0000-0000-0000-000000000001'),
  3::bigint,
  'the skipped row leaves no guest without a contact'
);
select is(
  public.guests_add('30000000-0000-0000-0000-000000000004', '[{"name": "Ann", "email": "ann@x.no"}]'),
  '{}'::text[],
  'the same email may be on another Event'
);
select throws_ok(
  $$select public.guests_add('30000000-0000-0000-0000-000000000001',
    jsonb_build_array(jsonb_build_object('name', E'Dan\nDahl', 'email', 'dan@x.no')))$$,
  '23514', null, 'a name with a line break is refused'
);
select throws_ok(
  $$select public.guests_add('30000000-0000-0000-0000-000000000001',
    jsonb_build_array(jsonb_build_object('name', 'Dan', 'email', E'dan@x.no\r')))$$,
  '23514', null, 'an email with a control character is refused'
);
select throws_ok(
  $$select public.guests_add('30000000-0000-0000-0000-000000000001',
    '[{"name": "Eva", "email": "eva@x.no"}, {"name": "Dan", "email": "dan"}]')$$,
  '23514', null, 'an email without @ aborts the batch'
);
select throws_ok(
  format($$select public.guests_add('30000000-0000-0000-0000-000000000001', %L)$$,
    jsonb_build_array(jsonb_build_object('name', repeat('x', 201), 'email', 'x@x.no'))),
  '23514', null, 'a name over 200 characters is refused'
);
select throws_ok(
  $$select public.guests_add('30000000-0000-0000-0000-000000000001', '[{"name": " ", "email": "x@x.no"}]')$$,
  '23514', null, 'a blank name is refused'
);
select is(
  (select count(*) from public.guests where name = 'Eva'),
  0::bigint,
  'nothing of an aborted batch is stored'
);
select throws_ok(
  $$select public.guests_add('30000000-0000-0000-0000-000000000001',
    (select jsonb_agg(jsonb_build_object('name', 'G' || i, 'email', 'g' || i || '@x.no'))
     from generate_series(1, 201) as i))$$,
  '22023', null, 'more than 200 rows are refused'
);
select throws_ok(
  $$select public.guests_add('30000000-0000-0000-0000-000000000002', '[{"name": "Eva", "email": "eva@x.no"}]')$$,
  '55000', null, 'a cancelled Event takes no guests'
);
select throws_ok(
  $$select public.guests_add('30000000-0000-0000-0000-000000000003', '[{"name": "Eva", "email": "eva@x.no"}]')$$,
  '55000', null, 'an ended published Event takes no guests'
);
select throws_ok(
  $$insert into public.guests (event_id, name) values ('30000000-0000-0000-0000-000000000001', 'Eva')$$,
  '42501', null, 'A cannot insert a guest directly'
);
select throws_ok(
  $$update public.guests set name = 'X' where event_id = '30000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'A cannot update a guest directly'
);
select throws_ok(
  $$delete from public.guest_contacts where event_id = '30000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'A cannot delete a contact directly'
);

-- Other user B and anon are refused
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok(
  $$select public.guests_add('30000000-0000-0000-0000-000000000001', '[{"name": "Eva", "email": "eva@x.no"}]')$$,
  '42501', null, 'B cannot add guests to A''s Event'
);
select is_empty($$select 1 from public.guests$$, 'B reads none of A''s guests');
select is_empty($$select 1 from public.guest_contacts$$, 'B reads none of A''s contacts');
set local role anon;
select throws_ok(
  $$select public.guests_add('30000000-0000-0000-0000-000000000001', '[{"name": "Eva", "email": "eva@x.no"}]')$$,
  '42501', null, 'anon is denied guests_add'
);
select throws_ok($$select 1 from public.guests$$, '42501', null, 'anon is denied guests');

-- Integrity, as the owner
reset role;
select throws_ok(
  $$with g as (insert into public.guests (event_id, name)
      values ('30000000-0000-0000-0000-000000000001', 'Gro') returning id)
    insert into public.guest_contacts (guest_id, event_id, email)
    select id, '30000000-0000-0000-0000-000000000004', 'gro@x.no' from g$$,
  '23503', null, 'a contact cannot point at another Event''s guest'
);
select throws_ok(
  $$with g as (insert into public.guests (event_id, name)
      values ('30000000-0000-0000-0000-000000000001', 'Fay') returning id, event_id)
    insert into public.guest_contacts (guest_id, event_id, email) select id, event_id, 'BO@X.NO' from g$$,
  '23505', null, 'the unique index stops a duplicate email in any case'
);
delete from public.events where id = '30000000-0000-0000-0000-000000000001';
select ok(
  not exists (select 1 from public.guests where event_id = '30000000-0000-0000-0000-000000000001')
    and not exists (select 1 from public.guest_contacts where event_id = '30000000-0000-0000-0000-000000000001'),
  'deleting the Event removes its guests and contacts'
);

select * from finish();
rollback;
