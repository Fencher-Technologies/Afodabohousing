import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from './DashboardSidebar';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Menu, Crown } from 'lucide-react';
import { getCurrentSubscription } from '@/services/subscriptions';

const COLLAPSED_KEY = 'sidebar_collapsed';

const getFromLocalStorage = (key: string, fallback: string = ''): string => {
  try { return window?.localStorage?.getItem(key) || fallback; } catch { return fallback; }
};

const saveToLocalStorage = (key: string, value: string): void => {
  try { if (window?.localStorage) window.localStorage.setItem(key, value); } catch {}
};

export default function DashboardLayout() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [collapsed, setCollapsed] = useState(() => getFromLocalStorage(COLLAPSED_KEY) === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sub, setSub] = useState<any>(null);

  useEffect(() => {
    saveToLocalStorage(COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (role === 'house_manager') {
      getCurrentSubscription().then(setSub).catch(() => setSub(null));
    }
  }, [role]);

  const pageTitle = getPageTitle(location.pathname, role);

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobile={!isDesktop}
        open={isDesktop ? undefined : mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur flex items-center gap-3 px-4 lg:px-6">
          {!isDesktop && (
            <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground -ml-1 p-1">
              <Menu className="h-5 w-5" />
            </button>
          )}
          <h1 className="font-bold text-lg truncate">{pageTitle}</h1>
          <div className="flex-1" />
          {sub && (
            <button onClick={() => navigate('/subscription')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                sub.status === 'active'
                  ? 'bg-accent/10 border-accent/30 text-accent'
                  : 'bg-destructive/10 border-destructive/30 text-destructive'
              }`}>
              <Crown className="h-3.5 w-3.5" />
              {sub.status === 'active' ? `${sub.days_remaining ?? '—'}d left` : 'Expired'}
            </button>
          )}
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function getPageTitle(path: string, role: string | null): string {
  if (path === '/dashboard/manager') return 'Dashboard';
  if (path === '/dashboard/manager/properties') return 'Properties';
  if (path.startsWith('/dashboard/manager/properties/')) return 'Property';
  if (path === '/dashboard/manager/tenancies') return 'Tenancies';
  if (path.startsWith('/dashboard/manager/tenancies/')) return 'Tenancy';
  if (path === '/dashboard/manager/tenants/' || path.startsWith('/dashboard/manager/tenants/')) return 'Tenant';
  if (path === '/dashboard/manager/payment-verifications') return 'Payment Verifications';
  if (path.startsWith('/dashboard/manager/payments/')) return 'Payment';
  if (path === '/dashboard/manager/reports') return 'Reports';
  if (path.startsWith('/dashboard/manager/agreements/')) return 'Agreement';
  if (path === '/subscription') return 'Subscription';
  if (path === '/dashboard/tenant') return 'Dashboard';
  if (path === '/dashboard/tenant/my-tenancy') return 'My Tenancy';
  if (path === '/dashboard/tenant/payments') return 'Payments';
  if (path.startsWith('/dashboard/tenant/payments/')) return 'Payment';
  if (path.startsWith('/dashboard/tenant/agreement/')) return 'Agreement';
  if (path === '/dashboard/tenant/browse') return 'Browse Properties';
  if (path === '/dashboard/super-admin') return 'Super Admin';
  return 'Dashboard';
}
