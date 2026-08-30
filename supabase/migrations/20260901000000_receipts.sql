-- ============================================================================
-- Receipts: auto-generated tenant-facing receipts for confirmed payments
-- ----------------------------------------------------------------------------
-- A receipt is an immutable snapshot created when a rent payment is
-- confirmed (verification approval, or a payment the manager records
-- directly). Receipts are visible to the tenant on their dashboard and to
-- the managing landlord.
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START 1;

CREATE OR REPLACE FUNCTION public.get_next_receipt_number()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('public.receipt_number_seq');
$$;

CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL UNIQUE,
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,

    -- Denormalized snapshot: receipts must stay correct even when the
    -- tenant, property, or payment rows later change.
    tenant_name TEXT,
    property_title TEXT,
    property_address TEXT,
    unit_label TEXT,
    manager_name TEXT,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'UGX',
    payment_method TEXT,
    payment_type TEXT NOT NULL DEFAULT 'rent',
    payment_date DATE,
    transaction_reference TEXT,
    coverage_days INTEGER,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'voided')),
    voided_at TIMESTAMPTZ,
    voided_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One receipt per payment.
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_payment_id
    ON public.receipts (payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_tenant_id
    ON public.receipts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipts_lease_id
    ON public.receipts (lease_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at
    ON public.receipts (created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_receipts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_receipts_updated_at ON public.receipts;
CREATE TRIGGER trg_receipts_updated_at
    BEFORE UPDATE ON public.receipts
    FOR EACH ROW EXECUTE FUNCTION public.touch_receipts_updated_at();

-- ─── Row Level Security ─────────────────────────────────────────────────
-- The backend reads and writes with the service role (bypasses RLS), so
-- policies only govern direct client access.

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

-- Tenants read their own receipts. tenants.user_id links the tenant record
-- to the auth user, so the check must go through the tenants table.
DROP POLICY IF EXISTS receipts_tenant_select ON public.receipts;
CREATE POLICY receipts_tenant_select ON public.receipts
    FOR SELECT TO authenticated
    USING (
        tenant_id IN (
            SELECT id FROM public.tenants WHERE user_id = auth.uid()
        )
    );

-- Managers read receipts for leases they own.
DROP POLICY IF EXISTS receipts_manager_select ON public.receipts;
CREATE POLICY receipts_manager_select ON public.receipts
    FOR SELECT TO authenticated
    USING (
        lease_id IN (
            SELECT id FROM public.leases WHERE owner_id = auth.uid()
        )
    );

-- No INSERT/UPDATE/DELETE policies for authenticated users on purpose:
-- receipts are issued exclusively by the backend (service role), and
-- voiding goes through the API which performs its own ownership check.
