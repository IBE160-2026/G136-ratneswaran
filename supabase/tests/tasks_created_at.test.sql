begin;
select plan(5);

insert into auth.users (id, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test');
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at) values
  ('59600000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '30 days', now() + interval '30 days 4 hours', 'Europe/Oslo', 'en', now());
insert into public.roles (id, event_id, key, active) values
  ('69600000-0000-0000-0000-000000000001', '59600000-0000-0000-0000-000000000001', 'venue', true);
insert into public.tasks (id, event_id, role_id, title, deadline) values
  ('89600000-0000-0000-0000-000000000001', '59600000-0000-0000-0000-000000000001', '69600000-0000-0000-0000-000000000001', 'T', current_date + 5);

select has_column('public', 'tasks', 'created_at', 'tasks has created_at');
select ok((select created_at is not null from public.tasks where id = '89600000-0000-0000-0000-000000000001'),
  'created_at is set on insert');

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select throws_ok(
  $$update public.tasks set created_at = now() - interval '9 days'$$,
  '42501', null, 'authenticated cannot update created_at');
reset role;

select is(
  (select count(*) from information_schema.columns
   where table_schema = 'public' and column_name ~* '(order|position|rank|sort|timeline)'),
  0::bigint, 'no column in public stores order, position, rank, sort or timeline');
select is(
  (select count(*) from information_schema.tables
   where table_schema = 'public' and table_name ~* '(order|position|rank|sort|timeline)'),
  0::bigint, 'no table in public stores order, position, rank, sort or timeline');

select * from finish();
rollback;
