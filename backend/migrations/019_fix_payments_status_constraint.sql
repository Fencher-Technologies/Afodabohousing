-- Fix payments constraints to match the actual application + payment-gateway
-- vocabulary. The original constraints only allowed gateway-style values,
-- which made every manager-recorded payment (status='confirmed',
-- payment_method='mobile_money'|'bank') fail with:
--   "new row for relation \"payments\" violates check constraint
--    \"payments_status_check\" (23514)"
-- Run this with Run with RLS disabled / as the table owner (Supabase SQL editor).

-- 1) status: app uses confirmed/pending/rejected; gateways use
--    completed/failed/refunded. Allow all of them.
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN (
    'pending', 'confirmed', 'completed', 'failed', 'refunded', 'rejected'
  ));

-- A manager-recorded payment is immediately confirmed.
ALTER TABLE payments
  ALTER COLUMN status SET DEFAULT 'confirmed';

-- 2) payment_method: app uses cash/bank/mobile_money; gateways use
--    bank_transfer/credit_card/check/other. Allow all of them.
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_payment_method_check;

ALTER TABLE payments
  ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN (
    'cash', 'bank', 'mobile_money',
    'bank_transfer', 'credit_card', 'check', 'other'
  ));
