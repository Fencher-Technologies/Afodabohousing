import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading: authLoading, role } = useAuth();
  const [profileRole, setProfileRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && user) {
      supabase
        .from('profiles')
        .select('role, status')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setProfileRole(data.role);
          }
          setChecking(false);
        })
        .catch(() => setChecking(false));
    } else if (!authLoading) {
      setChecking(false);
    }
  }, [user, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const effectiveRole = profileRole || role;

  if (allowedRoles && effectiveRole && !allowedRoles.includes(effectiveRole)) {
    const redirectMap: Record<string, string> = {
      super_admin: '/dashboard/super-admin',
      house_manager: '/dashboard/manager',
      tenant: '/dashboard/tenant',
    };
    const target = redirectMap[effectiveRole] || '/';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
