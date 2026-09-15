-- Subscription limits were only ever expressed as English inside the
-- benefits JSON array ("List up to 3 properties"), so nothing could
-- enforce them. The product owner listed 6 properties on a 3-property
-- plan with no resistance.
--
-- NULL means unlimited. These columns are the source of truth for
-- enforcement; benefits remains display copy and must be kept in sync.

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS max_properties INTEGER,
  ADD COLUMN IF NOT EXISTS max_tenants    INTEGER;

COMMENT ON COLUMN subscription_plans.max_properties IS
  'Maximum active property listings. NULL = unlimited. Source of truth for enforcement; the benefits array is display copy only.';
COMMENT ON COLUMN subscription_plans.max_tenants IS
  'Maximum tenants. NULL = unlimited.';

UPDATE subscription_plans SET max_properties = 3,    max_tenants = 10   WHERE id = '1mo';
UPDATE subscription_plans SET max_properties = 5,    max_tenants = 20   WHERE id = '3mo';
UPDATE subscription_plans SET max_properties = 15,   max_tenants = NULL WHERE id = '6mo';
UPDATE subscription_plans SET max_properties = NULL, max_tenants = NULL WHERE id = '12mo';
