-- Story 2.6: one writer for the Event's schedule (FR4, AD-2, AD-19).

-- A draft may lack either end, but once both are set the Event must start before it ends.
alter table public.events
  add constraint events_starts_before_ends check (starts_at is null or ends_at is null or starts_at < ends_at);

-- AD-2 mutation function and the only writer of starts_at, ends_at, time_zone, rsvp_due_date and language.
-- The local times are read in p_time_zone, so the Event's time zone, not the caller's, decides the instants.
-- Nulls are allowed because a draft may be incomplete.
create function public.events_update_schedule(
  p_event_id uuid,
  p_starts_local timestamp,
  p_ends_local timestamp,
  p_time_zone text,
  p_rsvp_due_date date,
  p_language text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_duration integer;
begin
  if not public.is_organizer(p_event_id) then
    raise exception 'only the Organizer can change the schedule' using errcode = '42501';
  end if;

  if p_time_zone is not null
    and not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    raise exception 'unknown time zone' using errcode = '22023';
  end if;
  if (p_starts_local is not null or p_ends_local is not null) and p_time_zone is null then
    raise exception 'a start or end time needs a time zone' using errcode = '22023';
  end if;

  perform 1 from public.events where id = p_event_id for update;

  v_starts_at := p_starts_local at time zone p_time_zone;
  v_ends_at := p_ends_local at time zone p_time_zone;
  -- Duration and end are one fact, so the questionnaire shows the same length. Rounding up keeps any
  -- length past 14 days out through the duration CHECK, and an end at or before the start fails it too.
  v_duration := ceil(extract(epoch from v_ends_at - v_starts_at) / 60)::integer;

  -- Epic 4: this is the single place that recalculates resolved Task deadlines when starts_at changes.
  -- Until Tasks exist there is nothing to recalculate.

  update public.events set
    starts_at = v_starts_at,
    ends_at = v_ends_at,
    time_zone = p_time_zone,
    rsvp_due_date = p_rsvp_due_date,
    language = p_language,
    duration_minutes = v_duration,
    -- A value it sets is no longer "Not sure yet".
    unknown_answers = array_remove(array_remove(array_remove(unknown_answers,
      case when v_starts_at is not null then 'starts_at' end),
      case when v_duration is not null then 'duration' end),
      case when p_rsvp_due_date is not null then 'rsvp_due_date' end)
  where id = p_event_id;
end;
$$;

revoke execute on function public.events_update_schedule(uuid, timestamp, timestamp, text, date, text)
  from public, anon;
grant execute on function public.events_update_schedule(uuid, timestamp, timestamp, text, date, text)
  to authenticated;

-- Same signature and behaviour as in 20261019170000_roles.sql, but the schedule columns are written only
-- through events_update_schedule.
create or replace function public.events_save_questionnaire(
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
  v_ends_at timestamptz;
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

  -- An end set in Event settings is kept while the start and duration are unchanged.
  select case
      when v_starts_at is not distinct from starts_at and p_duration_minutes is not distinct from duration_minutes
        then ends_at
      else v_starts_at + make_interval(mins => p_duration_minutes)
    end
  into v_ends_at
  from public.events where id = p_event_id;

  -- CHECKs hold after every statement, and a due date needs RSVP wanted, so that answer goes in first.
  -- A due date sent with RSVP not wanted still fails below, when rsvp_wanted takes its real value.
  if p_rsvp_due_date is not null then
    update public.events
    set rsvp_wanted = true, unknown_answers = array_remove(unknown_answers, 'rsvp_wanted')
    where id = p_event_id;
  end if;

  perform public.events_update_schedule(
    p_event_id, p_starts_local, v_ends_at at time zone p_time_zone, p_time_zone, p_rsvp_due_date, p_language
  );

  update public.events set
    event_type = p_event_type,
    duration_minutes = p_duration_minutes,
    guest_count = p_guest_count,
    venue_known = p_venue_known,
    rsvp_wanted = p_rsvp_wanted,
    guest_list_method = p_guest_list_method,
    unknown_answers = coalesce(p_unknown_answers, '{}')
  where id = p_event_id;

  if p_default_roles is not null then
    update public.roles set active = key = any (p_default_roles)
    where event_id = p_event_id and toggled_at is null;
  end if;
end;
$$;
