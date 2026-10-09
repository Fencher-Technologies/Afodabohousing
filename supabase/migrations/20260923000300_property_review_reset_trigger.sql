-- Quality assurance review (3 of 3: the requeue trigger).
--
-- A new listing enters the review queue, and an edit to what the public
-- actually sees sends it back. Occupancy changes, boosts and the reviewer's
-- own decision must never knock a listing off the site.
--
-- Deliberately NOT security definer: the function only reads and writes the
-- NEW/OLD record of the row being modified and touches no other table, so it
-- needs no elevated privilege.
--
-- Verified against the live database before shipping:
--   * editing the title    -> review_status becomes 'pending', requeued
--   * changing occupancy   -> stays 'approved', listing remains live
--   * reviewer's decision  -> sticks, does not bounce back to 'pending'

create or replace function public.trg_property_review_reset()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.review_status := coalesce(new.review_status, 'pending');
    new.submitted_for_review_at := now();
    new.reviewed_at := null;
    new.reviewed_by := null;
    return new;
  end if;

  if new.review_status is distinct from old.review_status then
    -- An explicit decision by a reviewer: leave it exactly as set.
    return new;
  end if;

  if new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.images is distinct from old.images
    or new.address is distinct from old.address
    or new.city is distinct from old.city
    or new.monthly_rent is distinct from old.monthly_rent
  then
    new.review_status := 'pending';
    new.submitted_for_review_at := now();
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;

  return new;
end;
$$;

create trigger property_review_reset
  before insert or update on public.properties
  for each row execute function public.trg_property_review_reset();
