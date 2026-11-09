begin;
select plan(58);

-- A organizes Events 1 (live), 2 (cancelled), 3 (ended), 5 (draft); B organizes 4. G1 is a guest on 1, 2, 3, 5;
-- G2 on 1; G4 on 4; R holds a Role on 1; Z is a stranger.
insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'organizer-a@example.test', now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'organizer-b@example.test', now()),
  ('11111111-1111-1111-1111-111111111111', 'guest-1@example.test', now()),
  ('22222222-2222-2222-2222-222222222222', 'guest-2@example.test', now()),
  ('44444444-4444-4444-4444-444444444444', 'guest-4@example.test', now()),
  ('33333333-3333-3333-3333-333333333333', 'holder-r@example.test', now()),
  ('99999999-9999-9999-9999-999999999999', 'stranger@example.test', now());
insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at,
  cancelled_at) values
  ('57000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null),
  ('57000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Called off',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), now()),
  ('57000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Over',
   now() - interval '2 days', now() - interval '1 day', 'Europe/Oslo', 'en', now() - interval '3 days', null),
  ('57000000-0000-0000-0000-000000000004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'B''s party',
   now() + interval '7 days', now() + interval '7 days 4 hours', 'Europe/Oslo', 'en', now(), null);
insert into public.events (id, organizer_id, name) values
  ('57000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Draft');
insert into public.roles (id, event_id, key, active) values
  ('67000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', 'venue', true);
insert into public.role_members (event_id, role_id, user_id, name) values
  ('57000000-0000-0000-0000-000000000001', '67000000-0000-0000-0000-000000000001',
   '33333333-3333-3333-3333-333333333333', 'Rita');
insert into public.guests (id, event_id, name, user_id) values
  ('77000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', 'Gro', '11111111-1111-1111-1111-111111111111'),
  ('77000000-0000-0000-0000-000000000002', '57000000-0000-0000-0000-000000000001', 'Gunn', '22222222-2222-2222-2222-222222222222'),
  ('77000000-0000-0000-0000-000000000003', '57000000-0000-0000-0000-000000000002', 'Gro', '11111111-1111-1111-1111-111111111111'),
  ('77000000-0000-0000-0000-000000000004', '57000000-0000-0000-0000-000000000003', 'Gro', '11111111-1111-1111-1111-111111111111'),
  ('77000000-0000-0000-0000-000000000005', '57000000-0000-0000-0000-000000000004', 'Geir', '44444444-4444-4444-4444-444444444444'),
  ('77000000-0000-0000-0000-000000000006', '57000000-0000-0000-0000-000000000005', 'Gro', '11111111-1111-1111-1111-111111111111');
insert into public.guest_contacts (guest_id, event_id, email) values
  ('77000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', 'guest-1@example.test'),
  ('77000000-0000-0000-0000-000000000002', '57000000-0000-0000-0000-000000000001', 'guest-2@example.test');

-- Schema and grants
select is((select confdeltype from pg_constraint where conrelid = 'public.rsvps'::regclass and contype = 'f'
    and confrelid = 'public.guests'::regclass), 'c'::"char", 'an rsvp goes with its guest (FK cascade)');
select ok((select relrowsecurity from pg_class where oid = 'public.rsvps'::regclass), 'rsvps has RLS');
select ok(has_function_privilege('authenticated', 'public.guests_submit_rsvp(uuid, jsonb, timestamptz)', 'execute'),
  'authenticated can execute guests_submit_rsvp');
select ok(not has_function_privilege('anon', 'public.guests_submit_rsvp(uuid, jsonb, timestamptz)', 'execute'),
  'anon cannot execute guests_submit_rsvp');
select ok((select prosecdef and 'search_path=""' = any(proconfig) from pg_proc
  where oid = 'public.guests_submit_rsvp(uuid, jsonb, timestamptz)'::regprocedure),
  'guests_submit_rsvp is security definer with an empty search_path');

-- CHECKs (as the owner)
select throws_ok($$insert into public.rsvps (guest_id, event_id, attending, plus_one)
  values ('77000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', false, true)$$,
  '23514', null, 'a No cannot carry a plus-one');
select throws_ok($$insert into public.rsvps (guest_id, event_id, attending, other_needs)
  values ('77000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', false, 'x')$$,
  '23514', null, 'a No cannot carry needs');
select throws_ok($$insert into public.rsvps (guest_id, event_id, attending, plus_one_name)
  values ('77000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', true, 'Z')$$,
  '23514', null, 'a name needs a plus-one');
select throws_ok($$insert into public.rsvps (guest_id, event_id, attending, plus_one, plus_one_name)
  values ('77000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', true, true, repeat('a', 81))$$,
  '23514', null, 'the name is at most 80');
select throws_ok($$insert into public.rsvps (guest_id, event_id, attending, other_needs)
  values ('77000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', true, repeat('a', 501))$$,
  '23514', null, 'the needs are at most 500');
