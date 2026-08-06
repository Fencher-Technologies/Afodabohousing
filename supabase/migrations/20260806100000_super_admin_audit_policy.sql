-- The original audit-log policy allowed only role='admin', but the
-- auth_role_overhaul migration mapped every admin account to 'super_admin'.
-- As a result NO authenticated account could read agreement_audit_logs.
-- Allow super_admin (and keep admin for safety).
ALTER POLICY "Admins can view agreement audit logs" ON public.agreement_audit_logs
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
