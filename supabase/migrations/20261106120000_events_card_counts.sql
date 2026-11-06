-- Story 5.5: one grouped read of every visible Event's card counts, under the viewer's own RLS.
create index tasks_event_owner_idx on public.tasks (event_id, owner_user_id);

-- Same scope and Needs you / At risk rules as classifyDashboard (src/modules/tasks/dashboard.ts).
create function public.events_card_counts()
returns table (
  event_id uuid, open_count integer, new_count integer,
  overdue_count integer, need_you_count integer, at_risk_count integer
)
language sql stable security invoker set search_path = ''
as $$
  with live as (
    select
      t.event_id, s.overdue, s.blocked, s.stale_unaccepted, t.status,
      coalesce(t.owner_user_id = (select auth.uid()), false) as owned,
      coalesce(t.owner_user_id = (select auth.uid()), false) and t.accepted_at is null as unaccepted,
      public.is_organizer(t.event_id) or exists (
        select 1 from public.role_members m
        where m.role_id = t.role_id and m.user_id = (select auth.uid()) and m.is_lead and m.joined_at is not null
      ) as manages
    from public.tasks t
    join public.task_state s on s.id = t.id
    join public.roles r on r.id = t.role_id and r.active
    where t.lifecycle = 'active' and not t.obsolete and t.status <> 'done'
  ), scoped as (
    select *, (overdue or (stale_unaccepted and manages) or unaccepted) as needs
    from live where manages or owned
  )
  select
    event_id,
    (count(*) filter (where owned))::integer,
    (count(*) filter (where unaccepted))::integer,
    (count(*) filter (where overdue))::integer,
    (count(*) filter (where needs))::integer,
    (count(*) filter (where not needs and (status = 'waiting_external' or blocked)))::integer
  from scoped
  group by event_id;
$$;

revoke execute on function public.events_card_counts() from public, anon;
grant execute on function public.events_card_counts() to authenticated;
