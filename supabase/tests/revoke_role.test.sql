begin;
select plan(29);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stranger-b@example.test'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'joined-c@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'pending-d@example.test'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'shared-e@example.test'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'solo-f@example.test');

-- A's Events: live (1), cancelled (2), published and ended (3)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at)
values
  ('59000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('59000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), now()),
  ('59000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Over',
   now() - interval '2 days', now() - interval '1 day', 'Europe/Oslo', 'en', now() - interval '3 days', null);

-- Venue and Guests active, Program off; Venue on the cancelled and the ended Event
insert into public.roles (id, event_id, key, active) values
  ('69000000-0000-0000-0000-000000000001', '59000000-0000-0000-0000-000000000001', 'venue', true),
  ('69000000-0000-0000-0000-000000000002', '59000000-0000-0000-0000-000000000001', 'guests', true),
  ('69000000-0000-0000-0000-000000000003', '59000000-0000-0000-0000-000000000001', 'program', false),
  ('69000000-0000-0000-0000-000000000004', '59000000-0000-0000-0000-000000000002', 'venue', true),
  ('69000000-0000-0000-0000-000000000005', '59000000-0000-0000-0000-000000000003', 'venue', true);

-- 1 C joined lead on Venue, 2 D pending on Venue, 3 C on Guests, 4 E joined on Venue, 5 E on Program (off),
-- 6 C on the cancelled Event, 7 C on the ended Event, 8 F joined on Venue and nothing else
insert into public.role_members (id, event_id, role_id, user_id, name, email, joined_at, is_lead) values
  ('79000000-0000-0000-0000-000000000001', '59000000-0000-0000-0000-000000000001',
   '69000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', 'joined-c@example.test', now(), true),
  ('79000000-0000-0000-0000-000000000002', '59000000-0000-0000-0000-000000000001',
   '69000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', 'pending-d@example.test', null, false),
  ('79000000-0000-0000-0000-000000000003', '59000000-0000-0000-0000-000000000001',
   '69000000-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', 'joined-c@example.test', now(), false),
  ('79000000-0000-0000-0000-000000000004', '59000000-0000-0000-0000-000000000001',
   '69000000-0000-0000-0000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Eli', 'shared-e@example.test', now(), false),
  ('79000000-0000-0000-0000-000000000005', '59000000-0000-0000-0000-000000000001',
   '69000000-0000-0000-0000-000000000003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Eli', 'shared-e@example.test', now(), false),
  ('79000000-0000-0000-0000-000000000006', '59000000-0000-0000-0000-000000000002',
   '69000000-0000-0000-0000-000000000004', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', 'joined-c@example.test', now(), false),
  ('79000000-0000-0000-0000-000000000007', '59000000-0000-0000-0000-000000000003',
   '69000000-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', 'joined-c@example.test', now(), false),
  ('79000000-0000-0000-0000-000000000008', '59000000-0000-0000-0000-000000000001',
   '69000000-0000-0000-0000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Finn', 'solo-f@example.test', now(), false);

-- D's open link for Venue; C's open links for Venue and Guests
insert into public.invite_tokens (event_id, kind, token_hash, user_id, role_id, created_by) values
  ('59000000-0000-0000-0000-000000000001', 'role_holder', sha256('d-venue'), 'dddddddd-dddd-dddd-dddd-dddddddddddd',
   '69000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('59000000-0000-0000-0000-000000000001', 'role_holder', sha256('c-venue'), 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   '69000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('59000000-0000-0000-0000-000000000001', 'role_holder', sha256('c-guests'), 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   '69000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

create temp view open_links as
  select t.user_id, t.role_id from public.invite_tokens t where t.revoked_at is null;
create temp view revoke_log as
  select l.role_id, l.user_id, l.actor_id from public.role_membership_log l where l.action = 'revoked';
grant select on open_links, revoke_log to authenticated;

select ok(
  (select prosecdef and proconfig @> array['search_path=""'] from pg_proc
   where oid = 'public.events_revoke_role(uuid)'::regprocedure),
  'events_revoke_role is security definer with an empty search_path'
);
select ok(
  has_function_privilege('authenticated', 'public.events_revoke_role(uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.events_revoke_role(uuid)', 'EXECUTE')
    and not has_function_privilege('public', 'public.events_revoke_role(uuid)', 'EXECUTE'),
  'only authenticated can execute events_revoke_role'
);

-- Refusals first: a holder (self and other), a stranger, anon
set local role authenticated;
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select throws_ok(
  $$select public.events_revoke_role('79000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'a holder cannot revoke themselves'
);
select throws_ok(
  $$select public.events_revoke_role('79000000-0000-0000-0000-000000000004')$$,
  '42501', null, 'a holder cannot revoke another holder'
);
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok(
  $$select public.events_revoke_role('79000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'a stranger cannot revoke'
);
reset role;
set local role anon;
select throws_ok(
  $$select public.events_revoke_role('79000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'anon cannot execute the function'
);
reset role;
select is((select count(*) from public.role_members), 8::bigint, 'the refused calls changed nothing');

-- The Organizer
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select throws_ok(
  $$select public.events_revoke_role('79000000-0000-0000-0000-0000000000ff')$$,
  '42501', null, 'an unknown row looks like another Organizer''s'
);
select throws_ok(
  $$select public.events_revoke_role('79000000-0000-0000-0000-000000000006')$$,
  '55000', null, 'a cancelled Event is read-only'
);
select throws_ok(
  $$select public.events_revoke_role('79000000-0000-0000-0000-000000000007')$$,
  '55000', null, 'an ended Event is read-only'
);

-- Pending invitee: row, link and log
select lives_ok(
  $$select public.events_revoke_role('79000000-0000-0000-0000-000000000002')$$,
  'the Organizer revokes a pending invitee'
);
select is((select count(*) from public.role_members where id = '79000000-0000-0000-0000-000000000002'), 0::bigint,
  'the pending row is gone');
select is((select count(*) from open_links where user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), 0::bigint,
  'the pending invitee''s link no longer works');
select results_eq(
  $$select user_id, actor_id from revoke_log$$,
  $$values ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid)$$,
  'one revoked row names the person and the Organizer'
);
select throws_ok(
  $$select public.events_revoke_role('79000000-0000-0000-0000-000000000002')$$,
  '42501', null, 'a second revoke of the same row looks like an unknown row'
);

-- The lead, who also holds Guests
select lives_ok(
  $$select public.events_revoke_role('79000000-0000-0000-0000-000000000001')$$,
  'the Organizer revokes the lead'
);
select is((select count(*) from public.role_members where role_id = '69000000-0000-0000-0000-000000000001' and is_lead),
  0::bigint, 'the Role has no lead');
select is((select count(*) from public.role_members where id = '79000000-0000-0000-0000-000000000003'), 1::bigint,
  'the person keeps their other Role');
select is((select count(*) from open_links where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'), 1::bigint,
  'only the revoked Role''s link is revoked');

-- Shared Role: E keeps Venue, and a switched-off Role can be revoked
select lives_ok(
  $$select public.events_revoke_role('79000000-0000-0000-0000-000000000005')$$,
  'a switched-off Role can be revoked'
);
select is((select count(*) from public.role_members where id = '79000000-0000-0000-0000-000000000004'), 1::bigint,
  'the other holder of the Role keeps theirs');

-- The Event and the Role's rows are gone for the revoked person; the other Role keeps the Event visible
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select is((select count(*) from public.events), 0::bigint, 'the revoked invitee reads no Event');
select is((select count(*) from public.roles) + (select count(*) from public.role_members), 0::bigint,
  'the revoked invitee reads no Role or membership rows');
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select is((select count(*) from public.events where id = '59000000-0000-0000-0000-000000000001'), 1::bigint,
  'a person with a remaining Role still reads the Event');
-- A joined holder whose only Role goes: the Event is visible before and gone after
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select is((select count(*) from public.events), 1::bigint, 'a joined holder reads the Event');
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok(
  $$select public.events_revoke_role('79000000-0000-0000-0000-000000000008')$$,
  'the Organizer revokes a joined holder''s only Role'
);
set local request.jwt.claims = '{"sub": "ffffffff-ffff-ffff-ffff-ffffffffffff", "role": "authenticated"}';
select is((select count(*) from public.events), 0::bigint, 'the revoked joined holder reads no Event');
select is((select count(*) from public.roles) + (select count(*) from public.role_members), 0::bigint,
  'the revoked joined holder reads no Role or membership rows');
reset role;
select is((select count(*) from revoke_log), 4::bigint, 'each revoke is logged once');

select * from finish();
rollback;
