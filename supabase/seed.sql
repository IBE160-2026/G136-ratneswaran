-- Flagship scenario (AD-15): a 40th birthday with fictional people only. Re-runnable: it first removes its
-- own users, which cascades to the Event, Roles, members and Tasks, so dates are fresh on every run.
-- Local development only: never run against the cloud project (CI pushes migrations, not this file).
-- Deadlines count from today in the Event's time zone and sit 30+ days out, so a database seeded within a month stays valid.
-- Sign-in password for every seeded user: abcdefg1

-- Guest users (…-…0002xxxx) go too; the Event delete cascades guests, contacts, RSVPs and tokens.
delete from auth.users where id::text like 'f1a90000-%';

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
select
  v.id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v.email,
  extensions.crypt('abcdefg1', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', '', '', '', '', ''
from (values
  ('f1a90000-0000-4000-8000-0000000000a1', 'demo.organizer@example.com'),
  ('f1a90000-0000-4000-8000-0000000000a2', 'demo.venue@example.com'),
  ('f1a90000-0000-4000-8000-0000000000a3', 'demo.food@example.com'),
  ('f1a90000-0000-4000-8000-0000000000a4', 'demo.entertainment@example.com'),
  ('f1a90000-0000-4000-8000-0000000000a5', 'demo.guests@example.com')
) as v (id, email);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
from auth.users u where u.id::text like 'f1a90000-0000-4000-8000-0000000000a_';

-- The name a revoked guest link shows ("Ask Olga Organizer for a new one.").
update auth.users set raw_user_meta_data = '{"name": "Olga Organizer"}' where id = 'f1a90000-0000-4000-8000-0000000000a1';

insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at, guest_count)
values (
  'f1a90000-0000-4000-8000-0000000000e1', 'f1a90000-0000-4000-8000-0000000000a1', 'Demo 40th Birthday',
  date_trunc('day', now()) + interval '90 days 17 hours', date_trunc('day', now()) + interval '90 days 22 hours',
  'Europe/Oslo', 'en', now(), 80
);

insert into public.roles (id, event_id, key, active) values
  ('f1a90000-0000-4000-8000-0000000000b1', 'f1a90000-0000-4000-8000-0000000000e1', 'venue', true),
  ('f1a90000-0000-4000-8000-0000000000b2', 'f1a90000-0000-4000-8000-0000000000e1', 'food_beverage', true),
  ('f1a90000-0000-4000-8000-0000000000b3', 'f1a90000-0000-4000-8000-0000000000e1', 'entertainment', true),
  ('f1a90000-0000-4000-8000-0000000000b4', 'f1a90000-0000-4000-8000-0000000000e1', 'program', true),
  ('f1a90000-0000-4000-8000-0000000000b5', 'f1a90000-0000-4000-8000-0000000000e1', 'guests', true),
  ('f1a90000-0000-4000-8000-0000000000b6', 'f1a90000-0000-4000-8000-0000000000e1', 'travel_logistics', false);

-- The Venue holder leads Venue; the Entertainment invitee has not joined yet.
insert into public.role_members (event_id, role_id, user_id, name, joined_at, is_lead) values
  ('f1a90000-0000-4000-8000-0000000000e1', 'f1a90000-0000-4000-8000-0000000000b1', 'f1a90000-0000-4000-8000-0000000000a2', 'Vera Venue', now(), true),
  ('f1a90000-0000-4000-8000-0000000000e1', 'f1a90000-0000-4000-8000-0000000000b2', 'f1a90000-0000-4000-8000-0000000000a3', 'Finn Food', now(), false),
  ('f1a90000-0000-4000-8000-0000000000e1', 'f1a90000-0000-4000-8000-0000000000b3', 'f1a90000-0000-4000-8000-0000000000a4', 'Ida Invited', null, false),
  ('f1a90000-0000-4000-8000-0000000000e1', 'f1a90000-0000-4000-8000-0000000000b5', 'f1a90000-0000-4000-8000-0000000000a5', 'Gwen Guests', now(), false);

-- Parents and plain Tasks first; the Subtask and the dependency follow because their triggers read the parent.
insert into public.tasks (id, event_id, role_id, title, deadline, owner_user_id, status, lifecycle, accepted_at, delegated_at, created_at)
select v.id::uuid, 'f1a90000-0000-4000-8000-0000000000e1', r.id, v.title, (now() at time zone 'Europe/Oslo')::date + v.days, v.owner::uuid,
  v.status, v.lifecycle, null, v.delegated::timestamptz, now() - interval '30 days'
