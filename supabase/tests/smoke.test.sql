begin;
select plan(1);
select ok(true, 'pgTAP runs against local Supabase');
select * from finish();
rollback;
