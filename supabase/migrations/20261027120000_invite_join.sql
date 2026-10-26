-- Story 3.7: join through the invitation link (FR-1, AD-3, AD-4, AD-5, AD-19).

-- AD-5 system function: finds a token by hash and gives its one status. Ids come back for every token
-- found (callers decide what to reveal); an unknown token has none.
create function public.invite_tokens_lookup(p_token text)
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
  v_status text := 'valid';
begin
  select t.* into v_token from public.invite_tokens t
  where t.token_hash = sha256(convert_to(p_token, 'UTF8'));

  if v_token.id is null then
    return query select 'invalid'::text, null::uuid, null::uuid, null::public.invite_kind, null::uuid, null::uuid;
    return;
  end if;

  select e.ends_at, e.cancelled_at into v_ends_at, v_cancelled_at from public.events e where e.id = v_token.event_id;
  if v_token.revoked_at is not null or v_token.consumed_at is not null then
    v_status := 'used';
  elsif v_cancelled_at is not null or v_ends_at < now() then
    v_status := 'expired';
  end if;

  return query select v_status, v_token.id, v_token.event_id, v_token.kind, v_token.user_id, v_token.role_id;
end;
$$;

revoke execute on function public.invite_tokens_lookup(text) from public, anon, authenticated;

-- 3.5's validate on top of the lookup, so the status rule exists once. A mismatch and an unknown token
-- still look the same (AD-4), and ids still come back only when valid.
create or replace function public.invite_tokens_validate(p_token text, p_kind public.invite_kind, p_event_id uuid)
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
  v_found record;
begin
  select l.* into v_found from public.invite_tokens_lookup(p_token) l;

  if v_found.token_id is null or v_found.kind is distinct from p_kind or v_found.event_id is distinct from p_event_id then
    return query select 'invalid'::text, null::uuid, null::uuid, null::public.invite_kind, null::uuid, null::uuid;
  elsif v_found.status <> 'valid' then
    return query select v_found.status, null::uuid, null::uuid, null::public.invite_kind, null::uuid, null::uuid;
  else
    return query select v_found.status, v_found.token_id, v_found.event_id, v_found.kind, v_found.user_id, v_found.role_id;
  end if;
end;
$$;

-- AD-5 system function: what /invite may show for a token. Only a valid Role invitation with a pending
-- membership reveals anything, and then only its own invitee. has_account: the invitee can already sign in
-- (a password, or an identity from Google or GitHub), so they log in instead of verifying a code. Auth gives
-- a user created without a password a random one nobody knows, so inviteToRole marks that user with
-- app_metadata password_pending (only the secret key writes app_metadata), cleared once they choose one.
create function public.events_invite_preview(p_token text)
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
      select 'valid'::text, v_member.event_id, e.name, r.key, v_member.name, v_member.email,
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

revoke execute on function public.events_invite_preview(text) from public, anon, authenticated;

-- AD-5 system function (token exchange): attaches the invited user's pending membership and consumes the
-- token. Called by the server with the secret key and the session's user id. The one identity check: the
-- user is the token's own user and has a confirmed email. A second call by the same user after a join
-- answers joined again. Statuses: joined (with the Event), invalid, used, expired, mismatch.
create function public.events_join_role(p_token text, p_user_id uuid)
returns table (status text, event_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_token public.invite_tokens;
  v_status text;
  v_member_id uuid;
begin
  select t.* into v_token from public.invite_tokens t
  where t.token_hash = sha256(convert_to(p_token, 'UTF8'))
  for update;

  if v_token.id is null or v_token.kind <> 'role_holder' then
    return query select 'invalid'::text, null::uuid;
    return;
  end if;

  if v_token.consumed_at is not null and v_token.user_id = p_user_id and exists (
    select 1 from public.role_members m
    where m.role_id = v_token.role_id and m.user_id = p_user_id and m.joined_at is not null
  ) then
    return query select 'joined'::text, v_token.event_id;
    return;
  end if;

  select l.status into v_status from public.invite_tokens_lookup(p_token) l;
  if v_status <> 'valid' then
    return query select v_status, null::uuid;
    return;
  end if;

  if v_token.user_id is distinct from p_user_id or not exists (
    select 1 from auth.users u where u.id = p_user_id and u.email_confirmed_at is not null
  ) then
    return query select 'mismatch'::text, null::uuid;
    return;
  end if;

  update public.role_members set joined_at = now()
  where role_id = v_token.role_id and user_id = p_user_id and joined_at is null
  returning id into v_member_id;
  if v_member_id is null then
    -- The invitation was withdrawn without its link; nothing to join.
    return query select 'used'::text, null::uuid;
    return;
  end if;

  update public.invite_tokens set consumed_at = now() where id = v_token.id;
  -- A Role ends guest-only access (AD-4).
  perform public.invite_tokens_revoke_for_user(p_user_id);
  insert into public.role_membership_log (event_id, role_id, user_id, action, actor_id)
  values (v_token.event_id, v_token.role_id, p_user_id, 'joined', p_user_id);
  return query select 'joined'::text, v_token.event_id;
end;
$$;

revoke execute on function public.events_join_role(text, uuid) from public, anon, authenticated;

-- A joined member sees the Event. events is the table is_organizer reads, so this compares
-- role_members.user_id with auth.uid() directly instead of calling a helper (AD-3).
create policy events_select_member on public.events
  for select to authenticated
  using (exists (
    select 1 from public.role_members m
    where m.event_id = events.id and m.user_id = (select auth.uid()) and m.joined_at is not null
  ));

-- Backfill for invitees 3.6 created before this story: unconfirmed, with Auth's random password and no
-- password_pending, they would read as an account and fail the join. Confirm them (no one has used the
-- account: never signed in, no provider identity) and mark them, as inviteToRole now does at creation.
-- confirmation_sent_at is null keeps out a self signUp nobody confirmed: its password was chosen by
-- whoever signed up, so confirming it would hand them the account.
update auth.users u
set email_confirmed_at = coalesce(u.email_confirmed_at, now()),
  raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || '{"password_pending": true}'::jsonb
where u.last_sign_in_at is null
  and u.confirmation_sent_at is null
  and exists (select 1 from public.role_members m where m.user_id = u.id and m.joined_at is null)
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider <> 'email');
