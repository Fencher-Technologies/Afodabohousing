-- Elite (highest property-manager package): free boosting for 6 months on every
-- listed property, plus Axis support managing properties worldwide on request.
-- free_boost_days drives grant_plan_boosts(); benefits is display copy.
UPDATE subscription_plans SET
  free_boost_days = 180,
  benefits = '["List unlimited properties",
               "Manage unlimited tenants",
               "Free boosting for 6 months on every property you list",
               "Axis support in managing all your properties around the world, on request",
               "Listings reviewed and approved by our QA team",
               "GPS directions to your property for house seekers",
               "Automated rent reminders to your tenants",
               "Electronic receipts and tenancy agreements (PDF)",
               "Reports on tenants owing and their balances (PDF)"]'::jsonb
WHERE id = '12mo';
