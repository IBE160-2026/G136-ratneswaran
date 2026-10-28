-- Story 3.8: Role lead (FR-1, AD-2, AD-3, AD-5, AD-18, AD-19).

alter table public.role_members add column is_lead boolean not null default false;

comment on column public.role_members.is_lead is
  'Role lead flag. Only events_set_role_lead writes it; no client has an update grant (AD-19).';

-- AD-19: at most one lead per Role. Zero is allowed; the index, not the function, is the invariant.
create unique index role_members_one_lead_idx on public.role_members (role_id) where is_lead;

-- AD-2/AD-5 mutation function: the Organizer makes a member of the Role its lead, or clears the lead with a
-- null p_member_id (Undo). A pending invitee can be lead. No user id is taken from the caller. Every real
-- change appends one lead_changed row naming the new lead, or on a clear the previous one.
create function public.events_set_role_lead(p_role_id uuid, p_member_id uuid default null)
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

  -- Epic 4 (AD-18) adds its call to tasks_assign_role_owned_to_lead for this Role here, once a new lead is
  -- set, so the Role's owned Tasks move to that lead in the same transaction.

  insert into public.role_membership_log (event_id, role_id, user_id, action, actor_id)
  values (v_event_id, p_role_id, coalesce(v_lead, v_previous), 'lead_changed', v_actor);
end;
$$;

revoke execute on function public.events_set_role_lead(uuid, uuid) from public, anon;
grant execute on function public.events_set_role_lead(uuid, uuid) to authenticated;
