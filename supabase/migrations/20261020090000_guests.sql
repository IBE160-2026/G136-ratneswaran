-- Story 2.9: add guests by hand (FR-5, AD-1, AD-2, AD-3, AD-19). The guests module owns both tables.

-- Epic 7 adds user_id and identified with its own policies.
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  -- No control characters, line breaks included: names reach email headers later.
  name text not null check (char_length(btrim(name)) between 1 and 200 and name !~ '[[:cntrl:]]'),
  created_at timestamptz not null default now(),
  -- Target of the composite key below, so a contact can never point at another Event's guest.
  unique (id, event_id)
);

-- The email lives apart from the name and stays readable only by the Organizer.
create table public.guest_contacts (
  guest_id uuid primary key,
  event_id uuid not null references public.events (id) on delete cascade,
  email text not null check (char_length(email) <= 254 and email like '%@%' and email !~ '[[:cntrl:]]'),
  foreign key (guest_id, event_id) references public.guests (id, event_id) on delete cascade
);

-- Backs the duplicate check when two tabs add the same email at once.
create unique index guest_contacts_event_email on public.guest_contacts (event_id, lower(email));

alter table public.guests enable row level security;
alter table public.guest_contacts enable row level security;

-- AD-19: no direct-edit columns. Rows come from guests_add; Story 2.10 adds edits.
revoke all on public.guests from public, anon, authenticated;
revoke all on public.guest_contacts from public, anon, authenticated;
grant select on public.guests to authenticated;
grant select on public.guest_contacts to authenticated;

-- is_organizer reads events, not guests, so these policies do not recurse. Epic 3 adds Role-holders.
create policy guests_select on public.guests
  for select to authenticated using (public.is_organizer(event_id));
create policy guest_contacts_select on public.guest_contacts
  for select to authenticated using (public.is_organizer(event_id));

-- AD-2/AD-5 mutation function: the Organizer adds a batch of {name, email} rows in one transaction.
-- An email already on the Event is skipped and returned, so a lost race reports a duplicate, not an error.
-- A row that breaks a CHECK aborts the whole batch (23514).
create function public.guests_add(p_event_id uuid, p_rows jsonb)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cancelled_at timestamptz;
  v_published_at timestamptz;
  v_ends_at timestamptz;
  v_row jsonb;
  v_guest_id uuid;
  v_skipped text[] := '{}';
begin
  if not public.is_organizer(p_event_id) then
    raise exception 'only the Organizer can add guests' using errcode = '42501';
  end if;

  -- The same bound as MAX_GUEST_ROWS in src/modules/guests/schemas.ts.
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) > 200 then
    raise exception 'at most 200 guest rows per call' using errcode = '22023';
  end if;

  -- Concurrent adds to one Event run one at a time.
  select cancelled_at, published_at, ends_at into v_cancelled_at, v_published_at, v_ends_at
  from public.events where id = p_event_id for update;
  -- The rule of events_refuse_read_only, whose trigger cannot guard an INSERT.
  if v_cancelled_at is not null or (v_published_at is not null and v_ends_at < now()) then
    raise exception 'a cancelled or ended Event is read-only' using errcode = '55000';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    begin
      insert into public.guests (event_id, name)
      values (p_event_id, btrim(coalesce(v_row ->> 'name', '')))
      returning id into v_guest_id;
      insert into public.guest_contacts (guest_id, event_id, email)
      values (v_guest_id, p_event_id, btrim(coalesce(v_row ->> 'email', '')));
    exception when unique_violation then
      v_skipped := v_skipped || btrim(v_row ->> 'email');
    end;
  end loop;
  return v_skipped;
end;
$$;

revoke execute on function public.guests_add(uuid, jsonb) from public, anon;
grant execute on function public.guests_add(uuid, jsonb) to authenticated;

-- A draft that has guests is not blank, so events_create must not hand it out again.
create or replace function public.events_create()
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

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select e.id into v_event_id from public.events e
  where e.organizer_id = v_user_id
    and e.published_at is null
    and e.cancelled_at is null
    and e.name is null
    and e.description is null
    and e.event_type is null
    and e.starts_at is null
    and e.ends_at is null
    and e.time_zone is null
    and e.duration_minutes is null
    and e.guest_count is null
    and e.venue_known is null
    and e.rsvp_wanted is null
    and e.rsvp_due_date is null
    and e.guest_list_method is null
    and e.language is null
    and e.unknown_answers = '{}'
    and not exists (select 1 from public.roles r where r.event_id = e.id and r.toggled_at is not null)
    and not exists (select 1 from public.guests g where g.event_id = e.id)
  order by e.created_at desc
  limit 1;

  if v_event_id is null then
    insert into public.events (organizer_id) values (v_user_id) returning id into v_event_id;
    insert into public.roles (event_id, key)
    select v_event_id, k.key from unnest(enum_range(null::public.role_key)) as k (key);
  end if;
  return v_event_id;
end;
$$;