select throws_ok($$insert into public.rsvps (guest_id, event_id, attending)
  values ('77000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000002', true)$$,
  '23503', null, 'the Event must be the guest''s own');

-- Function: first answer
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
create temp table first_answer as select public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001',
  '{"attending": true, "plus_one": true, "plus_one_name": "  Per  ", "other_needs": "line1\r\n<script>x</script>"}',
  null) as at;
grant all on first_answer to authenticated;
select is((select count(*) from public.rsvps), 1::bigint, 'a first Yes makes one row');
select results_eq($$select attending, plus_one, plus_one_name, other_needs, answered_at = updated_at,
  updated_at = (select at from first_answer) from public.rsvps$$,
  $$values (true, true, 'Per'::text, E'line1\n<script>x</script>'::text, true, true)$$,
  'the answers are trimmed and normalised, answered_at is updated_at, the function returns updated_at');

-- Double submit
select is(public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001',
  '{"attending": true, "plus_one": true, "plus_one_name": "Per", "other_needs": "line1\n<script>x</script>"}', null),
  (select at from first_answer), 'a repeat with null expected changes nothing and returns the same updated_at');
select is((select count(*) from public.rsvps), 1::bigint, 'a double submit leaves one row');

-- Stale and fresh change
select throws_ok($$select public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001',
  '{"attending": true, "plus_one": false}', '2020-01-01 00:00:00+00')$$,
  '40001', 'concurrent_edit', 'a stale expected with other answers is concurrent_edit');
select throws_ok($$select public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001',
  '{"attending": true, "plus_one": false}', null)$$,
  '40001', 'concurrent_edit', 'a null expected with other answers on an existing row is concurrent_edit');
select isnt(public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001',
  '{"attending": true, "plus_one": false, "other_needs": "Quiet seat"}', (select at from first_answer)),
  (select at from first_answer), 'a change with the right expected advances updated_at');
select results_eq($$select plus_one, plus_one_name, other_needs, answered_at < updated_at from public.rsvps$$,
  $$values (false, ''::text, 'Quiet seat'::text, true)$$, 'the change is stored and answered_at is kept');

-- Yes then No clears
select lives_ok($$select public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001',
  '{"attending": false, "plus_one": true, "plus_one_name": "Per", "other_needs": "x"}',
  (select updated_at from public.rsvps))$$, 'a No after a Yes');
select results_eq($$select attending, plus_one, plus_one_name, other_needs from public.rsvps$$,
  $$values (false, false, ''::text, ''::text)$$, 'a No clears the plus-one and the texts');

-- Another guest's id is ignored
select lives_ok($$select public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001',
  '{"attending": true, "guest_id": "77000000-0000-0000-0000-000000000002"}', (select updated_at from public.rsvps))$$,
  'a guest_id in the answers is ignored');
select is((select count(*) from public.rsvps where guest_id = '77000000-0000-0000-0000-000000000002'), 0::bigint,
  'another guest''s row stays untouched');

-- No row yet but an expected timestamp: a stale tab, so nothing is written
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select throws_ok($$select public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001',
  '{"attending": true}', '2020-01-01 00:00:00+00')$$, '40001', 'concurrent_edit',
  'no row with a non-null expected is concurrent_edit');
select is((select count(*) from public.rsvps), 0::bigint, 'and writes no row');
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- Bad answers
select throws_ok($$select public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001',
  '{"attending": "yes"}', null)$$, '22023', null, 'attending must be a boolean');
select throws_ok($$select public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001',
  jsonb_build_object('attending', true, 'plus_one', true, 'plus_one_name', repeat('a', 81)), null)$$,
  '22023', null, 'an 81-character name');
select throws_ok($$select public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001',
  jsonb_build_object('attending', true, 'other_needs', repeat('a', 501)), null)$$,
  '22023', null, 'a 501-character need');
select throws_ok($$select public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001',
  jsonb_build_object('attending', true, 'other_needs', 'a' || chr(7)), null)$$,
  '22023', null, 'a control character in the needs');
select throws_ok($$select public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001',
  jsonb_build_object('attending', true, 'plus_one', true, 'plus_one_name', 'a' || chr(10)), null)$$,
  '22023', null, 'a line break in the name');

-- A second Guest of the same Event answers: each reads exactly one row, their own
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select lives_ok($$select public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001',
  '{"attending": true}', null)$$, 'a second guest of the same Event answers');
select results_eq($$select guest_id from public.rsvps$$,
  $$values ('77000000-0000-0000-0000-000000000002'::uuid)$$,
  'with two answers on the Event, the second guest reads only their own row');
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select results_eq($$select guest_id from public.rsvps$$,
  $$values ('77000000-0000-0000-0000-000000000001'::uuid)$$,
  'and the first guest reads only their own row');
