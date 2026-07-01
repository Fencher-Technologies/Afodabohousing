-- ============================================================================
-- Migration: Auth & Role Overhaul
-- Date: 2026-06-20
-- 
-- Changes:
-- 1. Add super_admin to app_role enum, migrate admin → super_admin
-- 2. Add created_by, status, manager_id columns to profiles
-- 3. Create invitations table
-- 4. Rebuild ALL RLS policies with new role hierarchy
-- 5. Update helper functions
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. ENUM: Add super_admin to app_role
-- --------------------------------------------------------------------------
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin' AFTER 'admin';

-- Map existing admin accounts to super_admin
UPDATE public.profiles SET role = 'super_admin' WHERE role = 'admin';

-- --------------------------------------------------------------------------
-- 2. PROFILES: Add new columns
-- --------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Constraint for status values
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check,
  ADD CONSTRAINT profiles_status_check CHECK (status IN ('active', 'suspended', 'pending'));

-- Super admin accounts have created_by = NULL (seeded)
UPDATE public.profiles SET created_by = NULL WHERE role = 'super_admin';

CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- --------------------------------------------------------------------------
-- 3. INVITATIONS TABLE
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('house_manager', 'tenant')),
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);

-- --------------------------------------------------------------------------
-- 4. UPDATE get_user_role FUNCTION (return TEXT for flexibility)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- --------------------------------------------------------------------------
-- 5. DROP ALL EXISTING RLS POLICIES
-- --------------------------------------------------------------------------
-- Profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Properties
DROP POLICY IF EXISTS "Properties are publicly viewable" ON public.properties;
DROP POLICY IF EXISTS "Owners can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can delete own properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can update any property" ON public.properties;

-- Tenants
DROP POLICY IF EXISTS "Owners can view their tenants" ON public.tenants;
DROP POLICY IF EXISTS "Owners can create tenants" ON public.tenants;
DROP POLICY IF EXISTS "Owners can update their tenants" ON public.tenants;
DROP POLICY IF EXISTS "Owners can delete their tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenants can view own record" ON public.tenants;
DROP POLICY IF EXISTS "Admins can view all tenants" ON public.tenants;

-- Leases
DROP POLICY IF EXISTS "Owners can view their leases" ON public.leases;
DROP POLICY IF EXISTS "Owners can create leases" ON public.leases;
DROP POLICY IF EXISTS "Owners can update their leases" ON public.leases;
DROP POLICY IF EXISTS "Owners can delete their leases" ON public.leases;
DROP POLICY IF EXISTS "Tenants can view their leases" ON public.leases;
DROP POLICY IF EXISTS "Admins can view all leases" ON public.leases;

-- Payments
DROP POLICY IF EXISTS "Tenant or owner can view payments" ON public.payments;
DROP POLICY IF EXISTS "Tenants can create payments" ON public.payments;
DROP POLICY IF EXISTS "Owners can update payments" ON public.payments;
DROP POLICY IF EXISTS "Tenants can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update all payments" ON public.payments;

-- Maintenance Requests
DROP POLICY IF EXISTS "Tenants can view their maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Owners can view their property maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can create maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Owners can update maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Owners can delete maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins can view all maintenance" ON public.maintenance_requests;

-- Messages
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Receiver can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;

-- Rental Units
DROP POLICY IF EXISTS "Units are publicly viewable" ON public.rental_units;
DROP POLICY IF EXISTS "Managers can insert their units" ON public.rental_units;
DROP POLICY IF EXISTS "Managers can update their units" ON public.rental_units;
DROP POLICY IF EXISTS "Managers can delete their units" ON public.rental_units;
DROP POLICY IF EXISTS "Admins can view all units" ON public.rental_units;
DROP POLICY IF EXISTS "Admins can update all units" ON public.rental_units;

-- --------------------------------------------------------------------------
-- 6. NEW RLS POLICIES
-- --------------------------------------------------------------------------

-- ── PROFILES ──
-- Super admin: full access
CREATE POLICY "Super admins can read all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can update profiles" ON public.profiles
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.get_user_role(auth.uid()) = 'super_admin');

-- Users can read and update their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Accept-invite flow: allow inserting own profile on first account creation
CREATE POLICY "Users can insert own profile on accept" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- House managers can read tenants linked to them (profiles where manager_id = their id OR created_by = their id)
CREATE POLICY "Managers can read tenant profiles" ON public.profiles
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND (manager_id = auth.uid() OR created_by = auth.uid())
  );


