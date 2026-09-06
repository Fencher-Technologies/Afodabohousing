-- Restore payments.proof_url.
--
-- 20260312220000_align_schema_to_backend.sql dropped this column, but
-- PaymentVerificationService.approve_submission still writes the tenant's
-- uploaded screenshot into it. Because the insert payload is built with
-- exclude_none=True, the column was only referenced when a tenant actually
-- attached proof -- so approving those submissions failed with
--   42703: column "proof_url" of relation "payments" does not exist
-- (surfacing in the app as "Internal server error") while rejection, which
-- never touches the payments table, kept working. The web ManagerDashboard
-- also renders p.proof_url, which had been silently null since the drop.
--
-- Already applied to the live project on 2026-09-05.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS proof_url TEXT;
