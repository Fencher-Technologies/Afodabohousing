import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Building2, Users, DollarSign, BarChart3,
  Crown, PanelLeftClose, PanelLeft, LogOut, ChevronRight, Home,
  Wrench, Search, Menu, X, User, UserCheck, Shield
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', path: '/dashboard/manager', icon: <LayoutDashboard className="h-4 w-4" />, roles: ['house_manager'] },
  { label: 'Properties', path: '/dashboard/manager/properties', icon: <Building2 className="h-4 w-4" />, roles: ['house_manager'] },
  { label: 'Tenancies', path: '/dashboard/manager/tenancies', icon: <Users className="h-4 w-4" />, roles: ['house_manager'] },
  { label: 'Payments', path: '/dashboard/manager/payment-verifications', icon: <DollarSign className="h-4 w-4" />, roles: ['house_manager'] },
  { label: 'Reports', path: '/dashboard/manager/reports', icon: <BarChart3 className="h-4 w-4" />, roles: ['house_manager'] },
  { label: 'Account', path: '/account', icon: <User className="h-4 w-4" />, roles: ['house_manager'] },
  { label: 'Subscription', path: '/subscription', icon: <Crown className="h-4 w-4" />, roles: ['house_manager'] },
  { label: 'Account', path: '/account', icon: <User className="h-4 w-4" />, roles: ['tenant'] },
  { label: 'Dashboard', path: '/dashboard/tenant', icon: <Home className="h-4 w-4" />, roles: ['tenant'] },
  { label: 'My Tenancy', path: '/dashboard/tenant/my-tenancy', icon: <Users className="h-4 w-4" />, roles: ['tenant'] },
  { label: 'Payments', path: '/dashboard/tenant/payments', icon: <DollarSign className="h-4 w-4" />, roles: ['tenant'] },
  { label: 'Browse', path: '/dashboard/tenant/browse', icon: <Search className="h-4 w-4" />, roles: ['tenant'] },
  { label: 'Account', path: '/account', icon: <User className="h-4 w-4" />, roles: ['super_admin'] },
  { label: 'Overview', path: '/dashboard/super-admin', icon: <LayoutDashboard className="h-4 w-4" />, roles: ['super_admin'] },
  { label: 'Approvals', path: '/dashboard/super-admin/approvals', icon: <UserCheck className="h-4 w-4" />, roles: ['super_admin'] },
  { label: 'Managers', path: '/dashboard/super-admin/managers', icon: <Users className="h-4 w-4" />, roles: ['super_admin'] },
  { label: 'Settings', path: '/dashboard/super-admin/settings', icon: <Shield className="h-4 w-4" />, roles: ['super_admin'] },
];

export default function DashboardSidebar({ collapsed, onToggle, mobile, open, onClose }: {
  collapsed: boolean; onToggle: () => void;
  mobile?: boolean; open?: boolean; onClose?: () => void;
}) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items = NAV_ITEMS.filter(i => role && i.roles.includes(role));

  function handleNav(path: string) {
    navigate(path);
    onClose?.();
  }

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border shrink-0">
        <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
          A
        </div>
        {!collapsed && <span className="font-semibold text-sm truncate">Axis</span>}
        {!mobile && (
          <button onClick={onToggle} className="ml-auto text-muted-foreground hover:text-foreground p-1">
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
        {mobile && (
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground p-1 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {items.map(item => {
          const active = location.pathname === item.path || (
            item.path !== '/dashboard/manager' && item.path !== '/dashboard/tenant' && item.path !== '/dashboard/super-admin' &&
            location.pathname.startsWith(item.path)
          ) || (
            (item.path === '/dashboard/manager' && location.pathname === '/dashboard/manager')
          );
          return (
            <button key={item.path} onClick={() => handleNav(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title={collapsed ? item.label : undefined}>
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-3 border-t border-border pt-3">
        <button onClick={() => navigate('/account')}
          className="w-full flex items-center gap-3 mb-3 px-1 hover:bg-muted/30 rounded-xl py-1.5 transition-colors text-left">
          <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
            {user?.email?.charAt(0).toUpperCase() || '?'}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{role?.replace('_', ' ') || ''}</p>
            </div>
          )}
        </button>
        <button onClick={signOut}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all ${collapsed ? 'justify-center' : ''}`}>
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  if (mobile) {
    return (
      <>
        {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          {content}
        </aside>
      </>
    );
  }

  return (
    <aside className={`hidden lg:flex flex-col border-r border-border bg-card transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
      {content}
    </aside>
  );
}
