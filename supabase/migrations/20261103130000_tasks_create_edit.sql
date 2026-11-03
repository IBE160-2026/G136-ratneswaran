-- Story 4.2: create, edit and open a Task (FR-9, AD-1, AD-2, AD-3, AD-19).
-- Mutation functions below follow the privilege model in 20261103120000_tasks.sql. They authorise from
-- auth.uid(): the Organizer, or the joined lead of the Task's Role.

alter table public.tasks
  add column days_before smallint,
  add column show_on_guest_program boolean not null default false,
  add column guest_label text,
  add column guest_time time,
  add constraint tasks_days_before_range check (days_before is null or days_before between 0 and 365),
  add constraint tasks_guest_label_required
    check (not show_on_guest_program or char_length(btrim(coalesce(guest_label, ''))) >= 1),
  add constraint tasks_guest_label_length check (guest_label is null or char_length(guest_label) <= 80),
  add constraint tasks_title_length check (char_length(title) <= 120),
  add constraint tasks_description_length check (description is null or char_length(description) <= 2000);

-- Same style as holds_role: a joined lead of the Role. Security invoker, so RLS decides what it sees.
create function public.is_role_lead(p_role_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.role_members
    where role_id = p_role_id and user_id = (select auth.uid()) and joined_at is not null and is_lead
  );
$$;

revoke execute on function public.is_role_lead(uuid) from public, anon;
grant execute on function public.is_role_lead(uuid) to authenticated;

-- The Organizer and the lead of the Task's Role may edit; the trigger below keeps the guest program Organizer-only.
grant update (title, description, show_on_guest_program, guest_label, guest_time) on public.tasks to authenticated;

drop policy tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_organizer(event_id) or public.is_role_lead(role_id))
  with check (public.is_organizer(event_id) or public.is_role_lead(role_id));

-- Column grants cannot differ per user, so a trigger refuses a guest-program change by anyone but the Organizer.
create function public.tasks_guest_program_organizer_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (old.show_on_guest_program, old.guest_label, old.guest_time)
      is distinct from (new.show_on_guest_program, new.guest_label, new.guest_time)
    and not public.is_organizer(new.event_id) then
    raise exception 'only the Organizer can change the guest program' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.tasks_guest_program_organizer_only() from public, anon, authenticated;

create trigger tasks_guest_program_organizer before update on public.tasks
  for each row execute function public.tasks_guest_program_organizer_only();

-- A deadline is a date, or N days before the Event's start, read in the Event's time zone.
create function public.tasks_resolve_deadline(
  p_event_id uuid, p_deadline date, p_days_before integer
)
returns date
language plpgsql
stable
set search_path = ''
as $$
declare
  v_start date;
begin
  if p_days_before is null then
    if p_deadline is null then
      raise exception 'deadline_required' using errcode = '22023';
    end if;
    return p_deadline;
  end if;
  if p_days_before not between 0 and 365 then
    raise exception 'days_before_out_of_range' using errcode = '22023';
  end if;
  select (e.starts_at at time zone e.time_zone)::date into v_start from public.events e where e.id = p_event_id;
  if v_start is null then
    raise exception 'event_start_required' using errcode = '22023';
  end if;
  return v_start - p_days_before;
end;
$$;

revoke execute on function public.tasks_resolve_deadline(uuid, date, integer) from public, anon, authenticated;

