-- AD-21: Postgres-backed counter for public routes. Security invoker, so RLS and the
-- column grants below are the whole boundary (no definer function, no secret key).
create table public.abuse_counters (
  bucket text not null check (bucket in ('signup_ip', 'signup_email')),
  key_hash text not null check (char_length(key_hash) = 64),
  window_start timestamptz not null,
  hits integer not null check (hits > 0),
  primary key (bucket, key_hash, window_start)
);

alter table public.abuse_counters enable row level security;

revoke all on public.abuse_counters from public, anon, authenticated;
grant select, insert on public.abuse_counters to anon, authenticated;
grant update (hits) on public.abuse_counters to anon, authenticated;

create policy abuse_counters_select on public.abuse_counters
  for select to anon, authenticated using (true);
create policy abuse_counters_insert on public.abuse_counters
  for insert to anon, authenticated with check (hits = 1);
create policy abuse_counters_update on public.abuse_counters
  for update to anon, authenticated using (true) with check (true);

-- A direct PostgREST update may only add one hit, never lower or reset a counter.
create function public.abuse_counters_guard_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.hits <> old.hits + 1 then
    raise exception 'abuse_counters hits may only grow by one' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger abuse_counters_guard_update
  before update on public.abuse_counters
  for each row execute function public.abuse_counters_guard_update();

-- True while the caller is within `p_max` hits per `p_window_seconds`; every call counts.
create function public.abuse_hit(p_bucket text, p_key_hash text, p_max integer, p_window_seconds integer)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  insert into public.abuse_counters as c (bucket, key_hash, window_start, hits)
  values (
    p_bucket,
    p_key_hash,
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds),
    1
  )
  on conflict (bucket, key_hash, window_start) do update set hits = c.hits + 1
  returning hits <= p_max;
$$;

revoke execute on function public.abuse_hit(text, text, integer, integer) from public;
grant execute on function public.abuse_hit(text, text, integer, integer) to anon, authenticated;
