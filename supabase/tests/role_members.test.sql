begin;
select plan(55);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stranger-b@example.test'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'invitee-c@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'member-d@example.test'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'fixed-e@example.test'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'capped-f@example.test'),
  ('11111111-1111-1111-1111-111111111111', 'typo-g@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'typo-h@example.test');

-- A's Events: live (1), cancelled (2), published and ended (3); B's own Event (4)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at)
values
  ('53000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('53000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), now()),
  ('53000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Over',
   now() - interval '2 days', now() - interval '1 day', 'Europe/Oslo', 'en', now() - interval '3 days', null),
  ('53000000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B''s party',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null);

insert into public.roles (id, event_id, key, active) values
  ('63000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001', 'venue', true),
  ('63000000-0000-0000-0000-000000000002', '53000000-0000-0000-0000-000000000001', 'guests', true),
  ('63000000-0000-0000-0000-000000000003', '53000000-0000-0000-0000-000000000001', 'program', false),
  ('63000000-0000-0000-0000-000000000004', '53000000-0000-0000-0000-000000000002', 'venue', true),
  ('63000000-0000-0000-0000-000000000005', '53000000-0000-0000-0000-000000000003', 'venue', true),
  ('63000000-0000-0000-0000-000000000006', '53000000-0000-0000-0000-000000000004', 'venue', true);

-- D has joined Venue; G and H are pending on Venue (typos to correct); C has a live guest link to Event 1
insert into public.role_members (id, event_id, role_id, user_id, name, email, joined_at) values
  ('73000000-0000-0000-0000-000000000001', '53000000-0000-0000-0000-000000000001',
   '63000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', 'member-d@example.test', now()),
  ('73000000-0000-0000-0000-000000000002', '53000000-0000-0000-0000-000000000001',
   '63000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Gina', 'typo-g@example.test', null),
  ('73000000-0000-0000-0000-000000000003', '53000000-0000-0000-0000-000000000001',
   '63000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Hal', 'typo-h@example.test', null);
insert into public.invite_tokens (event_id, kind, token_hash, user_id, role_id) values
  ('53000000-0000-0000-0000-000000000001', 'guest', sha256(convert_to('tok-c-guest', 'UTF8')),
   'cccccccc-cccc-cccc-cccc-cccccccccccc', null),
  ('53000000-0000-0000-0000-000000000001', 'role_holder', sha256(convert_to('tok-g-role', 'UTF8')),
   '11111111-1111-1111-1111-111111111111', '63000000-0000-0000-0000-000000000001');

create temp table issued (n int, status text, token text);
grant select, insert on issued to authenticated;

-- Schema, grants and function attributes
select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.role_members'::regclass, 'public.role_membership_log'::regclass)),
  'RLS is enabled on role_members and role_membership_log'
);
select ok(
  not has_table_privilege('authenticated', 'public.role_members', 'INSERT, UPDATE, DELETE, TRUNCATE')
    and not has_table_privilege('authenticated', 'public.role_membership_log', 'INSERT, UPDATE, DELETE, TRUNCATE')
    and not has_table_privilege('anon', 'public.role_members', 'SELECT, INSERT, UPDATE, DELETE')
    and not has_table_privilege('anon', 'public.role_membership_log', 'SELECT, INSERT, UPDATE, DELETE'),
  'no client has write access, and anon has none at all'
);
select ok(
  (select prosecdef and proconfig @> array['search_path=""'] from pg_proc
   where oid = 'public.events_invite_to_role(uuid, text, text, uuid)'::regprocedure),
  'events_invite_to_role is security definer with an empty search_path'
);
select ok(
  has_function_privilege('authenticated', 'public.events_invite_to_role(uuid, text, text, uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.events_invite_to_role(uuid, text, text, uuid)', 'EXECUTE')
    and not has_function_privilege('public', 'public.events_invite_to_role(uuid, text, text, uuid)', 'EXECUTE'),
  'only authenticated can execute events_invite_to_role'
);
select ok(
  not has_function_privilege('authenticated', 'public.invite_tokens_check_cap()', 'EXECUTE')
    and not has_function_privilege('anon', 'public.invite_tokens_check_cap()', 'EXECUTE')
    and not has_function_privilege('public', 'public.invite_tokens_check_cap()', 'EXECUTE'),
  'invite_tokens_check_cap is a system function no client can execute'
);

-- New invitee, as A
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
insert into issued select 1, * from public.events_invite_to_role(
  '63000000-0000-0000-0000-000000000001', '  Cleo ', ' Invitee-C@Example.test ');
