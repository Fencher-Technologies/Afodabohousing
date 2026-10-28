-- Reword Elite's fourth benefit (the Axis support line).
update public.subscription_plans
set benefits = jsonb_set(
      benefits, '{3}',
      to_jsonb('Free support from Axis team to list all your properties around the world and add all your tenants to them as well on your behalf'::text))
where id = '12mo' and benefits->>3 like 'Axis support in managing%';
