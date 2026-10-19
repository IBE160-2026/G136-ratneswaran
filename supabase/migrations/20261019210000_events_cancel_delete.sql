-- Story 2.7: cancel or delete an Event, and cancelled or ended Events are read-only (FR4, AD-2, AD-11, AD-19).

-- No grant: only events_cancel writes it, together with cancelled_at (AD-19).
alter table public.events
  add column cancellation_note text
  check (cancellation_note is null or char_length(btrim(cancellation_note)) between 1 and 500);

-- One rule for every writer, current and future: the questionnaire, the schedule, a Role switch, the direct
-- name grant and publish (2.8). A cancelled Event, or a published one that has ended, is read-only. A draft
-- stays editable after its date so a mistyped date can be fixed. Permission checks run before triggers, so a
-- forbidden write still reports 42501. DELETE is not blocked.
create function public.events_refuse_read_only()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_cancelled_at timestamptz;
  v_published_at timestamptz;
  v_ends_at timestamptz;
begin
  if tg_table_name = 'events' then
    v_cancelled_at := old.cancelled_at;
    v_published_at := old.published_at;
    v_ends_at := old.ends_at;
  else
    select cancelled_at, published_at, ends_at into v_cancelled_at, v_published_at, v_ends_at
    from public.events where id = old.event_id;
  end if;

  if v_cancelled_at is not null or (v_published_at is not null and v_ends_at < now()) then
    raise exception 'a cancelled or ended Event is read-only' using errcode = '55000';
  end if;
  return new;
end;
$$;

revoke execute on function public.events_refuse_read_only() from public, anon, authenticated;

create trigger events_read_only before update on public.events
  for each row execute function public.events_refuse_read_only();
create trigger roles_read_only before update on public.roles
  for each row execute function public.events_refuse_read_only();

-- AD-2/AD-5 mutation function: the Organizer cancels a published Event. A blank note is stored as null.
-- Core sends no notice; Epic 3 tells the Team.
create function public.events_cancel(p_event_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_published_at timestamptz;
  v_cancelled_at timestamptz;
begin
  if not public.is_organizer(p_event_id) then
    raise exception 'only the Organizer can cancel the Event' using errcode = '42501';
  end if;

  select published_at, cancelled_at into v_published_at, v_cancelled_at
  from public.events where id = p_event_id for update;
  if v_published_at is null or v_cancelled_at is not null then
    raise exception 'only a published Event that is not cancelled can be cancelled' using errcode = '55000';
  end if;

  update public.events
  set cancelled_at = now(), cancellation_note = nullif(btrim(p_note), '')
  where id = p_event_id;
end;
$$;

revoke execute on function public.events_cancel(uuid, text) from public, anon;
grant execute on function public.events_cancel(uuid, text) to authenticated;

-- AD-2/AD-5 mutation function: the Organizer deletes an Event in any state, which also discards a draft.
-- Every foreign key to events cascades, so its Roles and later rows go with it.
create function public.events_delete(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_organizer(p_event_id) then
    raise exception 'only the Organizer can delete the Event' using errcode = '42501';
  end if;

  -- Epic 7: this is the single place that purges guest data and Guest auth users before the Event goes.

  delete from public.events where id = p_event_id;
end;
$$;

revoke execute on function public.events_delete(uuid) from public, anon;
grant execute on function public.events_delete(uuid) to authenticated;