select ok(
  (select status = 'invited' and token ~ '^[A-Za-z0-9_-]{43}$' from issued where n = 1),
  'a new invitee is invited and gets a link token'
);
select results_eq(
  $$select name, email, joined_at is null, invited_by from public.role_members
    where role_id = '63000000-0000-0000-0000-000000000001' and user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  $$values ('Cleo', 'invitee-c@example.test', true, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid)$$,
  'a pending row with the trimmed name, the lower-cased email and A as inviter'
);
select results_eq(
  $$select event_id, role_id, action, actor_id from public.role_membership_log
    where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'$$,
  $$values ('53000000-0000-0000-0000-000000000001'::uuid, '63000000-0000-0000-0000-000000000001'::uuid,
            'invited', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid)$$,
  'the invitation is logged with ids and the acting Organizer'
);
select is(
  (select count(*) from information_schema.columns
   where table_schema = 'public' and table_name = 'role_membership_log' and column_name in ('name', 'email')),
  0::bigint,
  'the log has no name or email column'
);

-- Same person again: New link
insert into issued select 2, * from public.events_invite_to_role(
  '63000000-0000-0000-0000-000000000001', ' Cleo Renamed ', 'invitee-c@example.test');
select ok(
  (select i2.status = 'invited' and i2.token <> i1.token from issued i1, issued i2 where i1.n = 1 and i2.n = 2),
  'inviting a pending person again gives a new link'
);
select is(
  (select count(*) from public.role_members where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  1::bigint,
  'the pending row is not duplicated'
);
select is(
  (select name from public.role_members where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'Cleo Renamed',
  'a new link takes the name just entered'
);

-- Already joined this Role; holds another Role; the Organizer's own email
select results_eq(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000001', 'Dana', 'member-d@example.test')$$,
  $$values ('member'::text, null::text)$$,
  'a person who joined this Role is a member, with no link'
);
select results_eq(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000002', 'Dana', 'member-d@example.test')$$,
  $$values ('added'::text, null::text)$$,
  'a person who holds another Role of the Event is added, with no link'
);
select ok(
  (select joined_at is not null from public.role_members
   where role_id = '63000000-0000-0000-0000-000000000002' and user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'the added person joins the second Role at once'
);
select results_eq(
  $$select action, actor_id from public.role_membership_log
    where user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'$$,
  $$values ('joined'::text, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid)$$,
  'the addition is logged as joined, once'
);
select results_eq(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000001', 'Me', 'Organizer-A@example.test')$$,
  $$values ('self'::text, null::text)$$,
  'the Organizer''s own email is self'
);
select is(
  (select count(*) from public.role_members where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint,
  'the Organizer gets no row'
);

-- Refusals
select throws_ok(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000001', 'Nobody', 'nobody@example.test')$$,
  'P0002', null, 'an email with no auth user is refused'
);
select throws_ok(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000003', 'Nobody', 'nobody@example.test')$$,
  '22023', null, 'an inactive Role is refused'
);
select throws_ok(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000004', 'Nobody', 'nobody@example.test')$$,
  '55000', null, 'a cancelled Event is read-only'
);
select throws_ok(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000005', 'Nobody', 'nobody@example.test')$$,
  '55000', null, 'an ended published Event is read-only'
);
select throws_ok(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000006', 'Nobody', 'nobody@example.test')$$,
  '42501', null, 'A cannot invite to B''s Role'
);
select throws_ok(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-0000000000ff', 'Nobody', 'nobody@example.test')$$,
  '42501', null, 'an unknown Role is refused like a foreign one'
);
select throws_ok(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000001', ' ', 'fixed-e@example.test')$$,
  '23514', null, 'a blank name is refused'
);
select throws_ok(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000002', 'Eve', 'fixed-e@example.test',
    '73000000-0000-0000-0000-000000000001')$$,
  'P0001', 'stale_invitation', 'Correct email refuses a row of another Role'
);
select throws_ok(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000001', 'Eve', 'fixed-e@example.test',
    '73000000-0000-0000-0000-000000000001')$$,
  'P0001', 'stale_invitation', 'Correct email refuses a joined row'
);
select throws_ok(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000001', 'Eve', 'fixed-e@example.test',
    '73000000-0000-0000-0000-0000000000ff')$$,
  'P0001', 'stale_invitation', 'Correct email refuses a row that no longer exists'
);

-- Direct writes are refused
select throws_ok(
  $$insert into public.role_members (event_id, role_id, user_id, name, email)
    values ('53000000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000002',
            'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Eve', 'fixed-e@example.test')$$,
  '42501', null, 'authenticated cannot insert role_members'
);
select throws_ok(
  $$update public.role_members set joined_at = now()$$,
  '42501', null, 'authenticated cannot update role_members'
);
select throws_ok(
  $$delete from public.role_members$$,
  '42501', null, 'authenticated cannot delete role_members'
);
select throws_ok(
  $$insert into public.role_membership_log (action) values ('joined')$$,
  '42501', null, 'authenticated cannot insert role_membership_log'
);
select throws_ok(
  $$update public.role_membership_log set action = 'joined'$$,
  '42501', null, 'authenticated cannot update role_membership_log'
);
select throws_ok(
  $$delete from public.role_membership_log$$,
  '42501', null, 'authenticated cannot delete role_membership_log'
);

-- Correct email to the Organizer's own or a member's email still removes the wrong row
select results_eq(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000001', 'Me', 'organizer-a@example.test',
    '73000000-0000-0000-0000-000000000002')$$,
  $$values ('self'::text, null::text)$$,
  'Correct email to the Organizer''s own email is self'
);
select is(
  (select count(*) from public.role_members where user_id = '11111111-1111-1111-1111-111111111111'),
  0::bigint,
  'the replaced row is gone even though the new email is self'
);
select results_eq(
  $$select action, actor_id from public.role_membership_log where user_id = '11111111-1111-1111-1111-111111111111'$$,
  $$values ('revoked'::text, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid)$$,
  'the replaced person is logged as revoked'
);
select results_eq(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000001', 'Dana', 'member-d@example.test',
    '73000000-0000-0000-0000-000000000003')$$,
  $$values ('member'::text, null::text)$$,
  'Correct email to a member''s email is member'
);
select is(
  (select count(*) from public.role_members where user_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'the replaced row is gone even though the new email is a member'
);

-- Correct email: C's pending row becomes E's
select results_eq(
  $$select status from public.events_invite_to_role('63000000-0000-0000-0000-000000000001', 'Eve', 'fixed-e@example.test',
    (select id from public.role_members where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'))$$,
  $$values ('invited'::text)$$,
  'Correct email invites the new address'
);
select results_eq(
  $$select user_id from public.role_members where role_id = '63000000-0000-0000-0000-000000000001' order by user_id$$,
  $$values ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid), ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid)$$,
  'the wrong address''s row is gone'
);
select results_eq(
  $$select action from public.role_membership_log
    where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' order by created_at$$,
  $$values ('invited'::text), ('invited'), ('revoked')$$,
  'the wrong address is logged as revoked'
);

-- Visibility: Organizer, the person themselves, a stranger
select is(
  (select count(*) from public.role_members), 3::bigint, 'the Organizer sees every row of the Event'
);
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select results_eq(
  $$select user_id from public.role_members group by user_id$$,
  $$values ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid)$$,
  'a Role-holder sees only their own rows'
);
select is(
  (select count(*) from public.role_membership_log), 0::bigint, 'a Role-holder reads no access history'
);
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is((select count(*) from public.role_members), 0::bigint, 'a stranger sees no rows');
select is(
  (select count(*) from public.role_membership_log), 0::bigint, 'a stranger reads no access history'
);
select throws_ok(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000001', 'Eve', 'fixed-e@example.test')$$,
  '42501', null, 'a non-Organizer cannot invite'
);
reset role;

