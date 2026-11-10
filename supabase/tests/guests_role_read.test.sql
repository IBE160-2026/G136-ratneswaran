begin;
select plan(27);

-- A organizes Event 1, B organizes Event 2. On Event 1: H holds the active Guests Role, P is invited to it
-- but has not joined, V holds Venue, G is a guest. Event 2 has its own guest and answer.
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'organizer-b@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'holder-h@example.test'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'pending-p@example.test'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'holder-v@example.test'),
  ('11111111-1111-1111-1111-111111111111', 'guest-g@example.test');
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at) values
  ('58000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now()),
  ('58000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Elsewhere',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now());
insert into public.roles (id, event_id, key, active) values
  ('68000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001', 'guests', true),
  ('68000000-0000-0000-0000-000000000002', '58000000-0000-0000-0000-000000000001', 'venue', true),
  ('68000000-0000-0000-0000-000000000003', '58000000-0000-0000-0000-000000000002', 'guests', true);
insert into public.role_members (event_id, role_id, user_id, name, joined_at) values
  ('58000000-0000-0000-0000-000000000001', '68000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Hanna', now()),
  ('58000000-0000-0000-0000-000000000001', '68000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Pia', null),
  ('58000000-0000-0000-0000-000000000001', '68000000-0000-0000-0000-000000000002', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Vera', now());
insert into public.guests (id, event_id, name, user_id) values
  ('78000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001', 'Gro', '11111111-1111-1111-1111-111111111111'),
  ('78000000-0000-0000-0000-000000000002', '58000000-0000-0000-0000-000000000001', 'Gunn', null),
  ('78000000-0000-0000-0000-000000000003', '58000000-0000-0000-0000-000000000002', 'Geir', null);
insert into public.guest_contacts (guest_id, event_id, email) values
  ('78000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001', 'guest-g@example.test'),
  ('78000000-0000-0000-0000-000000000002', '58000000-0000-0000-0000-000000000001', 'gunn@example.test'),
  ('78000000-0000-0000-0000-000000000003', '58000000-0000-0000-0000-000000000002', 'geir@example.test');
insert into public.rsvps (guest_id, event_id, attending) values
  ('78000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001', true),
  ('78000000-0000-0000-0000-000000000002', '58000000-0000-0000-0000-000000000001', false),
  ('78000000-0000-0000-0000-000000000003', '58000000-0000-0000-0000-000000000002', true);

set local role authenticated;

-- The Organizer keeps everything of their own Event
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select is((select count(*) from public.guests), 2::bigint, 'the Organizer reads the guests of their Event');
select is((select count(*) from public.rsvps), 2::bigint, 'the Organizer reads its rsvps');
select is((select count(*) from public.guest_contacts), 2::bigint, 'the Organizer reads its emails');

-- Joined holder of the active Guests Role
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select is((select array_agg(name order by name) from public.guests), array['Gro', 'Gunn'],
  'a holder of the active Guests Role reads the guests of that Event only');
select is((select count(*) from public.rsvps), 2::bigint, 'and its rsvps, not another Event''s');
select is((select count(email) from public.guest_contacts), 0::bigint, 'and no email');
select throws_ok($$update public.guests set name = 'x'$$, '42501', null, 'the holder cannot write guests');
select throws_ok($$delete from public.rsvps$$, '42501', null, 'the holder cannot write rsvps');
select throws_ok($$select public.guests_remove('78000000-0000-0000-0000-000000000002')$$, '42501', null,
  'the holder cannot remove a guest: the functions still ask for the Organizer');

-- Invited to the Guests Role, not joined
set local request.jwt.claims = '{"sub": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "role": "authenticated"}';
select is((select count(*) from public.guests), 0::bigint, 'a pending invitee of the Guests Role reads no guest');
select is((select count(*) from public.rsvps), 0::bigint, 'and no rsvp');
select is((select count(email) from public.guest_contacts), 0::bigint, 'and no email');

-- Holder of another Role
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select is((select count(*) from public.guests), 0::bigint, 'a holder of another Role reads no guest');
select is((select count(*) from public.rsvps), 0::bigint, 'and no rsvp');
select is((select count(email) from public.guest_contacts), 0::bigint, 'and no email');

-- Another Event's Organizer
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is((select array_agg(name) from public.guests), array['Geir'], 'another Organizer reads only their own guests');
select results_eq($$select guest_id from public.rsvps$$, $$values ('78000000-0000-0000-0000-000000000003'::uuid)$$,
  'and only their own rsvps');
select is((select count(email) from public.guest_contacts), 1::bigint, 'and only their own emails');

-- The Guest
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select results_eq($$select id from public.guests$$, $$values ('78000000-0000-0000-0000-000000000001'::uuid)$$,
  'a Guest reads their own guest row only');
select results_eq($$select guest_id from public.rsvps$$, $$values ('78000000-0000-0000-0000-000000000001'::uuid)$$,
  'and their own rsvp only');
select is((select count(email) from public.guest_contacts), 0::bigint, 'and no email');
reset role;

-- anon
set local role anon;
select throws_ok($$select 1 from public.guests$$, '42501', null, 'anon cannot read guests');
select throws_ok($$select 1 from public.rsvps$$, '42501', null, 'anon cannot read rsvps');
select throws_ok($$select email from public.guest_contacts$$, '42501', null, 'anon cannot read emails');
reset role;

-- The Guests Role switched off: only the Organizer reads
update public.roles set active = false where id = '68000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select is((select count(*) from public.guests), 0::bigint, 'with the Guests Role inactive its holder reads no guest');
select is((select count(*) from public.rsvps), 0::bigint, 'and no rsvp');
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select is((select count(*) from public.guests), 2::bigint, 'while the Organizer still reads them');
reset role;

select * from finish();
rollback;
