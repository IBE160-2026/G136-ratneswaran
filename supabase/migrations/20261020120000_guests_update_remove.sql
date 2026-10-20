-- Story 2.10: edit and remove guests (FR-5, AD-2, AD-5, AD-19). No grants change: these functions are
-- the only writers, and name and email change together so a taken email leaves no half-done edit.

-- AD-2/AD-5 mutation function. The Event comes from the guest row, never from the caller.
create function public.guests_update(p_guest_id uuid, p_name text, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_cancelled_at timestamptz;
  v_published_at timestamptz;
  v_ends_at timestamptz;
begin
  select event_id into v_event_id from public.guests where id = p_guest_id;
  -- An unknown guest looks the same as someone else's, so ids cannot be probed.
  if v_event_id is null or not public.is_organizer(v_event_id) then
    raise exception 'only the Organizer can edit guests' using errcode = '42501';
  end if;

  select cancelled_at, published_at, ends_at into v_cancelled_at, v_published_at, v_ends_at
  from public.events where id = v_event_id for update;
  -- The rule of guests_add.
  if v_cancelled_at is not null or (v_published_at is not null and v_ends_at < now()) then
    raise exception 'a cancelled or ended Event is read-only' using errcode = '55000';
  end if;

  -- The CHECKs refuse bad data (23514) and the unique index another guest's email (23505).
  update public.guests set name = btrim(coalesce(p_name, '')) where id = p_guest_id;
  update public.guest_contacts set email = btrim(coalesce(p_email, '')) where guest_id = p_guest_id;
end;
$$;

revoke execute on function public.guests_update(uuid, text, text) from public, anon;
grant execute on function public.guests_update(uuid, text, text) to authenticated;

-- AD-2/AD-5 mutation function: a hard delete; the contact goes by cascade.
-- Epic 7: once a guest has an RSVP or an auth user, removal goes through guests_delete_guest_data.
create function public.guests_remove(p_guest_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_cancelled_at timestamptz;
  v_published_at timestamptz;
  v_ends_at timestamptz;
begin
  select event_id into v_event_id from public.guests where id = p_guest_id;
  if v_event_id is null or not public.is_organizer(v_event_id) then
    raise exception 'only the Organizer can remove guests' using errcode = '42501';
  end if;

  select cancelled_at, published_at, ends_at into v_cancelled_at, v_published_at, v_ends_at
  from public.events where id = v_event_id for update;
  if v_cancelled_at is not null or (v_published_at is not null and v_ends_at < now()) then
    raise exception 'a cancelled or ended Event is read-only' using errcode = '55000';
  end if;

  delete from public.guests where id = p_guest_id;
end;
$$;

revoke execute on function public.guests_remove(uuid) from public, anon;
grant execute on function public.guests_remove(uuid) to authenticated;
