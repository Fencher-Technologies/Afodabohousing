BEGIN;

-- ==========================================================================
-- Migration 026: Phone Authentication Support
--
-- Adds:
--   1. pin_hash, auth_password_enc, phone_verified_at to profiles
--   2. UNIQUE constraint on profiles.phone (deduplicates first)
--   3. phone_otps table for OTP storage
--   4. phone column to invitations + relax email NOT NULL
--
-- Does NOT modify: leases, tenants, properties, payments, agreement_*
-- Does NOT modify: auth.users, RLS policies, triggers
-- ==========================================================================

-- 1. PROFILES — new columns for PIN and phone auth
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pin_hash TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_password_enc TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- 2. PROFILES — phone uniqueness (safe dedup first)
-- Convert empty strings to NULL (they violate unique constraint)
UPDATE public.profiles SET phone = NULL WHERE phone = '';

-- Remove duplicate phones beyond the first occurrence
UPDATE public.profiles
  SET phone = NULL
  WHERE phone IS NOT NULL
    AND phone IN (
      SELECT phone FROM (
        SELECT phone, ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at ASC) AS rn
          FROM public.profiles WHERE phone IS NOT NULL
      ) dup WHERE dup.rn > 1
    );

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);

-- 3. PHONE OTPS — new table
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

-- 4. INVITATIONS — add phone column, relax email NOT NULL
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE public.invitations
  ALTER COLUMN email DROP NOT NULL;

COMMIT;
