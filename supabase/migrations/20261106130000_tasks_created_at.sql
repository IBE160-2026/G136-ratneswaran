-- Story 5.6: the Timeline bar-start rule needs the day a Task was created (AD-13). Read-only to clients:
-- only the column-level update grants on tasks apply, and this column is not among them.
alter table public.tasks add column created_at timestamptz not null default clock_timestamp();

-- Existing rows: the best known moment is their last change. The user triggers (read-only guard, updated_at
-- touch) are off so the backfill neither fails nor moves updated_at.
alter table public.tasks disable trigger user;
update public.tasks set created_at = updated_at;
alter table public.tasks enable trigger user;
