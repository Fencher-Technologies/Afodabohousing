-- 036_boost_packages.sql
-- Boost packages are now database-driven (single source of truth), mirroring
-- subscription_plans. UGX is the authoritative payment amount (what reaches
-- Pesapal).
--
-- Idempotent: safe to run more than once. The UPDATEs deliberately do NOT
-- touch is_active, so an admin-deactivated package stays deactivated across
-- re-runs. sort_order controls display ordering.

CREATE TABLE IF NOT EXISTS boost_packages (
    id          TEXT PRIMARY KEY,
    days        INTEGER NOT NULL UNIQUE,
    price_ugx   NUMERIC(12,2) NOT NULL,
    label       TEXT NOT NULL,  
    is_active   BOOLEAN DEFAULT true,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed the client's final prices (does not overwrite existing rows).
INSERT INTO boost_packages (id, days, price_ugx, label, sort_order) VALUES
    ('7d',  7,  10000, '7 Days',  1),
    ('14d', 14, 20000, '14 Days', 2),
    ('30d', 30, 40000, '30 Days', 3)
ON CONFLICT (id) DO NOTHING;

-- Ensure the correct values regardless of whether the INSERT succeeded.
UPDATE boost_packages SET days = 7,  price_ugx = 10000, label = '7 Days',  sort_order = 1 WHERE id = '7d';
UPDATE boost_packages SET days = 14, price_ugx = 20000, label = '14 Days', sort_order = 2 WHERE id = '14d';
UPDATE boost_packages SET days = 30, price_ugx = 40000, label = '30 Days', sort_order = 3 WHERE id = '30d';
