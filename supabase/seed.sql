-- Flagship scenario (AD-15): a 40th birthday with fictional people only. Re-runnable: it first removes its
-- own users, which cascades to the Event, Roles, members and Tasks, so dates are fresh on every run.
-- Local development only: never run against the cloud project (CI pushes migrations, not this file).
-- Deadlines count from today in the Event's time zone and sit 30+ days out, so a database seeded within a month stays valid.
-- Sign-in password for every seeded user: abcdefg1

delete from auth.users where id::text like 'f1a90000-0000-4000-8000-0000000000a_';

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
  ('f1a90000-0000-4000-8000-0000000000a4', 'demo.entertainment@example.com')
) as v (id, email);

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true), now(), now(), now()
from auth.users u where u.id::text like 'f1a90000-0000-4000-8000-0000000000a_';

insert into public.events (id, organizer_id, name, starts_at, ends_at, time_zone, language, published_at)
values (
  'f1a90000-0000-4000-8000-0000000000e1', 'f1a90000-0000-4000-8000-0000000000a1', 'Demo 40th Birthday',
  date_trunc('day', now()) + interval '90 days 17 hours', date_trunc('day', now()) + interval '90 days 22 hours',
  'Europe/Oslo', 'en', now()
);

insert into public.roles (id, event_id, key, active) values
  ('f1a90000-0000-4000-8000-0000000000b1', 'f1a90000-0000-4000-8000-0000000000e1', 'venue', true),
  ('f1a90000-0000-4000-8000-0000000000b2', 'f1a90000-0000-4000-8000-0000000000e1', 'food_beverage', true),
  ('f1a90000-0000-4000-8000-0000000000b3', 'f1a90000-0000-4000-8000-0000000000e1', 'entertainment', true),
  ('f1a90000-0000-4000-8000-0000000000b4', 'f1a90000-0000-4000-8000-0000000000e1', 'program', true),
  ('f1a90000-0000-4000-8000-0000000000b5', 'f1a90000-0000-4000-8000-0000000000e1', 'guests', false),
  ('f1a90000-0000-4000-8000-0000000000b6', 'f1a90000-0000-4000-8000-0000000000e1', 'travel_logistics', false);

-- The Venue holder leads Venue; the Entertainment invitee has not joined yet.
insert into public.role_members (event_id, role_id, user_id, name, joined_at, is_lead) values
  ('f1a90000-0000-4000-8000-0000000000e1', 'f1a90000-0000-4000-8000-0000000000b1', 'f1a90000-0000-4000-8000-0000000000a2', 'Vera Venue', now(), true),
  ('f1a90000-0000-4000-8000-0000000000e1', 'f1a90000-0000-4000-8000-0000000000b2', 'f1a90000-0000-4000-8000-0000000000a3', 'Finn Food', now(), false),
  ('f1a90000-0000-4000-8000-0000000000e1', 'f1a90000-0000-4000-8000-0000000000b3', 'f1a90000-0000-4000-8000-0000000000a4', 'Ida Invited', null, false);

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
