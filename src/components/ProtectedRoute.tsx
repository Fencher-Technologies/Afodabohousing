import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

/** Same policy as the API's require_active_user: pending accounts are let in. */
const ALLOWED_STATUSES = ['active', 'pending'];

/** Key the login page reads to explain why the person was signed out. */
export const ACCOUNT_NOTICE_KEY = 'axis_account_notice';

interface ProfileCheck {
  /** Which user this result belongs to, so a previous user's role is never reused. */
  userId: string;
  role: string | null;
  status: string | null;
  failed: boolean;
}

const HOME_BY_ROLE: Record<string, string> = {
  super_admin: '/dashboard/super-admin',
  house_manager: '/dashboard/manager',
  tenant: '/dashboard/tenant',
};

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading: authLoading, role, signOut } = useAuth();
  const [check, setCheck] = useState<ProfileCheck | null>(null);
  const [attempt, setAttempt] = useState(0);
  const location = useLocation();

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    const userId = user.id;

    const finish = (result: ProfileCheck) => {
      if (!cancelled) setCheck(result);
    };

    void (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('user_id', userId)
          .maybeSingle();
        const status = (data?.status as string | null | undefined) ?? null;
        if (status && !ALLOWED_STATUSES.includes(status)) {
          // Suspended or rejected: end the session instead of leaving a valid
          // token behind a page that merely looks closed.
          try { sessionStorage.setItem(ACCOUNT_NOTICE_KEY, status); } catch { /* storage unavailable */ }
          await supabase.auth.signOut();
        }
        finish({ userId, role: (data?.role as string | null | undefined) ?? null, status, failed: !!error });
      } catch {
        finish({ userId, role: null, status: null, failed: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Still resolving the session, or the profile of the user now signed in.
  const checking = authLoading || (!!user && check?.userId !== user.id);
  if (checking) return <Spinner />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Suspended or rejected: the sign-out above is still propagating through the
  // auth context, so do not render anything in the meantime.
  if (check?.status && !ALLOWED_STATUSES.includes(check.status)) {
    return <Navigate to="/login" replace />;
  }

  const effectiveRole = check?.role || role;

  if (allowedRoles) {
    // Fail closed: if the role could not be determined, the page is not shown.
    // (Previously an unknown role skipped this check and rendered the page.)
    if (!effectiveRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-sm text-center space-y-4">
            <h1 className="text-lg font-semibold">We couldn't verify your access</h1>
            <p className="text-sm text-muted-foreground">
              {check?.failed
                ? 'There was a problem reaching the server. Check your connection and try again.'
                : 'Your account has no role assigned yet. Please contact support.'}
            </p>
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => {
                  setCheck(null);
                  setAttempt(a => a + 1);
                }}
              >
                Try again
              </Button>
              <Button variant="outline" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (!allowedRoles.includes(effectiveRole)) {
      return <Navigate to={HOME_BY_ROLE[effectiveRole] || '/'} replace />;
    }
  }

  return <>{children}</>;
}
