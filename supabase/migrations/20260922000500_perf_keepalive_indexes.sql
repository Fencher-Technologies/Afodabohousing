-- Speed: Render's free tier stops the backend after ~15 minutes idle, so the
-- next person waited 30-60s for it to start. Supabase pings it every 10 min.
CREATE OR REPLACE FUNCTION public.ping_axis_backend()
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, extensions AS $$
DECLARE v_url text;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'axis_backend_url';
  IF v_url IS NULL THEN RAISE EXCEPTION 'axis_backend_url missing from the vault'; END IF;
  RETURN net.http_get(url := v_url || '/health', timeout_milliseconds := 120000);
END $$;
REVOKE ALL ON FUNCTION public.ping_axis_backend() FROM PUBLIC, anon, authenticated;
SELECT cron.unschedule('axis-keepalive') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'axis-keepalive');
SELECT cron.schedule('axis-keepalive', '*/10 * * * *', $$SELECT public.ping_axis_backend()$$);

-- Indexes for lookups made on every screen.
CREATE INDEX IF NOT EXISTS idx_payment_verifications_lease_id ON public.payment_verifications (lease_id);
CREATE INDEX IF NOT EXISTS idx_payment_verifications_property_id ON public.payment_verifications (property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON public.property_images (property_id);
CREATE INDEX IF NOT EXISTS idx_saved_properties_property_id ON public.saved_properties (property_id);
CREATE INDEX IF NOT EXISTS idx_manager_subscriptions_plan_id ON public.manager_subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_agreement_consents_user_id ON public.agreement_consents (user_id);
CREATE INDEX IF NOT EXISTS idx_agreement_documents_uploaded_by ON public.agreement_documents (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_recipient_id ON public.notification_deliveries (recipient_id);
CREATE INDEX IF NOT EXISTS idx_manager_subscriptions_manager_status
  ON public.manager_subscriptions (manager_id, status, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications (recipient_id, is_read, created_at DESC);

-- Exact duplicates: every copy slows inserts and updates.
DROP INDEX IF EXISTS public.idx_maintenance_requests_property_id;
DROP INDEX IF EXISTS public.idx_messages_receiver_id;
DROP INDEX IF EXISTS public.idx_messages_sender_id;
DROP INDEX IF EXISTS public.idx_properties_type;
DROP INDEX IF EXISTS public.idx_rental_units_property_id;
