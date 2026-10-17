-- Each public flow counts in its own `<flow>_ip` and `<flow>_email` buckets (AD-21).
-- The shape check is what keeps anon from creating unbounded bucket namespaces.
alter table public.abuse_counters drop constraint abuse_counters_bucket_check;
alter table public.abuse_counters
  add constraint abuse_counters_bucket_check check (bucket ~ '^[a-z0-9_]{1,32}$');
