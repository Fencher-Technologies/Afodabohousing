-- ──────────────────────────────────────────────────────────────
-- Coverage-first accounting — frozen rent rate per payment
--
-- Rules (kept in sync with backend/services/crud.py):
--   * frozen_monthly_rent captures the lease's monthly_rent at the
--     moment a rent payment becomes confirmed/completed, so later
--     rent edits never revalue historical coverage (FIFO).
--   * Only confirmed/completed RENT payments carry coverage;
--     deposits, maintenance, late fees, etc. keep coverage NULL.
--   * Backfill uses the lease's CURRENT monthly_rent because
--     pre-existing payments were written under the current rate.
-- ──────────────────────────────────────────────────────────────

-- 1. Frozen rent rate per payment (whole currency units, INTEGER)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS frozen_monthly_rent INTEGER;

-- 2. Backfill for existing confirmed/completed rent payments
UPDATE public.payments p
SET frozen_monthly_rent = CAST(NULLIF(l.monthly_rent, 0) AS INTEGER)
FROM public.leases l
WHERE p.lease_id = l.id
  AND p.status IN ('confirmed', 'completed')
  AND p.payment_type = 'rent'
  AND l.monthly_rent > 0
  AND p.frozen_monthly_rent IS NULL;
-- 3. Index
CREATE INDEX IF NOT EXISTS idx_payments_frozen_monthly_rent ON public.payments(frozen_monthly_rent);
