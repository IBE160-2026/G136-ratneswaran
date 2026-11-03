-- Story 4.1: the tasks table and Role-scoped access (AD-1, AD-2, AD-3, AD-19).
--
-- Privilege model for every later tasks_* function (Stories 4.2+): it is a mutation function, so it is
-- security definer with search_path = '', revoked from public and anon, granted to authenticated, and it
-- authorises from auth.uid() and the AD-3 helpers before any write. It takes no user id from its caller.
-- INSERT and DELETE are denied to authenticated; the only direct write is UPDATE (title, description).

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  role_id uuid not null references public.roles (id),
  title text not null check (char_length(btrim(title)) >= 1),
  description text,
  deadline date,
  owner_user_id uuid references auth.users (id) on delete set null,
  lifecycle text not null default 'active' check (lifecycle in ('proposed', 'active', 'dismissed')),
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'waiting_external', 'done')),
  accepted_at timestamptz,
  delegated_at timestamptz,
  obsolete boolean not null default false,
  confirmed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default clock_timestamp(),
  constraint tasks_active_needs_deadline check (lifecycle <> 'active' or deadline is not null)
);

create index tasks_event_id_idx on public.tasks (event_id);
create index tasks_role_id_idx on public.tasks (role_id);

alter table public.tasks enable row level security;

revoke all on public.tasks from public, anon, authenticated;
grant select on public.tasks to authenticated;
grant update (title, description) on public.tasks to authenticated;

-- The Organizer sees every Task. Anyone else sees a Task of their Role, or one they own, only while the
-- Event is published and the Role is active (events_select_member hides a cancelled Event from them).
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    public.is_organizer(event_id)
    or (
      (public.holds_role(role_id) or owner_user_id = (select auth.uid()))
      and exists (select 1 from public.events e where e.id = tasks.event_id and e.published_at is not null)
      and exists (select 1 from public.roles r where r.id = tasks.role_id and r.active)
    )
  );

-- Story 4.2 widens who may edit; until then only the Organizer does.
create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_organizer(event_id))
  with check (public.is_organizer(event_id));

create trigger tasks_read_only before update on public.tasks
  for each row execute function public.events_refuse_read_only();

create function public.tasks_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

revoke execute on function public.tasks_touch_updated_at() from public, anon, authenticated;

create trigger tasks_touch before update on public.tasks
  for each row when (old.* is distinct from new.*) execute function public.tasks_touch_updated_at();

-- Later tasks_* functions call these first. Both are security invoker, so RLS decides what they see.
create function public.tasks_assert_writable(p_event_id uuid)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.events
    where id = p_event_id and cancelled_at is null and not (published_at is not null and ends_at < now())
  ) then
    raise exception 'a cancelled or ended Event is read-only' using errcode = '55000';
  end if;
end;
$$;

create function public.tasks_check_expected(p_task_id uuid, p_expected timestamptz)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- The row lock makes a second writer wait, then fail on the new updated_at.
  perform 1 from public.tasks where id = p_task_id and updated_at = p_expected for update;
  if not found then
    raise exception 'concurrent_edit' using errcode = '40001';
  end if;
end;
$$;

revoke execute on function public.tasks_assert_writable(uuid) from public, anon;
grant execute on function public.tasks_assert_writable(uuid) to authenticated;
revoke execute on function public.tasks_check_expected(uuid, timestamptz) from public, anon;
grant execute on function public.tasks_check_expected(uuid, timestamptz) to authenticated;

-- Later stories extend this view with CREATE OR REPLACE VIEW.
create view public.task_state with (security_invoker = true) as
select
  id, event_id, role_id,
  owner_user_id is not null as is_delegated,
  owner_user_id is null as is_pending
from public.tasks;

revoke all on public.task_state from public, anon, authenticated;
grant select on public.task_state to authenticated;
