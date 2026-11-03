begin;
select plan(22);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'holder-d@example.test'),
  ('11111111-1111-1111-1111-111111111111', 'pending-g@example.test'),
  ('99999999-9999-9999-9999-999999999999', 'holder-x@example.test');

insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at)
values
  ('54000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('54000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Elsewhere',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('54000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), now());

insert into public.roles (id, event_id, key, active) values
  ('64000000-0000-0000-0000-000000000001', '54000000-0000-0000-0000-000000000001', 'venue', true),
  ('64000000-0000-0000-0000-000000000002', '54000000-0000-0000-0000-000000000001', 'guests', true),
  ('64000000-0000-0000-0000-000000000003', '54000000-0000-0000-0000-000000000002', 'venue', true),
  ('64000000-0000-0000-0000-000000000004', '54000000-0000-0000-0000-000000000003', 'venue', true);

-- D holds Venue in the live Event and in the cancelled one; G is pending on Guests
insert into public.role_members (event_id, role_id, user_id, name, joined_at) values
  ('54000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', now()),
  ('54000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Gina', null),
  ('54000000-0000-0000-0000-000000000002', '64000000-0000-0000-0000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', now());
insert into public.role_members (event_id, role_id, user_id, name, joined_at) values
  ('54000000-0000-0000-0000-000000000003', '64000000-0000-0000-0000-000000000004',
   '99999999-9999-9999-9999-999999999999', 'Xena', now());
insert into public.role_member_contacts (role_member_id, event_id, email)
select m.id, m.event_id, v.email from (values
  ('54000000-0000-0000-0000-000000000001'::uuid, '64000000-0000-0000-0000-000000000001'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'holder-d@example.test'),
  ('54000000-0000-0000-0000-000000000001'::uuid, '64000000-0000-0000-0000-000000000002'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, 'pending-g@example.test'),
  ('54000000-0000-0000-0000-000000000002'::uuid, '64000000-0000-0000-0000-000000000003'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'holder-d@example.test')
) as v (event_id, role_id, user_id, email)
join public.role_members m on m.role_id = v.role_id and m.user_id = v.user_id;
with g as (insert into public.guests (event_id, name) values ('54000000-0000-0000-0000-000000000001', 'Eva') returning id)
insert into public.guest_contacts (guest_id, event_id, email)
select id, '54000000-0000-0000-0000-000000000001', 'eva@example.test' from g;
insert into public.role_membership_log (event_id, role_id, user_id, action, actor_id) values
  ('54000000-0000-0000-0000-000000000001', '64000000-0000-0000-0000-000000000001',
   'dddddddd-dddd-dddd-dddd-dddddddddddd', 'joined', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

select ok(
  not has_function_privilege('anon', 'public.is_team_member(uuid)', 'EXECUTE')
    and not has_function_privilege('public', 'public.is_team_member(uuid)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.is_team_member(uuid)', 'EXECUTE'),
  'only authenticated can execute is_team_member'
);
select ok(
  not has_table_privilege('authenticated', 'public.role_member_contacts', 'INSERT, UPDATE, DELETE, TRUNCATE')
    and not has_table_privilege('anon', 'public.role_member_contacts', 'SELECT'),
  'no client writes role_member_contacts and anon reads none'
);
select ok(
  not has_function_privilege('anon', 'public.holds_role(uuid)', 'EXECUTE')
    and not has_function_privilege('public', 'public.holds_role(uuid)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.holds_role(uuid)', 'EXECUTE'),
  'only authenticated can execute holds_role'
);

-- Joined holder D
set local role authenticated;
set local request.jwt.claims = '{"sub": "dddddddd-dddd-dddd-dddd-dddddddddddd", "role": "authenticated"}';
select ok(public.holds_role('64000000-0000-0000-0000-000000000001'), 'holds_role is true for the held Role');
select ok(not public.holds_role('64000000-0000-0000-0000-000000000002'), 'holds_role is false for another Role');
select ok(public.is_team_member('54000000-0000-0000-0000-000000000001'), 'is_team_member is true for the own Event');
select is(
  (select count(*) from public.role_members where event_id = '54000000-0000-0000-0000-000000000001'),
  2::bigint, 'a holder reads every Team row of their Event, pending ones included'
);
select is(
  (select count(*) from public.roles where event_id = '54000000-0000-0000-0000-000000000001'),
  2::bigint, 'a holder reads every Role of their Event'
);
select is((select count(*) from public.guests), 0::bigint, 'a holder of a Role reads no guests row');
select is((select count(*) from public.guest_contacts), 0::bigint, 'a holder reads no guest contacts');
select is((select count(*) from public.role_membership_log), 0::bigint, 'a holder reads no access history');
select is(
  (select count(*) from public.events), 1::bigint,
  'the cancelled Event is gone from the holder, the live one stays'
);
select throws_ok(
  $$update public.role_members set is_lead = true where role_id = '64000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'a holder cannot write the Team'
);
select is((select count(*) from public.role_member_contacts), 0::bigint, 'a holder reads no email');
select is(
  (select count(*) from public.role_members where event_id = '54000000-0000-0000-0000-000000000003')
    + (select count(*) from public.roles where event_id = '54000000-0000-0000-0000-000000000003')
    + (select count(*) from public.events where id = '54000000-0000-0000-0000-000000000003'),
  0::bigint, 'a holder reads nothing of an Event they are not on'
);
select ok(not public.is_team_member('54000000-0000-0000-0000-000000000003'), 'is_team_member is false for another Event');
reset role;

-- Pending invitee G
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select ok(not public.is_team_member('54000000-0000-0000-0000-000000000001'), 'a pending invitee is not a team member');
select is((select count(*) from public.role_members), 1::bigint, 'a pending invitee reads only their own row');
select is((select count(*) from public.roles), 0::bigint, 'a pending invitee reads no Roles');
select is((select count(*) from public.events), 0::bigint, 'a pending invitee reads no Event');
reset role;

-- The Organizer keeps the cancelled Event
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select is((select count(*) from public.events), 3::bigint, 'the Organizer still reads the cancelled Event');
select is((select count(*) from public.role_member_contacts), 3::bigint, 'the Organizer reads the emails');
reset role;

select * from finish();
rollback;
