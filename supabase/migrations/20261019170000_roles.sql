-- Story 2.5: Roles from the Branch Pool (FR-2, AD-2, AD-3, AD-19).

-- The Branch Pool. Keys are stable because guest-data ownership refers to them; names are localised in the app.
-- Generated types expose this list, so TypeScript never keeps a second copy.
create type public.role_key as enum (
  'venue', 'guests', 'food_beverage', 'entertainment', 'travel_logistics', 'program'
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  key public.role_key not null,
  -- The single source for "owning Role inactive, so the Organizer owns its guest data". A Role is never
  -- deleted, only switched off, so its rows survive (AD-19).
  active boolean not null default false,
  -- Set when the Organizer switches the Role; the type mapping never changes a toggled Role.
  toggled_at timestamptz,
  unique (event_id, key)
);

alter table public.roles enable row level security;

-- AD-19: no direct-edit columns. Rows come from events_create, change through events_set_role_active
-- and the questionnaire save, and go only with their Event.
revoke all on public.roles from public, anon, authenticated;
grant select on public.roles to authenticated;

-- Epic 3 widens this with holds_role for Role-holders.
create policy roles_select on public.roles
  for select to authenticated using (public.is_organizer(event_id));

-- Existing Events get every pool Role with the defaults for an unknown type (demo data only).
insert into public.roles (event_id, key, active)
select e.id, k.key, k.key in ('venue', 'guests', 'food_beverage')
from public.events e
cross join unnest(enum_range(null::public.role_key)) as k (key);

-- A new Event starts with every pool Role switched off; the type answer activates the defaults.
-- A draft whose Roles were switched is not blank, so a double click never hands it back.
create or replace function public.events_create()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
begin
  if v_user_id is null then
    raise exception 'events_create requires a signed-in user' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select e.id into v_event_id from public.events e
  where e.organizer_id = v_user_id
    and e.published_at is null
    and e.cancelled_at is null
    and e.name is null
    and e.event_type is null
    and e.starts_at is null
    and e.ends_at is null
    and e.time_zone is null
    and e.duration_minutes is null
    and e.guest_count is null
    and e.venue_known is null
    and e.rsvp_wanted is null
    and e.rsvp_due_date is null
    and e.guest_list_method is null
    and e.language is null
    and e.unknown_answers = '{}'
    and not exists (select 1 from public.roles r where r.event_id = e.id and r.toggled_at is not null)
  order by e.created_at desc
  limit 1;

  if v_event_id is null then
    insert into public.events (organizer_id) values (v_user_id) returning id into v_event_id;
    insert into public.roles (event_id, key)
    select v_event_id, k.key from unnest(enum_range(null::public.role_key)) as k (key);
  end if;
  return v_event_id;
end;
$$;

-- The questionnaire save now also applies the type's default Roles, in the same transaction. The defaults
-- come from the app's mapping (src/modules/events/roles.ts); null leaves the Roles as they are.
drop function public.events_save_questionnaire(
  uuid, text, timestamp, text, integer, integer, boolean, boolean, date, text, text, text[]
);

create function public.events_save_questionnaire(
  p_event_id uuid,
  p_event_type text,
  p_starts_local timestamp,
  p_time_zone text,
  p_duration_minutes integer,
  p_guest_count integer,
  p_venue_known boolean,
  p_rsvp_wanted boolean,
  p_rsvp_due_date date,
  p_guest_list_method text,
  p_language text,
  p_unknown_answers text[],
  p_default_roles public.role_key[] default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_starts_at timestamptz;
begin
  if not public.is_organizer(p_event_id) then
    raise exception 'only the Organizer can answer the questionnaire' using errcode = '42501';
  end if;

  if p_time_zone is not null
    and not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    raise exception 'unknown time zone' using errcode = '22023';
  end if;
  if p_starts_local is not null and p_time_zone is null then
    raise exception 'a start time needs a time zone' using errcode = '22023';
  end if;

  perform 1 from public.events where id = p_event_id for update;

  v_starts_at := p_starts_local at time zone p_time_zone;

  update public.events set
    event_type = p_event_type,
    starts_at = v_starts_at,
    -- Story 2.6 takes over ends_at through events_update_schedule, so re-saving unchanged answers keeps it.
    ends_at = case
      when v_starts_at is not distinct from starts_at and p_duration_minutes is not distinct from duration_minutes
        then ends_at
      else v_starts_at + make_interval(mins => p_duration_minutes)
    end,
    time_zone = p_time_zone,
    duration_minutes = p_duration_minutes,
    guest_count = p_guest_count,
    venue_known = p_venue_known,
    rsvp_wanted = p_rsvp_wanted,
    rsvp_due_date = p_rsvp_due_date,
    guest_list_method = p_guest_list_method,
    language = p_language,
    unknown_answers = coalesce(p_unknown_answers, '{}')
  where id = p_event_id;

  if p_default_roles is not null then
    update public.roles set active = key = any (p_default_roles)
    where event_id = p_event_id and toggled_at is null;
  end if;
end;
$$;

revoke execute on function public.events_save_questionnaire(
  uuid, text, timestamp, text, integer, integer, boolean, boolean, date, text, text, text[], public.role_key[]
) from public, anon;
grant execute on function public.events_save_questionnaire(
  uuid, text, timestamp, text, integer, integer, boolean, boolean, date, text, text, text[], public.role_key[]
) to authenticated;

-- AD-2/AD-5 mutation function: the Organizer switches one Role. The caller names the Role, never the Event,
-- so authorisation follows the Role's own Event.
create function public.events_set_role_active(p_role_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
begin
  select event_id into v_event_id from public.roles where id = p_role_id;
  if v_event_id is null or not public.is_organizer(v_event_id) then
    raise exception 'only the Organizer can switch a Role' using errcode = '42501';
  end if;
  if p_active is null then
    raise exception 'a Role is on or off' using errcode = '22004';
  end if;

  update public.roles set active = p_active, toggled_at = now() where id = p_role_id;
end;
$$;

revoke execute on function public.events_set_role_active(uuid, boolean) from public, anon;
grant execute on function public.events_set_role_active(uuid, boolean) to authenticated;
