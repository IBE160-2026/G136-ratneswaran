-- Story 4.7: Role lead and revoke hooks (FR-1, FR-8, AD-1, AD-5, AD-18, AD-19).

-- System function: called only by events_set_role_lead. Open Tasks nobody owns move to the Role's lead; Tasks
-- owned by anyone stay. The actor is auth.uid(); the lead comes from role_members.
create function public.tasks_assign_role_owned_to_lead(p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_lead uuid;
  v_event_id uuid;
  v_moved int;
begin
  select m.user_id, m.event_id into v_lead, v_event_id
  from public.role_members m where m.role_id = p_role_id and m.is_lead;
  if v_lead is null then
    return;
  end if;

  with moved as (
    update public.tasks
    set owner_user_id = v_lead, delegated_at = now(), accepted_at = null
    where role_id = p_role_id and owner_user_id is null
      and lifecycle = 'active' and not obsolete and status <> 'done'
    returning id
  ), logged as (
    insert into public.task_assignment_log (task_id, from_user, to_user, by_user, kind)
    select id, null, v_lead, v_actor, 'delegated' from moved
    returning 1
  )
  select count(*) into v_moved from logged;

  if v_moved > 0 and exists (
    select 1 from public.events e where e.id = v_event_id and e.published_at is not null
  ) then
    perform public.notifications_emit(
      v_event_id, 'task_assigned', p_role_id, array[row('user', v_lead)::public.recipient_spec]
    );
  end if;
end;
$$;

-- System function: called only by events_revoke_role, after the role_members row is deleted. Releases the
-- user's Tasks in the Role, and in the whole Event when they no longer hold any Role there (the Organizer
-- keeps access through is_organizer, so theirs stay).
create function public.tasks_release_owner(p_role_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_event_id uuid;
  v_whole_event boolean;
begin
  select r.event_id into v_event_id from public.roles r where r.id = p_role_id;
  v_whole_event := not exists (
      select 1 from public.role_members m where m.event_id = v_event_id and m.user_id = p_user_id
    ) and not exists (
      select 1 from public.events e where e.id = v_event_id and e.organizer_id = p_user_id
    );

  with released as (
    update public.tasks
    set owner_user_id = null, delegated_at = null, accepted_at = null
    where owner_user_id = p_user_id and (role_id = p_role_id or (v_whole_event and event_id = v_event_id))
    returning id
  )
  insert into public.task_assignment_log (task_id, from_user, to_user, by_user, kind)
  select id, p_user_id, null, v_actor, 'released' from released;
end;
$$;

revoke execute on function public.tasks_assign_role_owned_to_lead(uuid) from public, anon, authenticated;
revoke execute on function public.tasks_release_owner(uuid, uuid) from public, anon, authenticated;

-- Replaces the Story 3.8 and 3.9 bodies; the notes about Epic 4 are gone.
create or replace function public.events_set_role_lead(p_role_id uuid, p_member_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_event_id uuid;
  v_active boolean;
  v_read_only boolean;
  v_previous uuid;
  v_lead uuid;
  v_is_lead boolean;
begin
  -- An unknown Role id looks the same as another Organizer's.
  select r.event_id into v_event_id from public.roles r where r.id = p_role_id;
  if v_event_id is null or not public.is_organizer(v_event_id) then
    raise exception 'only the Organizer can set the Role lead' using errcode = '42501';
  end if;

  -- Concurrent calls for the same Role run one after the other.
  select r.active into v_active from public.roles r where r.id = p_role_id for update;

  -- Same rule as events_refuse_read_only and events_invite_to_role.
  select e.cancelled_at is not null or (e.published_at is not null and e.ends_at < now())
  into v_read_only from public.events e where e.id = v_event_id;
  if v_read_only then
    raise exception 'a cancelled or ended Event is read-only' using errcode = '55000';
  end if;

  if not v_active then
    raise exception 'role_inactive' using errcode = '22023';
  end if;

  select m.user_id into v_previous from public.role_members m where m.role_id = p_role_id and m.is_lead
  for update;

  if p_member_id is not null then
    select m.user_id, m.is_lead into v_lead, v_is_lead
    from public.role_members m where m.id = p_member_id and m.role_id = p_role_id
    for update;
    if v_lead is null then
      raise exception 'not_a_member' using errcode = '22023';
    end if;
    if v_is_lead then
      return;
    end if;
  elsif v_previous is null then
    return;
  end if;

  -- One statement, so there is never zero or two leads. The partial unique index is checked row by row and
  -- cannot be deferred, so a plain "set is_lead = (id = new)" fails whenever the new row is visited before
  -- the old one. The clear lives in a data-modifying CTE; the scalar subquery makes the main UPDATE wait
  -- for it to finish. With a null p_member_id the CTE alone does the work. Do not simplify.
  with cleared as (
    update public.role_members set is_lead = false
    where role_id = p_role_id and is_lead and id is distinct from p_member_id
    returning user_id
  )
  update public.role_members set is_lead = true
  where id = p_member_id and (select count(*) from cleared) >= 0;

  -- A new lead (the early returns above skip a repeat and a clear): the Role's unowned Tasks move to them.
  if p_member_id is not null then
    perform public.tasks_assign_role_owned_to_lead(p_role_id);
  end if;

  insert into public.role_membership_log (event_id, role_id, user_id, action, actor_id)
  values (v_event_id, p_role_id, coalesce(v_lead, v_previous), 'lead_changed', v_actor);
end;
$$;

create or replace function public.events_revoke_role(p_member_id uuid)
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

  perform public.tasks_release_owner(v_role_id, v_user_id);

  insert into public.role_membership_log (event_id, role_id, user_id, action, actor_id)
  values (v_event_id, v_role_id, v_user_id, 'revoked', v_actor);
end;
$$;