from (values
  ('f1a90000-0000-4000-8000-0000000000c1', 'venue', 'Book the venue', -20, null, 'done', 'active', null),
  ('f1a90000-0000-4000-8000-0000000000c2', 'venue', 'Agree catering access', 30, 'f1a90000-0000-4000-8000-0000000000a2', 'not_started', 'active', (now() - interval '5 days')::text),
  ('f1a90000-0000-4000-8000-0000000000c3', 'venue', 'Order tables', 33, null, 'not_started', 'active', null),
  ('f1a90000-0000-4000-8000-0000000000c5', 'venue', 'Set up stage', 35, null, 'not_started', 'active', null),
  ('f1a90000-0000-4000-8000-0000000000d1', 'food_beverage', 'Choose caterer', -10, null, 'done', 'active', null),
  ('f1a90000-0000-4000-8000-0000000000d2', 'food_beverage', 'Send menu to caterer', -6, null, 'not_started', 'active', null),
  ('f1a90000-0000-4000-8000-0000000000d3', 'food_beverage', 'Wait for cake quote', 40, null, 'waiting_external', 'active', null),
  ('f1a90000-0000-4000-8000-0000000000d4', 'food_beverage', 'Taste the menu', 70, null, 'not_started', 'active', null),
  ('f1a90000-0000-4000-8000-0000000000e2', 'entertainment', 'Book the band', 50, null, 'not_started', 'active', null),
  ('f1a90000-0000-4000-8000-0000000000f1', 'program', 'Draft the speeches', 65, null, 'not_started', 'active', null),
  ('f1a90000-0000-4000-8000-0000000000f2', 'program', 'Print the programme', -2, null, 'not_started', 'active', null),
  ('f1a90000-0000-4000-8000-0000000000f3', 'program', 'Proposed photo booth idea', null, null, 'not_started', 'proposed', null)
) as v (id, key, title, days, owner, status, lifecycle, delegated)
join public.roles r on r.event_id = 'f1a90000-0000-4000-8000-0000000000e1' and r.key = v.key::public.role_key;

insert into public.tasks (id, event_id, role_id, title, deadline, parent_task_id, created_at)
values ('f1a90000-0000-4000-8000-0000000000c4', 'f1a90000-0000-4000-8000-0000000000e1',
  'f1a90000-0000-4000-8000-0000000000b1', 'Reserve chairs', (now() at time zone 'Europe/Oslo')::date + 32,
  'f1a90000-0000-4000-8000-0000000000c3', now() - interval '30 days');

insert into public.task_dependencies (task_id, depends_on_id)
values ('f1a90000-0000-4000-8000-0000000000c5', 'f1a90000-0000-4000-8000-0000000000c3');

-- 80 fictional guests, numbered n = 1..80 (ids …00000001nnnn, users …00000002nnnn):
--   1-15 not invited (no user, no token)        16-30 link copied, never opened      31-40 opened, not answered
--   41-60 coming alone                          61-72 coming with a plus-one         73-80 not coming
-- Guest users are guest-only like the ones copyGuestLink creates: no password, no identity, no Role.
create temp table seed_guests as
select n,
  ('f1a90000-0000-4000-8000-00000001' || lpad(n::text, 4, '0'))::uuid as guest_id,
  ('f1a90000-0000-4000-8000-00000002' || lpad(n::text, 4, '0'))::uuid as user_id,
  'seed.guest.' || lpad(n::text, 2, '0') || '@example.com' as email
from generate_series(1, 80) as n;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token
)
select user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, '', now(),
  '{"password_pending": true}', '{}', now(), now(), '', '', '', '', '', '', '', ''
from seed_guests where n > 15;

insert into public.guests (id, event_id, name, user_id, first_opened_at)
select guest_id, 'f1a90000-0000-4000-8000-0000000000e1', 'Seed Guest ' || lpad(n::text, 2, '0'),
  case when n > 15 then user_id end, case when n > 30 then now() end
from seed_guests;

insert into public.guest_contacts (guest_id, event_id, email)
select guest_id, 'f1a90000-0000-4000-8000-0000000000e1', email from seed_guests;

-- Tokens come from the system function, never a hand-made hash.
select public.invite_tokens_guest_link('f1a90000-0000-4000-8000-0000000000e1', user_id, false)
from seed_guests where n > 15;

insert into public.rsvps (guest_id, event_id, attending, plus_one, plus_one_name, other_needs)
select guest_id, 'f1a90000-0000-4000-8000-0000000000e1', n <= 72, n between 61 and 72,
  case when n between 61 and 66 then 'Seed Plus-one ' || lpad(n::text, 2, '0') else '' end,
  case n
    when 41 then 'Seed-needs: parking near the door'
    when 42 then 'A seat near the stage, please'
    when 61 then 'We need a high chair'
    else ''
  end
from seed_guests where n > 40;

drop table seed_guests;
