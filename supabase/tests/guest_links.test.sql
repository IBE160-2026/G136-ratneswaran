begin;
select plan(63);

-- A organizes (named Ada); B organizes another Event; G1 and G2 are guest-only (created by copyGuestLink:
-- Auth's random password, marked pending); R holds a Role; P has a password; H signed up with GitHub.
insert into auth.users (id, email, email_confirmed_at, encrypted_password, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test', now(), 'x', '{"name": "Ada"}'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'organizer-b@example.test', now(), 'x', '{}'),
  ('11111111-1111-1111-1111-111111111111', 'guest-1@example.test', now(), 'random', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'guest-2@example.test', now(), 'random', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'holder-r@example.test', now(), 'random', '{}'),
  ('44444444-4444-4444-4444-444444444444', 'password-p@example.test', now(), 'x', '{}'),
  ('55555555-5555-5555-5555-555555555555', 'github-h@example.test', now(), null, '{}');
update auth.users set raw_app_meta_data = '{"provider": "email", "password_pending": true}'
where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222',
             '33333333-3333-3333-3333-333333333333');
insert into auth.identities (provider_id, user_id, identity_data, provider) values
  ('gh-h', '55555555-5555-5555-5555-555555555555', '{}', 'github');

-- A's Events: live (1), cancelled with a note (2), ended (3); B's live Event (4)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at,
  cancelled_at, cancellation_note)