-- Tokens: C's guest link and both Role links are revoked; E has one live Role link
select results_eq(
  $$select kind, revoked_at is not null from public.invite_tokens
    where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' order by kind, created_at$$,
  $$values ('guest'::public.invite_kind, true), ('role_holder', true), ('role_holder', true)$$,
  'the new row revoked C''s guest link, New link and Correct email revoked the Role links'
);
select is(
  (select count(*) from public.invite_tokens
   where user_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' and kind = 'role_holder' and revoked_at is null),
  1::bigint,
  'the corrected address has one live link'
);
select ok(
  (select revoked_at is not null from public.invite_tokens where user_id = '11111111-1111-1111-1111-111111111111'),
  'Correct email revoked the replaced person''s Role link'
);
select is(
  (select count(*) from public.invite_tokens where user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  0::bigint,
  'member and added create no token'
);

-- Cap: 30 Role invitations by A in 24 hours, then nothing is created
insert into public.invite_tokens (event_id, kind, token_hash, user_id, role_id, created_by)
select '53000000-0000-0000-0000-000000000001', 'role_holder', sha256(convert_to('cap-' || n, 'UTF8')),
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '63000000-0000-0000-0000-000000000002',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
from generate_series(1, 30) as n;
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select throws_ok(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000001', 'Finn', 'capped-f@example.test')$$,
  '53400', null, 'the daily cap refuses the invitation'
);
select throws_ok(
  $$select * from public.events_invite_to_role('63000000-0000-0000-0000-000000000001', 'Nobody', 'nobody@example.test')$$,
  '53400', null, 'the cap refuses before the email is looked up'
);
select is(
  (select count(*) from public.role_members where user_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
  0::bigint,
  'nothing is created at the cap'
);
reset role;

select * from finish();
rollback;
