-- Story 4.5: delegate a Task (FR-8, AD-2, AD-3, AD-7, AD-19).
-- Core counts delegation as accepted at once; Story 4.6 changes that. The notifications_emit stub below keeps
-- its final signature so Story 3.1 only replaces the body.

create type public.recipient_spec as (kind text, id uuid);

create table public.task_assignment_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  from_user uuid references auth.users (id) on delete set null,
  to_user uuid references auth.users (id) on delete set null,
  by_user uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('delegated', 'accepted', 'released')),
  created_at timestamptz not null default clock_timestamp()
);

create index task_assignment_log_task_id_idx on public.task_assignment_log (task_id, created_at);
create index task_assignment_log_from_user_idx on public.task_assignment_log (from_user);
create index task_assignment_log_to_user_idx on public.task_assignment_log (to_user);
create index task_assignment_log_by_user_idx on public.task_assignment_log (by_user);

alter table public.task_assignment_log enable row level security;

revoke all on public.task_assignment_log from public, anon, authenticated;
grant select on public.task_assignment_log to authenticated;

-- The policy reads tasks as the caller, so RLS on tasks decides who sees the log.
create policy task_assignment_log_select on public.task_assignment_log
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_assignment_log.task_id));

-- Append-only; the only update that passes is the user-delete FK action nulling a user column.
create function public.task_assignment_log_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.id, new.task_id, new.kind, new.created_at) is not distinct from (old.id, old.task_id, old.kind, old.created_at)
     and (new.from_user is null or new.from_user is not distinct from old.from_user)
     and (new.to_user is null or new.to_user is not distinct from old.to_user)
     and (new.by_user is null or new.by_user is not distinct from old.by_user) then
    return new;
  end if;
  raise exception 'assignment log is append-only' using errcode = '42501';
end;
$$;

revoke execute on function public.task_assignment_log_guard() from public, anon, authenticated;

create trigger task_assignment_log_guard before update on public.task_assignment_log
  for each row execute function public.task_assignment_log_guard();

-- No-op stub (AD-7): Story 3.1 builds the outbox behind this signature.
create function public.notifications_emit(
  p_event_id uuid,
  p_kind text,
  p_subject_ref uuid,
  p_recipients public.recipient_spec[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  null;
end;
$$;

revoke execute on function public.notifications_emit(uuid, text, uuid, public.recipient_spec[])
  from public, anon, authenticated;

create function public.tasks_delegate(p_task_id uuid, p_new_owner uuid, p_expected timestamptz)
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
  set owner_user_id = p_new_owner, delegated_at = now(), accepted_at = now()
  where id = p_task_id
  returning updated_at into v_updated_at;
  insert into public.task_assignment_log (task_id, from_user, to_user, by_user, kind)
  values (p_task_id, t.owner_user_id, p_new_owner, v_me, 'delegated');

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

revoke execute on function public.tasks_delegate(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.tasks_delegate(uuid, uuid, timestamptz) to authenticated;
