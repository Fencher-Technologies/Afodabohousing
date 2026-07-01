ALTER TABLE public.properties
    ADD COLUMN IF NOT EXISTS manager_email TEXT,
    ADD COLUMN IF NOT EXISTS manager_phone TEXT;
