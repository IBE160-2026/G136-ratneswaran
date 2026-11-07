-- Story 7.3: RSVP (FR-6, AD-2, AD-3, AD-5, AD-17, AD-19). One row per guest, written only by
-- guests_submit_rsvp, which derives the guest from auth.uid() and the Event.

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null unique,
  -- Set by the function; lets policies use is_organizer without reading guests.
  event_id uuid not null references public.events (id) on delete cascade,
  attending boolean not null,
  plus_one boolean not null default false,
  plus_one_name text not null default '' check (char_length(plus_one_name) <= 80),
  other_needs text not null default '' check (char_length(other_needs) <= 500),
  -- The first answer, never changed.
  answered_at timestamptz not null default clock_timestamp(),
  -- clock_timestamp, not now(): the AD-17 token must differ between two writes of one transaction.
  updated_at timestamptz not null default clock_timestamp(),
  foreign key (guest_id, event_id) references public.guests (id, event_id) on delete cascade,
  -- A No carries no plus-one and no text; a name needs a plus-one.
  constraint rsvps_no_clears check (
    attending or (not plus_one and plus_one_name = '' and other_needs = '')
  ),
  constraint rsvps_name_needs_plus_one check (plus_one or plus_one_name = '')
);

create index rsvps_event_id_idx on public.rsvps (event_id);

alter table public.rsvps enable row level security;

-- AD-19: no direct-edit columns. Rows come from guests_submit_rsvp. Story 7.7 adds the Role-holder policy.
revoke all on public.rsvps from public, anon, authenticated;
grant select on public.rsvps to authenticated;

create policy rsvps_select on public.rsvps
  for select to authenticated using (public.is_organizer(event_id) or public.is_guest_self(guest_id));

-- A Guest reads their Event (name, date, time zone, due date, cancellation note), as Role-holders do.
-- Inline on guests.user_id, as AD-3 asks of the table a helper reads; a published Event only.
create policy events_select_guest on public.events
  for select to authenticated
  using (
    published_at is not null
    and exists (
      select 1 from public.guests g where g.event_id = events.id and g.user_id = (select auth.uid())
    )
  );

-- AD-2/AD-5 mutation function. Takes no guest or user id: the caller's own guest row is found by
-- Event and auth.uid(). Anything but a Guest of a published Event gets one refusal that reveals nothing.
create function public.guests_submit_rsvp(p_event_id uuid, p_answers jsonb, p_expected_updated_at timestamptz default null)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest public.guests;
  v_event public.events;
  v_row public.rsvps;
  v_attending boolean;
  v_plus_one boolean;
  v_name text;
  v_needs text;
  v_bad constant text := '[\u0001-\u001f\u007f-\u009f  ]';
  v_now timestamptz := clock_timestamp();
begin
  select g.* into v_guest from public.guests g
  where g.event_id = p_event_id and g.user_id = auth.uid() for update;
  select e.* into v_event from public.events e where e.id = p_event_id;
  if v_guest.id is null or v_event.published_at is null then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  -- The rule of guests_add.
  if v_event.cancelled_at is not null or v_event.ends_at < now() then
    raise exception 'a cancelled or ended Event is read-only' using errcode = '55000';
  end if;

  if jsonb_typeof(p_answers) is distinct from 'object'
    or jsonb_typeof(p_answers -> 'attending') is distinct from 'boolean'
    or jsonb_typeof(coalesce(p_answers -> 'plus_one', 'false'::jsonb)) <> 'boolean'
    or jsonb_typeof(coalesce(p_answers -> 'plus_one_name', '""'::jsonb)) <> 'string'
    or jsonb_typeof(coalesce(p_answers -> 'other_needs', '""'::jsonb)) <> 'string' then
    raise exception 'invalid answers' using errcode = '22023';
  end if;
  v_attending := (p_answers ->> 'attending')::boolean;
  v_plus_one := coalesce((p_answers ->> 'plus_one')::boolean, false);
  v_name := btrim(coalesce(p_answers ->> 'plus_one_name', ''));
  v_needs := btrim(replace(coalesce(p_answers ->> 'other_needs', ''), E'\r\n', E'\n'));
  if char_length(v_name) > 80 or char_length(v_needs) > 500
    or v_name ~ v_bad or replace(v_needs, E'\n', '') ~ v_bad then
    raise exception 'invalid answers' using errcode = '22023';
  end if;
  -- A No after a Yes clears the plus-one and the texts in this same statement.
  if not v_attending then
    v_plus_one := false;
  end if;
  if not v_plus_one then
    v_name := '';
  end if;
  if not v_attending then
    v_needs := '';
  end if;

  select r.* into v_row from public.rsvps r where r.guest_id = v_guest.id;
  if v_row.id is null then
    if p_expected_updated_at is not null then
      raise exception 'concurrent_edit' using errcode = '40001';
    end if;
    insert into public.rsvps (guest_id, event_id, attending, plus_one, plus_one_name, other_needs,
      answered_at, updated_at)
    values (v_guest.id, p_event_id, v_attending, v_plus_one, v_name, v_needs, v_now, v_now)
    returning * into v_row;
    return v_row.updated_at;
  end if;

  -- A double submit or a second tab with the same answers changes nothing.
  if (v_row.attending, v_row.plus_one, v_row.plus_one_name, v_row.other_needs)
    is not distinct from (v_attending, v_plus_one, v_name, v_needs) then
    return v_row.updated_at;
  end if;

  -- The row lock makes a second writer wait, then fail on the new updated_at.
  if p_expected_updated_at is distinct from v_row.updated_at then
    raise exception 'concurrent_edit' using errcode = '40001';
  end if;
  update public.rsvps
  set attending = v_attending, plus_one = v_plus_one, plus_one_name = v_name, other_needs = v_needs,
    updated_at = v_now
  where id = v_row.id returning updated_at into v_now;
  return v_now;
end;
$$;

revoke execute on function public.guests_submit_rsvp(uuid, jsonb, timestamptz) from public, anon;
grant execute on function public.guests_submit_rsvp(uuid, jsonb, timestamptz) to authenticated;
