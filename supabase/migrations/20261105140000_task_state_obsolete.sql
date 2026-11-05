-- Same columns as in 20261105120000_tasks_accept.sql, plus obsolete at the end (Story 4.9).
create or replace view public.task_state with (security_invoker = true) as
select
  t.id, t.event_id, t.role_id,
  t.owner_user_id is not null as is_delegated,
  t.owner_user_id is null as is_pending,
  b.first_id is not null as blocked,
  b.first_id as blocked_by,
  greatest(b.open_count - 1, 0) as blocked_by_count,
  case when t.lifecycle = 'active' and not t.obsolete and t.status <> 'done' then w.waiting_count else 0 end
    as blocks_count,
  o.days is not null as overdue,
  o.days as overdue_days,
  t.owner_user_id is not null and t.accepted_at is not null as accepted,
  coalesce(
    t.lifecycle = 'active' and not t.obsolete and t.status <> 'done' and t.accepted_at is null
      and t.delegated_at < now() - interval '48 hours',
    false
  ) as stale_unaccepted,
  t.obsolete
from public.tasks t
left join public.events ev on ev.id = t.event_id
cross join lateral (
  select (array_agg(o.id order by o.deadline, o.id))[1] as first_id, count(*) as open_count
  from public.task_dependencies d join public.tasks o on o.id = d.depends_on_id
  where d.task_id = t.id and o.lifecycle = 'active' and not o.obsolete and o.status <> 'done'
) b
cross join lateral (
  select count(*) as waiting_count
  from public.task_dependencies d join public.tasks x on x.id = d.task_id
  where d.depends_on_id = t.id and x.lifecycle = 'active' and not x.obsolete and x.status <> 'done'
) w
cross join lateral (
  select case when t.lifecycle = 'active' and not t.obsolete and t.status <> 'done'
    then public.tasks_overdue_days(t.deadline, ev.time_zone) end as days
) o;
