-- Story 3.6: invite someone to a Role (FR-1, FR-2, AD-2, AD-3, AD-4, AD-5, AD-19).

-- Events module owns both tables. A row with joined_at null is a pending invitation.
create table public.role_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100 and name !~ '[[:cntrl:]]'),
  email text not null check (char_length(email) <= 254 and email like '%@%' and email !~ '[[:cntrl:]]'),
  joined_at timestamptz,
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (role_id, user_id)
);

create index role_members_event_id_idx on public.role_members (event_id);
create index role_members_user_id_idx on public.role_members (user_id);
create index role_members_invited_by_idx on public.role_members (invited_by);

-- Append-only access history. Ids only, never a name or email; rows outlive what they point at.
create table public.role_membership_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete set null,
  role_id uuid references public.roles (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('invited', 'joined', 'lead_changed', 'revoked')),
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default clock_timestamp()
);

create index role_membership_log_event_id_idx on public.role_membership_log (event_id, created_at);
create index role_membership_log_role_id_idx on public.role_membership_log (role_id);
create index role_membership_log_user_id_idx on public.role_membership_log (user_id);
create index role_membership_log_actor_id_idx on public.role_membership_log (actor_id);

alter table public.role_members enable row level security;
alter table public.role_membership_log enable row level security;

-- AD-19: no direct-edit columns. Rows change only through the events module's functions.
revoke all on public.role_members from public, anon, authenticated;
revoke all on public.role_membership_log from public, anon, authenticated;
grant select on public.role_members to authenticated;
grant select on public.role_membership_log to authenticated;

-- holds_role (3.8+) reads role_members, so its own policy compares user_id directly (AD-3).
create policy role_members_select on public.role_members
  for select to authenticated
  using (public.is_organizer(event_id) or user_id = (select auth.uid()));
create policy role_membership_log_select on public.role_membership_log
  for select to authenticated using (public.is_organizer(event_id));

-- AD-5 system function: at most 30 Role invitations per creator (auth.uid()) per 24 hours. The lock
-- serialises concurrent creates; it is held to the end of the caller's transaction.
create function public.invite_tokens_check_cap()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator uuid := auth.uid();
begin
  perform pg_advisory_xact_lock(hashtextextended('invite_tokens_cap:' || v_creator::text, 0));
  if (
    select count(*) from public.invite_tokens
    where created_by = v_creator and kind = 'role_holder' and created_at > now() - interval '24 hours'
  ) >= 30 then
    raise exception 'daily invitation cap reached' using errcode = '53400';
  end if;
end;
$$;

revoke execute on function public.invite_tokens_check_cap() from public, anon, authenticated;

