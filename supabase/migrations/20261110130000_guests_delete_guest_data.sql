-- Story 7.8: delete guest data (FR-18, AD-2, AD-5, AD-11). One function removes what Arrangly holds about a
-- guest of one Event; the Guest's *Delete my data*, the Organizer's remove and Event deletion all run it.

-- AD-2/AD-5 mutation function. Returns 'deleted', 'deleted_with_user' (the auth user went too) or 'nothing'
-- (unknown, already deleted or someone else's guest: no change and no error, so ids cannot be probed).
create function public.guests_delete_guest_data(p_guest_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest public.guests;
begin
  select g.* into v_guest from public.guests g where g.id = p_guest_id for update;
  if v_guest.id is null
    or not (public.is_guest_self(p_guest_id) or public.is_organizer(v_guest.event_id)) then
    return 'nothing';
  end if;

  -- Two deletions of one user's guest rows wait here in turn, so the later one sees the earlier one's
  -- delete and removes the user: no orphan user is left.
  perform 1 from auth.users u where u.id = v_guest.user_id for update;

  -- Purge hooks: Epic 6 (ai_purge_user) and Epic 8 (tasks_purge_guest, notifications_purge_user_event)
  -- add their calls here with create or replace; none exists in Core.

  -- Deleted, not revoked: a revoked token would still hold the user id.
  delete from public.invite_tokens
  where event_id = v_guest.event_id and user_id = v_guest.user_id and kind = 'guest';
  -- The contact and the RSVP go by cascade.
  delete from public.guests where id = p_guest_id;

  if v_guest.user_id is not null
    and public.guests_is_guest_only(v_guest.user_id)
    and not exists (select 1 from public.guests g where g.user_id = v_guest.user_id) then
    delete from auth.users where id = v_guest.user_id;
    return 'deleted_with_user';
  end if;
  return 'deleted';
end;
$$;

revoke execute on function public.guests_delete_guest_data(uuid) from public, anon;
grant execute on function public.guests_delete_guest_data(uuid) to authenticated;

-- Story 2.10's remove: the Organizer and read-only checks stay here, the deletion is the shared one.
create or replace function public.guests_remove(p_guest_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest public.guests;
  v_cancelled_at timestamptz;
  v_published_at timestamptz;
  v_ends_at timestamptz;
begin
  select g.* into v_guest from public.guests g where g.id = p_guest_id;
  if v_guest.id is null or not public.is_organizer(v_guest.event_id) then
    raise exception 'only the Organizer can remove guests' using errcode = '42501';
  end if;

  select cancelled_at, published_at, ends_at into v_cancelled_at, v_published_at, v_ends_at
  from public.events where id = v_guest.event_id for update;
  if v_cancelled_at is not null or (v_published_at is not null and v_ends_at < now()) then
    raise exception 'a cancelled or ended Event is read-only' using errcode = '55000';
  end if;

  perform public.guests_delete_guest_data(p_guest_id);
end;
$$;

-- Story 2.7's delete: every guest's data, and each guest-only user of this Event alone, goes first.
create or replace function public.events_delete(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_organizer(p_event_id) then
    raise exception 'only the Organizer can delete the Event' using errcode = '42501';
  end if;

  -- In user order, so two Event deletions that share guests take the user locks in one order.
  perform public.guests_delete_guest_data(g.id)
  from (select id from public.guests where event_id = p_event_id order by user_id, id) g;

  delete from public.events where id = p_event_id;
end;
$$;
