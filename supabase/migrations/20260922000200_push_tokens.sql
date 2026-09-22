-- Device tokens for Expo push notifications. The backend already sent pushes
-- from this table, but it had never been created, so every push was skipped.
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'expo',
  device_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_tokens_select_own ON public.push_tokens;
CREATE POLICY push_tokens_select_own ON public.push_tokens
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS push_tokens_delete_own ON public.push_tokens;
CREATE POLICY push_tokens_delete_own ON public.push_tokens
  FOR DELETE TO authenticated USING (user_id = auth.uid());
