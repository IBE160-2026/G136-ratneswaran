-- Story 2.1: Events and Organizer-only access (AD-2, AD-3, AD-5, AD-19).
create table public.events (
  id uuid primary key default gen_random_uuid(),
  -- Set only by events_create from auth.uid(). Cascade so deleting an auth user removes their Events (AD-11).
  -- The cascade skips events_delete, so account deletion must run the Event purge itself.
  organizer_id uuid not null references auth.users (id) on delete cascade,
  name text check (char_length(btrim(name)) between 1 and 200),
  starts_at timestamptz,
  ends_at timestamptz,
  time_zone text,
  language text check (language in ('nb', 'en')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  -- A draft may be incomplete; a published Event may not.
  constraint events_publishable check (
    published_at is null
    or (
      name is not null
      and starts_at is not null
      and ends_at is not null
      and time_zone is not null
      and language is not null
      and starts_at < ends_at
    )
  )
);

create index events_organizer_id_idx on public.events (organizer_id);

alter table public.events enable row level security;

-- AD-19: name is the only direct-edit column here. Later stories grant their own columns;
-- every other write goes through an AD-2 function.
revoke all on public.events from public, anon, authenticated;
grant select on public.events to authenticated;
grant update (name) on public.events to authenticated;

-- These policies match organizer_id directly (an allowed AD-3 input) and must not call
-- is_organizer: it is security invoker and reads events, so it would recurse under RLS.
-- is_organizer is for the tables that reference events.
create policy events_select on public.events
  for select to authenticated using (organizer_id = (select auth.uid()));
create policy events_update on public.events
  for update to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

-- AD-3 helper: true when the caller organizes the Event.
create function public.is_organizer(p_event_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.events
    where id = p_event_id and organizer_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_organizer(uuid) from public, anon;
grant execute on function public.is_organizer(uuid) to authenticated;

-- AD-2/AD-5 mutation function: takes no arguments, so the caller cannot choose the Organizer.
create function public.events_create()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
begin
  if v_user_id is null then
    raise exception 'events_create requires a signed-in user' using errcode = '42501';
  end if;

  insert into public.events (organizer_id) values (v_user_id) returning id into v_event_id;
  return v_event_id;
end;
$$;

revoke execute on function public.events_create() from public, anon;
grant execute on function public.events_create() to authenticated;
