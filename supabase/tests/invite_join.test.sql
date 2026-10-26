begin;
select plan(52);

-- A organizes; B is a stranger; C is a new invitee (confirmed at invite time, no password); D has a
-- password; E signed up with GitHub; F was never confirmed.
insert into auth.users (id, email, email_confirmed_at, encrypted_password) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test', now(), 'x'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stranger-b@example.test', now(), 'x'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'invitee-c@example.test', now(), ''),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'password-d@example.test', now(), 'x'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'github-e@example.test', now(), null),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'unconfirmed-f@example.test', null, null),
  ('99999999-9999-9999-9999-999999999999', 'pending-g@example.test', now(), 'random-from-auth'),
  -- H: invited by 3.6 before this story: unconfirmed, Auth's random password, no marker
  ('88888888-8888-8888-8888-888888888888', 'legacy-h@example.test', null, 'random-from-auth');
-- G was created by inviteToRole: Auth's random password, marked as not chosen yet
update auth.users set raw_app_meta_data = '{"provider": "email", "password_pending": true}'
where id = '99999999-9999-9999-9999-999999999999';
insert into auth.identities (provider_id, user_id, identity_data, provider) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '{}', 'email'),
  ('gh-e', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '{}', 'github'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '{}', 'email');

-- A's Events: live (1), cancelled (2), published and ended (3)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at)
values
  ('54000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('54000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), now()),
  ('54000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Over',
   now() - interval '2 days', now() - interval '1 day', 'Europe/Oslo', 'en', now() - interval '3 days', null);

insert into public.roles (id, event_id, key, active) values
  ('64000000-0000-0000-0000-000000000001', '54000000-0000-0000-0000-000000000001', 'venue', true),
  ('64000000-0000-0000-0000-000000000002', '54000000-0000-0000-0000-000000000001', 'guests', true),
  ('64000000-0000-0000-0000-000000000003', '54000000-0000-0000-0000-000000000002', 'venue', true),
  ('64000000-0000-0000-0000-000000000004', '54000000-0000-0000-0000-000000000003', 'venue', true);