reset role;
delete from public.rsvps where guest_id = '77000000-0000-0000-0000-000000000002';
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- Reads and direct writes
select is((select count(*) from public.rsvps), 1::bigint, 'a guest reads their own rsvp');
select throws_ok($$insert into public.rsvps (guest_id, event_id, attending)
  values ('77000000-0000-0000-0000-000000000001', '57000000-0000-0000-0000-000000000001', true)$$,
  '42501', null, 'a guest cannot INSERT');
select throws_ok($$update public.rsvps set attending = true$$, '42501', null, 'a guest cannot UPDATE');
select throws_ok($$delete from public.rsvps$$, '42501', null, 'a guest cannot DELETE');
select is((select array_agg(name order by name) from public.events), array['Called off', 'Live', 'Over'],
  'events_select_guest: the published Events they are a guest of, not the draft or others');

-- Denied callers share one refusal
create function pg_temp.refusal(p_event uuid) returns text language plpgsql as $$
begin
  perform public.guests_submit_rsvp(p_event, '{"attending": true}', null);
  return 'allowed';
exception when others then
  return sqlstate || ':' || sqlerrm;
end;
$$;
grant execute on function pg_temp.refusal(uuid) to authenticated;
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is(pg_temp.refusal('57000000-0000-0000-0000-000000000004'), '42501:not allowed', 'another Event''s guest is refused');
select is(pg_temp.refusal('57000000-0000-0000-0000-000000000099'), '42501:not allowed', 'an unknown Event is refused the same');
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select is(pg_temp.refusal('57000000-0000-0000-0000-000000000001'), '42501:not allowed', 'a Role-holder is refused the same');
set local request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';
select is(pg_temp.refusal('57000000-0000-0000-0000-000000000001'), '42501:not allowed', 'a stranger (a removed guest) is refused the same');
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(pg_temp.refusal('57000000-0000-0000-0000-000000000005'), '42501:not allowed', 'a guest of an unpublished Event is refused the same');
reset role;
set local role anon;
select throws_ok($$select public.guests_submit_rsvp('57000000-0000-0000-0000-000000000001', '{"attending": true}', null)$$,
  '42501', null, 'anon cannot execute it at all');
reset role;
select is((select count(*) from public.rsvps), 1::bigint, 'no refused call wrote a row');

-- Cancelled and ended: read-only
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select is(pg_temp.refusal('57000000-0000-0000-0000-000000000002'), '55000:a cancelled or ended Event is read-only',
  'a cancelled Event is read-only');
select is(pg_temp.refusal('57000000-0000-0000-0000-000000000003'), '55000:a cancelled or ended Event is read-only',
  'an ended Event is read-only');

-- The Organizer reads, never writes; Role-holders and other Organizers read nothing
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select is((select count(*) from public.rsvps), 1::bigint, 'the Organizer reads the rsvps of their Event');
select throws_ok($$update public.rsvps set other_needs = 'x'$$, '42501', null, 'the Organizer cannot UPDATE');
select throws_ok($$delete from public.rsvps$$, '42501', null, 'the Organizer cannot DELETE');
select throws_ok($$insert into public.rsvps (guest_id, event_id, attending)
  values ('77000000-0000-0000-0000-000000000002', '57000000-0000-0000-0000-000000000001', true)$$,
  '42501', null, 'the Organizer cannot INSERT');
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select is((select count(*) from public.rsvps), 0::bigint, 'another guest reads no rsvp');
set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';
select is((select count(*) from public.rsvps), 0::bigint, 'a Role-holder reads no rsvp');
set local request.jwt.claims = '{"sub": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "role": "authenticated"}';
select is((select count(*) from public.rsvps), 0::bigint, 'another Organizer reads no rsvp');
set local request.jwt.claims = '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}';
select is((select count(*) from public.events), 0::bigint, 'events_select_guest: a stranger reads no Event');
reset role;

-- Edits by the Organizer: a rename keeps the answer, a changed email is another person and drops it
set local role authenticated;
set local request.jwt.claims = '{"sub": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "role": "authenticated"}';
select public.guests_update('77000000-0000-0000-0000-000000000001', 'Gro H', 'GUEST-1@example.test');
select is((select count(*) from public.rsvps), 1::bigint, 'a name-only edit keeps the rsvp');
select public.guests_update('77000000-0000-0000-0000-000000000001', 'Gro H', 'other@example.test');
select is((select count(*) from public.rsvps), 0::bigint, 'an email change deletes the rsvp');
reset role;

-- FK cascade
insert into public.rsvps (guest_id, event_id, attending) values
  ('77000000-0000-0000-0000-000000000002', '57000000-0000-0000-0000-000000000001', true);
delete from public.guests where id = '77000000-0000-0000-0000-000000000002';
select is((select count(*) from public.rsvps), 0::bigint, 'removing the guest removes the rsvp');

select * from finish();
rollback;
