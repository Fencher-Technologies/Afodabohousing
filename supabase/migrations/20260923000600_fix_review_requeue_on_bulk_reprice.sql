-- Restore the listings the currency conversion knocked off the site, and
-- stop it happening again.
--
-- WHAT WENT WRONG
--
-- Migration 20260923000500 divided every property's monthly_rent by the
-- exchange rate. The property review trigger added in 20260923000300 treats
-- a rent change as a material edit and pushes the listing back into the
-- review queue; public listings are gated on review_status = 'approved'.
--
-- So all 24 listings went to 'pending' in one statement and the website
-- showed no properties at all. The rent had not actually changed; only the
-- currency it was quoted in had.
--
-- THE FIX
--
-- Two parts. First, every listing's review state is restored from the
-- snapshot taken before the conversion, so each one returns to exactly what
-- it was rather than being blanket-approved.
--
-- Second, the trigger learns to sit out a maintenance operation. The rule
-- itself is right: a manager quietly changing their price should be
-- re-reviewed. What is wrong is applying it to a bulk re-denomination. The
-- trigger now honours a session flag that only a migration would set:
--
--   set local axis.skip_review_requeue = 'on';
--
-- It is session-scoped and resets with the transaction, so it cannot leak
-- into ordinary application traffic.
--
-- Verified in a rolled-back transaction: an ordinary rent change still
-- requeues, the same change under the flag does not, and a later edit once
-- the flag is cleared requeues again.

create or replace function public.trg_property_review_reset()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    new.review_status := coalesce(new.review_status, 'pending');
    new.submitted_for_review_at := now();
    new.reviewed_at := null;
    new.reviewed_by := null;
    return new;
  end if;

  -- A maintenance operation (bulk re-pricing, a currency conversion, a
  -- backfill) leaves the listing's review state exactly as it found it.
  if coalesce(current_setting('axis.skip_review_requeue', true), 'off') = 'on' then
    return new;
  end if;

  if new.review_status is distinct from old.review_status then
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
$function$;

-- Put every listing back exactly as the conversion found it.
set local axis.skip_review_requeue = 'on';

update public.properties p set
  review_status           = b.snapshot->>'review_status',
  reviewed_at             = nullif(b.snapshot->>'reviewed_at','')::timestamptz,
  reviewed_by             = nullif(b.snapshot->>'reviewed_by','')::uuid,
  review_notes            = nullif(b.snapshot->>'review_notes',''),
  submitted_for_review_at = nullif(b.snapshot->>'submitted_for_review_at','')::timestamptz
from public.currency_conversion_backup b
where b.table_name = 'properties' and b.row_id = p.id;
