begin;
select plan(34);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b@example.test');

-- A's Events: open draft (1), cancelled published (2), ended published (3), past draft (4),
-- published and not ended (5)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at)
values
  ('31000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lucas 40',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', null, null),
  ('31000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), now()),
  ('31000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Over',
   now() - interval '2 days', now() - interval '1 day', 'Europe/Oslo', 'en', now() - interval '3 days', null),
  ('31000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Past draft',
   now() - interval '2 days', now() - interval '1 day', 'Europe/Oslo', 'en', null, null),
  ('31000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Upcoming',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null);

-- Guests: Ann (1), Bo (2) and Cia (3) on the draft; Dan on the cancelled (4), Eva on the ended (5),
-- Fay (6) and Gro (7) on the past draft, Hal (8) and Ida (9) on the upcoming published
insert into public.guests (id, event_id, name) values
  ('41000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'Ann Berg'),
  ('41000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000001', 'Bo'),
  ('41000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000001', 'Cia'),
  ('41000000-0000-0000-0000-000000000004', '31000000-0000-0000-0000-000000000002', 'Dan'),
  ('41000000-0000-0000-0000-000000000005', '31000000-0000-0000-0000-000000000003', 'Eva'),
  ('41000000-0000-0000-0000-000000000006', '31000000-0000-0000-0000-000000000004', 'Fay'),
  ('41000000-0000-0000-0000-000000000007', '31000000-0000-0000-0000-000000000004', 'Gro'),
  ('41000000-0000-0000-0000-000000000008', '31000000-0000-0000-0000-000000000005', 'Hal'),
  ('41000000-0000-0000-0000-000000000009', '31000000-0000-0000-0000-000000000005', 'Ida');
insert into public.guest_contacts (guest_id, event_id, email) values
  ('41000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'ann@x.no'),
  ('41000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000001', 'bo@x.no'),
  ('41000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000001', 'cia@x.no'),
  ('41000000-0000-0000-0000-000000000004', '31000000-0000-0000-0000-000000000002', 'dan@x.no'),
  ('41000000-0000-0000-0000-000000000005', '31000000-0000-0000-0000-000000000003', 'eva@x.no'),
  ('41000000-0000-0000-0000-000000000006', '31000000-0000-0000-0000-000000000004', 'fay@x.no'),
  ('41000000-0000-0000-0000-000000000007', '31000000-0000-0000-0000-000000000004', 'gro@x.no'),
  ('41000000-0000-0000-0000-000000000008', '31000000-0000-0000-0000-000000000005', 'hal@x.no'),
  ('41000000-0000-0000-0000-000000000009', '31000000-0000-0000-0000-000000000005', 'ida@x.no');

-- Attributes and grants
select ok(
  (select bool_and(prosecdef and proconfig @> array['search_path=""']) from pg_proc
   where oid in ('public.guests_update(uuid, text, text)'::regprocedure,
                 'public.guests_remove(uuid)'::regprocedure)),
  'guests_update and guests_remove are security definer with an empty search_path'
);
select ok(
  has_function_privilege('authenticated', 'public.guests_update(uuid, text, text)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.guests_update(uuid, text, text)', 'EXECUTE')
    and not has_function_privilege('public', 'public.guests_update(uuid, text, text)', 'EXECUTE'),
  'only authenticated can execute guests_update'
);
select ok(
  has_function_privilege('authenticated', 'public.guests_remove(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.guests_remove(uuid)', 'EXECUTE')
    and not has_function_privilege('public', 'public.guests_remove(uuid)', 'EXECUTE'),
  'only authenticated can execute guests_remove'
);
select ok(
  not has_table_privilege('authenticated', 'public.guests', 'INSERT, UPDATE, DELETE')
    and not has_table_privilege('authenticated', 'public.guest_contacts', 'INSERT, UPDATE, DELETE')
    and not has_any_column_privilege('authenticated', 'public.guests', 'UPDATE')
    and not has_any_column_privilege('authenticated', 'public.guest_contacts', 'UPDATE'),
  'authenticated still has no direct write on guests or guest_contacts'
);

-- Other user B and anon are refused
set local role authenticated;
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok(
  $$select public.guests_update('41000000-0000-0000-0000-000000000001', 'X', 'x@x.no')$$,
  '42501', null, 'B cannot edit A''s guest'
);
select throws_ok(
  $$select public.guests_remove('41000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'B cannot remove A''s guest'
);
select throws_ok(
  $$update public.guest_contacts set email = 'x@x.no' where guest_id = '41000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'B cannot update A''s contact directly'
);
select throws_ok(
  $$delete from public.guests where id = '41000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'B cannot delete A''s guest directly'
);
set local role anon;
select throws_ok(
  $$select public.guests_update('41000000-0000-0000-0000-000000000001', 'X', 'x@x.no')$$,
  '42501', null, 'anon is denied guests_update'
);
select throws_ok(
  $$select public.guests_remove('41000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'anon is denied guests_remove'
);

-- A edits
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select results_eq(
  $$select g.name, c.email from public.guests g join public.guest_contacts c on c.guest_id = g.id
    where g.id = '41000000-0000-0000-0000-000000000001'$$,
  $$values ('Ann Berg'::text, 'ann@x.no'::text)$$,
  'B''s direct writes changed nothing'
);
select lives_ok(
  $$select public.guests_update('41000000-0000-0000-0000-000000000001', ' Ann Dahl ', ' ann.berg@x.no ')$$,
  'A edits a guest''s name and email'
);
select results_eq(
  $$select g.name, c.email from public.guests g join public.guest_contacts c on c.guest_id = g.id
    where g.id = '41000000-0000-0000-0000-000000000001'$$,
  $$values ('Ann Dahl'::text, 'ann.berg@x.no'::text)$$,
  'the trimmed name and email are stored'
);
select lives_ok(
  $$select public.guests_update('41000000-0000-0000-0000-000000000001', 'Ann Dahl', 'ANN.BERG@x.no')$$,
  'A changes only the case of the guest''s own email'
);
select is(
  (select email from public.guest_contacts where guest_id = '41000000-0000-0000-0000-000000000001'),
  'ANN.BERG@x.no',
  'the new case is stored'
);
select throws_ok(
  $$select public.guests_update('41000000-0000-0000-0000-000000000001', 'Ann Renamed', 'BO@x.no')$$,
  '23505', null, 'another guest''s email, in any case, is refused'
);
select is(
  (select name from public.guests where id = '41000000-0000-0000-0000-000000000001'),
  'Ann Dahl',
  'a refused email leaves the name unchanged too'
);
select throws_ok(
  $$select public.guests_update('41000000-0000-0000-0000-000000000001', ' ', 'ann@x.no')$$,
  '23514', null, 'a blank name is refused'
);
select throws_ok(
  $$select public.guests_update('41000000-0000-0000-0000-000000000001', 'Ann', 'ann')$$,
  '23514', null, 'an email without @ is refused'
);
select throws_ok(
  $$select public.guests_update('41000000-0000-0000-0000-000000000001', E'Ann\nDahl', 'ann@x.no')$$,
  '23514', null, 'a name with a line break is refused'
);
select throws_ok(
  $$select public.guests_update('41000000-0000-0000-0000-000000000099', 'X', 'x@x.no')$$,
  '42501', null, 'an unknown guest is refused like someone else''s'
);
select throws_ok(
  $$select public.guests_remove('41000000-0000-0000-0000-000000000099')$$,
  '42501', null, 'removing an unknown guest is refused'
);
select throws_ok(
  $$select public.guests_update('41000000-0000-0000-0000-000000000004', 'X', 'x@x.no')$$,
  '55000', null, 'a cancelled Event''s guest cannot be edited'
);
select throws_ok(
  $$select public.guests_remove('41000000-0000-0000-0000-000000000005')$$,
  '55000', null, 'an ended published Event''s guest cannot be removed'
);
select throws_ok(
  $$select public.guests_update('41000000-0000-0000-0000-000000000005', 'X', 'x@x.no')$$,
  '55000', null, 'an ended published Event''s guest cannot be edited'
);
select throws_ok(
  $$select public.guests_remove('41000000-0000-0000-0000-000000000004')$$,
  '55000', null, 'a cancelled Event''s guest cannot be removed'
);
select lives_ok(
  $$select public.guests_update('41000000-0000-0000-0000-000000000006', 'Fay Dahl', 'fay@x.no')$$,
  'a past draft''s guest can still be edited'
);
select lives_ok(
  $$select public.guests_remove('41000000-0000-0000-0000-000000000007')$$,
  'a past draft''s guest can still be removed'
);
select lives_ok(
  $$select public.guests_update('41000000-0000-0000-0000-000000000008', 'Hal Berg', 'hal@x.no')$$,
  'a guest of a published Event that has not ended can be edited'
);
select lives_ok(
  $$select public.guests_remove('41000000-0000-0000-0000-000000000009')$$,
  'a guest of a published Event that has not ended can be removed'
);

-- A removes
select lives_ok(
  $$select public.guests_remove('41000000-0000-0000-0000-000000000003')$$,
  'A removes a guest'
);
select ok(
  not exists (select 1 from public.guests where id = '41000000-0000-0000-0000-000000000003')
    and not exists (select 1 from public.guest_contacts where guest_id = '41000000-0000-0000-0000-000000000003'),
  'the guest and its contact are gone'
);
select is(
  public.guests_add('31000000-0000-0000-0000-000000000001', '[{"name": "Cia", "email": "cia@x.no"}]'),
  '{}'::text[],
  'the removed email can be added again'
);

-- Integrity, as the owner
reset role;
select is(
  (select count(*) from public.guests where event_id = '31000000-0000-0000-0000-000000000001'),
  3::bigint,
  'the draft has Ann, Bo and the re-added Cia'
);

select * from finish();
rollback;
