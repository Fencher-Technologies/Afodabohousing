
-- 1. Allow users to insert their own role (needed for registration)
CREATE POLICY "Users can insert their own role" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Allow admins to manage all user roles
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 3. Allow admins to insert/update roles for other users
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 4. Admins can view all properties including inactive
CREATE POLICY "Admins can view all properties" ON public.properties
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any property" ON public.properties
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 5. Admins can view all tenancies
CREATE POLICY "Admins can view all tenancies" ON public.tenancies
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 6. Admins can view all payments
CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 7. Admins can view all messages
CREATE POLICY "Admins can view all messages" ON public.messages
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 8. Tenant can also update their own payment (upload proof)
CREATE POLICY "Tenants can update their own payments" ON public.payments
  FOR UPDATE USING (auth.uid() = tenant_id);

-- 9. Security definer function to look up a user ID by email (for manager creating tenancies)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
BEGIN
  SELECT id INTO _user_id FROM auth.users WHERE email = lower(trim(_email));
  RETURN _user_id;
END;
$$;

-- 10. Function to get profile info for a user (for managers to see tenant info)
CREATE OR REPLACE FUNCTION public.get_profile_by_user_id(_user_id UUID)
RETURNS TABLE(full_name TEXT, phone TEXT, avatar_url TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT p.full_name, p.phone, p.avatar_url
    FROM public.profiles p
    WHERE p.user_id = _user_id;
END;
$$;
