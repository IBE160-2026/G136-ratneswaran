-- Story 2.8: description and publish to the team (FR4, AD-2, AD-19).

alter table public.events
  add column description text check (char_length(btrim(description)) between 1 and 2000);

-- Wizard step 3 writes name and description in one direct update under events_update (AD-19).
grant update (name, description) on public.events to authenticated;

-- A draft with only a description is not blank, so events_create must not hand it out again.
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
    and e.description is null
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

-- AD-2/AD-5 mutation function: the Organizer publishes an Event to the team. The events_publishable CHECK
-- refuses an incomplete draft (23514). The read-only trigger sees only the old, unpublished row, so a draft whose
-- date has passed still publishes and is read-only from then on. A second call changes nothing.
-- Core sends no invitation or notice.
create function public.events_publish(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cancelled_at timestamptz;
begin
  if not public.is_organizer(p_event_id) then
    raise exception 'only the Organizer can publish the Event' using errcode = '42501';
  end if;

  select cancelled_at into v_cancelled_at from public.events where id = p_event_id for update;
  if v_cancelled_at is not null then
    raise exception 'a cancelled Event cannot be published' using errcode = '55000';
  end if;

  update public.events set published_at = now() where id = p_event_id and published_at is null;
end;
$$;

revoke execute on function public.events_publish(uuid) from public, anon;
grant execute on function public.events_publish(uuid) to authenticated;