values
  ('57000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null, null),
  ('57000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), now(), 'Sorry'),
  ('57000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Over',
   now() - interval '2 days', now() - interval '1 day', 'Europe/Oslo', 'en', now() - interval '3 days', null, null),
  ('57000000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B''s party',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null, null);
insert into public.roles (id, event_id, key, active) values
  ('67000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', 'venue', true);
insert into public.role_members (event_id, role_id, user_id, name) values
  ('57000000-0000-0000-0000-000000000001', '67000000-0000-0000-0000-000000000001',
   '33333333-3333-3333-3333-333333333333', 'Rita');

-- Guests: on Event 1 g1, g2, gr (R), gp (P), gn (no auth user yet); g1 also on Events 2, 3 and 4
insert into public.guests (id, event_id, name) values
  ('77000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', 'Gro Hansen'),
  ('77000000-0000-0000-0000-000000000002', '57000000-0000-0000-0000-000000000001', 'Gunn'),
  ('77000000-0000-0000-0000-000000000003', '57000000-0000-0000-0000-000000000001', 'Rita'),
  ('77000000-0000-0000-0000-000000000004', '57000000-0000-0000-0000-000000000001', 'Per'),
  ('77000000-0000-0000-0000-000000000005', '57000000-0000-0000-0000-000000000001', 'Nina'),
  ('77000000-0000-0000-0000-000000000006', '57000000-0000-0000-0000-000000000002', 'Gro Hansen'),
  ('77000000-0000-0000-0000-000000000007', '57000000-0000-0000-0000-000000000003', 'Gro Hansen'),
  ('77000000-0000-0000-0000-000000000008', '57000000-0000-0000-0000-000000000004', 'Gro Hansen');
insert into public.guest_contacts (guest_id, event_id, email)
select g.id, g.event_id, v.email from (values
  ('77000000-0000-0000-0000-000000000001'::uuid, 'Guest-1@example.test'),
  ('77000000-0000-0000-0000-000000000002'::uuid, 'guest-2@example.test'),
  ('77000000-0000-0000-0000-000000000003'::uuid, 'holder-r@example.test'),
  ('77000000-0000-0000-0000-000000000004'::uuid, 'password-p@example.test'),
  ('77000000-0000-0000-0000-000000000005'::uuid, 'new-n@example.test'),
  ('77000000-0000-0000-0000-000000000006'::uuid, 'guest-1@example.test'),
  ('77000000-0000-0000-0000-000000000007'::uuid, 'guest-1@example.test'),
  ('77000000-0000-0000-0000-000000000008'::uuid, 'guest-1@example.test')
) as v (guest_id, email)
join public.guests g on g.id = v.guest_id;

insert into public.invite_tokens (event_id, kind, token_hash, user_id, role_id) values
  ('57000000-0000-0000-0000-000000000001', 'role_holder', sha256(convert_to('tok-role', 'UTF8')),
   '33333333-3333-3333-3333-333333333333', '67000000-0000-0000-0000-000000000001');

-- The active guest token of a guest identity, derived as the server derives it.
create function pg_temp.token(p_event uuid, p_user uuid) returns text language sql as $$
  select public.invite_tokens_guest_token(t.id) from public.invite_tokens t
  where t.event_id = p_event and t.user_id = p_user and t.kind = 'guest' and t.revoked_at is null;
$$;
create function pg_temp.active(p_user uuid) returns bigint language sql as $$
  select count(*) from public.invite_tokens where user_id = p_user and kind = 'guest' and revoked_at is null;
$$;

-- Schema, attributes and grants
select is(
  (select confdeltype from pg_constraint where conrelid = 'public.guests'::regclass and contype = 'f'
     and confrelid = 'auth.users'::regclass),
  'n'::"char", 'guests.user_id is set null when the auth user goes'
);
select ok(
  (select bool_and(prosecdef and proconfig @> array['search_path=""']) from pg_proc
   where oid in ('public.invite_tokens_guest_token(uuid)'::regprocedure,
                 'public.invite_tokens_guest_link(uuid, uuid, boolean)'::regprocedure,
                 'public.invite_tokens_revoke_guest(uuid, uuid)'::regprocedure,
                 'public.invite_tokens_password_changed()'::regprocedure,
                 'public.guests_is_guest_only(uuid)'::regprocedure,
                 'public.guests_copy_link(uuid, boolean)'::regprocedure,
                 'public.guests_link_preview(text)'::regprocedure,
                 'public.guests_open_link(text)'::regprocedure)),
  'the functions are security definer with an empty search_path'
);
select ok(
  (select bool_and(not prosecdef and provolatile = 's' and proconfig @> array['search_path=""']) from pg_proc
   where oid in ('public.is_guest_of(uuid)'::regprocedure, 'public.is_guest_self(uuid)'::regprocedure)),
  'the helpers are stable security invoker with an empty search_path'
);
select ok(
  (select bool_and(not has_function_privilege(r, f, 'EXECUTE'))
   from unnest(array['public', 'anon', 'authenticated']) as r,
        unnest(array['public.invite_tokens_guest_token(uuid)', 'public.invite_tokens_guest_link(uuid, uuid, boolean)',
                     'public.invite_tokens_revoke_guest(uuid, uuid)', 'public.invite_tokens_password_changed()',
                     'public.guests_is_guest_only(uuid)', 'public.guests_link_preview(text)',
                     'public.guests_open_link(text)']) as f),
  'public, anon and authenticated cannot execute the system functions'
);
select ok(
  has_function_privilege('service_role', 'public.guests_link_preview(text)', 'EXECUTE')
    and has_function_privilege('service_role', 'public.guests_open_link(text)', 'EXECUTE'),
  'service_role can execute preview and open'
);
select ok(
  has_function_privilege('authenticated', 'public.guests_copy_link(uuid, boolean)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.is_guest_of(uuid)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.is_guest_self(uuid)', 'EXECUTE'),
  'authenticated can copy links and call the helpers'
);
select ok(
  not has_function_privilege('anon', 'public.guests_copy_link(uuid, boolean)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.is_guest_of(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.is_guest_self(uuid)', 'EXECUTE'),
  'anon cannot copy links or call the helpers'
);
select ok(
  not has_table_privilege('authenticated', 'public.guests', 'INSERT')
    and not has_table_privilege('authenticated', 'public.guests', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.guests', 'DELETE'),
  'authenticated has no direct write on guests'
);

-- guests_is_guest_only
select ok(public.guests_is_guest_only('11111111-1111-1111-1111-111111111111'), 'a pending user is guest-only');
select ok(not public.guests_is_guest_only('33333333-3333-3333-3333-333333333333'), 'a Role-holder is not');
select ok(not public.guests_is_guest_only('44444444-4444-4444-4444-444444444444'), 'a password is not');
select ok(not public.guests_is_guest_only('55555555-5555-5555-5555-555555555555'), 'a GitHub identity is not');
select ok(not public.guests_is_guest_only('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'an Organizer is not');

-- Copy link, as A
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select throws_ok($$select public.guests_copy_link('77000000-0000-0000-0000-000000000005')$$, 'P0002', null,
  'a guest without an auth user yet is P0002');
select ok(public.guests_copy_link('77000000-0000-0000-0000-000000000001') ~ '^[A-Za-z0-9_-]{43}$',
  'copy returns a 43-char base64url token');
select ok(public.guests_copy_link('77000000-0000-0000-0000-000000000001')
  = public.guests_copy_link('77000000-0000-0000-0000-000000000001'), 'a second copy gives the same link');
select throws_ok($$select public.guests_copy_link('77000000-0000-0000-0000-000000000006')$$, '55000', null,
  'a cancelled Event refuses copy');
select throws_ok($$select public.guests_copy_link('77000000-0000-0000-0000-000000000007')$$, '55000', null,
  'an ended Event refuses copy');
select throws_ok($$select public.guests_copy_link('77000000-0000-0000-0000-000000000008')$$, '42501', null,
  'another Organizer''s guest is refused');
select throws_ok($$select public.guests_copy_link('77000000-0000-0000-0000-0000000000ff')$$, '42501', null,
  'an unknown guest looks the same');
select lives_ok($$select public.guests_copy_link('77000000-0000-0000-0000-000000000002'),
  public.guests_copy_link('77000000-0000-0000-0000-000000000003')$$, 'copy for G2 and the Role-holder');
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select lives_ok($$select public.guests_copy_link('77000000-0000-0000-0000-000000000008')$$, 'B copies G1 on B''s Event');
reset role;

select is((select user_id from public.guests where id = '77000000-0000-0000-0000-000000000001'),
  '11111111-1111-1111-1111-111111111111'::uuid, 'copy attaches the user found by email, ignoring case');
select is(pg_temp.active('11111111-1111-1111-1111-111111111111'), 2::bigint, 'one active token per Event');
select ok(
  (select token_hash = sha256(convert_to(pg_temp.token(event_id, user_id), 'UTF8')) from public.invite_tokens
   where event_id = '57000000-0000-0000-0000-000000000001' and user_id = '11111111-1111-1111-1111-111111111111'),
  'only the hash of the derived token is stored'
);
select throws_ok(
  $$insert into public.invite_tokens (event_id, kind, token_hash, user_id)
    values ('57000000-0000-0000-0000-000000000001', 'guest', sha256('x'), '11111111-1111-1111-1111-111111111111')$$,
  '23505', null, 'a second active guest token is refused'
);

-- Preview
select results_eq(
  $$select * from public.guests_link_preview(pg_temp.token('57000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111'))$$,
  $$values ('valid'::text, '57000000-0000-0000-0000-000000000001'::uuid, '11111111-1111-1111-1111-111111111111'::uuid,
            'Gro Hansen'::text, 'Live'::text, 'Ada'::text, null::text)$$,
  'a valid link shows the guest, the Event and the Organizer'
);
select results_eq(
  $$select * from public.guests_link_preview('nope')$$,
  $$values ('invalid'::text, null::uuid, null::uuid, null::text, null::text, null::text, null::text)$$,
  'an unknown token reveals nothing'
);
select results_eq(
  $$select * from public.guests_link_preview('tok-role')$$,
  $$values ('other_kind'::text, null::uuid, null::uuid, null::text, null::text, null::text, null::text)$$,
  'a Role invitation is another kind and reveals nothing'
);
-- Links made before the Event was cancelled or ended
update public.guests set user_id = '11111111-1111-1111-1111-111111111111'
where id in ('77000000-0000-0000-0000-000000000006', '77000000-0000-0000-0000-000000000007');
select public.invite_tokens_guest_link('57000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', false);
select public.invite_tokens_guest_link('57000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', false);
select results_eq(
  $$select status, event_name, cancellation_note from public.guests_link_preview(pg_temp.token(
    '57000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111'))$$,
  $$values ('cancelled'::text, 'Called off'::text, 'Sorry'::text)$$, 'a cancelled Event shows its note'
);
select is(
  (select status from public.guests_link_preview(pg_temp.token('57000000-0000-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111'))),
  'ended', 'an ended Event reads ended'
);
select is(
  (select status from public.guests_open_link(pg_temp.token('57000000-0000-0000-0000-000000000003',
    '11111111-1111-1111-1111-111111111111'))),
  'ended', 'opening an ended Event''s link gives no session'
);

-- Open
select results_eq(
  $$select status, user_id, email from public.guests_open_link(pg_temp.token('57000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111'))$$,
  $$values ('session'::text, '11111111-1111-1111-1111-111111111111'::uuid, 'guest-1@example.test'::text)$$,
  'a guest-only user gets a session'
);
create temp table opened as
  select first_opened_at from public.guests where id = '77000000-0000-0000-0000-000000000001';
select isnt((select first_opened_at from opened), null, 'the first open is recorded');
select public.guests_open_link(pg_temp.token('57000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'));
select is((select first_opened_at from public.guests where id = '77000000-0000-0000-0000-000000000001'),
  (select first_opened_at from opened), 'a later open keeps the first');
select results_eq(
  $$select status, user_id, email from public.guests_open_link(pg_temp.token('57000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333'))$$,
  $$values ('sign_in'::text, '33333333-3333-3333-3333-333333333333'::uuid, 'holder-r@example.test'::text)$$,
  'a Role-holder signs in instead'
);
select isnt((select first_opened_at from public.guests where id = '77000000-0000-0000-0000-000000000003'),
  null, 'Continue to log in is an open too');

-- RLS for a guest session (G1)
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select results_eq($$select id from public.guests order by id$$,
  $$values ('77000000-0000-0000-0000-000000000001'::uuid), ('77000000-0000-0000-0000-000000000006'::uuid),
           ('77000000-0000-0000-0000-000000000007'::uuid), ('77000000-0000-0000-0000-000000000008'::uuid)$$,
  'a guest sees only their own guest rows');
select is((select count(*) from public.guest_contacts), 0::bigint, 'a guest sees no contacts, not even their own');
select throws_ok($$select * from public.invite_tokens$$, '42501', null, 'a guest cannot read invite_tokens');
select throws_ok($$update public.guests set name = 'x' where id = '77000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'a guest cannot update guests');
select throws_ok($$delete from public.guests where id = '77000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'a guest cannot delete guests');
select throws_ok($$select public.guests_copy_link('77000000-0000-0000-0000-000000000001')$$, '42501', null,
  'a guest cannot copy links');
select ok(public.is_guest_of('57000000-0000-0000-0000-000000000001'), 'is_guest_of: own Event');
select ok(public.is_guest_self('77000000-0000-0000-0000-000000000001'), 'is_guest_self: own row');
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select ok(not public.is_guest_of('57000000-0000-0000-0000-000000000004'), 'is_guest_of: not another Event');
select ok(not public.is_guest_self('77000000-0000-0000-0000-000000000001'), 'is_guest_self: not another guest');
select is((select count(*) from public.events), 0::bigint, 'a guest reads no Event row');
select results_eq($$select id from public.guests$$, $$values ('77000000-0000-0000-0000-000000000002'::uuid)$$,
  'a guest on one Event sees only their own row');
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select is((select count(*) from public.guests), 7::bigint, 'the Organizer still sees all their guests');
reset role;

-- New link: earlier links stop, a guest-only user's sessions end, a Role-holder's do not
create temp table old_link as select pg_temp.token('57000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111') as token;
insert into auth.sessions (id, user_id) values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333');
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$select public.guests_copy_link('77000000-0000-0000-0000-000000000001', true),
  public.guests_copy_link('77000000-0000-0000-0000-000000000003', true)$$, 'New link for G1 and the Role-holder');
reset role;
select isnt(pg_temp.token('57000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
  (select token from old_link), 'New link gives another link');
select results_eq(
  $$select * from public.guests_link_preview((select token from old_link))$$,
  $$values ('revoked'::text, null::uuid, null::uuid, null::text, null::text, 'Ada'::text, null::text)$$,
  'the old link is revoked and names only the Organizer'
);
select is((select count(*) from auth.sessions where user_id = '11111111-1111-1111-1111-111111111111'), 0::bigint,
  'the guest-only user''s sessions end');
select is((select count(*) from auth.sessions where user_id = '33333333-3333-3333-3333-333333333333'), 1::bigint,
  'the Role-holder keeps their sessions');
select is(pg_temp.active('11111111-1111-1111-1111-111111111111'), 4::bigint,
  'still one active token per Event (1, 2, 3, 4)');

-- Edit and remove
update public.guests set first_opened_at = now() where id = '77000000-0000-0000-0000-000000000002';
create temp table g2_link as select pg_temp.token('57000000-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222') as token;
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select public.guests_update('77000000-0000-0000-0000-000000000002', 'Gunn B', 'GUEST-2@example.test');
reset role;
select is((select user_id from public.guests where id = '77000000-0000-0000-0000-000000000002'),
  '22222222-2222-2222-2222-222222222222'::uuid, 'a rename or a change of case keeps the link');
set local role authenticated;
select public.guests_update('77000000-0000-0000-0000-000000000002', 'Gunn B', 'other@example.test');
reset role;
select ok(
  (select user_id is null and first_opened_at is null from public.guests
   where id = '77000000-0000-0000-0000-000000000002')
    and pg_temp.active('22222222-2222-2222-2222-222222222222') = 0
    and (select status from public.guests_link_preview((select token from g2_link))) = 'invalid',
  'a changed email detaches the user and the old link reads invalid'
);
set local role authenticated;
select public.guests_remove('77000000-0000-0000-0000-000000000003');
reset role;
select is(
  (select count(*) from public.invite_tokens
   where user_id = '33333333-3333-3333-3333-333333333333' and kind = 'guest' and revoked_at is null),
  0::bigint, 'removing a guest revokes their link'
);

-- The password trigger
update auth.users set raw_user_meta_data = '{"x": 1}' where id = '11111111-1111-1111-1111-111111111111';
select is(pg_temp.active('11111111-1111-1111-1111-111111111111'), 4::bigint, 'other changes revoke nothing');
update auth.users set encrypted_password = 'chosen' where id = '11111111-1111-1111-1111-111111111111';
select ok(
  pg_temp.active('11111111-1111-1111-1111-111111111111') = 0
    and (select not (raw_app_meta_data ? 'password_pending') from auth.users
         where id = '11111111-1111-1111-1111-111111111111'),
  'a chosen password clears the marker and revokes every guest link'
);
select ok(not public.guests_is_guest_only('11111111-1111-1111-1111-111111111111'),
  'after a password the user is no longer guest-only');

-- Deleting an auth user keeps the guest row and drops its tokens
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
update public.guests set user_id = '44444444-4444-4444-4444-444444444444'
where id = '77000000-0000-0000-0000-000000000004';
delete from auth.users where id = '44444444-4444-4444-4444-444444444444';
select is((select user_id from public.guests where id = '77000000-0000-0000-0000-000000000004'), null,
  'the guest row stays without its user');

select * from finish();
rollback;
