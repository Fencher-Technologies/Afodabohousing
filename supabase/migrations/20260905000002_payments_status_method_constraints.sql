-- Port of backend/migrations/019_fix_payments_status_constraint.sql, which
-- lives only in backend/migrations and was never mirrored here, so a database
-- provisioned from the supabase/ set alone still carries the original
-- constraints from 001_initial_schema and rejects status='confirmed' and
-- payment_method='mobile_money'. Idempotent.

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('pending','confirmed','completed','failed','refunded','rejected'));
ALTER TABLE public.payments ALTER COLUMN status SET DEFAULT 'confirmed';
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('cash','bank','mobile_money','bank_transfer','credit_card','check','other'));
