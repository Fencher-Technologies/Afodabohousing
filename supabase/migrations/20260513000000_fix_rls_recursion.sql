-- Fix RLS infinite recursion: replace subqueries to profiles.role
-- with SECURITY DEFINER function get_user_role() which bypasses RLS.

-- Drop offending admin policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can update any property" ON public.properties;
DROP POLICY IF EXISTS "Admins can view all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admins can view all leases" ON public.leases;
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view all maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can view all units" ON public.rental_units;
DROP POLICY IF EXISTS "Admins can update all units" ON public.rental_units;

-- Recreate using get_user_role() SECURITY DEFINER function (bypasses RLS)
CREATE POLICY "Admins can view all properties" ON public.properties
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin'::app_role);
CREATE POLICY "Admins can update any property" ON public.properties
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin'::app_role);
CREATE POLICY "Admins can view all tenants" ON public.tenants
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin'::app_role);
CREATE POLICY "Admins can view all leases" ON public.leases
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin'::app_role);
CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin'::app_role);
CREATE POLICY "Admins can update all payments" ON public.payments
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin'::app_role);
CREATE POLICY "Admins can view all maintenance" ON public.maintenance_requests
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin'::app_role);
CREATE POLICY "Admins can view all messages" ON public.messages
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin'::app_role);
CREATE POLICY "Admins can view all units" ON public.rental_units
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin'::app_role);
CREATE POLICY "Admins can update all units" ON public.rental_units
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin'::app_role);
