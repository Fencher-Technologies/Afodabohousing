-- ============================================================================
-- Migration: Align Supabase schema to backend API models
-- Target: profiles.role, properties.owner_id, tenants, leases, payments,
--        maintenance_requests
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. PROFILES: add role column, migrate data from user_roles, drop user_roles
-- --------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.app_role;

-- Migrate existing roles from user_roles into profiles.role
UPDATE public.profiles p
SET role = ur.role
FROM public.user_roles ur
WHERE p.user_id = ur.user_id;

-- Drop user_roles table and its dependents
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Drop helper functions that depended on user_roles
DROP FUNCTION IF EXISTS public.has_role CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role CASCADE;

-- --------------------------------------------------------------------------
-- 2. PROPERTIES: rename manager_id → owner_id, add/align columns
-- --------------------------------------------------------------------------
ALTER TABLE public.properties RENAME COLUMN manager_id TO owner_id;

ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'UG';
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS square_feet INT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS monthly_rent BIGINT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS security_deposit BIGINT DEFAULT 0;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Sync monthly_rent from rent_amount where monthly_rent is null
UPDATE public.properties
SET monthly_rent = rent_amount
WHERE monthly_rent IS NULL;

-- --------------------------------------------------------------------------
-- 3. TENANTS: new table (separate record per occupant, linked to auth.users)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  employer TEXT,
  monthly_income BIGINT,
  credit_score INT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  status public.tenancy_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each auth user can have one tenant record per owner
ALTER TABLE public.tenants ADD CONSTRAINT tenants_user_id_owner_id_key UNIQUE (user_id, owner_id);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- 4. LEASES: new table (replaces tenancies)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent BIGINT NOT NULL,
  security_deposit BIGINT DEFAULT 0,
  status public.tenancy_status NOT NULL DEFAULT 'active',
  terms TEXT,
  termination_date DATE,
  termination_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-- Migrate data from tenancies into tenants + leases, and capture mappings
CREATE TEMP TABLE _tenancy_lease_map (
  tenancy_id UUID PRIMARY KEY,
  lease_id UUID NOT NULL,
  tenant_id UUID NOT NULL
);

DO $$
DECLARE
  t RECORD;
  _full_name TEXT;
  _email TEXT;
  new_tenant_id UUID;
  new_lease_id UUID;
BEGIN
  FOR t IN SELECT * FROM public.tenancies LOOP
    -- Look up profile and user info
    SELECT full_name INTO _full_name FROM public.profiles WHERE user_id = t.tenant_id;
    SELECT email INTO _email FROM auth.users WHERE id = t.tenant_id;

    -- Create or find tenant by user_id + owner_id
    INSERT INTO public.tenants (owner_id, user_id, first_name, last_name, email, status)
    VALUES (
      t.manager_id,
      t.tenant_id,
      COALESCE(_full_name, 'Imported'),
      'Tenant',
      COALESCE(_email, 'unknown@imported.local'),
      'active'
    )
    ON CONFLICT (user_id, owner_id) DO NOTHING
    RETURNING id INTO new_tenant_id;

    IF new_tenant_id IS NULL THEN
      SELECT id INTO new_tenant_id FROM public.tenants
      WHERE user_id = t.tenant_id AND owner_id = t.manager_id
      LIMIT 1;
    END IF;

    -- Create lease from tenancy
    INSERT INTO public.leases (owner_id, property_id, tenant_id, start_date, end_date, monthly_rent, status)
    VALUES (t.manager_id, t.property_id, new_tenant_id, t.rent_start_date, t.rent_end_date, t.rent_amount, t.status)
    RETURNING id INTO new_lease_id;

    -- Capture mapping
    INSERT INTO _tenancy_lease_map (tenancy_id, lease_id, tenant_id)
    VALUES (t.id, new_lease_id, new_tenant_id);
  END LOOP;
END $$;

