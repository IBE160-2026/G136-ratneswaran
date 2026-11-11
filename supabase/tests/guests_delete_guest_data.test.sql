begin;
select plan(33);

-- A organizes Events 1 (live), 2 (cancelled), 3 (ended) and 5 (live, deleted below); B organizes Event 4.
-- G1-G6 are guest-only (Auth's random password, marked pending); P has a password; H signed up with GitHub;
-- R holds a Role.
insert into auth.users (id, email, encrypted_password, raw_app_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test', 'x', '{}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'organizer-b@example.test', 'x', '{}'),
  ('11111111-1111-1111-1111-111111111111', 'guest-1@example.test', 'random', '{"password_pending": true}'),
  ('22222222-2222-2222-2222-222222222222', 'guest-2@example.test', 'random', '{"password_pending": true}'),
  ('33333333-3333-3333-3333-333333333333', 'guest-3@example.test', 'random', '{"password_pending": true}'),
  ('44444444-4444-4444-4444-444444444444', 'guest-4@example.test', 'random', '{"password_pending": true}'),
  ('55555555-5555-5555-5555-555555555555', 'guest-5@example.test', 'random', '{"password_pending": true}'),
  ('66666666-6666-6666-6666-666666666666', 'guest-6@example.test', 'random', '{"password_pending": true}'),
  ('77777777-7777-7777-7777-777777777777', 'password-p@example.test', 'x', '{}'),
  ('88888888-8888-8888-8888-888888888888', 'github-h@example.test', null, '{}'),
  ('99999999-9999-9999-9999-999999999999', 'holder-r@example.test', 'random', '{"password_pending": true}');
insert into auth.identities (provider_id, user_id, identity_data, provider) values
  ('gh-h', '88888888-8888-8888-8888-888888888888', '{}', 'github');

insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at)
values
  ('58000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('58000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), now()),
  ('58000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Over',
   now() - interval '2 days', now() - interval '1 day', 'Europe/Oslo', 'en', now() - interval '3 days', null),
  ('58000000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B''s party',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('58000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'To delete',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null);
insert into public.roles (id, event_id, key, active) values
  ('68000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001', 'venue', true);
insert into public.role_members (event_id, role_id, user_id, name) values
  ('58000000-0000-0000-0000-000000000001', '68000000-0000-0000-0000-000000000001',
   '99999999-9999-9999-9999-999999999999', 'Rita');

-- Guests. Event 1: G1 (01), G2 (02), P (03), H (04), R (05), B (06), G5 (07), no user yet (08).
-- Event 2: G3 (09). Event 3: G4 (0a). Event 4: G2 (0b). Event 5: G6 (0c), G2 (0d), no user yet (0e).
insert into public.guests (id, event_id, name, user_id) values
  ('78000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001', 'One', '11111111-1111-1111-1111-111111111111'),
  ('78000000-0000-0000-0000-000000000002', '58000000-0000-0000-0000-000000000001', 'Two', '22222222-2222-2222-2222-222222222222'),
  ('78000000-0000-0000-0000-000000000003', '58000000-0000-0000-0000-000000000001', 'Per', '77777777-7777-7777-7777-777777777777'),
  ('78000000-0000-0000-0000-000000000004', '58000000-0000-0000-0000-000000000001', 'Hege', '88888888-8888-8888-8888-888888888888'),
  ('78000000-0000-0000-0000-000000000005', '58000000-0000-0000-0000-000000000001', 'Rita', '99999999-9999-9999-9999-999999999999'),
  ('78000000-0000-0000-0000-000000000006', '58000000-0000-0000-0000-000000000001', 'Bea', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('78000000-0000-0000-0000-000000000007', '58000000-0000-0000-0000-000000000001', 'Five', '55555555-5555-5555-5555-555555555555'),
  ('78000000-0000-0000-0000-000000000008', '58000000-0000-0000-0000-000000000001', 'Nina', null),
  ('78000000-0000-0000-0000-000000000009', '58000000-0000-0000-0000-000000000002', 'Three', '33333333-3333-3333-3333-333333333333'),
  ('78000000-0000-0000-0000-00000000000a', '58000000-0000-0000-0000-000000000003', 'Four', '44444444-4444-4444-4444-444444444444'),
  ('78000000-0000-0000-0000-00000000000b', '58000000-0000-0000-0000-000000000004', 'Two', '22222222-2222-2222-2222-222222222222'),
  ('78000000-0000-0000-0000-00000000000c', '58000000-0000-0000-0000-000000000005', 'Six', '66666666-6666-6666-6666-666666666666'),
  ('78000000-0000-0000-0000-00000000000d', '58000000-0000-0000-0000-000000000005', 'Two', '22222222-2222-2222-2222-222222222222'),
  ('78000000-0000-0000-0000-00000000000e', '58000000-0000-0000-0000-000000000005', 'Nils', null);
-- Every guest has a contact and an answer; every guest with a user has a guest token.
insert into public.guest_contacts (guest_id, event_id, email)
select id, event_id, 'g-' || right(id::text, 2) || '@example.test' from public.guests
where event_id::text like '58000000-%';
insert into public.rsvps (guest_id, event_id, attending)
select id, event_id, true from public.guests where event_id::text like '58000000-%';
insert into public.invite_tokens (event_id, kind, token_hash, user_id)
select event_id, 'guest', sha256(convert_to(id::text, 'UTF8')), user_id from public.guests
where event_id::text like '58000000-%' and user_id is not null;

-- What is left of a guest: guests, guest_contacts, rsvps rows and the user's guest tokens on the Event.
create function pg_temp.remains(p_guest uuid, p_event uuid, p_user uuid) returns bigint language sql as $$
  select (select count(*) from public.guests where id = p_guest)
    + (select count(*) from public.guest_contacts where guest_id = p_guest)
    + (select count(*) from public.rsvps where guest_id = p_guest)
    + (select count(*) from public.invite_tokens where event_id = p_event and user_id = p_user and kind = 'guest');
$$;
create function pg_temp.has_user(p_user uuid) returns boolean language sql as $$
  select exists (select 1 from auth.users where id = p_user);
$$;

-- Attributes, grants and foreign keys
select ok(
  (select prosecdef and proconfig @> array['search_path=""'] from pg_proc
   where oid = 'public.guests_delete_guest_data(uuid)'::regprocedure),
  'guests_delete_guest_data is security definer with an empty search_path'
);
select ok(
  has_function_privilege('authenticated', 'public.guests_delete_guest_data(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.guests_delete_guest_data(uuid)', 'EXECUTE')
    and not has_function_privilege('public', 'public.guests_delete_guest_data(uuid)', 'EXECUTE'),
  'only authenticated can execute guests_delete_guest_data'
);
select is_empty(
  $$select conrelid::regclass::text, conname::text from pg_constraint
    where contype = 'f' and connamespace = 'public'::regnamespace
      and confrelid in ('public.guests'::regclass, 'auth.users'::regclass)
      and confdeltype not in ('c', 'n')$$,
  'every foreign key in public to guests or auth.users is CASCADE or SET NULL'
);
select isnt_empty(
  $$select 1 from pg_constraint where contype = 'f' and connamespace = 'public'::regnamespace
      and confrelid = 'public.guests'::regclass$$,
  'the foreign key check sees a foreign key to guests'
);

-- anon is denied
set local role anon;
select throws_ok(
  $$select public.guests_delete_guest_data('78000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'anon is denied guests_delete_guest_data'
);

-- Someone else's guest: another Guest, and the Organizer of another Event
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(public.guests_delete_guest_data('78000000-0000-0000-0000-000000000002'), 'nothing',
  'a Guest gets nothing for another guest''s id');
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is(public.guests_delete_guest_data('78000000-0000-0000-0000-000000000001'), 'nothing',
  'the Organizer of another Event gets nothing');
select is(public.guests_delete_guest_data('78000000-0000-0000-0000-0000000000ff'), 'nothing',
  'an unknown guest id gets nothing');
reset role;
select is(
  pg_temp.remains('78000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111')
  + pg_temp.remains('78000000-0000-0000-0000-000000000002', '58000000-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222'),
  8::bigint, 'the refused calls changed nothing'
);

-- Guest-only, one Event
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(public.guests_delete_guest_data('78000000-0000-0000-0000-000000000001'), 'deleted_with_user',
  'a guest-only Guest of one Event deletes their data and their user');
select is(public.guests_delete_guest_data('78000000-0000-0000-0000-000000000001'), 'nothing',
  'a second call has nothing to delete');
reset role;
select is(
  pg_temp.remains('78000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111'),
  0::bigint, 'the guest row, contact, RSVP and guest token are gone'
);
select ok(not pg_temp.has_user('11111111-1111-1111-1111-111111111111'), 'the auth user is gone');

-- Guest of two Events
set local role authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is(public.guests_delete_guest_data('78000000-0000-0000-0000-000000000002'), 'deleted',
  'a Guest of two Events deletes only this Event''s data');
reset role;
select is(
  pg_temp.remains('78000000-0000-0000-0000-000000000002', '58000000-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222'),
  0::bigint, 'this Event''s rows are gone'
);
select ok(
  pg_temp.has_user('22222222-2222-2222-2222-222222222222')
    and pg_temp.remains('78000000-0000-0000-0000-00000000000b', '58000000-0000-0000-0000-000000000004',
      '22222222-2222-2222-2222-222222222222') = 4,
  'the user and the other Event''s rows stay'
);

-- A password, an identity, a Role or an own Event keeps the user
set local role authenticated;
set local request.jwt.claims = '{"sub": "77777777-7777-7777-7777-777777777777", "role": "authenticated"}';
select is(public.guests_delete_guest_data('78000000-0000-0000-0000-000000000003'), 'deleted',
  'a Guest with a password keeps the user');
set local request.jwt.claims = '{"sub": "88888888-8888-8888-8888-888888888888", "role": "authenticated"}';
select is(public.guests_delete_guest_data('78000000-0000-0000-0000-000000000004'), 'deleted',
  'a Guest with a GitHub identity keeps the user');
set local request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';
select is(public.guests_delete_guest_data('78000000-0000-0000-0000-000000000005'), 'deleted',
  'a Guest who holds a Role keeps the user');
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is(public.guests_delete_guest_data('78000000-0000-0000-0000-000000000006'), 'deleted',
  'a Guest who organizes an Event keeps the user');
reset role;
select is(
  (select count(*) from auth.users where id in ('77777777-7777-7777-7777-777777777777',
    '88888888-8888-8888-8888-888888888888', '99999999-9999-9999-9999-999999999999',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')),
  4::bigint, 'the four users stay'
);
select is(
  (select count(*) from public.guests where id in ('78000000-0000-0000-0000-000000000003',
    '78000000-0000-0000-0000-000000000004', '78000000-0000-0000-0000-000000000005',
    '78000000-0000-0000-0000-000000000006')),
  0::bigint, 'their guest rows are gone'
);
select is(
  (select count(*) from public.role_members where user_id = '99999999-9999-9999-9999-999999999999'),
  1::bigint, 'the Role-holder keeps the Role'
);

-- A cancelled and an ended Event
set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select is(public.guests_delete_guest_data('78000000-0000-0000-0000-000000000009'), 'deleted_with_user',
  'a Guest of a cancelled Event can delete');
set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';
select is(public.guests_delete_guest_data('78000000-0000-0000-0000-00000000000a'), 'deleted_with_user',
  'a Guest of an ended Event can delete');

-- The Organizer removes a guest: the same deletion
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$select public.guests_remove('78000000-0000-0000-0000-000000000007')$$,
  'the Organizer removes a guest-only guest');
select lives_ok($$select public.guests_remove('78000000-0000-0000-0000-000000000008')$$,
  'the Organizer removes a guest with no link yet');
reset role;
select ok(
  pg_temp.remains('78000000-0000-0000-0000-000000000007', '58000000-0000-0000-0000-000000000001',
    '55555555-5555-5555-5555-555555555555') = 0
    and not pg_temp.has_user('55555555-5555-5555-5555-555555555555'),
  'the removed guest''s rows, token and guest-only user are gone'
);
select ok(
  pg_temp.remains('78000000-0000-0000-0000-000000000008', '58000000-0000-0000-0000-000000000001', null) = 0
    and (select count(*) from auth.users where email like '%@example.test') = 7,
  'the guest without a link is gone and no user was touched'
);

-- The Organizer calls the function directly, then deletes an Event
set local role authenticated;
select is(public.guests_delete_guest_data('78000000-0000-0000-0000-000000000007'), 'nothing',
  'the function has nothing left for a removed guest');
select lives_ok($$select public.events_delete('58000000-0000-0000-0000-000000000005')$$,
  'the Organizer deletes an Event with guests');
reset role;
select is(
  (select count(*) from public.guests where event_id = '58000000-0000-0000-0000-000000000005')
    + (select count(*) from public.rsvps where event_id = '58000000-0000-0000-0000-000000000005')
    + (select count(*) from public.invite_tokens where event_id = '58000000-0000-0000-0000-000000000005'),
  0::bigint, 'no guests, rsvps or invite_tokens row of the Event remains'
);
select ok(
  not pg_temp.has_user('66666666-6666-6666-6666-666666666666')
    and pg_temp.has_user('22222222-2222-2222-2222-222222222222')
    and exists (select 1 from public.guests where id = '78000000-0000-0000-0000-00000000000b'),
  'the guest-only user of that Event alone is gone; a guest of another Event survives'
);

select * from finish();
rollback;
