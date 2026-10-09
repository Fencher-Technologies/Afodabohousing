-- Quality assurance review (2 of 3: constraints and the queue index).

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'properties_review_status_check'
  ) then
    alter table public.properties
      add constraint properties_review_status_check
      check (review_status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'properties_reviewed_by_fkey'
  ) then
    alter table public.properties
      add constraint properties_reviewed_by_fkey
      foreign key (reviewed_by) references public.profiles(user_id) on delete set null;
  end if;
end $$;

-- The admin review queue reads pending, oldest first.
create index if not exists idx_properties_review_queue
  on public.properties (review_status, submitted_for_review_at)
  where review_status = 'pending';

comment on column public.properties.review_status is
  'QA gate: pending until the Axis team approves. Only approved listings are visible to the public.';
comment on column public.properties.review_notes is
  'Why a listing was rejected, shown to the house manager so they can correct it.';
