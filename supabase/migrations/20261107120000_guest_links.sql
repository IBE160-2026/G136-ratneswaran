-- Story 7.1: personal guest link (FR-6, AD-3, AD-4, AD-5, AD-19). Each guest gets a passwordless auth user
-- (created by the server with the secret key) and one active guest token, re-derivable while it is active.

-- Guests module: who the guest is, and when they first opened their link.
alter table public.guests
  add column user_id uuid references auth.users (id) on delete set null,
  add column first_opened_at timestamptz,
  add constraint guests_event_user unique (event_id, user_id);
create index guests_user_id_idx on public.guests (user_id);

-- A guest reads their own row. is_guest_of/is_guest_self read guests, so this compares directly (AD-3).
create policy guests_select_self on public.guests
  for select to authenticated using (user_id = (select auth.uid()));

-- AD-3 helpers for the guest-side tables of later stories.
create function public.is_guest_of(p_event_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.guests where event_id = p_event_id and user_id = (select auth.uid())
  );
$$;

create function public.is_guest_self(p_guest_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.guests where id = p_guest_id and user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_guest_of(uuid) from public, anon;
grant execute on function public.is_guest_of(uuid) to authenticated;
revoke execute on function public.is_guest_self(uuid) from public, anon;
grant execute on function public.is_guest_self(uuid) to authenticated;

-- The key guest tokens are derived from. Whoever reads the vault already holds the secret key, so a link
-- that can be copied again exposes nothing new; a dump without the vault reveals no link.
select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'guest_link_key',
  'Story 7.1: HMAC key for personal guest links'
);

-- Events module: at most one active guest token per guest identity on an Event.
create unique index invite_tokens_one_active_guest on public.invite_tokens (event_id, user_id)
  where kind = 'guest' and revoked_at is null;

