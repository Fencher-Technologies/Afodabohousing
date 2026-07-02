-- ============================================================================
-- Migration: Performance Indexes
-- Date: 2026-07-01
--
-- Adds missing indexes on foreign keys and frequently filtered columns
-- to improve query performance as data volume grows.
--
-- Prior analysis:
-- - Existing indexes from prior migrations cover owner_id, user_id, and basic
--   FK lookups on properties, tenants, leases, payments, maintenance_requests
-- - Missing: status filters (heavily used in backend), date ordering,
--   property_type filtering, email lookups, rental_units/messages FKs
-- ============================================================================

-- ── PROFILES ──────────────────────────────────────────────────────────────
-- Existing: idx_profiles_role, idx_profiles_created_by, idx_profiles_manager_id, idx_profiles_status
-- Queries: auth.py checks email on signin, accept-invite does eq("email")
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
-- Composite: role + status for dashboard stats queries (super admin analytics)
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);
-- Composite: user_id + role for quick role lookups from auth
CREATE INDEX IF NOT EXISTS idx_profiles_user_role ON public.profiles(user_id, role);


-- ── PROPERTIES ────────────────────────────────────────────────────────────
-- Existing: idx_properties_owner_id, idx_properties_status
-- Queries: public listings filter by property_type, state, city; ordered by created_at
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON public.properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON public.properties(created_at DESC);
-- Composite: status + property_type for filtered public listing queries
CREATE INDEX IF NOT EXISTS idx_properties_status_type ON public.properties(status, property_type);
-- Location filtering indexes (state, city for district-like search patterns)
CREATE INDEX IF NOT EXISTS idx_properties_state ON public.properties(state);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city);
-- Composite: status + state for state-based filtering (district-level search)
CREATE INDEX IF NOT EXISTS idx_properties_status_state ON public.properties(status, state);
-- Composite: status + city for city-based filtering  
CREATE INDEX IF NOT EXISTS idx_properties_status_city ON public.properties(status, city);


-- ── TENANTS ───────────────────────────────────────────────────────────────
-- Existing: idx_tenants_owner_id, idx_tenants_user_id
-- Queries: email lookup, status filtering
CREATE INDEX IF NOT EXISTS idx_tenants_email ON public.tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON public.tenants(created_at DESC);
-- Composite: owner_id + status for manager's tenant list queries
CREATE INDEX IF NOT EXISTS idx_tenants_owner_status ON public.tenants(owner_id, status);


-- ── LEASES ────────────────────────────────────────────────────────────────
-- Existing: idx_leases_owner_id, idx_leases_property_id, idx_leases_tenant_id
-- Queries: status = 'active' is extremely common, date range filtering
CREATE INDEX IF NOT EXISTS idx_leases_status ON public.leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_start_date ON public.leases(start_date);
CREATE INDEX IF NOT EXISTS idx_leases_end_date ON public.leases(end_date);
CREATE INDEX IF NOT EXISTS idx_leases_created_at ON public.leases(created_at DESC);
-- Composite: owner_id + status for manager's lease list
CREATE INDEX IF NOT EXISTS idx_leases_owner_status ON public.leases(owner_id, status);
-- Composite: status + start_date for active lease range queries
CREATE INDEX IF NOT EXISTS idx_leases_status_start ON public.leases(status, start_date);


-- ── PAYMENTS ──────────────────────────────────────────────────────────────
-- Existing: idx_payments_lease_id, idx_payments_tenant_id
-- Queries: status = 'completed' (financial stats), status = 'pending' (outstanding)
--          due_date, paid_date, created_at ordering
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_paid_date ON public.payments(paid_date);
-- Composite: status + amount for sum queries (dashboard financial stats)
CREATE INDEX IF NOT EXISTS idx_payments_status_amount ON public.payments(status, amount);
-- Composite: lease_id + status for per-lease payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_lease_status ON public.payments(lease_id, status);
-- Composite: tenant_id + status for tenant payment history
CREATE INDEX IF NOT EXISTS idx_payments_tenant_status ON public.payments(tenant_id, status);


-- ── MAINTENANCE REQUESTS ──────────────────────────────────────────────────
-- Existing: idx_maintenance_requests_property_id, idx_maintenance_requests_tenant_id
-- Queries: status = 'open', priority filtering
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON public.maintenance_requests(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_created_at ON public.maintenance_requests(created_at DESC);
-- Composite: property_id + status for manager's property maintenance view
CREATE INDEX IF NOT EXISTS idx_maintenance_property_status ON public.maintenance_requests(property_id, status);


-- ── RENTAL UNITS ──────────────────────────────────────────────────────────
-- No indexes beyond PK
-- Queries: property_id FK, status filtering
CREATE INDEX IF NOT EXISTS idx_rental_units_property_id ON public.rental_units(property_id);
CREATE INDEX IF NOT EXISTS idx_rental_units_status ON public.rental_units(status);
-- Composite: property_id + status for property detail page unit listing
CREATE INDEX IF NOT EXISTS idx_rental_units_property_status ON public.rental_units(property_id, status);


-- ── MESSAGES ──────────────────────────────────────────────────────────────
-- No indexes beyond PK
-- Queries: sender_id, receiver_id for conversation view
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_property_id ON public.messages(property_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
-- Composite: receiver_id + is_read for unread count
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON public.messages(receiver_id, is_read);
-- Composite: sender_id + created_at for sender's message history
CREATE INDEX IF NOT EXISTS idx_messages_sender_created ON public.messages(sender_id, created_at DESC);
-- Composite: receiver_id + created_at for receiver's message history
CREATE INDEX IF NOT EXISTS idx_messages_receiver_created ON public.messages(receiver_id, created_at DESC);
