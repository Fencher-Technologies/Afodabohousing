-- Make zip_code nullable (Uganda doesn't use ZIP codes)
ALTER TABLE public.properties ALTER COLUMN zip_code DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN zip_code SET DEFAULT '';

-- Set country default to 'UG' for Uganda market
ALTER TABLE public.properties ALTER COLUMN country SET DEFAULT 'UG';

-- Drop redundant rent_period CHECK constraint — the rent_period ENUM type
-- already enforces valid values ('monthly', 'quarterly', 'annually').
-- This constraint was likely added manually outside migrations and causes
-- false errors on valid enum inputs.
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_rent_period_check;
