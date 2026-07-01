import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  LayoutDashboard, Users, Building2, Settings, LogOut, Menu, X,
  ChevronRight, RefreshCcw, Mail, Shield, Plus, MoreHorizontal
} from 'lucide-react';

type Tab = 'overview' | 'managers' | 'settings';
type Stats = { total_managers: number; total_tenants: number; total_properties: number; active_leases: number };
type Manager = { id: string; user_id: string; email: string; full_name: string | null; role: string; status: string; created_at: string | null; property_count: number };

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'managers', label: 'Managers', icon: <Users className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
];

export default function SuperAdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${apiBase}/admin/stats`, { headers }),
        fetch(`${apiBase}/admin/users?role=house_manager`, { headers }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setManagers(await usersRes.json());
    } catch (err: any) {
      console.error('Failed to fetch admin data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}/auth/invite`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: inviteEmail, role: 'house_manager' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to send invitation');
      }
      toast({ title: 'Invitation sent!', description: `Invitation emailed to ${inviteEmail}` });
      setInviteDialogOpen(false);
      setInviteEmail('');
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setInviting(false);
  };

  const handleToggleStatus = async (manager: Manager) => {
    const newStatus = manager.status === 'active' ? 'suspended' : 'active';
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}/admin/users/${manager.user_id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast({ title: `Manager ${newStatus}`, description: `${manager.full_name || manager.email} is now ${newStatus}.` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const statCards = stats ? [
    { label: 'Managers', val: stats.total_managers, icon: <Users className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Tenants', val: stats.total_tenants, icon: <Shield className="h-5 w-5" />, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Properties', val: stats.total_properties, icon: <Building2 className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Active Leases', val: stats.active_leases, icon: <LayoutDashboard className="h-5 w-5" />, color: 'text-accent', bg: 'bg-accent/10' },
  ] : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-muted">
            <Menu className="h-5 w-5" />
          </button>
          <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">SA</div>
          <div>
            <h1 className="font-display font-bold text-lg">Super Admin</h1>
            <p className="text-xs text-muted-foreground">Platform Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchData} disabled={loading} className="gap-2 h-8 text-xs">
            <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <button onClick={signOut} className="text-muted-foreground hover:text-foreground p-2">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-card border-r border-border">
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  tab === item.id ? 'bg-accent/10 text-accent' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}>
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-6 max-w-4xl">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {statCards.map(s => (
                  <div key={s.label} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                    <div className={`${s.bg} ${s.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>{s.icon}</div>
                    <div className="text-2xl font-display font-bold">{loading ? <div className="h-7 w-16 bg-muted animate-pulse rounded" /> : s.val}</div>
                    <div className="text-sm font-semibold text-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="font-display font-semibold text-base mb-4">Recent Managers</h3>
                {managers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No managers yet. Invite your first manager.</p>
                ) : (
                  <div className="space-y-3">
                    {managers.slice(0, 5).map(m => (
                      <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-semibold">{m.full_name || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground">{m.email} · {m.property_count} properties</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${m.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MANAGERS */}
          {tab === 'managers' && (
            <div className="space-y-5 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-xl">House Managers</h2>
                  <p className="text-sm text-muted-foreground">{managers.length} registered</p>
                </div>
                <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => setInviteDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Invite Manager
                </Button>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold">Name</th>
                        <th className="text-left py-3 px-4 font-semibold">Email</th>
                        <th className="text-left py-3 px-4 font-semibold">Properties</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                        <th className="text-left py-3 px-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managers.length === 0 ? (
                        <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No managers found</td></tr>
                      ) : managers.map(m => (
                        <tr key={m.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-semibold">{m.full_name || '—'}</td>
                          <td className="py-3 px-4 text-muted-foreground">{m.email}</td>
                          <td className="py-3 px-4">{m.property_count}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                              {m.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Button size="sm" variant={m.status === 'active' ? 'destructive' : 'outline'}
                              className="h-7 text-xs" onClick={() => handleToggleStatus(m)}>
                              {m.status === 'active' ? 'Suspend' : 'Activate'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {tab === 'settings' && (
            <div className="max-w-2xl">
              <h2 className="font-display font-bold text-xl mb-4">Platform Settings</h2>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                <p className="text-sm text-muted-foreground">Platform-wide settings will be available here.</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Invite House Manager</DialogTitle>
            <DialogDescription>Send an invitation email to a new house manager.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Email Address</label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="manager@example.com" required className="mt-1" />
            </div>
            <Button type="submit" disabled={inviting} className="w-full">
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
