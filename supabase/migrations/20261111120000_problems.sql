-- Story 4.8: Problem flag (FR-8, AD-2, AD-3, AD-5, AD-7, AD-11, AD-19).
-- A Problem is a flag beside status, never a status. The tasks module owns the table; writes only through
-- the two functions below. Notes never leave the database: the notification carries ids only.

create table public.problems (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  raised_by uuid references auth.users (id) on delete set null,
  note text not null check (note = btrim(note) and char_length(note) between 1 and 500),
  raised_at timestamptz not null default clock_timestamp(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  resolution_note text check (resolution_note is null or (resolution_note = btrim(resolution_note) and char_length(resolution_note) between 1 and 500)),
  -- resolved_by is also nulled by the user-delete FK action, so only the other two are tied to resolved_at.
  check (resolved_at is not null or (resolved_by is null and resolution_note is null))
);

create unique index problems_one_open_per_task on public.problems (task_id) where resolved_at is null;
create index problems_task_id_idx on public.problems (task_id, raised_at);

alter table public.problems enable row level security;

revoke all on public.problems from public, anon, authenticated;
grant select on public.problems to authenticated;

-- The policy reads tasks as the caller, so RLS on tasks decides who sees the Problems.
create policy problems_select on public.problems
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = problems.task_id));

-- AD-2 mutation function. Returns the id of the open Problem (the existing one on a repeat).
create function public.tasks_report_problem(p_task_id uuid, p_note text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tasks;
  v_me uuid := (select auth.uid());
  v_allowed boolean;
  v_id uuid;
  v_recipients public.recipient_spec[];
begin
  select * into t from public.tasks where id = p_task_id;
  if found then
    v_allowed := public.is_organizer(t.event_id) or public.is_role_lead(t.role_id)
      or coalesce(t.owner_user_id = v_me, false);
  end if;
  if not found or not coalesce(v_allowed, false) then
    raise exception 'only the owner, the Role lead or the Organizer can report a problem' using errcode = '42501';
  end if;

  perform public.tasks_assert_writable(t.event_id);
  if t.lifecycle <> 'active' or t.obsolete then
    raise exception 'task_not_active' using errcode = '22023';
  end if;

  select id into v_id from public.problems where task_id = p_task_id and resolved_at is null;
  if found then
    return v_id;
  end if;

  insert into public.problems (task_id, raised_by, note)
  values (p_task_id, v_me, btrim(coalesce(p_note, '')))
  returning id into v_id;

  if exists (select 1 from public.events e where e.id = t.event_id and e.published_at is not null) then
    select array_agg(row('user', u.id)::public.recipient_spec) into v_recipients
    from (
      select e.organizer_id as id from public.events e where e.id = t.event_id
      union
      select m.user_id from public.role_members m
      where m.role_id = t.role_id and m.is_lead and m.joined_at is not null and m.user_id is not null
    ) u
    where u.id <> v_me;
    if v_recipients is not null then
      perform public.notifications_emit(t.event_id, 'problem_reported', v_id, v_recipients);
    end if;
  end if;
  return v_id;
end;
$$;

revoke execute on function public.tasks_report_problem(uuid, text) from public, anon;
grant execute on function public.tasks_report_problem(uuid, text) to authenticated;

create function public.tasks_resolve_problem(p_task_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tasks;
  v_me uuid := (select auth.uid());
  v_allowed boolean;
begin
  select * into t from public.tasks where id = p_task_id;
  if found then
    v_allowed := public.is_organizer(t.event_id) or public.is_role_lead(t.role_id)
      or coalesce(t.owner_user_id = v_me, false);
  end if;
  if not found or not coalesce(v_allowed, false) then
    raise exception 'only the owner, the Role lead or the Organizer can resolve a problem' using errcode = '42501';
  end if;

  perform public.tasks_assert_writable(t.event_id);
  update public.problems
  set resolved_at = clock_timestamp(), resolved_by = v_me, resolution_note = nullif(btrim(p_note), '')
  where task_id = p_task_id and resolved_at is null;
end;
$$;

revoke execute on function public.tasks_resolve_problem(uuid, text) from public, anon;
grant execute on function public.tasks_resolve_problem(uuid, text) to authenticated;

-- Same columns as in 20261105140000_task_state_obsolete.sql, plus has_problem at the end.
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
  ) as stale_unaccepted,
  t.obsolete,
  not t.obsolete and exists (
    select 1 from public.problems p where p.task_id = t.id and p.resolved_at is null
  ) as has_problem
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
