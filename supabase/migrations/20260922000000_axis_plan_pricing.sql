-- ── Axis subscription plans: Test / Essential / Business Class / Elite ─────────
-- UGX is authoritative (what reaches Pesapal); price_usd is the card price.
-- Plan ids are kept stable because manager_subscriptions.plan_id references
-- them and the mobile app types them ("1mo" | "3mo" | "6mo" | "12mo").
-- Idempotent: safe to re-run.

-- 1. Plan-included boosting, data-driven (NULL/0 = none).
ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS free_boost_days INTEGER;

COMMENT ON COLUMN subscription_plans.free_boost_days IS
  'Days of free boosting for every property the manager lists, counted from subscription start. NULL/0 = none.';

-- 2. Pricing, limits and display copy.
--    Benefits are display copy only; max_* columns are what gets enforced.
UPDATE subscription_plans SET
  name = 'Test', duration_days = 1, price_ugx = 500, price_usd = 0.14,
  max_properties = 3, max_tenants = 10, free_boost_days = NULL,
  sort_order = 0, popular = false, is_active = true,
  benefits = '["For testing payments only: lasts 1 day",
               "List up to 3 properties",
               "Manage up to 10 tenants"]'::jsonb
WHERE id = '1mo';

UPDATE subscription_plans SET
  name = 'Essential', duration_days = 90, price_ugx = 40000, price_usd = 10,
  max_properties = 3, max_tenants = 10, free_boost_days = NULL,
  sort_order = 1, popular = false, is_active = true,
  benefits = '["List up to 3 properties",
               "Manage up to 10 tenants",
               "Listings reviewed and approved by our QA team",
               "GPS directions to your property for house seekers",
               "Automated rent reminders to your tenants",
               "Electronic receipts and tenancy agreements (PDF)",
               "Reports on tenants owing and their balances (PDF)"]'::jsonb
WHERE id = '3mo';

UPDATE subscription_plans SET
  name = 'Business Class', duration_days = 180, price_ugx = 100000, price_usd = 25,
  max_properties = 20, max_tenants = 50, free_boost_days = NULL,
  sort_order = 2, popular = true, is_active = true,
  benefits = '["List up to 20 properties",
               "Manage up to 50 tenants",
               "Listings reviewed and approved by our QA team",
               "GPS directions to your property for house seekers",
               "Automated rent reminders to your tenants",
               "Electronic receipts and tenancy agreements (PDF)",
               "Reports on tenants owing and their balances (PDF)"]'::jsonb
WHERE id = '6mo';

UPDATE subscription_plans SET
  name = 'Elite', duration_days = 365, price_ugx = 1000000, price_usd = 250,
  max_properties = NULL, max_tenants = NULL, free_boost_days = 90,
  sort_order = 3, popular = false, is_active = true,
  benefits = '["List unlimited properties",
               "Manage unlimited tenants",
               "Free boosting for 3 months on every property you list",
               "Listings reviewed and approved by our QA team",
               "GPS directions to your property for house seekers",
               "Automated rent reminders to your tenants",
               "Electronic receipts and tenancy agreements (PDF)",
               "Reports on tenants owing and their balances (PDF)"]'::jsonb
WHERE id = '12mo';

-- 3. The backend marks mismatched payments as 'failed', but the check
--    constraint did not allow it, so that update errored instead.
ALTER TABLE manager_subscriptions DROP CONSTRAINT IF EXISTS manager_subscriptions_status_check;
ALTER TABLE manager_subscriptions ADD CONSTRAINT manager_subscriptions_status_check
  CHECK (status = ANY (ARRAY['active','expired','pending','cancelled','grace','failed']));

-- 4. Plan-included boosts.
--    Boost every active listing of p_manager (or just p_property) until
--    p_window_start + p_days. Skips properties already boosted past that point.
CREATE OR REPLACE FUNCTION public.grant_plan_boosts(
  p_manager uuid, p_window_start timestamptz, p_days integer, p_property uuid DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_end timestamptz := p_window_start + make_interval(days => p_days);
  v_count integer;
BEGIN
  IF p_days IS NULL OR p_days <= 0 OR v_end <= now() THEN
    RETURN 0;
  END IF;

  INSERT INTO property_boosts
    (property_id, manager_id, amount_paid, duration_days, started_at, expires_at, status, payment_method)
  SELECT p.id, p_manager, 0,
         GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_end - now())) / 86400))::int,
         now(), v_end, 'active', 'plan_included'
  FROM properties p
  WHERE p.owner_id = p_manager
    AND COALESCE(p.is_active, true)
    AND (p_property IS NULL OR p.id = p_property)
    AND NOT EXISTS (
      SELECT 1 FROM property_boosts b
      WHERE b.property_id = p.id AND b.status = 'active' AND b.expires_at >= v_end
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

REVOKE ALL ON FUNCTION public.grant_plan_boosts(uuid, timestamptz, integer, uuid) FROM PUBLIC, anon, authenticated;

-- When a subscription becomes active on a plan with free boosting,
-- boost everything the manager has listed.
CREATE OR REPLACE FUNCTION public.trg_subscription_plan_boosts() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_days integer;
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
    SELECT free_boost_days INTO v_days FROM subscription_plans WHERE id = NEW.plan_id;
    IF COALESCE(v_days, 0) > 0 THEN
      PERFORM grant_plan_boosts(NEW.manager_id, COALESCE(NEW.started_at, now()), v_days);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS subscription_plan_boosts ON manager_subscriptions;
CREATE TRIGGER subscription_plan_boosts
  AFTER INSERT OR UPDATE OF status ON manager_subscriptions
  FOR EACH ROW EXECUTE FUNCTION trg_subscription_plan_boosts();

-- When a property is listed (or reactivated) during a free-boost window,
-- boost it until the window closes.
CREATE OR REPLACE FUNCTION public.trg_property_plan_boosts() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF COALESCE(NEW.is_active, true) AND NEW.owner_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.is_active, true) IS DISTINCT FROM true) THEN
    SELECT s.started_at, sp.free_boost_days INTO r
    FROM manager_subscriptions s
    JOIN subscription_plans sp ON sp.id = s.plan_id
    WHERE s.manager_id = NEW.owner_id
      AND s.status = 'active' AND s.expires_at > now()
      AND COALESCE(sp.free_boost_days, 0) > 0
      AND s.started_at + make_interval(days => sp.free_boost_days) > now()
    ORDER BY s.started_at + make_interval(days => sp.free_boost_days) DESC
    LIMIT 1;
    IF FOUND THEN
      PERFORM grant_plan_boosts(NEW.owner_id, r.started_at, r.free_boost_days, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS property_plan_boosts ON properties;
CREATE TRIGGER property_plan_boosts
  AFTER INSERT OR UPDATE OF is_active ON properties
  FOR EACH ROW EXECUTE FUNCTION trg_property_plan_boosts();
