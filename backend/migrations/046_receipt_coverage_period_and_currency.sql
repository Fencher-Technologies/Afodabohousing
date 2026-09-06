-- 1. Receipt coverage period.
-- Receipts recorded "Rent coverage: 90 days" but never the dates that span,
-- so a tenant paying 1 Apr for three months had no 30 Jun end date anywhere
-- on the receipt. Stored as a snapshot alongside the other frozen values so a
-- reissued receipt always shows the period as it was at the time of payment.
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS coverage_start_date DATE,
  ADD COLUMN IF NOT EXISTS coverage_end_date DATE;

UPDATE public.receipts
   SET coverage_start_date = payment_date,
       coverage_end_date   = payment_date + (coverage_days || ' days')::interval
 WHERE coverage_days IS NOT NULL
   AND payment_date IS NOT NULL
   AND coverage_end_date IS NULL;

-- 2. Currency chain.
-- properties.rent_currency already existed (default UGX) and the mobile create
-- /edit screens already wrote it, but it stopped there: leases and payments had
-- no currency at all, so ReceiptService's payment.get("currency") always fell
-- through to the 'UGX' default and every receipt read UGX regardless of how the
-- property was listed.
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'UGX';

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'UGX';

UPDATE public.leases l
   SET currency = COALESCE(p.rent_currency, 'UGX')
  FROM public.properties p
 WHERE p.id = l.property_id
   AND l.currency = 'UGX'
   AND COALESCE(p.rent_currency, 'UGX') <> 'UGX';

UPDATE public.payments pay
   SET currency = l.currency
  FROM public.leases l
 WHERE l.id = pay.lease_id
   AND pay.currency = 'UGX'
   AND l.currency <> 'UGX';
