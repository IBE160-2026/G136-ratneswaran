-- Story 3.5: invitation tokens and rules (AD-4, AD-5, AD-19, AD-21, NFR10).

create type public.invite_kind as enum ('guest', 'role_holder', 'shared_event');

-- Events module owns this table. Only the sha256 of a token is stored; validity (Event ended or cancelled)
-- is read from events at use, never copied here.
create table public.invite_tokens (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  kind public.invite_kind not null,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  user_id uuid references auth.users (id) on delete cascade,
  role_id uuid references public.roles (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  consumed_at timestamptz,
  check ((role_id is not null) = (kind = 'role_holder')),
  check ((user_id is null) = (kind = 'shared_event')),
  check (consumed_at is null or kind = 'role_holder')
);

create index invite_tokens_created_by_created_at_idx on public.invite_tokens (created_by, created_at);
create index invite_tokens_user_id_idx on public.invite_tokens (user_id);
create index invite_tokens_event_id_idx on public.invite_tokens (event_id);
create index invite_tokens_role_id_idx on public.invite_tokens (role_id);

-- No client access at all: no grants, no policies. service_role keeps its default grants.
alter table public.invite_tokens enable row level security;
revoke all on public.invite_tokens from public, anon, authenticated;

-- AD-5 system function: issues a token and returns it once as unpadded base64url (43 chars).
-- Callers (3.6 invite, Epic 7 guest links) authorise first; the creator is always auth.uid().
create function public.invite_tokens_create(
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
  v_creator uuid := auth.uid();
  v_token text;
begin
  if p_kind = 'role_holder' then
    -- Also refuses a call without a session, so the cap below always has a creator to count.
    if not public.is_organizer(p_event_id) then
      raise exception 'only the Organizer can invite to a Role' using errcode = '42501';
    end if;
    if not exists (select 1 from public.roles where id = p_role_id and event_id = p_event_id) then
      raise exception 'the Role belongs to another Event' using errcode = '22023';
    end if;

    -- At most 30 Role invitations per creator per 24 hours; the lock serialises concurrent creates.
    perform pg_advisory_xact_lock(hashtextextended('invite_tokens_cap:' || v_creator::text, 0));
    if (
      select count(*) from public.invite_tokens
      where created_by = v_creator and kind = 'role_holder' and created_at > now() - interval '24 hours'
    ) >= 30 then
      raise exception 'daily invitation cap reached' using errcode = '53400';
    end if;
  end if;

  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');

  insert into public.invite_tokens (event_id, kind, token_hash, user_id, role_id, created_by)
  values (p_event_id, p_kind, sha256(convert_to(v_token, 'UTF8')), p_user_id, p_role_id, v_creator);

  return v_token;
end;
$$;

revoke execute on function public.invite_tokens_create(uuid, public.invite_kind, uuid, uuid)
  from public, anon, authenticated;

-- AD-5 system function: lookup by hash, so timing never depends on the plaintext. Exactly one status;
-- ids only when valid. A mismatch and an unknown token look the same (AD-4).
create function public.invite_tokens_validate(p_token text, p_kind public.invite_kind, p_event_id uuid)
returns table (
  status text,
  token_id uuid,
  event_id uuid,
  kind public.invite_kind,
  user_id uuid,
  role_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_token public.invite_tokens;
  v_ends_at timestamptz;
  v_cancelled_at timestamptz;
begin
  select t.* into v_token from public.invite_tokens t
  where t.token_hash = sha256(convert_to(p_token, 'UTF8'));

  if v_token.id is null or v_token.kind is distinct from p_kind or v_token.event_id is distinct from p_event_id then
    return query select 'invalid'::text, null::uuid, null::uuid, null::public.invite_kind, null::uuid, null::uuid;
    return;
  end if;

  if v_token.revoked_at is not null or v_token.consumed_at is not null then
    return query select 'used'::text, null::uuid, null::uuid, null::public.invite_kind, null::uuid, null::uuid;
    return;
  end if;

  select e.ends_at, e.cancelled_at into v_ends_at, v_cancelled_at from public.events e where e.id = v_token.event_id;
  if v_cancelled_at is not null or v_ends_at < now() then
    return query select 'expired'::text, null::uuid, null::uuid, null::public.invite_kind, null::uuid, null::uuid;
    return;
  end if;

  return query select 'valid'::text, v_token.id, v_token.event_id, v_token.kind, v_token.user_id, v_token.role_id;
end;
$$;

revoke execute on function public.invite_tokens_validate(text, public.invite_kind, uuid)
  from public, anon, authenticated;

-- AD-5 system function: a user added to a Role loses their live guest links, in the caller's transaction.
create function public.invite_tokens_revoke_for_user(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.invite_tokens set revoked_at = now()
  where user_id = p_user_id and kind = 'guest' and revoked_at is null;
$$;

revoke execute on function public.invite_tokens_revoke_for_user(uuid) from public, anon, authenticated;