-- Pending invitations
insert into public.role_members (event_id, role_id, user_id, name, email) values
  ('54000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000001',
   'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', 'invitee-c@example.test'),
  ('54000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000001',
   'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', 'password-d@example.test'),
  ('54000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000001',
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Eli', 'github-e@example.test'),
  ('54000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000001',
   'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Fay', 'unconfirmed-f@example.test'),
  ('54000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000001',
   '99999999-9999-9999-9999-999999999999', 'Gus', 'pending-g@example.test'),
  ('54000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000001',
   '88888888-8888-8888-8888-888888888888', 'Hal', 'legacy-h@example.test'),
  ('54000000-0000-0000-0000-000000000002', '64000000-0000-0000-0000-000000000003',
   'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', 'invitee-c@example.test'),
  ('54000000-0000-0000-0000-000000000003', '64000000-0000-0000-0000-000000000004',
   'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', 'invitee-c@example.test');

insert into public.invite_tokens (event_id, kind, token_hash, user_id, role_id, revoked_at, consumed_at) values
  ('54000000-0000-0000-0000-000000000001', 'role_holder', sha256(convert_to('tok-c', 'UTF8')),
   'cccccccc-cccc-cccc-cccc-cccccccccccc', '64000000-0000-0000-0000-000000000001', null, null),
  ('54000000-0000-0000-0000-000000000001', 'role_holder', sha256(convert_to('tok-d', 'UTF8')),
   'dddddddd-dddd-dddd-dddd-dddddddddddd', '64000000-0000-0000-0000-000000000001', null, null),
  ('54000000-0000-0000-0000-000000000001', 'role_holder', sha256(convert_to('tok-e', 'UTF8')),
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '64000000-0000-0000-0000-000000000001', null, null),
  ('54000000-0000-0000-0000-000000000001', 'role_holder', sha256(convert_to('tok-f', 'UTF8')),
   'ffffffff-ffff-ffff-ffff-ffffffffffff', '64000000-0000-0000-0000-000000000001', null, null),
  ('54000000-0000-0000-0000-000000000001', 'role_holder', sha256(convert_to('tok-g', 'UTF8')),
   '99999999-9999-9999-9999-999999999999', '64000000-0000-0000-0000-000000000001', null, null),
  ('54000000-0000-0000-0000-000000000001', 'role_holder', sha256(convert_to('tok-h', 'UTF8')),
   '88888888-8888-8888-8888-888888888888', '64000000-0000-0000-0000-000000000001', null, null),
  ('54000000-0000-0000-0000-000000000002', 'role_holder', sha256(convert_to('tok-cancelled', 'UTF8')),
   'cccccccc-cccc-cccc-cccc-cccccccccccc', '64000000-0000-0000-0000-000000000003', null, null),
  ('54000000-0000-0000-0000-000000000003', 'role_holder', sha256(convert_to('tok-ended', 'UTF8')),
   'cccccccc-cccc-cccc-cccc-cccccccccccc', '64000000-0000-0000-0000-000000000004', null, null),
  ('54000000-0000-0000-0000-000000000001', 'role_holder', sha256(convert_to('tok-consumed', 'UTF8')),
   'cccccccc-cccc-cccc-cccc-cccccccccccc', '64000000-0000-0000-0000-000000000002', null, now()),
  ('54000000-0000-0000-0000-000000000001', 'role_holder', sha256(convert_to('tok-revoked', 'UTF8')),
   'cccccccc-cccc-cccc-cccc-cccccccccccc', '64000000-0000-0000-0000-000000000001', now(), null),
  -- D's link to a Role with no membership row: the invitation was withdrawn
  ('54000000-0000-0000-0000-000000000001', 'role_holder', sha256(convert_to('tok-orphan', 'UTF8')),
   'dddddddd-dddd-dddd-dddd-dddddddddddd', '64000000-0000-0000-0000-000000000002', null, null),
  ('54000000-0000-0000-0000-000000000001', 'guest', sha256(convert_to('tok-c-guest', 'UTF8')),
   'cccccccc-cccc-cccc-cccc-cccccccccccc', null, null, null);

-- A snapshot of everything a join may change, to prove a refused join changes nothing
create temp table snapshot as
  select (select string_agg(user_id::text || role_id::text || coalesce(joined_at::text, '-'), ',' order by user_id, role_id)
          from public.role_members) as members,
         (select string_agg(id::text || coalesce(revoked_at::text, '-') || coalesce(consumed_at::text, '-'), ',' order by id)
          from public.invite_tokens) as tokens,
         (select count(*) from public.role_membership_log) as log;
create function pg_temp.unchanged() returns boolean language sql as $$
  select (select string_agg(user_id::text || role_id::text || coalesce(joined_at::text, '-'), ',' order by user_id, role_id)
          from public.role_members) = s.members
     and (select string_agg(id::text || coalesce(revoked_at::text, '-') || coalesce(consumed_at::text, '-'), ',' order by id)
          from public.invite_tokens) = s.tokens
     and (select count(*) from public.role_membership_log) = s.log
  from snapshot s;
$$;

-- Function attributes and grants
select ok(
  (select bool_and(prosecdef and proconfig @> array['search_path=""']) from pg_proc
   where oid in ('public.invite_tokens_lookup(text)'::regprocedure,
                 'public.invite_tokens_validate(text, public.invite_kind, uuid)'::regprocedure,
                 'public.events_invite_preview(text)'::regprocedure,
                 'public.events_join_role(text, uuid)'::regprocedure)),
  'the functions are security definer with an empty search_path'
);
select ok(
  (select bool_and(not has_function_privilege(r, f, 'EXECUTE'))
   from unnest(array['public', 'anon', 'authenticated']) as r,
        unnest(array['public.invite_tokens_lookup(text)', 'public.events_invite_preview(text)',
                     'public.events_join_role(text, uuid)']) as f),
  'public, anon and authenticated cannot execute lookup, preview or join'
);
select ok(
  has_function_privilege('service_role', 'public.events_invite_preview(text)', 'EXECUTE')
    and has_function_privilege('service_role', 'public.events_join_role(text, uuid)', 'EXECUTE'),
  'service_role can execute preview and join'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select throws_ok($$select * from public.events_invite_preview('tok-c')$$, '42501', null,
  'authenticated cannot preview');
select throws_ok($$select * from public.events_join_role('tok-c', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  '42501', null, 'authenticated cannot join');
select throws_ok($$select * from public.invite_tokens_lookup('tok-c')$$, '42501', null,
  'authenticated cannot look up a token');
set local role anon;
select throws_ok($$select * from public.events_invite_preview('tok-c')$$, '42501', null, 'anon cannot preview');
select throws_ok($$select * from public.events_join_role('tok-c', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  '42501', null, 'anon cannot join');
reset role;

-- Lookup and validate
select results_eq(
  $$select status, event_id, kind from public.invite_tokens_lookup('tok-consumed')$$,
  $$values ('used'::text, '54000000-0000-0000-0000-000000000001'::uuid, 'role_holder'::public.invite_kind)$$,
  'lookup gives a used token''s ids'
);
select results_eq(
  $$select * from public.invite_tokens_validate('tok-consumed', 'role_holder', '54000000-0000-0000-0000-000000000001')$$,
  $$values ('used'::text, null::uuid, null::uuid, null::public.invite_kind, null::uuid, null::uuid)$$,
  'validate still hides a used token''s ids'
);
select is(
  (select status from public.invite_tokens_validate('tok-consumed', 'guest', '54000000-0000-0000-0000-000000000001')),
  'invalid', 'validate: a used token of another kind is still invalid'
);
select is(
  (select status from public.invite_tokens_validate('tok-cancelled', 'role_holder', '54000000-0000-0000-0000-000000000002')),
  'expired', 'validate: a cancelled Event is still expired'
);
select is(
  (select user_id from public.invite_tokens_validate('tok-c', 'role_holder', '54000000-0000-0000-0000-000000000001')),
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'validate: a live token still returns its ids'
);

-- Preview
select results_eq(
  $$select * from public.events_invite_preview('tok-c')$$,
  $$values ('valid'::text, '54000000-0000-0000-0000-000000000001'::uuid, 'Live'::text, 'venue'::public.role_key,
            'Cleo'::text, 'invitee-c@example.test'::text, false)$$,
  'a new invitee''s preview shows only their own invitation, without an account'
);
select is((select has_account from public.events_invite_preview('tok-d')), true, 'a password is an account');
select is((select has_account from public.events_invite_preview('tok-e')), true, 'a GitHub identity is an account');
select is((select has_account from public.events_invite_preview('tok-g')), false,
  'Auth''s random password for an invitee marked password_pending is no account');
select is((select status from public.events_invite_preview('tok-consumed')), 'used', 'a consumed token is used');
select is((select status from public.events_invite_preview('tok-revoked')), 'used', 'a revoked token is used');
select is((select status from public.events_invite_preview('tok-orphan')), 'used', 'a withdrawn invitation is used');
select results_eq(
  $$select * from public.events_invite_preview('nope')$$,
  $$values ('invalid'::text, null::uuid, null::text, null::public.role_key, null::text, null::text, null::boolean)$$,
  'an unknown token reveals nothing'
);
select is((select status from public.events_invite_preview('tok-c-guest')), 'invalid', 'a guest link is invalid');
select is((select status from public.events_invite_preview('tok-cancelled')), 'expired', 'a cancelled Event is expired');
select is((select status from public.events_invite_preview('tok-ended')), 'expired', 'an ended Event is expired');
select is((select event_name from public.events_invite_preview('tok-ended')), null, 'an expired preview has no name');

-- Join refusals change nothing
select results_eq(
  $$select * from public.events_join_role('tok-c', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$,
  $$values ('mismatch'::text, null::uuid)$$, 'another user is a mismatch'
);
select is((select status from public.events_join_role('tok-f', 'ffffffff-ffff-ffff-ffff-ffffffffffff')),
  'mismatch', 'an unconfirmed email is a mismatch');
select is((select status from public.events_join_role('tok-consumed', 'cccccccc-cccc-cccc-cccc-cccccccccccc')),
  'used', 'a consumed token is used');
select is((select status from public.events_join_role('tok-revoked', 'cccccccc-cccc-cccc-cccc-cccccccccccc')),
  'used', 'a revoked token is used');
select is((select status from public.events_join_role('tok-orphan', 'dddddddd-dddd-dddd-dddd-dddddddddddd')),
  'used', 'a withdrawn invitation is used');
select is((select status from public.events_join_role('tok-cancelled', 'cccccccc-cccc-cccc-cccc-cccccccccccc')),
  'expired', 'a cancelled Event is expired');
select is((select status from public.events_join_role('tok-ended', 'cccccccc-cccc-cccc-cccc-cccccccccccc')),
  'expired', 'an ended Event is expired');
select is((select status from public.events_join_role('tok-c-guest', 'cccccccc-cccc-cccc-cccc-cccccccccccc')),
  'invalid', 'a guest link is the wrong kind');
select is((select status from public.events_join_role('nope', 'cccccccc-cccc-cccc-cccc-cccccccccccc')),
  'invalid', 'an unknown token is invalid');
select ok(pg_temp.unchanged(), 'no refused join changed a membership, token or log row');

-- Policy before the join: pending and stranger see nothing, the Organizer sees the Event
set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select is((select count(*) from public.events where id = '54000000-0000-0000-0000-000000000001'),
  0::bigint, 'a pending invitee cannot read the Event');
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is((select count(*) from public.events), 0::bigint, 'a stranger cannot read any Event');
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select is((select count(*) from public.events where id = '54000000-0000-0000-0000-000000000001'),
  1::bigint, 'the Organizer still reads the Event');
reset role;

-- The join
select results_eq(
  $$select * from public.events_join_role('tok-c', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  $$values ('joined'::text, '54000000-0000-0000-0000-000000000001'::uuid)$$,
  'the invited user joins and gets the Event'
);
select isnt(
  (select joined_at from public.role_members
   where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and role_id = '64000000-0000-0000-0000-000000000001'),
  null, 'the membership is joined'
);
select isnt(
  (select consumed_at from public.invite_tokens where token_hash = sha256(convert_to('tok-c', 'UTF8'))),
  null, 'the token is consumed'
);
select isnt(
  (select revoked_at from public.invite_tokens where token_hash = sha256(convert_to('tok-c-guest', 'UTF8'))),
  null, 'the joiner''s guest link is revoked'
);
select results_eq(
  $$select action, actor_id, user_id from public.role_membership_log where event_id = '54000000-0000-0000-0000-000000000001'$$,
  $$values ('joined'::text, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid)$$,
  'one joined entry with the member as actor'
);
select results_eq(
  $$select * from public.events_join_role('tok-c', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  $$values ('joined'::text, '54000000-0000-0000-0000-000000000001'::uuid)$$,
  'a second Join by the same user lands on the Event again'
);
select is((select count(*) from public.role_membership_log where event_id = '54000000-0000-0000-0000-000000000001'), 1::bigint, 'the second Join logs nothing');
select is((select status from public.events_join_role('tok-c', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')),
  'used', 'another user gets used on a consumed token');

-- Policy after the join: the member reads the Event, the stranger still does not
set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select results_eq(
  $$select id from public.events$$,
  $$values ('54000000-0000-0000-0000-000000000001'::uuid)$$,
  'a joined member reads that Event only, not the ones they are pending on'
);
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is((select count(*) from public.events), 0::bigint, 'a stranger still cannot read the Event');
reset role;

-- The migration's backfill, run again here (its statement verbatim) for H, a 3.6-era invitee
select is((select has_account from public.events_invite_preview('tok-h')), true,
  'before the backfill a 3.6 invitee reads as an account');
update auth.users u
set email_confirmed_at = coalesce(u.email_confirmed_at, now()),
  raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || '{"password_pending": true}'::jsonb
where u.last_sign_in_at is null
  and u.confirmation_sent_at is null
  and exists (select 1 from public.role_members m where m.user_id = u.id and m.joined_at is null)
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider <> 'email');
select is((select has_account from public.events_invite_preview('tok-h')), false,
  'after the backfill the 3.6 invitee verifies a code instead');
select is((select status from public.events_join_role('tok-h', '88888888-8888-8888-8888-888888888888')),
  'joined', 'and can join, confirmed');
update auth.users set confirmation_sent_at = now(), email_confirmed_at = null, raw_app_meta_data = '{}'
where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
update auth.users u
set email_confirmed_at = coalesce(u.email_confirmed_at, now()),
  raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || '{"password_pending": true}'::jsonb
where u.last_sign_in_at is null
  and u.confirmation_sent_at is null
  and exists (select 1 from public.role_members m where m.user_id = u.id and m.joined_at is null)
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider <> 'email');
select is((select email_confirmed_at from auth.users where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'), null,
  'the backfill leaves an unconfirmed self signUp unconfirmed');

select * from finish();
rollback;
