begin;
select plan(34);

-- The 80 guests of supabase/seed.sql (Story 7.10). The seed is loaded by `supabase start` and `db reset`.
-- Guest 50 (user …0020050) is answered, coming alone; guest 79 is not coming.
create temp view seeded as
  select g.*, r.attending, r.plus_one, r.other_needs,
    (select count(*) from public.invite_tokens t
      where t.event_id = g.event_id and t.user_id = g.user_id and t.kind = 'guest' and t.revoked_at is null) as tokens
  from public.guests g left join public.rsvps r on r.guest_id = g.id
  where g.event_id = 'f1a90000-0000-4000-8000-0000000000e1';

select is((select count(*) from seeded), 80::bigint, 'the flagship Event holds 80 guests');
select is((select count(*) from seeded where user_id is null and tokens = 0 and attending is null and first_opened_at is null),
  15::bigint, '15 are not invited');
select is((select count(*) from seeded where user_id is not null and tokens = 1 and first_opened_at is null and attending is null),
  15::bigint, '15 have a copied link, never opened');
select is((select count(*) from seeded where user_id is not null and tokens = 1 and first_opened_at is not null and attending is null),
  10::bigint, '10 opened their link and have not answered');
select is((select count(*) from seeded where attending and not plus_one), 20::bigint, '20 are coming without a plus-one');
select is((select count(*) from seeded where attending and plus_one), 12::bigint, '12 are coming with a plus-one');
select is((select count(*) from seeded where attending is false), 8::bigint, '8 are not coming');
select is((select count(*) from seeded where attending is not null and user_id is not null and tokens = 1 and first_opened_at is not null),
  40::bigint, 'the 40 answered guests have a user, one active token and a first-opened time');
select is((select count(*) from seeded where other_needs = 'Seed-needs: parking near the door'), 1::bigint,
  'one coming guest carries the leak-check marker');
select cmp_ok((select count(*) from seeded where attending and other_needs <> ''), '>=', 3::bigint,
  'at least three coming guests carry other needs');
select is((select count(*) from public.invite_tokens where event_id = 'f1a90000-0000-4000-8000-0000000000e1' and kind = 'guest'),
  65::bigint, 'one guest token per tokened guest, and no other');
select is((select count(*) from public.guest_contacts where event_id = 'f1a90000-0000-4000-8000-0000000000e1'
  and email not like '%@example.com'), 0::bigint, 'every guest email is fictional');
select is((select count(*) from auth.users u join public.guests g on g.user_id = u.id
  where g.event_id = 'f1a90000-0000-4000-8000-0000000000e1' and not public.guests_is_guest_only(u.id)), 0::bigint,
  'every guest user is guest-only');

-- A direct write counts as denied when it raises 42501.
create function public.test_denied(p_sql text) returns boolean language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when insufficient_privilege then
  return true;
end;
$$;

set local role authenticated;

set local request.jwt.claims = '{"sub": "f1a90000-0000-4000-8000-0000000000a1", "role": "authenticated"}';
select is((select count(*) from public.guests where event_id = 'f1a90000-0000-4000-8000-0000000000e1'), 80::bigint, 'the Organizer reads 80 guests');
select is((select count(*) from public.rsvps where event_id = 'f1a90000-0000-4000-8000-0000000000e1'), 40::bigint, 'the Organizer reads 40 RSVPs');
select is((select count(*) from public.guest_contacts where event_id = 'f1a90000-0000-4000-8000-0000000000e1'), 80::bigint, 'the Organizer reads 80 contacts');
select ok(public.test_denied($$update public.guests set name = 'x'$$) and public.test_denied($$delete from public.guests$$)
  and public.test_denied($$update public.rsvps set plus_one = false$$) and public.test_denied($$delete from public.rsvps$$)
  and public.test_denied($$insert into public.rsvps (guest_id, event_id, attending) select id, event_id, true from public.guests$$)
  and public.test_denied($$insert into public.guests (event_id, name) values ('f1a90000-0000-4000-8000-0000000000e1', 'x')$$),
  'the Organizer cannot write guests or RSVPs directly');

set local request.jwt.claims = '{"sub": "f1a90000-0000-4000-8000-0000000000a5", "role": "authenticated"}';
select is((select count(*) from public.guests where event_id = 'f1a90000-0000-4000-8000-0000000000e1'), 80::bigint, 'Gwen reads 80 guests');
select is((select count(*) from public.rsvps where event_id = 'f1a90000-0000-4000-8000-0000000000e1'), 40::bigint, 'Gwen reads 40 RSVPs');
select is((select count(*) from public.guest_contacts), 0::bigint, 'Gwen reads no guest contact');
select ok(public.test_denied($$update public.guests set name = 'x'$$) and public.test_denied($$delete from public.guests$$)
  and public.test_denied($$update public.rsvps set plus_one = false$$) and public.test_denied($$delete from public.rsvps$$)
  and public.test_denied($$insert into public.rsvps (guest_id, event_id, attending) select id, event_id, true from public.guests$$)
  and public.test_denied($$insert into public.guests (event_id, name) values ('f1a90000-0000-4000-8000-0000000000e1', 'x')$$),
  'Gwen cannot write guests or RSVPs directly');

