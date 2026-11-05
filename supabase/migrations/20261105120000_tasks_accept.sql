-- Story 4.6: accept a Task and the 48-hour rule (FR-8, AD-2, AD-3, AD-13, AD-19).
-- Delegation no longer counts as accepted; only the owner accepts. task_state gets accepted and
-- stale_unaccepted, computed per request and never stored (AD-13).

-- AD-2 mutation function. Returns the Task's updated_at for the caller to chain on.
create function public.tasks_accept(p_task_id uuid, p_expected timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tasks;
  v_me uuid := (select auth.uid());
  v_updated_at timestamptz;
begin
  select * into t from public.tasks where id = p_task_id;
  -- A Role-owned Task makes the comparison null, which must read as no, not as allowed.
  if not found or not coalesce(t.owner_user_id = v_me, false) then
    raise exception 'only the owner can accept a task' using errcode = '42501';
  end if;
  if t.accepted_at is not null then
    return t.updated_at;
  end if;

  perform public.tasks_assert_writable(t.event_id);
  perform public.tasks_check_expected(p_task_id, p_expected);
  select * into t from public.tasks where id = p_task_id;
  if t.lifecycle <> 'active' or t.obsolete or t.status = 'done' then
    raise exception 'task_not_active' using errcode = '22023';
  end if;

  update public.tasks set accepted_at = now() where id = p_task_id returning updated_at into v_updated_at;
  insert into public.task_assignment_log (task_id, from_user, to_user, by_user, kind)
  values (p_task_id, null, v_me, v_me, 'accepted');
  return v_updated_at;
end;
$$;

revoke execute on function public.tasks_accept(uuid, timestamptz) from public, anon;
grant execute on function public.tasks_accept(uuid, timestamptz) to authenticated;

-- Replaces the 4.5 body: only a self-delegation is accepted at once.
create or replace function public.tasks_delegate(p_task_id uuid, p_new_owner uuid, p_expected timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tasks;
  v_me uuid := (select auth.uid());
  v_organizer boolean;
  v_lead boolean;
  v_target_ok boolean;
  v_updated_at timestamptz;
begin
  select * into t from public.tasks where id = p_task_id;
  if found then
    v_organizer := public.is_organizer(t.event_id);
    v_lead := public.is_role_lead(t.role_id);
  end if;
  if not found or not coalesce(v_organizer or v_lead, false) then
    raise exception 'only the Organizer or the Role lead can delegate' using errcode = '42501';
  end if;
  -- The Organizer may pick anyone on the Team or themself; the lead only a joined holder of the Task's Role.
  v_target_ok := case
    when v_organizer then p_new_owner = v_me
      or exists (select 1 from public.role_members m where m.event_id = t.event_id and m.user_id = p_new_owner)
    else exists (
      select 1 from public.role_members m
      where m.role_id = t.role_id and m.user_id = p_new_owner and m.joined_at is not null
    )
  end;
  if not coalesce(v_target_ok, false) then
    raise exception 'that person cannot hold this task' using errcode = '42501';
  end if;

  perform public.tasks_assert_writable(t.event_id);
  perform public.tasks_check_expected(p_task_id, p_expected);
  select * into t from public.tasks where id = p_task_id;
  if t.lifecycle <> 'active' or t.obsolete or t.status = 'done' then
    raise exception 'task_not_active' using errcode = '22023';
  end if;
  if t.owner_user_id is not distinct from p_new_owner then
    return t.updated_at;
  end if;

  update public.tasks
  set owner_user_id = p_new_owner, delegated_at = now(),
      accepted_at = case when p_new_owner = v_me then now() end
  where id = p_task_id
  returning updated_at into v_updated_at;
  insert into public.task_assignment_log (task_id, from_user, to_user, by_user, kind)
  values (p_task_id, t.owner_user_id, p_new_owner, v_me, 'delegated');
  if p_new_owner = v_me then
    insert into public.task_assignment_log (task_id, from_user, to_user, by_user, kind)
    values (p_task_id, null, v_me, v_me, 'accepted');
  end if;

  if p_new_owner <> v_me and exists (
    select 1 from public.events e where e.id = t.event_id and e.published_at is not null
  ) then
    perform public.notifications_emit(
      t.event_id, 'task_assigned', p_task_id, array[row('user', p_new_owner)::public.recipient_spec]
    );
  end if;
  return v_updated_at;
end;
$$;

-- Same columns as in 20261104120000_tasks_status.sql, plus accepted and stale_unaccepted at the end.
create or replace view public.task_state with (security_invoker = true) as
select
  t.id, t.event_id, t.role_id,
  t.owner_user_id is not null as is_delegated,
  t.owner_user_id is null as is_pending,
  b.first_id is not null as blocked,
  b.first_id as blocked_by,
  greatest(b.open_count - 1, 0) as blocked_by_count,
  case when t.lifecycle = 'active' and not t.obsolete and t.status <> 'done' then w.waiting_count else 0 end
    as blocks_count,
  o.days is not null as overdue,
  o.days as overdue_days,
  t.owner_user_id is not null and t.accepted_at is not null as accepted,
  coalesce(
    t.lifecycle = 'active' and not t.obsolete and t.status <> 'done' and t.accepted_at is null
      and t.delegated_at < now() - interval '48 hours',
    false
  ) as stale_unaccepted
from public.tasks t
left join public.events ev on ev.id = t.event_id
cross join lateral (
  select (array_agg(o.id order by o.deadline, o.id))[1] as first_id, count(*) as open_count
  from public.task_dependencies d join public.tasks o on o.id = d.depends_on_id
  where d.task_id = t.id and o.lifecycle = 'active' and not o.obsolete and o.status <> 'done'
) b
cross join lateral (
  select count(*) as waiting_count
  from public.task_dependencies d join public.tasks x on x.id = d.task_id
  where d.depends_on_id = t.id and x.lifecycle = 'active' and not x.obsolete and x.status <> 'done'
) w
cross join lateral (
  select case when t.lifecycle = 'active' and not t.obsolete and t.status <> 'done'
    then public.tasks_overdue_days(t.deadline, ev.time_zone) end as days
) o;