-- 3.5's issuer, now counting through the shared helper so the cap rule lives in one place.
create or replace function public.invite_tokens_create(
  p_event_id uuid,
  p_kind public.invite_kind,
  p_user_id uuid default null,
  p_role_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if p_kind = 'role_holder' then
    -- Also refuses a call without a session, so the cap always has a creator to count.
    if not public.is_organizer(p_event_id) then
      raise exception 'only the Organizer can invite to a Role' using errcode = '42501';
    end if;
    if not exists (select 1 from public.roles where id = p_role_id and event_id = p_event_id) then
      raise exception 'the Role belongs to another Event' using errcode = '22023';
    end if;
    perform public.invite_tokens_check_cap();
  end if;

  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');

  insert into public.invite_tokens (event_id, kind, token_hash, user_id, role_id, created_by)
  values (p_event_id, p_kind, sha256(convert_to(v_token, 'UTF8')), p_user_id, p_role_id, auth.uid());

  return v_token;
end;
$$;

-- AD-2/AD-5 mutation function: the Organizer invites a person to a Role by email. It refuses everything it
-- can before it needs the person's auth user (P0002), so the Server Action creates a user only for an
-- invitation that will succeed. No user id is taken from the caller. Returns one status: invited (with the
-- link token, shown once), added (already joined another Role of this Event), member (already joined this
-- Role) or self (the Organizer's own email). p_replaces (Correct email) names a pending row of the same
-- Role; it is removed with its links in the same transaction, whatever the new address turns out to be.
create function public.events_invite_to_role(
  p_role_id uuid,
  p_name text,
  p_email text,
  p_replaces uuid default null
)
returns table (status text, token text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_actor uuid := auth.uid();
  v_event_id uuid;
  v_active boolean;
  v_read_only boolean;
  v_user_id uuid;
  v_email text := lower(btrim(p_email));
  v_existing public.role_members;
  v_replaced public.role_members;
  v_joined_elsewhere boolean;
  v_new_id uuid;
  v_token text;
begin
  -- An unknown Role id looks the same as another Organizer's.
  select r.event_id, r.active into v_event_id, v_active from public.roles r where r.id = p_role_id;
  if v_event_id is null or not public.is_organizer(v_event_id) then
    raise exception 'only the Organizer can invite to a Role' using errcode = '42501';
  end if;
  if not v_active then
    raise exception 'the Role is not active' using errcode = '22023';
  end if;

  -- Same rule as events_refuse_read_only; an insert fires no update trigger, so it is repeated here.
  select e.cancelled_at is not null or (e.published_at is not null and e.ends_at < now())
  into v_read_only from public.events e where e.id = v_event_id;
  if v_read_only then
    raise exception 'a cancelled or ended Event is read-only' using errcode = '55000';
  end if;

  perform public.invite_tokens_check_cap();

  select u.id into v_user_id from auth.users u where lower(u.email) = v_email limit 1;
  if v_user_id is null then
    raise exception 'no account for the email' using errcode = 'P0002';
  end if;

  -- Correct email: the wrong address loses its row and its links.
  if p_replaces is not null then
    delete from public.role_members m
    where m.id = p_replaces and m.role_id = p_role_id and m.joined_at is null
    returning m.* into v_replaced;
    if v_replaced.id is null then
      raise exception 'stale_invitation' using errcode = 'P0001';
    end if;
    update public.invite_tokens set revoked_at = now()
    where user_id = v_replaced.user_id and role_id = p_role_id and kind = 'role_holder'
      and revoked_at is null and consumed_at is null;
    insert into public.role_membership_log (event_id, role_id, user_id, action, actor_id)
    values (v_event_id, p_role_id, v_replaced.user_id, 'revoked', v_actor);
  end if;

  if v_user_id = v_actor then
    return query select 'self'::text, null::text;
    return;
  end if;

  select m.* into v_existing from public.role_members m
  where m.role_id = p_role_id and m.user_id = v_user_id
  for update;

  if v_existing.id is null then
    v_joined_elsewhere := exists (
      select 1 from public.role_members m
      where m.event_id = v_event_id and m.user_id = v_user_id and m.joined_at is not null
    );
    -- A concurrent invite of the same person wins the insert; this one then takes the re-invite path.
    insert into public.role_members (event_id, role_id, user_id, name, email, joined_at, invited_by)
    values (v_event_id, p_role_id, v_user_id, btrim(p_name), v_email,
            case when v_joined_elsewhere then now() end, v_actor)
    on conflict (role_id, user_id) do nothing
    returning id into v_new_id;

    if v_new_id is null then
      select m.* into v_existing from public.role_members m
      where m.role_id = p_role_id and m.user_id = v_user_id
      for update;
    else
      -- A Role ends guest-only access (AD-4).
      perform public.invite_tokens_revoke_for_user(v_user_id);
      if v_joined_elsewhere then
        -- Already on the Team: joined at once, no link and no second account.
        insert into public.role_membership_log (event_id, role_id, user_id, action, actor_id)
        values (v_event_id, p_role_id, v_user_id, 'joined', v_actor);
        return query select 'added'::text, null::text;
        return;
      end if;
    end if;
  end if;

  if v_existing.joined_at is not null then
    return query select 'member'::text, null::text;
    return;
  end if;

  if v_existing.id is not null then
    -- New link: the earlier links for this Role stop working, and the row takes the name just entered.
    update public.role_members set name = btrim(p_name) where id = v_existing.id;
    update public.invite_tokens set revoked_at = now()
    where user_id = v_user_id and role_id = p_role_id and kind = 'role_holder'
      and revoked_at is null and consumed_at is null;
  end if;

  v_token := public.invite_tokens_create(v_event_id, 'role_holder', v_user_id, p_role_id);
  insert into public.role_membership_log (event_id, role_id, user_id, action, actor_id)
  values (v_event_id, p_role_id, v_user_id, 'invited', v_actor);
  return query select 'invited'::text, v_token;
end;
$$;

revoke execute on function public.events_invite_to_role(uuid, text, text, uuid) from public, anon;
grant execute on function public.events_invite_to_role(uuid, text, text, uuid) to authenticated;
