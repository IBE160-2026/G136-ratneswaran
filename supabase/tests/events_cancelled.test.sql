begin;
select plan(5);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b@example.test');

create temp table drafts (tag text, id uuid);
grant select, insert on drafts to authenticated;

select col_is_null('public', 'events', 'cancelled_at', 'cancelled_at is nullable');

-- A cancelled blank row (as Story 2.7 will leave it) is never handed back by events_create
insert into public.events (id, organizer_id, cancelled_at)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now());

set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
insert into drafts select 'new', public.events_create();
select isnt(
  (select id from drafts where tag = 'new'),
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
  'create does not reuse a cancelled blank Event'
);
select isnt(
  (select cancelled_at from public.events where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  null,
  'the Organizer reads cancelled_at'
);
select throws_ok(
  $$update public.events set cancelled_at = null where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  '42501', null, 'the Organizer cannot write cancelled_at directly'
);

set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is(
  (select count(*) from public.events where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  0::bigint,
  'another user cannot read the cancelled Event'
);

select * from finish();
rollback;
