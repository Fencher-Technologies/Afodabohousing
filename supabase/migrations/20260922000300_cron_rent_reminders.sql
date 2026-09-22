-- Rent reminders used to depend on an in-process timer in the backend. Render
-- sleeps the web service when idle, which stops the timer: no reminder of any
-- kind was sent between 11 Sep 2026 and this change. Supabase (always on) now
-- calls the backend on a schedule, which also wakes the service.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE v_secret text := encode(gen_random_bytes(32), 'hex');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'axis_cron_secret') THEN
    PERFORM vault.create_secret(v_secret, 'axis_cron_secret', 'Auth for backend /internal/jobs/run');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'axis_backend_url') THEN
    PERFORM vault.create_secret('https://afodabohousing.onrender.com', 'axis_backend_url', 'Base URL of the Axis backend');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.verify_cron_secret(p_secret text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public, vault AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'axis_cron_secret'
      AND p_secret IS NOT NULL AND length(p_secret) > 0
      AND decrypted_secret = p_secret
  );
$$;
REVOKE ALL ON FUNCTION public.verify_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_secret(text) TO service_role;

CREATE OR REPLACE FUNCTION public.run_axis_jobs(p_job text DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, extensions AS $$
DECLARE v_secret text; v_url text;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'axis_cron_secret';
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'axis_backend_url';
  IF v_secret IS NULL OR v_url IS NULL THEN
    RAISE EXCEPTION 'axis_cron_secret / axis_backend_url missing from the vault';
  END IF;
  RETURN net.http_post(
    url := v_url || '/internal/jobs/run' || COALESCE('?job=' || p_job, ''),
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Cron-Secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
END $$;
REVOKE ALL ON FUNCTION public.run_axis_jobs(text) FROM PUBLIC, anon, authenticated;

-- 06:00 UTC = 09:00 Kampala, with a retry 15 minutes later in case the first
-- call only woke the server. Reminders are idempotent per period.
SELECT cron.unschedule('axis-daily-jobs') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'axis-daily-jobs');
SELECT cron.unschedule('axis-daily-jobs-retry') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'axis-daily-jobs-retry');
SELECT cron.schedule('axis-daily-jobs', '0 6 * * *', $$SELECT public.run_axis_jobs()$$);
SELECT cron.schedule('axis-daily-jobs-retry', '15 6 * * *', $$SELECT public.run_axis_jobs()$$);
