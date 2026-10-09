-- Quality assurance review before a listing goes public (1 of 3: columns).
--
-- Every subscription plan already promises "Listings reviewed and approved by
-- our QA team", and the terms of service carry a Quality Assurance clause, but
-- nothing enforced it: a new property appeared publicly the moment it was
-- saved.
--
-- review_status is added with a default of 'approved' so every property that
-- exists today is backfilled as approved and nothing already public
-- disappears. The default then flips to 'pending' so new listings go through
-- review. Doing it this way needs no UPDATE over the live table.

alter table public.properties
  add column if not exists review_status text not null default 'approved';

alter table public.properties
  alter column review_status set default 'pending';

alter table public.properties
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid,
  add column if not exists review_notes text,
  add column if not exists submitted_for_review_at timestamptz;

-- The public listing query filters on review_status plus is_active.
create index if not exists idx_properties_public_listing
  on public.properties (review_status, is_active, created_at desc);