-- --------------------------------------------------------------------------
-- 5. PAYMENTS: add lease_id, migrate from tenancy_id, drop old columns
-- --------------------------------------------------------------------------
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS lease_id UUID;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'rent';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS paid_date DATE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Migrate payment tenancy_ids to lease_ids
UPDATE public.payments p
SET lease_id = m.lease_id
FROM _tenancy_lease_map m
WHERE p.tenancy_id = m.tenancy_id;

-- Migrate tenant_id from auth.users references to public.tenants references
UPDATE public.payments p
SET tenant_id = m.tenant_id
FROM _tenancy_lease_map m
WHERE p.tenancy_id = m.tenancy_id;

-- Derive due_date from period_start/period_end where possible
UPDATE public.payments
SET due_date = period_end
WHERE due_date IS NULL AND period_end IS NOT NULL;

DROP TABLE IF EXISTS _tenancy_lease_map;

-- Drop orphaned payments that couldn't be mapped to a lease/tenant
DELETE FROM public.payments
WHERE tenancy_id IS NOT NULL AND lease_id IS NULL;

-- Drop old FK on tenant_id (was referencing auth.users) and re-add referencing public.tenants
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_tenant_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add FK on lease_id now that data is migrated
ALTER TABLE public.payments ADD CONSTRAINT payments_lease_id_fkey
  FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE;

-- Drop old payment columns
ALTER TABLE public.payments DROP COLUMN IF EXISTS tenancy_id;
ALTER TABLE public.payments DROP COLUMN IF EXISTS period_start;
ALTER TABLE public.payments DROP COLUMN IF EXISTS period_end;
ALTER TABLE public.payments DROP COLUMN IF EXISTS proof_url;
ALTER TABLE public.payments DROP COLUMN IF EXISTS receipt_url;
ALTER TABLE public.payments DROP COLUMN IF EXISTS currency;

-- Drop tenancies table now that payments are migrated
DROP TABLE IF EXISTS public.tenancies CASCADE;

-- --------------------------------------------------------------------------
-- 6. MAINTENANCE_REQUESTS: new table
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  scheduled_date DATE,
  completed_date DATE,
  cost BIGINT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- 7. RLS POLICIES (rebuilt for new schema)
-- --------------------------------------------------------------------------

-- Drop all existing policies to rebuild cleanly
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Properties are publicly viewable" ON public.properties;
DROP POLICY IF EXISTS "House managers can insert properties" ON public.properties;
DROP POLICY IF EXISTS "House managers can update own properties" ON public.properties;
DROP POLICY IF EXISTS "House managers can delete own properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can update any property" ON public.properties;
DROP POLICY IF EXISTS "Tenants can view their own tenancies" ON public.tenancies;
DROP POLICY IF EXISTS "Managers can create tenancies" ON public.tenancies;
DROP POLICY IF EXISTS "Managers can update tenancies" ON public.tenancies;
DROP POLICY IF EXISTS "Admins can view all tenancies" ON public.tenancies;
DROP POLICY IF EXISTS "Tenant or manager can view payments" ON public.payments;
DROP POLICY IF EXISTS "Tenants can create payments" ON public.payments;
DROP POLICY IF EXISTS "Managers can update payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Tenants can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Receiver can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Units are publicly viewable" ON public.rental_units;
DROP POLICY IF EXISTS "Managers can insert their units" ON public.rental_units;
DROP POLICY IF EXISTS "Managers can update their units" ON public.rental_units;
DROP POLICY IF EXISTS "Managers can delete their units" ON public.rental_units;
DROP POLICY IF EXISTS "Admins can view all units" ON public.rental_units;
DROP POLICY IF EXISTS "Admins can update all units" ON public.rental_units;

-- PROFILES
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- PROPERTIES
CREATE POLICY "Properties are publicly viewable" ON public.properties
  FOR SELECT USING (status != 'inactive');
CREATE POLICY "Owners can insert properties" ON public.properties
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own properties" ON public.properties
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete own properties" ON public.properties
  FOR DELETE USING (auth.uid() = owner_id);

