-- Story 3.9: revoke a Role (FR-1, AD-2, AD-3, AD-5, AD-18, AD-19).

-- AD-2/AD-5 mutation function: the Organizer removes one person from one Role. The row's Event and Role are
-- read here, never taken from the caller. The row goes, the person's open role_holder links for that Role
-- are revoked and one 'revoked' row is logged, all in one transaction. The lead flag lives on the row, so a
-- revoked lead leaves the Role with no lead. Access follows from RLS: with no joined row the person reads
-- nothing from the Event or the Role. "Change a Role" is a revoke plus a new invitation.
create function public.events_revoke_role(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_event_id uuid;
  v_role_id uuid;
  v_user_id uuid;
  v_read_only boolean;
begin
  -- An unknown row id looks the same as another Organizer's.
  select m.event_id into v_event_id from public.role_members m where m.id = p_member_id;
  if v_event_id is null or not public.is_organizer(v_event_id) then
    raise exception 'only the Organizer can revoke a Role' using errcode = '42501';
  end if;

  select m.role_id, m.user_id into v_role_id, v_user_id
  from public.role_members m where m.id = p_member_id for update;
  if v_user_id is null then
    -- A concurrent revoke won; the row is gone like an unknown one.
    raise exception 'only the Organizer can revoke a Role' using errcode = '42501';
  end if;

  -- Same rule as events_refuse_read_only and events_invite_to_role. A switched-off Role can still be revoked.
  select e.cancelled_at is not null or (e.published_at is not null and e.ends_at < now())
  into v_read_only from public.events e where e.id = v_event_id;
  if v_read_only then
    raise exception 'a cancelled or ended Event is read-only' using errcode = '55000';
  end if;

  delete from public.role_members where id = p_member_id;

  update public.invite_tokens set revoked_at = now()
  where user_id = v_user_id and role_id = v_role_id and kind = 'role_holder'
    and revoked_at is null and consumed_at is null;

  -- Epic 4 (AD-18) adds its call to tasks_release_owner(role_id, user_id) here, so the person's owned Tasks
  -- on this Role are released in the same transaction.

  insert into public.role_membership_log (event_id, role_id, user_id, action, actor_id)
  values (v_event_id, v_role_id, v_user_id, 'revoked', v_actor);
end;
$$;

revoke execute on function public.events_revoke_role(uuid) from public, anon;
grant execute on function public.events_revoke_role(uuid) to authenticated;
