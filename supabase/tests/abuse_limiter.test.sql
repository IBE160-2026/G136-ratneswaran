begin;
select plan(11);

set local role anon;

select ok(public.abuse_hit('signup_ip', repeat('a', 64), 2, 60), 'first call is allowed');
select ok(public.abuse_hit('signup_ip', repeat('a', 64), 2, 60), 'second call is allowed');
select ok(not public.abuse_hit('signup_ip', repeat('a', 64), 2, 60), 'third call over the limit is denied');
select ok(public.abuse_hit('signup_ip', repeat('b', 64), 2, 60), 'another key has its own counter');

select throws_ok(
  $$insert into public.abuse_counters values ('signup_ip', repeat('c', 64), now(), 5)$$,
  '42501', null, 'anon cannot insert a counter that starts above 1'
);
select throws_ok(
  $$update public.abuse_counters set hits = 1 where key_hash = repeat('a', 64)$$,
  '42501', null, 'anon cannot lower or reset a counter'
);
select throws_ok(
  $$update public.abuse_counters set bucket = 'signup_email'$$,
  '42501', null, 'anon cannot change anything but hits'
);
select throws_ok(
  $$delete from public.abuse_counters$$,
  '42501', null, 'anon cannot delete counters'
);

set local role authenticated;
select ok(public.abuse_hit('signup_email', repeat('d', 64), 1, 3600), 'authenticated is allowed');
select ok(not public.abuse_hit('signup_email', repeat('d', 64), 1, 3600), 'authenticated is denied over the limit');

reset role;
select ok(
  not has_function_privilege('public', 'public.abuse_hit(text,text,integer,integer)', 'execute'),
  'public has no execute on the limiter'
);

select * from finish();
rollback;
