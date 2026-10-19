-- Story 2.4: the Cancelled state exists before Story 2.7 writes it. No grant: only 2.7's function sets it (AD-19).
alter table public.events add column cancelled_at timestamptz;

-- A blank draft must also be uncancelled, so events_create never hands back a cancelled Event.
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

  select id into v_event_id from public.events
  where organizer_id = v_user_id
    and published_at is null
    and cancelled_at is null
    and name is null
    and event_type is null
    and starts_at is null
    and ends_at is null
    and time_zone is null
    and duration_minutes is null
    and guest_count is null
    and venue_known is null
    and rsvp_wanted is null
    and rsvp_due_date is null
    and guest_list_method is null
    and language is null
    and unknown_answers = '{}'
  order by created_at desc
  limit 1;

  if v_event_id is null then
    insert into public.events (organizer_id) values (v_user_id) returning id into v_event_id;
  end if;
  return v_event_id;
end;
$$;
