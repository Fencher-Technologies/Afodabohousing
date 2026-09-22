-- Axis standard boosting rates (per property). Boosts are charged in UGX;
-- the dollar figures on the rate card are the equivalent, not a card price.
--   Basic    2 weeks   UGX 4,000  (~$1)
--   Standard 1 month   UGX 8,000  (~$2)
--   Premium  3 months  UGX 12,000 (~$3)
-- Package ids are kept stable; property_boosts stores duration_days, not the id.
UPDATE boost_packages SET days = 14, price_ugx = 4000, label = 'Basic (2 weeks)', sort_order = 1, is_active = true WHERE id = '14d';
UPDATE boost_packages SET days = 30, price_ugx = 8000, label = 'Standard (1 month)', sort_order = 2, is_active = true WHERE id = '30d';

INSERT INTO boost_packages (id, days, price_ugx, label, is_active, sort_order)
VALUES ('90d', 90, 12000, 'Premium (3 months)', true, 3)
ON CONFLICT (id) DO UPDATE
  SET days = EXCLUDED.days, price_ugx = EXCLUDED.price_ugx, label = EXCLUDED.label,
      is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order;

-- The old 7-day package becomes the 500 UGX test option, listed last so it is
-- never the default. Set is_active = false to hide it at launch.
UPDATE boost_packages SET days = 1, price_ugx = 500, label = 'Test (1 day)', sort_order = 9, is_active = true WHERE id = '7d';
