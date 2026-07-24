-- Wrapper function for nextval so PostgREST can call it via RPC
CREATE OR REPLACE FUNCTION public.get_next_agreement_number()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  SELECT nextval('public.agreement_number_seq') INTO next_val;
  RETURN next_val;
END;
$$;