-- AD-5 system function: the guest token of a token id, HMAC-SHA256 as unpadded base64url (43 chars).
create function public.invite_tokens_guest_token(p_token_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_key text;
begin
  select s.decrypted_secret into v_key from vault.decrypted_secrets s where s.name = 'guest_link_key';
  if v_key is null then
    raise exception 'guest_link_key missing' using errcode = '55000';
  end if;
  return translate(encode(extensions.hmac(p_token_id::text, v_key, 'sha256'), 'base64'), '+/=', '-_');
end;
$$;

revoke execute on function public.invite_tokens_guest_token(uuid) from public, anon, authenticated;

-- AD-5 system function: revokes every guest token of a user on one Event.
create function public.invite_tokens_revoke_guest(p_event_id uuid, p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.invite_tokens set revoked_at = now()
  where event_id = p_event_id and user_id = p_user_id and kind = 'guest' and revoked_at is null;
$$;

revoke execute on function public.invite_tokens_revoke_guest(uuid, uuid) from public, anon, authenticated;

-- AD-5 system function: the active guest token, created when there is none (after revoking all on renew).
-- The caller serialises concurrent calls (guests_copy_link locks the guest row); the partial unique index
-- refuses a second active token if one ever slips past.
create function public.invite_tokens_guest_link(p_event_id uuid, p_user_id uuid, p_renew boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_renew then
    perform public.invite_tokens_revoke_guest(p_event_id, p_user_id);
  end if;
  select t.id into v_id from public.invite_tokens t
  where t.event_id = p_event_id and t.user_id = p_user_id and t.kind = 'guest' and t.revoked_at is null;
  if v_id is null then
    v_id := gen_random_uuid();
    insert into public.invite_tokens (id, event_id, kind, token_hash, user_id, created_by)
    values (v_id, p_event_id, 'guest',
      sha256(convert_to(public.invite_tokens_guest_token(v_id), 'UTF8')), p_user_id, auth.uid());
  end if;
  return public.invite_tokens_guest_token(v_id);
end;
$$;

revoke execute on function public.invite_tokens_guest_link(uuid, uuid, boolean)
  from public, anon, authenticated;

-- AD-4 revocation: a chosen password ends guest-only access. Clears the marker inviteToRole and
-- copyGuestLink set at creation, so the account reads as having a password everywhere.
create function public.invite_tokens_password_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) - 'password_pending';
  perform public.invite_tokens_revoke_for_user(new.id);
  return new;
end;
$$;

revoke execute on function public.invite_tokens_password_changed() from public, anon, authenticated;

create trigger invite_tokens_password_changed
  before update of encrypted_password on auth.users
  for each row
  when (new.encrypted_password is distinct from old.encrypted_password)
  execute function public.invite_tokens_password_changed();

-- AD-5 system function: guest-only means no usable password, no provider identity, no Role and no
-- organized Event. Decided here once, never in a policy.
create function public.guests_is_guest_only(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = p_user_id
      and not (coalesce(u.encrypted_password, '') <> ''
        and (u.raw_app_meta_data ->> 'password_pending') is distinct from 'true')
  )
    and not exists (select 1 from auth.identities i where i.user_id = p_user_id and i.provider <> 'email')
    and not exists (select 1 from public.role_members m where m.user_id = p_user_id)
    and not exists (select 1 from public.events e where e.organizer_id = p_user_id);
$$;

revoke execute on function public.guests_is_guest_only(uuid) from public, anon, authenticated;

-- AD-2/AD-5 mutation function: *Copy link* and *New link*. Returns the guest's one active token. P0002
-- when the guest's email has no auth user yet: the server creates it with the secret key and calls again.
create function public.guests_copy_link(p_guest_id uuid, p_renew boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest public.guests;
  v_read_only boolean;
  v_user_id uuid;
begin
  -- Concurrent copies of one guest run one at a time, so they find one user and one token.
  select g.* into v_guest from public.guests g where g.id = p_guest_id for update;
  if v_guest.id is null or not public.is_organizer(v_guest.event_id) then
    raise exception 'only the Organizer can share guest links' using errcode = '42501';
  end if;

  -- The rule of guests_add.
  select e.cancelled_at is not null or (e.published_at is not null and e.ends_at < now())
  into v_read_only from public.events e where e.id = v_guest.event_id;
  if v_read_only then
    raise exception 'a cancelled or ended Event is read-only' using errcode = '55000';
  end if;

  select u.id into v_user_id from auth.users u
  where lower(u.email) = (select lower(c.email) from public.guest_contacts c where c.guest_id = p_guest_id)
  limit 1;
  if v_user_id is null then
    raise exception 'no account for the email' using errcode = 'P0002';
  end if;

  if v_guest.user_id is distinct from v_user_id then
    if v_guest.user_id is not null then
      perform public.invite_tokens_revoke_guest(v_guest.event_id, v_guest.user_id);
    end if;
    update public.guests set user_id = v_user_id where id = p_guest_id;
  end if;

  -- New link ends a guest-only user's sessions too. An access token already issued stays valid until it
  -- expires (jwt_expiry, at most one hour); its refresh fails at once because the session row is gone.
  -- Someone with a real account keeps their sessions: none of them came from a link.
  if p_renew and public.guests_is_guest_only(v_user_id) then
    delete from auth.sessions where user_id = v_user_id;
  end if;

  return public.invite_tokens_guest_link(v_guest.event_id, v_user_id, p_renew);
end;
$$;

revoke execute on function public.guests_copy_link(uuid, boolean) from public, anon;
grant execute on function public.guests_copy_link(uuid, boolean) to authenticated;

-- AD-5 system function: what /invite may show for a token. Statuses: valid, revoked, cancelled, ended,
-- invalid, other_kind. A token without its guest row (removed guest, changed email) reads invalid, before
-- revoked, so a removed guest learns nothing; only revoked, cancelled and ended name the Organizer.
create function public.guests_link_preview(p_token text)
returns table (
  status text,
  event_id uuid,
  user_id uuid,
  guest_name text,
  event_name text,
  organizer_name text,
  cancellation_note text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_found record;
  v_guest public.guests;
  v_event public.events;
  v_organizer text;
begin
  select l.* into v_found from public.invite_tokens_lookup(p_token) l;
  if v_found.token_id is null then
    return query select 'invalid'::text, null::uuid, null::uuid, null::text, null::text, null::text, null::text;
    return;
  end if;
  if v_found.kind <> 'guest' then
    return query select 'other_kind'::text, null::uuid, null::uuid, null::text, null::text, null::text, null::text;
    return;
  end if;

  select g.* into v_guest from public.guests g
  where g.event_id = v_found.event_id and g.user_id = v_found.user_id;
  if v_guest.id is null then
    return query select 'invalid'::text, null::uuid, null::uuid, null::text, null::text, null::text, null::text;
    return;
  end if;

  select e.* into v_event from public.events e where e.id = v_found.event_id;
  select u.raw_user_meta_data ->> 'name' into v_organizer from auth.users u where u.id = v_event.organizer_id;

  if v_found.status = 'used' then
    return query select 'revoked'::text, null::uuid, null::uuid, null::text, null::text, v_organizer, null::text;
  elsif v_event.cancelled_at is not null then
    return query select 'cancelled'::text, v_event.id, null::uuid, v_guest.name, v_event.name, v_organizer,
      v_event.cancellation_note;
  elsif v_event.ends_at < now() then
    return query select 'ended'::text, v_event.id, null::uuid, v_guest.name, v_event.name, v_organizer, null::text;
  else
    return query select 'valid'::text, v_event.id, v_guest.user_id, v_guest.name, v_event.name, v_organizer,
      null::text;
  end if;
end;
$$;

revoke execute on function public.guests_link_preview(text) from public, anon, authenticated;

-- AD-5 system function (token exchange, *Continue*): a valid link becomes session for a guest-only user
-- (and records the first open) or sign_in for anyone else. user_id and email only for those two.
create function public.guests_open_link(p_token text)
returns table (
  status text,
  event_id uuid,
  user_id uuid,
  email text,
  guest_name text,
  event_name text,
  organizer_name text,
  cancellation_note text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_preview record;
  v_guest_only boolean;
begin
  select p.* into v_preview from public.guests_link_preview(p_token) p;
  if v_preview.status <> 'valid' then
    return query select v_preview.status, v_preview.event_id, null::uuid, null::text, v_preview.guest_name,
      v_preview.event_name, v_preview.organizer_name, v_preview.cancellation_note;
    return;
  end if;

  v_guest_only := public.guests_is_guest_only(v_preview.user_id);
  -- Continue is an open for both: the row reads Opened whether the guest gets a session or logs in.
  update public.guests g set first_opened_at = coalesce(g.first_opened_at, now())
  where g.event_id = v_preview.event_id and g.user_id = v_preview.user_id;
  return query select
    case when v_guest_only then 'session' else 'sign_in' end,
    v_preview.event_id, v_preview.user_id, u.email::text, v_preview.guest_name, v_preview.event_name,
    v_preview.organizer_name, null::text
  from auth.users u where u.id = v_preview.user_id;
end;
$$;

revoke execute on function public.guests_open_link(text) from public, anon, authenticated;

-- Story 2.10's edit: a changed email is another person, so the old identity loses the guest and its links.
create or replace function public.guests_update(p_guest_id uuid, p_name text, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest public.guests;
  v_cancelled_at timestamptz;
  v_published_at timestamptz;
  v_ends_at timestamptz;
begin
  -- Locked as guests_copy_link locks it, so a concurrent copy cannot re-attach the old user afterwards.
  select g.* into v_guest from public.guests g where g.id = p_guest_id for update;
  -- An unknown guest looks the same as someone else's, so ids cannot be probed.
  if v_guest.id is null or not public.is_organizer(v_guest.event_id) then
    raise exception 'only the Organizer can edit guests' using errcode = '42501';
  end if;

  select cancelled_at, published_at, ends_at into v_cancelled_at, v_published_at, v_ends_at
  from public.events where id = v_guest.event_id for update;
  -- The rule of guests_add.
  if v_cancelled_at is not null or (v_published_at is not null and v_ends_at < now()) then
    raise exception 'a cancelled or ended Event is read-only' using errcode = '55000';
  end if;

  if v_guest.user_id is not null and exists (
    select 1 from public.guest_contacts c
    where c.guest_id = p_guest_id and lower(c.email) <> lower(btrim(coalesce(p_email, '')))
  ) then
    perform public.invite_tokens_revoke_guest(v_guest.event_id, v_guest.user_id);
    update public.guests set user_id = null, first_opened_at = null where id = p_guest_id;
  end if;

  -- The CHECKs refuse bad data (23514) and the unique index another guest's email (23505).
  update public.guests set name = btrim(coalesce(p_name, '')) where id = p_guest_id;
  update public.guest_contacts set email = btrim(coalesce(p_email, '')) where guest_id = p_guest_id;
end;
$$;

-- Story 2.10's remove: the guest's links stop working with the row.
create or replace function public.guests_remove(p_guest_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guest public.guests;
  v_cancelled_at timestamptz;
  v_published_at timestamptz;
  v_ends_at timestamptz;
begin
  select g.* into v_guest from public.guests g where g.id = p_guest_id;
  if v_guest.id is null or not public.is_organizer(v_guest.event_id) then
    raise exception 'only the Organizer can remove guests' using errcode = '42501';
  end if;

  select cancelled_at, published_at, ends_at into v_cancelled_at, v_published_at, v_ends_at
  from public.events where id = v_guest.event_id for update;
  if v_cancelled_at is not null or (v_published_at is not null and v_ends_at < now()) then
    raise exception 'a cancelled or ended Event is read-only' using errcode = '55000';
  end if;

  if v_guest.user_id is not null then
    perform public.invite_tokens_revoke_guest(v_guest.event_id, v_guest.user_id);
  end if;
  delete from public.guests where id = p_guest_id;
end;
$$;
