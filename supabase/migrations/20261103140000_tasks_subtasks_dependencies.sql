-- Story 4.3: Subtasks and dependencies (FR-7, AD-1, AD-2, AD-3, AD-13, AD-19).
-- Deliberate simplification: there is no status rollup. A parent may be Done while it has open Subtasks.
-- Mutation functions follow the privilege model in 20261103120000_tasks.sql.

alter table public.tasks add column parent_task_id uuid references public.tasks (id);
create index tasks_parent_task_id_idx on public.tasks (parent_task_id);

-- A Subtask shares its parent's Role and Event, the parent is active, and nesting stops at one level (AD-19).
-- Role and Event are not directly writable, so a Subtask never changes Role afterwards.
create function public.tasks_check_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_parent public.tasks%rowtype;
begin
  -- First, so a concurrent dismiss or parent change is seen by the reads below.
  perform pg_advisory_xact_lock(hashtextextended(new.event_id::text, 0));
  select * into v_parent from public.tasks where id = new.parent_task_id;
  if not found or v_parent.role_id <> new.role_id or v_parent.event_id <> new.event_id then
    raise exception 'parent_must_share_role' using errcode = '23514';
  end if;
  if v_parent.lifecycle <> 'active' then
    raise exception 'parent_not_active' using errcode = '23514';
  end if;
  if v_parent.parent_task_id is not null or new.parent_task_id = new.id then
    raise exception 'one_level_only' using errcode = '23514';
  end if;
  if exists (select 1 from public.tasks where parent_task_id = new.id) then
    raise exception 'has_subtasks' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.tasks_check_parent() from public, anon, authenticated;

create trigger tasks_check_parent before insert or update of parent_task_id on public.tasks
  for each row when (new.parent_task_id is not null) execute function public.tasks_check_parent();

create table public.task_dependencies (
  task_id uuid not null references public.tasks (id) on delete cascade,
  depends_on_id uuid not null references public.tasks (id) on delete cascade,
  primary key (task_id, depends_on_id),
  constraint task_dependencies_not_self check (task_id <> depends_on_id)
);

create index task_dependencies_depends_on_idx on public.task_dependencies (depends_on_id);

alter table public.task_dependencies enable row level security;

revoke all on public.task_dependencies from public, anon, authenticated;
grant select on public.task_dependencies to authenticated;

-- A row is visible when the caller can see both Tasks; the subqueries read tasks under the caller's RLS.
create policy task_dependencies_select on public.task_dependencies
  for select to authenticated
  using (
    exists (select 1 from public.tasks t where t.id = task_dependencies.task_id)
    and exists (select 1 from public.tasks t where t.id = task_dependencies.depends_on_id)
  );

-- Both Tasks in one Role and Event and active, and no cycle. The advisory lock on the Event serialises
-- concurrent inserts, so two opposite edges cannot both pass the walk (AD-19).
create function public.tasks_check_dependency()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_task public.tasks%rowtype;
  v_blocker public.tasks%rowtype;
begin
  select * into v_task from public.tasks where id = new.task_id;
  if not found then
    raise exception 'unknown_task' using errcode = '23514';
  end if;
  -- Before the lifecycle reads below; event_id never changes, so reading it first is safe.
  perform pg_advisory_xact_lock(hashtextextended(v_task.event_id::text, 0));
  select * into v_task from public.tasks where id = new.task_id;
  select * into v_blocker from public.tasks where id = new.depends_on_id;
  if not found or v_blocker.role_id <> v_task.role_id or v_blocker.event_id <> v_task.event_id then
    raise exception 'dependency_must_share_role' using errcode = '23514';
  end if;
  if v_task.lifecycle <> 'active' or v_blocker.lifecycle <> 'active' then
    raise exception 'dependency_needs_active_tasks' using errcode = '23514';
  end if;

  -- A new statement after the lock, so it sees what a concurrent writer committed meanwhile.
  if exists (
    with recursive walk (id) as (
      select d.depends_on_id from public.task_dependencies d where d.task_id = new.depends_on_id
      union
      select d.depends_on_id from public.task_dependencies d join walk w on d.task_id = w.id
    )
    select 1 from walk where id = new.task_id
  ) then
    raise exception 'dependency_cycle' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.tasks_check_dependency() from public, anon, authenticated;

create trigger tasks_check_dependency before insert on public.task_dependencies
  for each row execute function public.tasks_check_dependency();

-- Who may add Subtasks and dependencies to a Task: the Organizer, the lead of its Role, or the joined holder
-- who owns it. Only the definer functions below call this, so it is not granted to anyone.
create function public.tasks_may_link(p_task_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.tasks t
    where t.id = p_task_id
      and (
        public.is_organizer(t.event_id)
        or public.is_role_lead(t.role_id)
        or (t.owner_user_id = (select auth.uid()) and public.holds_role(t.role_id))
      )
  );
$$;

revoke execute on function public.tasks_may_link(uuid) from public, anon, authenticated;

