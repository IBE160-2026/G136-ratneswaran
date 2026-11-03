-- Story 3.10 (owner decision): a Role-holder must not read other people's email, so the address moves
-- out of role_members into an Organizer-only table, after guest_contacts.
create table public.role_member_contacts (
  role_member_id uuid primary key references public.role_members (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  email text not null check (char_length(email) <= 254 and email like '%@%' and email !~ '[[:cntrl:]]')
);
create index role_member_contacts_event_id_idx on public.role_member_contacts (event_id);

insert into public.role_member_contacts (role_member_id, event_id, email)
select id, event_id, email from public.role_members;

alter table public.role_members drop column email;

alter table public.role_member_contacts enable row level security;
revoke all on public.role_member_contacts from public, anon, authenticated;
grant select on public.role_member_contacts to authenticated;
create policy role_member_contacts_select on public.role_member_contacts
  for select to authenticated using (public.is_organizer(event_id));

-- The two functions that read or wrote role_members.email now use the contacts table.
create or replace function public.events_invite_to_role(
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
    insert into public.role_members (event_id, role_id, user_id, name, joined_at, invited_by)
    values (v_event_id, p_role_id, v_user_id, btrim(p_name),
            case when v_joined_elsewhere then now() end, v_actor)
    on conflict (role_id, user_id) do nothing
    returning id into v_new_id;

    if v_new_id is null then
      select m.* into v_existing from public.role_members m
      where m.role_id = p_role_id and m.user_id = v_user_id
      for update;
    else
      insert into public.role_member_contacts (role_member_id, event_id, email)
      values (v_new_id, v_event_id, v_email);
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
    update public.invite_tokens set revoked_at = now()
    where user_id = v_user_id and role_id = p_role_id and kind = 'role_holder'
      and revoked_at is null and consumed_at is null;
    if exists (
      select 1 from public.role_members m
      where m.event_id = v_event_id and m.user_id = v_user_id and m.joined_at is not null
    ) then
      -- Joined another Role since this invitation: joined at once, no link.
      update public.role_members set name = btrim(p_name), joined_at = now() where id = v_existing.id;
      insert into public.role_membership_log (event_id, role_id, user_id, action, actor_id)
      values (v_event_id, p_role_id, v_user_id, 'joined', v_actor);
      return query select 'added'::text, null::text;
      return;
    end if;
    update public.role_members set name = btrim(p_name) where id = v_existing.id;
  end if;

  v_token := public.invite_tokens_create(v_event_id, 'role_holder', v_user_id, p_role_id);
  insert into public.role_membership_log (event_id, role_id, user_id, action, actor_id)
  values (v_event_id, p_role_id, v_user_id, 'invited', v_actor);
  return query select 'invited'::text, v_token;
end;
$$;

create or replace function public.events_invite_preview(p_token text)
returns table (
  status text,
  event_id uuid,
  event_name text,
  role_key public.role_key,
  name text,
  email text,
  has_account boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_found record;
  v_member public.role_members;
begin
  select l.* into v_found from public.invite_tokens_lookup(p_token) l;

  if v_found.status = 'valid' and v_found.kind = 'role_holder' then
    select m.* into v_member from public.role_members m
    where m.role_id = v_found.role_id and m.user_id = v_found.user_id and m.joined_at is null;
    if v_member.id is not null then
      return query
      select 'valid'::text, v_member.event_id, e.name, r.key, v_member.name,
        (select c.email from public.role_member_contacts c where c.role_member_id = v_member.id),
        exists (
          select 1 from auth.users u
          where u.id = v_member.user_id and coalesce(u.encrypted_password, '') <> ''
            and (u.raw_app_meta_data ->> 'password_pending') is distinct from 'true'
        )
          or exists (select 1 from auth.identities i where i.user_id = v_member.user_id and i.provider <> 'email')
      from public.events e, public.roles r
      where e.id = v_member.event_id and r.id = v_member.role_id;
      return;
    end if;
  end if;

  return query select
    case when v_found.status in ('used', 'expired') then v_found.status
         when v_found.status = 'valid' and v_found.kind = 'role_holder' then 'used'
         else 'invalid' end,
    null::uuid, null::text, null::public.role_key, null::text, null::text, null::boolean;
end;
$$;
