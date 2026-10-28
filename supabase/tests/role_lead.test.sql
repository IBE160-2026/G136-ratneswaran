begin;
select plan(30);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stranger-b@example.test'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'joined-c@example.test'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'pending-d@example.test'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'guests-e@example.test'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'corrected-f@example.test');

-- A's Events: live (1), cancelled (2), published and ended (3)
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, cancelled_at)
values
  ('58000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('58000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), now()),
  ('58000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Over',
   now() - interval '2 days', now() - interval '1 day', 'Europe/Oslo', 'en', now() - interval '3 days', null);

-- Venue and Guests active, Program off; Venue on the cancelled and the ended Event
insert into public.roles (id, event_id, key, active) values
  ('68000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001', 'venue', true),
  ('68000000-0000-0000-0000-000000000002', '58000000-0000-0000-0000-000000000001', 'guests', true),
  ('68000000-0000-0000-0000-000000000003', '58000000-0000-0000-0000-000000000001', 'program', false),
  ('68000000-0000-0000-0000-000000000004', '58000000-0000-0000-0000-000000000002', 'venue', true),
  ('68000000-0000-0000-0000-000000000005', '58000000-0000-0000-0000-000000000003', 'venue', true),
  ('68000000-0000-0000-0000-000000000006', '58000000-0000-0000-0000-000000000002', 'program', false);

