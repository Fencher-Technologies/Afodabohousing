-- Legal acceptance tracking for profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accepted_terms BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_version TEXT,
  ADD COLUMN IF NOT EXISTS privacy_version TEXT;