-- TENANTS
CREATE POLICY "Owners can view their tenants" ON public.tenants
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can create tenants" ON public.tenants
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their tenants" ON public.tenants
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their tenants" ON public.tenants
  FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Tenants can view own record" ON public.tenants
  FOR SELECT USING (auth.uid() = user_id);

-- LEASES
CREATE POLICY "Owners can view their leases" ON public.leases
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can create leases" ON public.leases
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their leases" ON public.leases
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their leases" ON public.leases
  FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Tenants can view their leases" ON public.leases
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM public.tenants WHERE id = tenant_id
  ));

-- PAYMENTS
-- Note: tenant_id now references public.tenants(id), so resolve through user_id
CREATE POLICY "Tenant or owner can view payments" ON public.payments
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.tenants WHERE id = tenant_id)
    OR auth.uid() = manager_id
    OR auth.uid() IN (
      SELECT owner_id FROM public.leases WHERE id = lease_id
    )
  );
CREATE POLICY "Tenants can create payments" ON public.payments
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.tenants WHERE id = tenant_id)
  );
CREATE POLICY "Owners can update payments" ON public.payments
  FOR UPDATE USING (auth.uid() = manager_id OR auth.uid() IN (
    SELECT owner_id FROM public.leases WHERE id = lease_id
  ));
CREATE POLICY "Tenants can update their own payments" ON public.payments
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.tenants WHERE id = tenant_id)
  );

-- MAINTENANCE REQUESTS
CREATE POLICY "Tenants can view their maintenance requests" ON public.maintenance_requests
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM public.tenants WHERE id = tenant_id
  ));
CREATE POLICY "Owners can view their property maintenance requests" ON public.maintenance_requests
  FOR SELECT USING (auth.uid() IN (
    SELECT owner_id FROM public.properties WHERE id = property_id
  ));
CREATE POLICY "Tenants can create maintenance requests" ON public.maintenance_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Owners can update maintenance requests" ON public.maintenance_requests
  FOR UPDATE USING (auth.uid() IN (
    SELECT owner_id FROM public.properties WHERE id = property_id
  ));
CREATE POLICY "Owners can delete maintenance requests" ON public.maintenance_requests
  FOR DELETE USING (auth.uid() IN (
    SELECT owner_id FROM public.properties WHERE id = property_id
  ));

-- MESSAGES (keep existing semantics)
CREATE POLICY "Users can view their own messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receiver can mark messages as read" ON public.messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- RENTAL UNITS (keep existing semantics)
CREATE POLICY "Units are publicly viewable" ON public.rental_units
  FOR SELECT USING (status <> 'inactive'::property_status);
CREATE POLICY "Managers can insert their units" ON public.rental_units
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid()
  ));
CREATE POLICY "Managers can update their units" ON public.rental_units
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid()
  ));
CREATE POLICY "Managers can delete their units" ON public.rental_units
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.properties WHERE id = property_id AND owner_id = auth.uid()
  ));

-- Admin overrides (using role on profiles)
CREATE POLICY "Admins can view all properties" ON public.properties
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Admins can update any property" ON public.properties
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Admins can view all tenants" ON public.tenants
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Admins can view all leases" ON public.leases
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Admins can update all payments" ON public.payments
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Admins can view all maintenance" ON public.maintenance_requests
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Admins can view all messages" ON public.messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Admins can view all units" ON public.rental_units
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));
CREATE POLICY "Admins can update all units" ON public.rental_units
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- --------------------------------------------------------------------------
-- 8. REPLACE helper functions (no longer depend on user_roles)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- --------------------------------------------------------------------------
-- 9. TRIGGERS for new tables
-- --------------------------------------------------------------------------
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------------------------------------
-- 10. INDEXES for performance
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON public.tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON public.tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_leases_owner_id ON public.leases(owner_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON public.leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON public.leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON public.payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_id ON public.maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_tenant_id ON public.maintenance_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
