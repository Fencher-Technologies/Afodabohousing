-- Create missing enums idempotently
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'uploaded', 'confirmed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE rent_period AS ENUM ('monthly', 'quarterly', 'annually');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE tenancy_status AS ENUM ('active', 'expired', 'terminated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('tenant', 'house_manager', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Fix get_user_role to query user_roles instead of profiles.role
-- CASCADE drops dependent RLS policies; they are recreated below
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
CREATE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role app_role;
BEGIN
    SELECT ur.role INTO user_role
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id;

    RETURN COALESCE(user_role, 'tenant'::app_role);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO service_role;

-- Recreate RLS policies that depended on the old function
CREATE POLICY "Admins can view all properties" ON properties
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update any property" ON properties
    FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can view all tenants" ON tenants
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can view all leases" ON leases
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can view all payments" ON payments
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update all payments" ON payments
    FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can view all maintenance" ON maintenance_requests
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- has_role function (referenced in types.ts)
DROP FUNCTION IF EXISTS public.has_role(app_role, uuid);
CREATE FUNCTION public.has_role(_role app_role, _user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = _user_id AND ur.role = _role
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role TO service_role;
