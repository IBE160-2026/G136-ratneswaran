-- Story 4.4: status, notes and Overdue (FR-8, AD-2, AD-3, AD-13, AD-19).
-- Mutation functions follow the privilege model in 20261103120000_tasks.sql. Overdue is computed in
-- tasks_overdue_days and the task_state view, never stored (AD-13). Blocked Tasks may change status.

create table public.status_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  changed_by uuid references auth.users (id) on delete set null,
  from_status text not null check (from_status in ('not_started', 'in_progress', 'waiting_external', 'done')),
  to_status text not null check (to_status in ('not_started', 'in_progress', 'waiting_external', 'done')),
  note text check (note is null or char_length(note) <= 500),
  note_removed_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);

create index status_history_task_id_idx on public.status_history (task_id, created_at);

alter table public.status_history enable row level security;

revoke all on public.status_history from public, anon, authenticated;
grant select on public.status_history to authenticated;

-- The policy reads tasks as the caller, so RLS on tasks decides who sees the history.
create policy status_history_select on public.status_history
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = status_history.task_id));

-- History is append-only. Two updates pass: removing a note (the function below) and the user-delete FK action.
create function public.status_history_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.id, new.task_id, new.from_status, new.to_status, new.note, new.note_removed_at, new.created_at)
       is not distinct from
       (old.id, old.task_id, old.from_status, old.to_status, old.note, old.note_removed_at, old.created_at)
     and new.changed_by is null then
    return new;
  end if;
  if new.note is null and new.note_removed_at is not null
     and (new.id, new.task_id, new.changed_by, new.from_status, new.to_status, new.created_at)
         is not distinct from
         (old.id, old.task_id, old.changed_by, old.from_status, old.to_status, old.created_at) then
    return new;
  end if;
  raise exception 'status history is append-only' using errcode = '42501';
end;
$$;

revoke execute on function public.status_history_guard() from public, anon, authenticated;

create trigger status_history_guard before update on public.status_history
  for each row execute function public.status_history_guard();

-- AD-2 mutation function. Returns the Task's updated_at for the caller to chain on.
create function public.tasks_set_status(
  p_task_id uuid,
  p_expected timestamptz,
  p_status text,
  p_note text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tasks;
  v_organizer boolean;
  v_lead boolean;
  v_owner boolean;
  v_note text := nullif(btrim(p_note), '');
  v_updated_at timestamptz;
begin
  select * into t from public.tasks where id = p_task_id;
  if found then
    v_organizer := public.is_organizer(t.event_id);
    v_lead := public.is_role_lead(t.role_id);
    v_owner := t.owner_user_id = (select auth.uid()) and public.holds_role(t.role_id);
  end if;
  if not found or not (v_organizer or v_lead or v_owner) then
    raise exception 'only the Organizer, the Role lead or the owner can set a status' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('not_started', 'in_progress', 'waiting_external', 'done') then
    raise exception 'unknown_status' using errcode = '22023';
  end if;

  perform public.tasks_assert_writable(t.event_id);
  perform public.tasks_check_expected(p_task_id, p_expected);
  if t.lifecycle <> 'active' or t.obsolete then
    raise exception 'task_not_active' using errcode = '22023';
  end if;
  -- Target 2: a delegated Task is accepted by its owner first. The lead and the Organizer are not held back.
  if not v_organizer and not v_lead and t.delegated_at is not null and t.accepted_at is null then
    raise exception 'accept_first' using errcode = '55007';
  end if;

  if p_status = t.status and v_note is null then
    return t.updated_at;
  end if;

  insert into public.status_history (task_id, changed_by, from_status, to_status, note)
  values (p_task_id, (select auth.uid()), t.status, p_status, v_note);

  if p_status = t.status then
    return t.updated_at;
  end if;
  update public.tasks set status = p_status where id = p_task_id returning updated_at into v_updated_at;
  return v_updated_at;
end;
$$;

-- Keeps the row and its time; only the text goes. A repeat is a no-op and the Task's updated_at does not move.
create function public.tasks_remove_status_note(p_history_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  h public.status_history;
  v_event_id uuid;
begin
  select * into h from public.status_history where id = p_history_id;
  if found then
    select event_id into v_event_id from public.tasks where id = h.task_id;
  end if;
  if not found or not (h.changed_by = (select auth.uid()) or public.is_organizer(v_event_id)) then
    raise exception 'only the author or the Organizer can remove a note' using errcode = '42501';
  end if;

  perform public.tasks_assert_writable(v_event_id);
  if h.note is null then
    return;
  end if;
  update public.status_history set note = null, note_removed_at = clock_timestamp() where id = p_history_id;
end;
$$;

-- Overdue starts at local midnight after the deadline day, read in the Event's time zone (null: UTC).
create function public.tasks_overdue_days(
  p_deadline date,
  p_time_zone text,
  p_at timestamptz default now()
)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when p_deadline is null then null
    when (p_at at time zone coalesce(p_time_zone, 'UTC')) >= (p_deadline + 1)::timestamp
      then greatest((p_at at time zone coalesce(p_time_zone, 'UTC'))::date - p_deadline, 1)
  end;
$$;

revoke execute on function public.tasks_set_status(uuid, timestamptz, text, text) from public, anon;
grant execute on function public.tasks_set_status(uuid, timestamptz, text, text) to authenticated;
revoke execute on function public.tasks_remove_status_note(uuid) from public, anon;
grant execute on function public.tasks_remove_status_note(uuid) to authenticated;
revoke execute on function public.tasks_overdue_days(date, text, timestamptz) from public, anon;
grant execute on function public.tasks_overdue_days(date, text, timestamptz) to authenticated;

-- Same columns as in 20261103140000_tasks_subtasks_dependencies.sql, plus overdue and overdue_days at the end.
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
  o.days as overdue_days
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
