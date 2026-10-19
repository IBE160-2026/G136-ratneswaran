-- Story 2.2: questionnaire answers as structured columns (AD-2, AD-19).
alter table public.events
  add column event_type text check (event_type in ('birthday', 'wedding', 'party', 'seminar', 'other')),
  add column guest_count integer check (guest_count between 1 and 100000),
  add column duration_minutes integer check (duration_minutes between 1 and 20160),
  add column venue_known boolean,
  add column rsvp_wanted boolean,
  add column rsvp_due_date date,
  add column guest_list_method text check (guest_list_method in ('invite_link', 'manual')),
  -- Questions answered "Not sure yet". A null value without its key here means never asked.
  add column unknown_answers text[] not null default '{}';

alter table public.events
  add constraint events_unknown_answers_known_keys check (
    unknown_answers <@ array[
      'event_type', 'starts_at', 'guest_count', 'duration',
      'venue_known', 'rsvp_wanted', 'rsvp_due_date', 'guest_list_method'
    ]::text[]
  ),
  -- A question is either answered or unknown, never both.
  add constraint events_unknown_answers_unanswered check (
    (event_type is null or not 'event_type' = any (unknown_answers))
    and (starts_at is null or not 'starts_at' = any (unknown_answers))
    and (guest_count is null or not 'guest_count' = any (unknown_answers))
    and (duration_minutes is null or not 'duration' = any (unknown_answers))
    and (venue_known is null or not 'venue_known' = any (unknown_answers))
    and (rsvp_wanted is null or not 'rsvp_wanted' = any (unknown_answers))
    and (rsvp_due_date is null or not 'rsvp_due_date' = any (unknown_answers))
    and (guest_list_method is null or not 'guest_list_method' = any (unknown_answers))
  ),
  add constraint events_rsvp_due_needs_rsvp check (rsvp_due_date is null or coalesce(rsvp_wanted, false)),
  -- The due date is a day, compared with the Event's local day.
  add constraint events_rsvp_due_by_start check (
    rsvp_due_date is null
    or starts_at is null
    or time_zone is null
    or rsvp_due_date <= (starts_at at time zone time_zone)::date
  );

-- AD-2 mutation function for wizard step 1. It writes only the questionnaire columns and
-- takes the local start time so the Event's time zone, not the caller's, decides the instant.
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
  p_unknown_answers text[]
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
    -- Story 2.6 takes over ends_at through events_update_schedule; duration_minutes only records the answer.
    ends_at = v_starts_at + make_interval(mins => p_duration_minutes),
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
end;
$$;

revoke execute on function public.events_save_questionnaire(
  uuid, text, timestamp, text, integer, integer, boolean, boolean, date, text, text, text[]
) from public, anon;
grant execute on function public.events_save_questionnaire(
  uuid, text, timestamp, text, integer, integer, boolean, boolean, date, text, text, text[]
) to authenticated;
