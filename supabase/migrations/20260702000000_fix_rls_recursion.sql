-- ============================================================================
-- Migration: Fix infinite RLS recursion on properties table
-- Date: 2026-07-02
--
-- The "Tenants can view leased property" policy had a subquery that
-- selected from public.properties, triggering RLS evaluation recursively.
-- Fix: select property_id from leases directly instead.
-- ============================================================================

DROP POLICY IF EXISTS "Tenants can view leased property" ON public.properties;

CREATE POLICY "Tenants can view leased property" ON public.properties
  FOR SELECT USING (
    public.get_user_role(auth.uid()) = 'tenant'
    AND id IN (
      SELECT l.property_id FROM public.leases l
      JOIN public.tenants t ON t.id = l.tenant_id
      WHERE t.user_id = auth.uid()
    )
  );
