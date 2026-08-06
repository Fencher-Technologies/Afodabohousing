-- ──────────────────────────────────────────────────────────────
-- Rent day tracking — coverage-based, independent of tenancy dates
--
-- Rules (kept in sync with backend/services/crud.py helpers):
--   * 1 month = 30 days
--   * coverage_days = FLOOR(amount * 30 / monthly_rent)
--   * coverage_days is frozen when a payment becomes
--     confirmed/completed; later rent edits never re-compute it.
--   * rent_effective_date anchors the first coverage cycle. It is
--     manager-set once and is NOT derived from start_date/end_date.
-- ──────────────────────────────────────────────────────────────

-- 1. Anchor for the first rent coverage cycle (manager-set, once)
ALTER TABLE public.leases ADD COLUMN rent_effective_date DATE;

-- 2. Per-payment coverage, frozen at write time
ALTER TABLE public.payments ADD COLUMN coverage_days INTEGER;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_leases_rent_effective_date ON public.leases(rent_effective_date);
CREATE INDEX IF NOT EXISTS idx_payments_coverage_days ON public.payments(coverage_days);

-- 4. Backfill coverage_days for existing confirmed/completed payments
--    using the lease's CURRENT monthly_rent. Historical effective
--    dates are intentionally NOT derived; rent_effective_date stays
--    NULL until a manager sets it via the dedicated endpoint.
UPDATE public.payments p
SET coverage_days = CAST(FLOOR((p.amount * 30.0) / NULLIF(l.monthly_rent, 0)) AS INTEGER)
FROM public.leases l
WHERE p.lease_id = l.id
  AND p.status IN ('confirmed', 'completed')
  AND p.amount > 0
  AND l.monthly_rent > 0
  AND p.coverage_days IS NULL;
