CREATE INDEX IF NOT EXISTS idx_properties_owner_status_type_active
  ON public.properties(owner_id, status, property_type, is_active);

CREATE INDEX IF NOT EXISTS idx_properties_location_rent
  ON public.properties(city, state, monthly_rent);

CREATE INDEX IF NOT EXISTS idx_properties_created_at
  ON public.properties(created_at);

CREATE INDEX IF NOT EXISTS idx_tenants_owner_status_created
  ON public.tenants(owner_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_tenants_owner_user_id
  ON public.tenants(owner_id, user_id);

CREATE INDEX IF NOT EXISTS idx_leases_owner_property_status_dates
  ON public.leases(owner_id, property_id, status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_leases_tenant_property_status_dates
  ON public.leases(tenant_id, property_id, status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_payments_lease_status_due_date
  ON public.payments(lease_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_payments_tenant_status_due_date
  ON public.payments(tenant_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_profiles_role_created
  ON public.profiles(role, created_at);
