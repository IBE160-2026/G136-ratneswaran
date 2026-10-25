begin;
select plan(42);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b@example.test'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'guest-c@example.test');

-- A's Events: live (1), cancelled (2), ended (3), draft without dates (4), to be deleted (5)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at)
values
  ('51000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('51000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), now()),
  ('51000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Over',
   now() - interval '2 days', now() - interval '1 day', 'Europe/Oslo', 'en', now() - interval '3 days', null),
  ('51000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', null,
   null, null, null, null, null, null),
  ('51000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Gone',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  -- B's own Event (6)
  ('51000000-0000-0000-0000-000000000006', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B''s party',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null);

insert into public.roles (id, event_id, key, active) values
  ('61000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'venue', true),
  ('61000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000002', 'venue', true),
  ('61000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000006', 'venue', true);

-- Validation fixtures with known plaintext; only the hash is stored
insert into public.invite_tokens (id, event_id, kind, token_hash, user_id, role_id, revoked_at, consumed_at) values
  ('71000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'role_holder',
   sha256(convert_to('tok-live', 'UTF8')), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '61000000-0000-0000-0000-000000000001', null, null),
  ('71000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001', 'guest',
   sha256(convert_to('tok-revoked', 'UTF8')), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', null, now(), null),
  ('71000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000001', 'role_holder',
   sha256(convert_to('tok-consumed', 'UTF8')), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '61000000-0000-0000-0000-000000000001', null, now()),
  ('71000000-0000-0000-0000-000000000004', '51000000-0000-0000-0000-000000000002', 'guest',
   sha256(convert_to('tok-cancelled', 'UTF8')), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', null, null, null),
  ('71000000-0000-0000-0000-000000000005', '51000000-0000-0000-0000-000000000003', 'guest',
   sha256(convert_to('tok-ended', 'UTF8')), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', null, null, null),
  ('71000000-0000-0000-0000-000000000006', '51000000-0000-0000-0000-000000000004', 'shared_event',
   sha256(convert_to('tok-undated', 'UTF8')), null, null, null, null),
  ('71000000-0000-0000-0000-000000000007', '51000000-0000-0000-0000-000000000005', 'shared_event',
   sha256(convert_to('tok-deleted', 'UTF8')), null, null, null, null),
  -- C's tokens: two live guest links, one Role invitation
  ('72000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', 'guest',
   sha256(convert_to('tok-c1', 'UTF8')), 'cccccccc-cccc-cccc-cccc-cccccccccccc', null, null, null),
  ('72000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000004', 'guest',
   sha256(convert_to('tok-c2', 'UTF8')), 'cccccccc-cccc-cccc-cccc-cccccccccccc', null, null, null),
  ('72000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000001', 'role_holder',
   sha256(convert_to('tok-c3', 'UTF8')), 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   '61000000-0000-0000-0000-000000000001', null, null),
  ('72000000-0000-0000-0000-000000000004', '51000000-0000-0000-0000-000000000001', 'guest',
   sha256(convert_to('tok-b-live', 'UTF8')), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', null, null, null);

-- Five of A's Role invitations from more than 24 hours ago; they must not count toward the cap
insert into public.invite_tokens (event_id, kind, token_hash, user_id, role_id, created_by, created_at)
select '51000000-0000-0000-0000-000000000001', 'role_holder', sha256(convert_to('old-' || n, 'UTF8')),
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '61000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now() - interval '25 hours'
from generate_series(1, 5) as n;

create temp table issued (n int, token text);

-- Schema, grants and function attributes
select ok(
  (select relrowsecurity from pg_class where oid = 'public.invite_tokens'::regclass),
  'RLS is enabled on invite_tokens'
);
select ok(
  not has_table_privilege('anon', 'public.invite_tokens', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
    and not has_table_privilege('authenticated', 'public.invite_tokens', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'),
  'anon and authenticated have no privilege on invite_tokens'
);
select is(
  (select count(*) from pg_policy where polrelid = 'public.invite_tokens'::regclass),
  0::bigint,
  'invite_tokens has no policies'
);
select ok(
  (select bool_and(prosecdef and proconfig @> array['search_path=""']) from pg_proc
   where oid in ('public.invite_tokens_create(uuid, public.invite_kind, uuid, uuid)'::regprocedure,
                 'public.invite_tokens_validate(text, public.invite_kind, uuid)'::regprocedure,
                 'public.invite_tokens_revoke_for_user(uuid)'::regprocedure)),
  'all three functions are security definer with an empty search_path'
);
select ok(
  (select bool_and(not has_function_privilege(r, f, 'EXECUTE'))
   from unnest(array['public', 'anon', 'authenticated']) as r,
        unnest(array['public.invite_tokens_create(uuid, public.invite_kind, uuid, uuid)',
                     'public.invite_tokens_validate(text, public.invite_kind, uuid)',
                     'public.invite_tokens_revoke_for_user(uuid)']) as f),
  'public, anon and authenticated cannot execute the functions'
);
select ok(
  has_function_privilege('service_role', 'public.invite_tokens_create(uuid, public.invite_kind, uuid, uuid)', 'EXECUTE')
    and has_function_privilege('service_role', 'public.invite_tokens_validate(text, public.invite_kind, uuid)', 'EXECUTE')
    and has_function_privilege('service_role', 'public.invite_tokens_revoke_for_user(uuid)', 'EXECUTE'),
  'service_role can execute the functions'
);

-- Direct calls from clients are refused
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select throws_ok($$select * from public.invite_tokens$$, '42501', null, 'authenticated cannot select invite_tokens');
select throws_ok(
  $$select public.invite_tokens_create('51000000-0000-0000-0000-000000000001', 'role_holder',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '61000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'authenticated cannot create a token'
);
select throws_ok(
  $$select * from public.invite_tokens_validate('tok-live', 'role_holder', '51000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'authenticated cannot validate a token'
);
select throws_ok(
  $$select public.invite_tokens_revoke_for_user('cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  '42501', null, 'authenticated cannot revoke tokens'
);
set local role anon;
select throws_ok($$select * from public.invite_tokens$$, '42501', null, 'anon cannot select invite_tokens');
select throws_ok(
  $$select * from public.invite_tokens_validate('tok-live', 'role_holder', '51000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'anon cannot validate a token'
);
reset role;

-- Create, as A (the calling SQL function runs under A's session)
insert into issued select 1, public.invite_tokens_create('51000000-0000-0000-0000-000000000001', 'role_holder',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '61000000-0000-0000-0000-000000000001');
insert into issued select 2, public.invite_tokens_create('51000000-0000-0000-0000-000000000001', 'role_holder',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '61000000-0000-0000-0000-000000000001');
select ok(
  (select token ~ '^[A-Za-z0-9_-]{43}$' from issued where n = 1),
  'create returns a 43-char unpadded base64url token'
);
select results_eq(
  $$select t.created_by, t.kind from public.invite_tokens t
    where t.token_hash = (select sha256(convert_to(token, 'UTF8')) from issued where n = 1)$$,
  $$values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'role_holder'::public.invite_kind)$$,
  'the stored hash is sha256 of the token text and created_by is the caller'
);
select isnt(
  (select token from issued where n = 1), (select token from issued where n = 2),
  'two creates give different tokens'
);
select throws_ok(
  $$select public.invite_tokens_create('51000000-0000-0000-0000-000000000001', 'role_holder',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '61000000-0000-0000-0000-000000000002')$$,
  '22023', null, 'a Role of another Event is refused'
);
select throws_ok(
  $$select public.invite_tokens_create('51000000-0000-0000-0000-000000000001', 'guest',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '61000000-0000-0000-0000-000000000001')$$,
  '23514', null, 'a guest token cannot carry a Role'
);
select throws_ok(
  $$select public.invite_tokens_create('51000000-0000-0000-0000-000000000001', 'guest')$$,
  '23514', null, 'a guest token needs a user'
);
select throws_ok(
  $$select public.invite_tokens_create('51000000-0000-0000-0000-000000000001', 'shared_event',
    'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  '23514', null, 'a shared-event token has no user'
);
select throws_ok(
  $$insert into public.invite_tokens (event_id, kind, token_hash, user_id, consumed_at)
    values ('51000000-0000-0000-0000-000000000001', 'guest', sha256(convert_to('tok-x', 'UTF8')),
            'cccccccc-cccc-cccc-cccc-cccccccccccc', now())$$,
  '23514', null, 'only a Role invitation can be consumed'
);

-- Daily cap: two issued plus 28 more is 30 in 24 hours; the five old ones do not count
select lives_ok(
  $$select public.invite_tokens_create('51000000-0000-0000-0000-000000000001', 'role_holder',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '61000000-0000-0000-0000-000000000001')
    from generate_series(1, 28)$$,
  'A reaches 30 Role invitations although five older ones exist'
);
select throws_ok(
  $$select public.invite_tokens_create('51000000-0000-0000-0000-000000000001', 'role_holder',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '61000000-0000-0000-0000-000000000001')$$,
  '53400', null, 'the 31st Role invitation in 24 hours is refused'
);
select lives_ok(
  $$select public.invite_tokens_create('51000000-0000-0000-0000-000000000001', 'guest',
      'cccccccc-cccc-cccc-cccc-cccccccccccc', null),
    public.invite_tokens_create('51000000-0000-0000-0000-000000000001', 'shared_event', null, null)$$,
  'guest and shared-event tokens are not capped'
);
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok(
  $$select public.invite_tokens_create('51000000-0000-0000-0000-000000000001', 'role_holder',
    'cccccccc-cccc-cccc-cccc-cccccccccccc', '61000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'a non-Organizer cannot invite to a Role'
);
select lives_ok(
  $$select public.invite_tokens_create('51000000-0000-0000-0000-000000000006', 'role_holder',
    'cccccccc-cccc-cccc-cccc-cccccccccccc', '61000000-0000-0000-0000-000000000003')$$,
  'the cap is per creator'
);
set local request.jwt.claims = '{}';
select throws_ok(
  $$select public.invite_tokens_create('51000000-0000-0000-0000-000000000006', 'role_holder',
    'cccccccc-cccc-cccc-cccc-cccccccccccc', '61000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'a create without a session is refused'
);

-- Validate
select results_eq(
  $$select * from public.invite_tokens_validate('tok-live', 'role_holder', '51000000-0000-0000-0000-000000000001')$$,
  $$values ('valid'::text, '71000000-0000-0000-0000-000000000001'::uuid, '51000000-0000-0000-0000-000000000001'::uuid,
            'role_holder'::public.invite_kind, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
            '61000000-0000-0000-0000-000000000001'::uuid)$$,
  'a live token is valid and returns its ids'
);
select is(
  (select status from public.invite_tokens_validate((select token from issued where n = 1), 'role_holder',
    '51000000-0000-0000-0000-000000000001')),
  'valid', 'a freshly created token validates'
);
select results_eq(
  $$select * from public.invite_tokens_validate('tok-revoked', 'guest', '51000000-0000-0000-0000-000000000001')$$,
  $$values ('used'::text, null::uuid, null::uuid, null::public.invite_kind, null::uuid, null::uuid)$$,
  'a revoked token is used, without ids'
);
select is(
  (select status from public.invite_tokens_validate('tok-consumed', 'role_holder', '51000000-0000-0000-0000-000000000001')),
  'used', 'a consumed token is used'
);
select is(
  (select status from public.invite_tokens_validate('tok-cancelled', 'guest', '51000000-0000-0000-0000-000000000002')),
  'expired', 'a token for a cancelled Event is expired'
);
select is(
  (select status from public.invite_tokens_validate('tok-ended', 'guest', '51000000-0000-0000-0000-000000000003')),
  'expired', 'a token for an ended Event is expired'
);
select is(
  (select status from public.invite_tokens_validate('tok-undated', 'shared_event', '51000000-0000-0000-0000-000000000004')),
  'valid', 'a token for an Event without an end stays valid'
);
select results_eq(
  $$select * from public.invite_tokens_validate('tok-live', 'guest', '51000000-0000-0000-0000-000000000001')$$,
  $$values ('invalid'::text, null::uuid, null::uuid, null::public.invite_kind, null::uuid, null::uuid)$$,
  'another kind is invalid, without ids'
);
select is(
  (select status from public.invite_tokens_validate('tok-live', 'role_holder', '51000000-0000-0000-0000-000000000002')),
  'invalid', 'another Event is invalid'
);
select is(
  (select status from public.invite_tokens_validate('tok-live', null, '51000000-0000-0000-0000-000000000001')),
  'invalid', 'a null kind is invalid'
);
select is(
  (select status from public.invite_tokens_validate('tok-live', 'role_holder', null)),
  'invalid', 'a null Event is invalid'
);
select is(
  (select status from public.invite_tokens_validate('nope', 'role_holder', '51000000-0000-0000-0000-000000000001')),
  'invalid', 'an unknown token is invalid'
);
delete from public.events where id = '51000000-0000-0000-0000-000000000005';
select is(
  (select status from public.invite_tokens_validate('tok-deleted', 'shared_event', '51000000-0000-0000-0000-000000000005')),
  'invalid', 'a token for a deleted Event is invalid'
);

-- Revoke for user: same-transaction semantics, then only C's live guest tokens
savepoint before_join;
select public.invite_tokens_revoke_for_user('cccccccc-cccc-cccc-cccc-cccccccccccc');
rollback to savepoint before_join;
select is(
  (select count(*) from public.invite_tokens
   where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' and revoked_at is not null),
  0::bigint,
  'a rolled-back join leaves the guest tokens live'
);
select public.invite_tokens_revoke_for_user('cccccccc-cccc-cccc-cccc-cccccccccccc');
select results_eq(
  $$select kind, revoked_at is not null from public.invite_tokens
    where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' order by kind, revoked_at is not null$$,
  $$values ('guest'::public.invite_kind, true), ('guest', true), ('guest', true),
           ('role_holder', false), ('role_holder', false)$$,
  'only the user''s guest tokens are revoked'
);
select is(
  (select revoked_at from public.invite_tokens where id = '72000000-0000-0000-0000-000000000004'),
  null, 'another user''s guest token stays live'
);

select * from finish();
rollback;
