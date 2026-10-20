begin;
select plan(19);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b@example.test');

-- A's Events: complete draft (1), draft without name and end (2), cancelled published (3)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at)
values
  ('20000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lucas 40',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', null, null),
  ('20000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null,
   now() + interval '7 days', null, 'Europe/Oslo', 'en', null, null),
  ('20000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Party',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), now());

-- Function attributes and grants
select ok(
  (select prosecdef and proconfig @> array['search_path=""'] from pg_proc
   where oid = 'public.events_publish(uuid)'::regprocedure),
  'events_publish is security definer with an empty search_path'
);
select ok(
  has_function_privilege('authenticated', 'public.events_publish(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.events_publish(uuid)', 'EXECUTE')
    and not has_function_privilege('public', 'public.events_publish(uuid)', 'EXECUTE'),
  'only authenticated can execute events_publish'
);
select col_type_is('public', 'events', 'description', 'text', 'events.description is text');

-- Other user B and anon are refused
set local role authenticated;
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok(
  $$select public.events_publish('20000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'B cannot publish A''s Event'
);
select is_empty(
  $$update public.events set description = 'Mine' where id = '20000000-0000-0000-0000-000000000001'
    returning id$$,
  'B updates no row of A''s description'
);
set local role anon;
select throws_ok(
  $$select public.events_publish('20000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'anon is denied events_publish'
);

-- A writes step 3
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok(
  $$update public.events set name = 'Lucas 40', description = 'Dinner, speeches and a DJ.'
    where id = '20000000-0000-0000-0000-000000000001'$$,
  'A saves the name and description in one update'
);
select is(
  (select description from public.events where id = '20000000-0000-0000-0000-000000000001'),
  'Dinner, speeches and a DJ.',
  'the description is saved'
);
select lives_ok(
  $$update public.events set description = null where id = '20000000-0000-0000-0000-000000000002'$$,
  'a blank description is stored as null'
);
select throws_ok(
  format($$update public.events set description = %L where id = '20000000-0000-0000-0000-000000000001'$$,
    repeat('x', 2001)),
  '23514', null, 'a description over 2000 characters is rejected'
);
select throws_ok(
  $$update public.events set description = '   ' where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'a whitespace-only description is rejected'
);
select throws_ok(
  $$update public.events set description = 'x' where id = '20000000-0000-0000-0000-000000000003'$$,
  '55000', null, 'the description of a cancelled Event cannot change'
);

-- A publishes
select throws_ok(
  $$select public.events_publish('20000000-0000-0000-0000-000000000002')$$,
  '23514', null, 'an incomplete draft cannot be published'
);
select is(
  (select published_at from public.events where id = '20000000-0000-0000-0000-000000000002'),
  null,
  'the incomplete draft stays a draft'
);
select throws_ok(
  $$select public.events_publish('20000000-0000-0000-0000-000000000003')$$,
  '55000', null, 'a cancelled Event cannot be published'
);
select lives_ok(
  $$select public.events_publish('20000000-0000-0000-0000-000000000001')$$,
  'A publishes a complete draft'
);
select isnt(
  (select published_at from public.events where id = '20000000-0000-0000-0000-000000000001'),
  null,
  'published_at is set'
);
select lives_ok(
  $$select public.events_publish('20000000-0000-0000-0000-000000000001')$$,
  'a second publish is accepted'
);
reset role;
-- now() is fixed per transaction, so compare with a value the second call could not produce.
update public.events set published_at = '2026-01-01Z' where id = '20000000-0000-0000-0000-000000000001';
set local role authenticated;
select public.events_publish('20000000-0000-0000-0000-000000000001');
select is(
  (select published_at from public.events where id = '20000000-0000-0000-0000-000000000001'),
  '2026-01-01Z'::timestamptz,
  'a second publish leaves published_at unchanged'
);

select * from finish();
rollback;
