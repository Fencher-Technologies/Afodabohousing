-- Add a column to persist the Pesapal order tracking id (OrderTrackingId)
-- so pending orders can be reconciled by polling GetTransactionStatus even
-- when the IPN webhook is delayed or lost.

ALTER TABLE public.manager_subscriptions
  ADD COLUMN IF NOT EXISTS pesapal_tracking_id TEXT;

ALTER TABLE public.property_boosts
  ADD COLUMN IF NOT EXISTS pesapal_tracking_id TEXT;