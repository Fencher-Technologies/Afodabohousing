-- The website inserts properties straight into the database, so the backend's
-- plan-limit check was bypassed (a manager on a 3-property plan had listed 6).
-- Enforcing it here covers every route: web, mobile and backend.
-- Existing over-limit listings are left alone; only new ones are blocked.
CREATE OR REPLACE FUNCTION public.enforce_property_plan_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_limit integer; v_plan text; v_used integer;
BEGIN
  IF NEW.owner_id IS NULL OR NOT COALESCE(NEW.is_active, true) THEN
    RETURN NEW;
  END IF;

  SELECT sp.max_properties, sp.name INTO v_limit, v_plan
  FROM manager_subscriptions s
  JOIN subscription_plans sp ON sp.id = s.plan_id
  WHERE s.manager_id = NEW.owner_id AND s.status = 'active' AND s.expires_at > now()
  ORDER BY s.expires_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAN_LIMIT_NO_SUBSCRIPTION: You need an active subscription to list a property.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_limit IS NULL THEN  -- Elite: unlimited
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_used FROM properties
  WHERE owner_id = NEW.owner_id AND COALESCE(is_active, true) AND id IS DISTINCT FROM NEW.id;

  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'PLAN_LIMIT_PROPERTIES: Your % plan allows % properties and you have %. Upgrade your subscription to list more.',
      v_plan, v_limit, v_used USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS property_plan_limit ON public.properties;
CREATE TRIGGER property_plan_limit
  BEFORE INSERT OR UPDATE OF is_active, owner_id ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.enforce_property_plan_limit();