-- AD-2 mutation function: the only creator of a Task. A repeat call with the same p_id creates nothing.
create function public.tasks_create(
  p_id uuid,
  p_role_id uuid,
  p_title text,
  p_description text default null,
  p_deadline date default null,
  p_days_before integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_active boolean;
begin
  -- An unknown Role id looks the same as another Event's.
  select r.event_id, r.active into v_event_id, v_active from public.roles r where r.id = p_role_id;
  if v_event_id is null or not (public.is_organizer(v_event_id) or public.is_role_lead(p_role_id)) then
    raise exception 'only the Organizer or the Role lead can create a Task' using errcode = '42501';
  end if;

  perform public.tasks_assert_writable(v_event_id);
  if not v_active then
    raise exception 'role_inactive' using errcode = '22023';
  end if;

  insert into public.tasks (id, event_id, role_id, title, description, deadline, days_before, created_by)
  values (
    p_id, v_event_id, p_role_id, btrim(p_title), nullif(btrim(p_description), ''),
    public.tasks_resolve_deadline(v_event_id, p_deadline, p_days_before), p_days_before, (select auth.uid())
  )
  on conflict (id) do nothing;
end;
$$;

create function public.tasks_set_deadline(
  p_task_id uuid,
  p_expected timestamptz,
  p_deadline date default null,
  p_days_before integer default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_role_id uuid;
  v_updated_at timestamptz;
begin
  select t.event_id, t.role_id into v_event_id, v_role_id from public.tasks t where t.id = p_task_id;
  if v_event_id is null or not (public.is_organizer(v_event_id) or public.is_role_lead(v_role_id)) then
    raise exception 'only the Organizer or the Role lead can change a deadline' using errcode = '42501';
  end if;

  perform public.tasks_assert_writable(v_event_id);
  perform public.tasks_check_expected(p_task_id, p_expected);

  -- A fixed date clears days_before, so a moved start no longer shifts it.
  update public.tasks
  set deadline = public.tasks_resolve_deadline(v_event_id, p_deadline, p_days_before),
      days_before = p_days_before
  where id = p_task_id
  returning updated_at into v_updated_at;
  -- The caller chains its next write on this value.
  return v_updated_at;
end;
$$;

-- Dismiss and restore share their rules; only their definer wrappers call this. A repeat returns before the expected check, because the first
-- call already moved updated_at. Nothing is hard-deleted.
create function public.tasks_set_lifecycle(p_task_id uuid, p_expected timestamptz, p_from text, p_to text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_role_id uuid;
  v_lifecycle text;
begin
  select t.event_id, t.role_id, t.lifecycle into v_event_id, v_role_id, v_lifecycle
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
  perform public.tasks_check_expected(p_task_id, p_expected);

  -- Story 4.3 refuses here while the Task has open Subtasks or dependents.

  update public.tasks set lifecycle = p_to where id = p_task_id;
end;
$$;

revoke execute on function public.tasks_set_lifecycle(uuid, timestamptz, text, text) from public, anon, authenticated;

create function public.tasks_dismiss(p_task_id uuid, p_expected timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  select public.tasks_set_lifecycle(p_task_id, p_expected, 'active', 'dismissed');
$$;

create function public.tasks_restore(p_task_id uuid, p_expected timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  select public.tasks_set_lifecycle(p_task_id, p_expected, 'dismissed', 'active');
$$;

revoke execute on function public.tasks_create(uuid, uuid, text, text, date, integer) from public, anon;
grant execute on function public.tasks_create(uuid, uuid, text, text, date, integer) to authenticated;
revoke execute on function public.tasks_set_deadline(uuid, timestamptz, date, integer) from public, anon;
grant execute on function public.tasks_set_deadline(uuid, timestamptz, date, integer) to authenticated;
revoke execute on function public.tasks_dismiss(uuid, timestamptz) from public, anon;
grant execute on function public.tasks_dismiss(uuid, timestamptz) to authenticated;
revoke execute on function public.tasks_restore(uuid, timestamptz) from public, anon;
grant execute on function public.tasks_restore(uuid, timestamptz) to authenticated;

-- System function (AD-5): called by events_update_schedule only. It moves only rows with days_before set,
-- only when the date differs, and never when the Event has lost its start. It emits no notification.
create function public.tasks_recalculate_deadlines(p_event_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.tasks t
  set deadline = (e.starts_at at time zone e.time_zone)::date - t.days_before
  from public.events e
  where e.id = t.event_id and t.event_id = p_event_id and t.days_before is not null
    and e.starts_at is not null and e.time_zone is not null
    -- A cancelled or ended Event is read-only (events_refuse_read_only); skip so the schedule save still succeeds.
    and e.cancelled_at is null and not (e.published_at is not null and e.ends_at < now())
    and t.deadline is distinct from (e.starts_at at time zone e.time_zone)::date - t.days_before;
$$;

revoke execute on function public.tasks_recalculate_deadlines(uuid) from public, anon, authenticated;

-- Same signature and behaviour as in 20261019190000_events_update_schedule.sql, plus the recalculation.
create or replace function public.events_update_schedule(
  p_event_id uuid,
  p_starts_local timestamp,
  p_ends_local timestamp,
  p_time_zone text,
  p_rsvp_due_date date,
  p_language text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_duration integer;
begin
  if not public.is_organizer(p_event_id) then
    raise exception 'only the Organizer can change the schedule' using errcode = '42501';
  end if;

  if p_time_zone is not null
    and not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    raise exception 'unknown time zone' using errcode = '22023';
  end if;
  if (p_starts_local is not null or p_ends_local is not null) and p_time_zone is null then
    raise exception 'a start or end time needs a time zone' using errcode = '22023';
  end if;

  perform 1 from public.events where id = p_event_id for update;

  v_starts_at := p_starts_local at time zone p_time_zone;
  v_ends_at := p_ends_local at time zone p_time_zone;
  -- Duration and end are one fact, so the questionnaire shows the same length. Rounding up keeps any
  -- length past 14 days out through the duration CHECK, and an end at or before the start fails it too.
  v_duration := ceil(extract(epoch from v_ends_at - v_starts_at) / 60)::integer;

  update public.events set
    starts_at = v_starts_at,
    ends_at = v_ends_at,
    time_zone = p_time_zone,
    rsvp_due_date = p_rsvp_due_date,
    language = p_language,
    duration_minutes = v_duration,
    -- A value it sets is no longer "Not sure yet".
    unknown_answers = array_remove(array_remove(array_remove(unknown_answers,
      case when v_starts_at is not null then 'starts_at' end),
      case when v_duration is not null then 'duration' end),
      case when p_rsvp_due_date is not null then 'rsvp_due_date' end)
  where id = p_event_id;

  -- The single place that recalculates resolved Task deadlines when starts_at changes (AD-13). It runs
  -- after the update because it reads the Event's new start and time zone.
  perform public.tasks_recalculate_deadlines(p_event_id);
end;
$$;
