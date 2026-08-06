-- Fix get_user_role to read from profiles.role (not user_roles table)
-- The Python code writes roles to profiles.role, but the get_user_role
-- RPC reads from user_roles which is never populated.
-- This caused RLS policies to always fall back to 'tenant'.

DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;

CREATE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT p.role INTO user_role
    FROM public.profiles p
    WHERE p.user_id = _user_id;

    RETURN COALESCE(user_role, 'tenant');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO service_role;

-- Recreate RLS policies that depend on get_user_role
DROP POLICY IF EXISTS "Admins can view all properties" ON properties;
CREATE POLICY "Admins can view all properties" ON properties
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can update any property" ON properties;
CREATE POLICY "Admins can update any property" ON properties
    FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can view all tenants" ON tenants;
CREATE POLICY "Admins can view all tenants" ON tenants
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can view all leases" ON leases;
CREATE POLICY "Admins can view all leases" ON leases
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
CREATE POLICY "Admins can view all payments" ON payments
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can update all payments" ON payments;
CREATE POLICY "Admins can update all payments" ON payments
    FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can view all maintenance" ON maintenance_requests;
CREATE POLICY "Admins can view all maintenance" ON maintenance_requests
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- Also remove old profiles role CHECK constraint if it still exists
-- The original 001 migration had CHECK (role IN ('landlord', 'tenant', 'admin'))
-- but the app now uses 'house_manager' instead of 'landlord'.
-- First migrate legacy values so the new constraint won't reject them.
-- 'landlord' -> 'house_manager' (old schema renamed)
-- 'manager'  -> 'house_manager' (ambiguous alias)
-- Any other unrecognised role -> 'tenant' (safest default)
UPDATE profiles SET role = 'house_manager' WHERE role IN ('landlord', 'manager');
UPDATE profiles SET role = 'tenant'      WHERE role NOT IN ('house_manager', 'tenant', 'admin');
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('house_manager', 'tenant', 'admin'));