-- Same as 20261103130000_tasks_create_edit.sql plus p_parent_id. With a parent the Role comes from the parent.
drop function public.tasks_create(uuid, uuid, text, text, date, integer);

create function public.tasks_create(
  p_id uuid,
  p_role_id uuid,
  p_title text,
  p_description text default null,
  p_deadline date default null,
  p_days_before integer default null,
  p_parent_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_role_id uuid;
  v_active boolean;
begin
  -- An unknown id looks the same as one the caller may not use.
  if p_parent_id is not null then
    select t.event_id, t.role_id into v_event_id, v_role_id from public.tasks t where t.id = p_parent_id;
    if v_event_id is null or not public.tasks_may_link(p_parent_id) then
      raise exception 'only the Organizer, the Role lead or the owner can add a Subtask' using errcode = '42501';
    end if;
    if p_role_id is not null and p_role_id <> v_role_id then
      raise exception 'parent_must_share_role' using errcode = '23514';
    end if;
  else
    v_role_id := p_role_id;
    select r.event_id into v_event_id from public.roles r where r.id = v_role_id;
    if v_event_id is null or not (public.is_organizer(v_event_id) or public.is_role_lead(v_role_id)) then
      raise exception 'only the Organizer or the Role lead can create a Task' using errcode = '42501';
    end if;
  end if;

  perform public.tasks_assert_writable(v_event_id);
  select r.active into v_active from public.roles r where r.id = v_role_id;
  if not v_active then
    raise exception 'role_inactive' using errcode = '22023';
  end if;

  -- A repeat call creates nothing and raises nothing, even if the parent has changed since.
  if exists (select 1 from public.tasks where id = p_id) then
    return;
  end if;

  insert into public.tasks (id, event_id, role_id, title, description, deadline, days_before, created_by, parent_task_id)
  values (
    p_id, v_event_id, v_role_id, btrim(p_title), nullif(btrim(p_description), ''),
    public.tasks_resolve_deadline(v_event_id, p_deadline, p_days_before), p_days_before, (select auth.uid()),
    p_parent_id
  )
  on conflict (id) do nothing;
end;
$$;

revoke execute on function public.tasks_create(uuid, uuid, text, text, date, integer, uuid) from public, anon;
grant execute on function public.tasks_create(uuid, uuid, text, text, date, integer, uuid) to authenticated;

-- A Subtask becomes a top-level Task of the same Role. A repeat returns before the expected check, because the
-- first call already moved updated_at.
create function public.tasks_promote_subtask(p_task_id uuid, p_expected timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_role_id uuid;
  v_parent_id uuid;
begin
  select t.event_id, t.role_id, t.parent_task_id into v_event_id, v_role_id, v_parent_id
  from public.tasks t where t.id = p_task_id;
  if v_event_id is null or not (public.is_organizer(v_event_id) or public.is_role_lead(v_role_id)) then
    raise exception 'only the Organizer or the Role lead can promote a Subtask' using errcode = '42501';
  end if;

  perform public.tasks_assert_writable(v_event_id);
  if v_parent_id is null then
    return;
  end if;
  perform public.tasks_check_expected(p_task_id, p_expected);

  update public.tasks set parent_task_id = null where id = p_task_id;
end;
$$;

-- Organizer only. A Subtask must be promoted first, and a Task with links stays in its Role, because
-- parents and dependencies never cross Roles. The new Role starts without an owner or acceptance.
create function public.tasks_move_to_role(p_task_id uuid, p_expected timestamptz, p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_role_id uuid;
  v_parent_id uuid;
  v_target_event uuid;
  v_target_active boolean;
begin
  select t.event_id, t.role_id, t.parent_task_id into v_event_id, v_role_id, v_parent_id
  from public.tasks t where t.id = p_task_id;
  if v_event_id is null or not public.is_organizer(v_event_id) then
    raise exception 'only the Organizer can move a Task to another Role' using errcode = '42501';
  end if;

  perform public.tasks_assert_writable(v_event_id);
  if v_role_id = p_role_id then
    return;
  end if;
  perform public.tasks_check_expected(p_task_id, p_expected);

  if v_parent_id is not null then
    raise exception 'promote_first' using errcode = '22023';
  end if;
  if exists (select 1 from public.tasks where parent_task_id = p_task_id)
    or exists (select 1 from public.task_dependencies where task_id = p_task_id or depends_on_id = p_task_id) then
    raise exception 'has_links' using errcode = '55006';
  end if;
  select r.event_id, r.active into v_target_event, v_target_active from public.roles r where r.id = p_role_id;
  if v_target_event is distinct from v_event_id or not v_target_active then
    raise exception 'target_role_unavailable' using errcode = '22023';
  end if;

  update public.tasks
  set role_id = p_role_id, owner_user_id = null, delegated_at = null, accepted_at = null
  where id = p_task_id;
end;
$$;

create function public.tasks_add_dependency(p_task_id uuid, p_depends_on_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
begin
  select t.event_id into v_event_id from public.tasks t where t.id = p_task_id;
  if v_event_id is null or not public.tasks_may_link(p_task_id) then
    raise exception 'only the Organizer, the Role lead or the owner can add a dependency' using errcode = '42501';
  end if;

  perform public.tasks_assert_writable(v_event_id);
  if exists (select 1 from public.task_dependencies where task_id = p_task_id and depends_on_id = p_depends_on_id) then
    return;
  end if;
  insert into public.task_dependencies (task_id, depends_on_id) values (p_task_id, p_depends_on_id);
end;
$$;

create function public.tasks_remove_dependency(p_task_id uuid, p_depends_on_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
begin
  select t.event_id into v_event_id from public.tasks t where t.id = p_task_id;
  if v_event_id is null or not public.tasks_may_link(p_task_id) then
    raise exception 'only the Organizer, the Role lead or the owner can remove a dependency' using errcode = '42501';
  end if;

  perform public.tasks_assert_writable(v_event_id);
  delete from public.task_dependencies where task_id = p_task_id and depends_on_id = p_depends_on_id;
end;
$$;

revoke execute on function public.tasks_promote_subtask(uuid, timestamptz) from public, anon;
grant execute on function public.tasks_promote_subtask(uuid, timestamptz) to authenticated;
revoke execute on function public.tasks_move_to_role(uuid, timestamptz, uuid) from public, anon;
grant execute on function public.tasks_move_to_role(uuid, timestamptz, uuid) to authenticated;
revoke execute on function public.tasks_add_dependency(uuid, uuid) from public, anon;
grant execute on function public.tasks_add_dependency(uuid, uuid) to authenticated;
revoke execute on function public.tasks_remove_dependency(uuid, uuid) from public, anon;
grant execute on function public.tasks_remove_dependency(uuid, uuid) to authenticated;

-- Same as in 20261103130000_tasks_create_edit.sql, plus the refusals at the marked site.
create or replace function public.tasks_set_lifecycle(p_task_id uuid, p_expected timestamptz, p_from text, p_to text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_role_id uuid;
  v_lifecycle text;
  v_parent_id uuid;
begin
  select t.event_id, t.role_id, t.lifecycle, t.parent_task_id into v_event_id, v_role_id, v_lifecycle, v_parent_id
  from public.tasks t where t.id = p_task_id;
  if v_event_id is null or not (public.is_organizer(v_event_id) or public.is_role_lead(v_role_id)) then
    raise exception 'only the Organizer or the Role lead can dismiss or restore a Task' using errcode = '42501';
  end if;

  perform public.tasks_assert_writable(v_event_id);
  if v_lifecycle = p_to then
    return;
  end if;
  if v_lifecycle <> p_from then
    raise exception 'wrong_lifecycle' using errcode = '22023';
  end if;
  -- Before the row lock, in the same order as the link triggers, so none can deadlock.
  perform pg_advisory_xact_lock(hashtextextended(v_event_id::text, 0));
  perform public.tasks_check_expected(p_task_id, p_expected);

  if p_to = 'dismissed' and (
    exists (select 1 from public.tasks c where c.parent_task_id = p_task_id and c.lifecycle = 'active')
    or exists (
      select 1 from public.task_dependencies d join public.tasks w on w.id = d.task_id
      where d.depends_on_id = p_task_id and w.lifecycle = 'active'
    )
  ) then
    raise exception 'has_open_children' using errcode = '55006';
  end if;
  if p_to = 'active' and v_parent_id is not null
    and not exists (select 1 from public.tasks p where p.id = v_parent_id and p.lifecycle = 'active') then
    raise exception 'parent_not_active' using errcode = '22023';
  end if;

  update public.tasks set lifecycle = p_to where id = p_task_id;
end;
$$;

-- Dependents wait only while the blocker is open (active, not obsolete, not Done), so Blocked is computed here
-- and never stored (AD-13). blocked_by is the open blocker with the earliest deadline. A dismissed, proposed or
-- obsolete Task blocks nothing, and a Task that is itself closed blocks nobody.
create or replace view public.task_state with (security_invoker = true) as
select
  t.id, t.event_id, t.role_id,
  t.owner_user_id is not null as is_delegated,
  t.owner_user_id is null as is_pending,
  b.first_id is not null as blocked,
  b.first_id as blocked_by,
  greatest(b.open_count - 1, 0) as blocked_by_count,
  case when t.lifecycle = 'active' and not t.obsolete and t.status <> 'done' then w.waiting_count else 0 end
    as blocks_count
from public.tasks t
cross join lateral (
  select (array_agg(o.id order by o.deadline, o.id))[1] as first_id, count(*) as open_count
  from public.task_dependencies d join public.tasks o on o.id = d.depends_on_id
  where d.task_id = t.id and o.lifecycle = 'active' and not o.obsolete and o.status <> 'done'
) b
cross join lateral (
  select count(*) as waiting_count
  from public.task_dependencies d join public.tasks x on x.id = d.task_id
  where d.depends_on_id = t.id and x.lifecycle = 'active' and not x.obsolete and x.status <> 'done'
) w;