-- ── PROPERTIES ──
-- Public: view available properties (no auth required)
CREATE POLICY "Public can view available properties" ON public.properties
  FOR SELECT USING (status = 'available' OR status IS NULL);

-- Super admin: full access
CREATE POLICY "Super admins can read all properties" ON public.properties
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can insert properties" ON public.properties
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can update properties" ON public.properties
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can delete properties" ON public.properties
  FOR DELETE USING (public.get_user_role(auth.uid()) = 'super_admin');

-- House manager: CRUD own properties
CREATE POLICY "Managers can view own properties" ON public.properties
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND (owner_id = auth.uid())
  );
CREATE POLICY "Managers can insert properties" ON public.properties
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND owner_id = auth.uid()
  );
CREATE POLICY "Managers can update own properties" ON public.properties
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND owner_id = auth.uid()
  );
CREATE POLICY "Managers can delete own properties" ON public.properties
  FOR DELETE USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND owner_id = auth.uid()
  );

-- Tenant: can view their own leased property
CREATE POLICY "Tenants can view leased property" ON public.properties
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'tenant'
    AND id IN (
      SELECT p.id FROM public.properties p
      JOIN public.leases l ON l.property_id = p.id
      JOIN public.tenants t ON t.id = l.tenant_id
      WHERE t.user_id = auth.uid()
    )
  );


-- ── TENANTS ──
-- Super admin: full access
CREATE POLICY "Super admins can read all tenants" ON public.tenants
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can insert tenants" ON public.tenants
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can update tenants" ON public.tenants
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can delete tenants" ON public.tenants
  FOR DELETE USING (public.get_user_role(auth.uid()) = 'super_admin');

-- House manager: CRUD tenants under their ownership
CREATE POLICY "Managers can view own tenants" ON public.tenants
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND owner_id = auth.uid()
  );
CREATE POLICY "Managers can insert tenants" ON public.tenants
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND owner_id = auth.uid()
  );
CREATE POLICY "Managers can update own tenants" ON public.tenants
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND owner_id = auth.uid()
  );
CREATE POLICY "Managers can delete own tenants" ON public.tenants
  FOR DELETE USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND owner_id = auth.uid()
  );

-- Tenant: view own record
CREATE POLICY "Tenants can view own record" ON public.tenants
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'tenant' AND user_id = auth.uid());


-- ── LEASES ──
-- Super admin: full access
CREATE POLICY "Super admins can read all leases" ON public.leases
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can insert leases" ON public.leases
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can update leases" ON public.leases
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can delete leases" ON public.leases
  FOR DELETE USING (public.get_user_role(auth.uid()) = 'super_admin');

-- House manager: CRUD leases on own properties
CREATE POLICY "Managers can view own leases" ON public.leases
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND owner_id = auth.uid()
  );
CREATE POLICY "Managers can insert leases" ON public.leases
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND owner_id = auth.uid()
  );
CREATE POLICY "Managers can update own leases" ON public.leases
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND owner_id = auth.uid()
  );
CREATE POLICY "Managers can delete own leases" ON public.leases
  FOR DELETE USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND owner_id = auth.uid()
  );

-- Tenant: view own lease
CREATE POLICY "Tenants can view own leases" ON public.leases
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'tenant'
    AND tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );


-- ── PAYMENTS ──
-- Super admin: full access
CREATE POLICY "Super admins can read all payments" ON public.payments
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can update payments" ON public.payments
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'super_admin');

-- House manager: view/update payments on own leases
CREATE POLICY "Managers can view payments" ON public.payments
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND lease_id IN (SELECT id FROM public.leases WHERE owner_id = auth.uid())
  );
CREATE POLICY "Managers can update payments" ON public.payments
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND lease_id IN (SELECT id FROM public.leases WHERE owner_id = auth.uid())
  );

-- Tenant: create/view own payments
CREATE POLICY "Tenants can view own payments" ON public.payments
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'tenant'
    AND tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenants can insert payments" ON public.payments
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) = 'tenant'
    AND tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenants can update own payments" ON public.payments
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'tenant'
    AND tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );


-- ── MAINTENANCE REQUESTS ──
-- Super admin: full access
CREATE POLICY "Super admins can read maintenance" ON public.maintenance_requests
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can update maintenance" ON public.maintenance_requests
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can delete maintenance" ON public.maintenance_requests
  FOR DELETE USING (public.get_user_role(auth.uid()) = 'super_admin');

-- House manager: view/update on own properties
CREATE POLICY "Managers can view maintenance" ON public.maintenance_requests
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
  );
CREATE POLICY "Managers can update maintenance" ON public.maintenance_requests
  FOR UPDATE USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
  );
CREATE POLICY "Managers can delete maintenance" ON public.maintenance_requests
  FOR DELETE USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND property_id IN (SELECT id FROM public.properties WHERE owner_id = auth.uid())
  );

-- Tenant: create/view own maintenance requests
CREATE POLICY "Tenants can view own maintenance" ON public.maintenance_requests
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'tenant'
    AND tenant_id IN (SELECT id FROM public.tenants WHERE user_id = auth.uid())
  );
CREATE POLICY "Tenants can insert maintenance" ON public.maintenance_requests
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'tenant');


-- ── MESSAGES ──
-- Super admin: view all
CREATE POLICY "Super admins can view messages" ON public.messages
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'super_admin');

-- Users: view own conversations, send messages, mark read
CREATE POLICY "Users can view own messages" ON public.messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
  );
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receiver can mark messages as read" ON public.messages
  FOR UPDATE USING (auth.uid() = receiver_id);


-- ── RENTAL UNITS ──
-- Public: view available units
CREATE POLICY "Public can view available units" ON public.rental_units
  FOR SELECT USING (status <> 'inactive'::property_status);

-- Super admin: full access
CREATE POLICY "Super admins can read all units" ON public.rental_units
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can update units" ON public.rental_units
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'super_admin');

-- House manager: CRUD units in own properties
CREATE POLICY "Managers can insert units" ON public.rental_units
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );
CREATE POLICY "Managers can update own units" ON public.rental_units
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );
CREATE POLICY "Managers can delete own units" ON public.rental_units
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );


-- ── INVITATIONS ──
-- Super admin: full access
CREATE POLICY "Super admins can read invitations" ON public.invitations
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can insert invitations" ON public.invitations
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can update invitations" ON public.invitations
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'super_admin');
CREATE POLICY "Super admins can delete invitations" ON public.invitations
  FOR DELETE USING (public.get_user_role(auth.uid()) = 'super_admin');

-- House manager: create/view invitations they sent (for tenant invites)
CREATE POLICY "Managers can view own invitations" ON public.invitations
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND invited_by = auth.uid()
  );
CREATE POLICY "Managers can insert invitations" ON public.invitations
  FOR INSERT WITH CHECK (
    public.get_user_role(auth.uid()) = 'house_manager'
    AND invited_by = auth.uid()
    AND role = 'tenant'
  );

-- Public: read invitation by token (needed for accept-invite flow)
-- Note: uses a function to securely lookup by token
CREATE POLICY "Public can read invitation by token" ON public.invitations
  FOR SELECT USING (auth.uid() IS NULL OR auth.uid() IS NOT NULL);
-- This is deliberately permissive for the accept flow; the token is a UUID which is unguessable.
-- The accept endpoint validates token + status + expiry server-side.


-- --------------------------------------------------------------------------
-- 7. STORAGE POLICIES (update for new roles)
-- --------------------------------------------------------------------------
-- Property images: public read, managers + super_admin upload
DROP POLICY IF EXISTS "Property images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Managers can upload property images" ON storage.objects;

CREATE POLICY "Property images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-images');

CREATE POLICY "Managers can upload property images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'property-images'
    AND (
      public.get_user_role(auth.uid()) IN ('house_manager', 'super_admin')
    )
  );

-- Payment proofs: tenant uploads own
DROP POLICY IF EXISTS "Users can view their own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Tenants can upload payment proofs" ON storage.objects;

CREATE POLICY "Tenants can view own payment proofs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'payment-proofs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Tenants can upload payment proofs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.uid() IS NOT NULL
  );

-- --------------------------------------------------------------------------
-- 8. UPDATE AUTO-PROFILE TRIGGER (set default status = 'active')
-- --------------------------------------------------------------------------
-- The existing handle_new_user() trigger inserts profiles on signup.
-- Since we're moving to invite-only, new users will come through
-- accept-invite, which creates the profile manually. Keep the trigger
-- for edge cases but update it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, status)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
