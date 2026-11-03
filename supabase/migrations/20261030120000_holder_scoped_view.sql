-- Story 3.10: the Role-holder's scoped view (AD-3). Both helpers are security invoker and read
-- role_members, so a joined row of the caller is the only thing they can see through its own policy.
create function public.holds_role(p_role_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.role_members
    where role_id = p_role_id and user_id = (select auth.uid()) and joined_at is not null
  );
$$;

-- Same test for the whole Event. role_members_select needs it: an inline subquery on role_members
-- inside its own policy is "infinite recursion", a function call is not.
create function public.is_team_member(p_event_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.role_members
    where event_id = p_event_id and user_id = (select auth.uid()) and joined_at is not null
  );
$$;

revoke execute on function public.holds_role(uuid) from public, anon;
grant execute on function public.holds_role(uuid) to authenticated;
revoke execute on function public.is_team_member(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;

-- A joined holder reads the Team's rows of their Event; a pending invitee still reads only their own row.
drop policy role_members_select on public.role_members;
create policy role_members_select on public.role_members
  for select to authenticated
  using (
    public.is_organizer(event_id)
    or user_id = (select auth.uid())
    or public.is_team_member(event_id)
  );

drop policy roles_select on public.roles;
create policy roles_select on public.roles
  for select to authenticated
  using (public.is_organizer(event_id) or public.is_team_member(event_id));

-- A cancelled Event leaves the Team's lists; the Organizer keeps theirs through events_select_organizer.
drop policy events_select_member on public.events;
create policy events_select_member on public.events
  for select to authenticated
  using (
    cancelled_at is null
    and exists (
      select 1 from public.role_members m
      where m.event_id = events.id and m.user_id = (select auth.uid()) and m.joined_at is not null
    )
  );