-- On Venue, C (joined) is inserted before D (pending): making C lead after D is the physical-order case.
insert into public.role_members (id, event_id, role_id, user_id, name, email, joined_at) values
  ('78000000-0000-0000-0000-000000000001', '58000000-0000-0000-0000-000000000001',
   '68000000-0000-0000-0000-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', 'joined-c@example.test', now()),
  ('78000000-0000-0000-0000-000000000002', '58000000-0000-0000-0000-000000000001',
   '68000000-0000-0000-0000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dana', 'pending-d@example.test', null),
  ('78000000-0000-0000-0000-000000000003', '58000000-0000-0000-0000-000000000001',
   '68000000-0000-0000-0000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Eli', 'guests-e@example.test', now()),
  ('78000000-0000-0000-0000-000000000004', '58000000-0000-0000-0000-000000000001',
   '68000000-0000-0000-0000-000000000003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Eli', 'guests-e@example.test', now()),
  ('78000000-0000-0000-0000-000000000005', '58000000-0000-0000-0000-000000000002',
   '68000000-0000-0000-0000-000000000004', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', 'joined-c@example.test', now()),
  ('78000000-0000-0000-0000-000000000006', '58000000-0000-0000-0000-000000000003',
   '68000000-0000-0000-0000-000000000005', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cleo', 'joined-c@example.test', now());

create temp view leads as
  select m.role_id, m.id from public.role_members m where m.is_lead;
create temp view lead_log as
  select l.role_id, l.user_id, l.actor_id from public.role_membership_log l where l.action = 'lead_changed';
grant select on leads, lead_log to authenticated;

-- Function attributes and grants
select ok(
  (select prosecdef and proconfig @> array['search_path=""'] from pg_proc
   where oid = 'public.events_set_role_lead(uuid, uuid)'::regprocedure),
  'events_set_role_lead is security definer with an empty search_path'
);
select ok(
  has_function_privilege('authenticated', 'public.events_set_role_lead(uuid, uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.events_set_role_lead(uuid, uuid)', 'EXECUTE')
    and not has_function_privilege('public', 'public.events_set_role_lead(uuid, uuid)', 'EXECUTE'),
  'only authenticated can execute events_set_role_lead'
);
select ok(
  not has_column_privilege('authenticated', 'public.role_members', 'is_lead', 'UPDATE')
    and not has_column_privilege('authenticated', 'public.role_members', 'is_lead', 'INSERT'),
  'no client can write is_lead directly'
);

-- First lead: a pending invitee, as A
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok(
  $$select public.events_set_role_lead('68000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000002')$$,
  'the Organizer makes a pending invitee lead'
);
select results_eq(
  $$select id from leads where role_id = '68000000-0000-0000-0000-000000000001'$$,
  $$values ('78000000-0000-0000-0000-000000000002'::uuid)$$,
  'the pending invitee is the Role lead'
);
select results_eq(
  $$select user_id, actor_id from lead_log$$,
  $$values ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid)$$,
  'one lead_changed row names the new lead and the acting Organizer'
);

-- Change lead to C, whose row comes first physically
select lives_ok(
  $$select public.events_set_role_lead('68000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000001')$$,
  'the lead moves to a row inserted before the old lead''s row'
);
select results_eq(
  $$select id from leads where role_id = '68000000-0000-0000-0000-000000000001'$$,
  $$values ('78000000-0000-0000-0000-000000000001'::uuid)$$,
  'C is the only lead; D is no longer lead'
);
select is((select count(*) from lead_log), 2::bigint, 'the change is logged once');
select is(
  (select count(*) from lead_log where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  1::bigint,
  'the change log names the new lead'
);

-- Same lead again
select lives_ok(
  $$select public.events_set_role_lead('68000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000001')$$,
  'setting the current lead again is accepted'
);
select is((select count(*) from lead_log), 2::bigint, 'setting the current lead again logs nothing');

-- Clear (Undo)
select lives_ok(
  $$select public.events_set_role_lead('68000000-0000-0000-0000-000000000001', null)$$,
  'a null member clears the lead'
);
select is(
  (select count(*) from leads where role_id = '68000000-0000-0000-0000-000000000001'),
  0::bigint,
  'the Role has no lead after a clear'
);
select is(
  (select count(*) from lead_log where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  2::bigint,
  'the clear is logged for the previous lead'
);
select public.events_set_role_lead('68000000-0000-0000-0000-000000000001', null);
select is((select count(*) from lead_log), 3::bigint, 'clearing a Role with no lead logs nothing');

-- Refusals
select throws_ok(
  $$select public.events_set_role_lead('68000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000003')$$,
  '22023', 'not_a_member',
  'a member of another Role cannot be made lead'
);
select throws_ok(
  $$select public.events_set_role_lead('68000000-0000-0000-0000-000000000003', '78000000-0000-0000-0000-000000000004')$$,
  '22023', 'role_inactive',
  'an inactive Role cannot get a lead'
);
select throws_ok(
  $$select public.events_set_role_lead('68000000-0000-0000-0000-000000000004', '78000000-0000-0000-0000-000000000005')$$,
  '55000', null,
  'a cancelled Event is read-only'
);
select throws_ok(
  $$select public.events_set_role_lead('68000000-0000-0000-0000-000000000005', '78000000-0000-0000-0000-000000000006')$$,
  '55000', null,
  'an ended Event is read-only'
);
select throws_ok(
  $$select public.events_set_role_lead('68000000-0000-0000-0000-000000000006', null)$$,
  '55000', null,
  'an inactive Role on a read-only Event answers read-only, not role_inactive'
);
select throws_ok(
  $$select public.events_set_role_lead('68000000-0000-0000-0000-0000000000ff', null)$$,
  '42501', null,
  'an unknown Role looks like another Organizer''s'
);
select throws_ok(
  $$update public.role_members set is_lead = true where id = '78000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'even the Organizer cannot write is_lead directly'
);

-- A stranger and a member of the Role
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok(
  $$select public.events_set_role_lead('68000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000001')$$,
  '42501', null,
  'a stranger cannot set the lead'
);
set local request.jwt.claims = '{"sub": "cccccccc-cccc-cccc-cccc-cccccccccccc", "role": "authenticated"}';
select throws_ok(
  $$select public.events_set_role_lead('68000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000001')$$,
  '42501', null,
  'a member of the Role cannot make themselves lead'
);
reset role;
select is((select count(*) from leads), 0::bigint, 'the refused calls changed nothing');

set local role anon;
select throws_ok(
  $$select public.events_set_role_lead('68000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000001')$$,
  '42501', null,
  'anon cannot execute the function'
);
reset role;

-- The index is the invariant, even for a direct write as postgres
update public.role_members set is_lead = true where id = '78000000-0000-0000-0000-000000000001';
select throws_ok(
  $$update public.role_members set is_lead = true where id = '78000000-0000-0000-0000-000000000002'$$,
  '23505', null,
  'the partial unique index rejects a second lead'
);

-- Lead removed: Correct email deletes the pending lead's row
update public.role_members set is_lead = false where id = '78000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select public.events_set_role_lead('68000000-0000-0000-0000-000000000001', '78000000-0000-0000-0000-000000000002');
select lives_ok(
  $$select * from public.events_invite_to_role('68000000-0000-0000-0000-000000000001', 'Dana',
      'corrected-f@example.test', '78000000-0000-0000-0000-000000000002')$$,
  'Correct email replaces the pending lead''s row'
);
select is(
  (select count(*) from leads where role_id = '68000000-0000-0000-0000-000000000001'),
  0::bigint,
  'the Role has no lead once the lead''s row is gone'
);

select * from finish();
rollback;