set local request.jwt.claims = '{"sub": "f1a90000-0000-4000-8000-0000000000a2", "role": "authenticated"}';
select is((select count(*) from public.guests), 0::bigint, 'the Venue holder reads no guest');
select is((select count(*) from public.rsvps), 0::bigint, 'the Venue holder reads no RSVP');
select is((select count(*) from public.guest_contacts), 0::bigint, 'the Venue holder reads no contact');
select ok(public.test_denied($$update public.guests set name = 'x'$$) and public.test_denied($$delete from public.guests$$)
  and public.test_denied($$update public.rsvps set plus_one = false$$) and public.test_denied($$delete from public.rsvps$$)
  and public.test_denied($$insert into public.rsvps (guest_id, event_id, attending) values (gen_random_uuid(), 'f1a90000-0000-4000-8000-0000000000e1', true)$$)
  and public.test_denied($$insert into public.guests (event_id, name) values ('f1a90000-0000-4000-8000-0000000000e1', 'x')$$),
  'the Venue holder cannot write guests or RSVPs directly');

set local request.jwt.claims = '{"sub": "f1a90000-0000-4000-8000-000000020050", "role": "authenticated"}';
select is((select id from public.guests), 'f1a90000-0000-4000-8000-000000010050'::uuid, 'a seeded Guest reads only their own guest row');
select is((select guest_id from public.rsvps), 'f1a90000-0000-4000-8000-000000010050'::uuid, 'a seeded Guest reads only their own RSVP');
select is((select count(*) from public.guest_contacts), 0::bigint, 'a Guest reads no contact');
select ok(public.test_denied($$update public.guests set name = 'x'$$) and public.test_denied($$delete from public.guests$$)
  and public.test_denied($$update public.rsvps set plus_one = false$$) and public.test_denied($$delete from public.rsvps$$)
  and public.test_denied($$insert into public.rsvps (guest_id, event_id, attending) values (gen_random_uuid(), 'f1a90000-0000-4000-8000-0000000000e1', true)$$)
  and public.test_denied($$insert into public.guests (event_id, name) values ('f1a90000-0000-4000-8000-0000000000e1', 'x')$$),
  'a Guest cannot write guests or RSVPs directly');

-- Deletion by one answered Guest: exactly their rows, token and user go; 79 guests stay.
select is(public.guests_delete_guest_data('f1a90000-0000-4000-8000-000000010050'), 'deleted_with_user', 'the Guest deletes their data and user');

reset role;
create temp view counts as select
  (select count(*) from public.guests where event_id = 'f1a90000-0000-4000-8000-0000000000e1') as guests,
  (select count(*) from public.guest_contacts where event_id = 'f1a90000-0000-4000-8000-0000000000e1') as contacts,
  (select count(*) from public.rsvps where event_id = 'f1a90000-0000-4000-8000-0000000000e1') as rsvps,
  (select count(*) from public.invite_tokens where event_id = 'f1a90000-0000-4000-8000-0000000000e1' and kind = 'guest') as tokens,
  (select count(*) from auth.users where id::text like 'f1a90000-0000-4000-8000-00000002%') as users,
  (select count(*) from public.guests where id = 'f1a90000-0000-4000-8000-000000010050') as gone;
select is((select row(guests, contacts, rsvps, tokens, users, gone) from counts), row(79::bigint, 79::bigint, 39::bigint, 64::bigint, 64::bigint, 0::bigint),
  'exactly their guest, contact, RSVP, token and user are gone');

set local role authenticated;
set local request.jwt.claims = '{"sub": "f1a90000-0000-4000-8000-000000020050", "role": "authenticated"}';
select is(public.guests_delete_guest_data('f1a90000-0000-4000-8000-000000010050'), 'nothing', 'a second call changes nothing');
reset role;
select is((select row(guests, contacts, rsvps, tokens, users, gone) from counts), row(79::bigint, 79::bigint, 39::bigint, 64::bigint, 64::bigint, 0::bigint),
  'the counts are the same after the second call');

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$select count(*) from public.guests$$, '42501', null, 'anon cannot read guests');

select * from finish();
rollback;
