-- Fix require_admin(): create the get_user_role RPC function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT p.role INTO user_role
    FROM public.profiles p
    WHERE p.user_id = _user_id;

    RETURN COALESCE(user_role, 'authenticated');
END;
$$;

-- Grant access for authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role TO service_role;
