BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS auth_password_enc TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

UPDATE public.profiles SET phone = NULL WHERE phone = '';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
  ON public.profiles(phone)
  WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.phone_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '5 minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_otps_phone_created
  ON public.phone_otps(phone, created_at DESC);

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.invitations
  ALTER COLUMN email DROP NOT NULL;

COMMIT;
