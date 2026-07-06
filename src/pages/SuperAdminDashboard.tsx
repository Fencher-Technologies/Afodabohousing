import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  LayoutDashboard, Users, Building2, LogOut, Menu,
  RefreshCcw, Mail, Shield, Plus, DollarSign, Copy, CheckCircle2,
  TrendingUp, AlertTriangle, Home, UserCheck
} from 'lucide-react';

type Tab = 'overview' | 'managers' | 'settings';

type DashboardStats = {
  total_managers: number; total_tenants: number;
  active_managers: number; active_tenants: number;
  new_this_month: number;
  total_properties: number;
  occupied_properties: number; vacant_properties: number;
  occupancy_rate: number;
  total_collected: number; total_outstanding: number;
  avg_collection_rate: number; recent_payments_count: number;
};

type Manager = {
  id: string; user_id: string; email: string;
  full_name: string | null; role: string; status: string;
  created_at: string | null; property_count: number;
};

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'managers', label: 'Managers', icon: <Users className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Shield className="h-4 w-4" /> },
];

function formatUGX(amount: number): string {
  return `UGX ${(amount || 0).toLocaleString()}`;
}

export default function SuperAdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'invite' | 'create'>('create');
  const [inviteEmail, setInviteEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_URL || '';

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

  const openDialog = (mode: 'invite' | 'create') => {
    setDialogMode(mode);
    setCreatedPassword(null);
    setInviteEmail('');
    setCreateName('');
    setCreateEmail('');
    setCreatePhone('');
    setCopied(false);
    setDialogOpen(true);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSubmitting(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}/auth/invite`, {
        method: 'POST', headers,
        body: JSON.stringify({ email: inviteEmail, role: 'house_manager' }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Failed'); }
      toast({ title: 'Invitation sent!', description: `Invitation emailed to ${inviteEmail}` });
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createEmail.trim()) return;
    setSubmitting(true);
    setCreatedPassword(null);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}/admin/create-manager`, {
        method: 'POST', headers,
        body: JSON.stringify({ email: createEmail, full_name: createName, phone: createPhone || null }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Failed'); }
      const data = await res.json();
      setCreatedPassword(data.temporary_password);
      toast({ title: 'Manager created!', description: `Account created for ${createEmail}` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const copyPassword = () => {
    if (createdPassword) {
      navigator.clipboard.writeText(createdPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleStatus = async (manager: Manager) => {
    const newStatus = manager.status === 'active' ? 'suspended' : 'active';
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}/admin/users/${manager.user_id}/status`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast({ title: `Manager ${newStatus}`, description: `${manager.full_name || manager.email} is now ${newStatus}.` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ── KPI cards ──
  const kpiCards = stats ? [
    {
      label: 'Total Collected', val: formatUGX(stats.total_collected),
      icon: <TrendingUp className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50',
    },
    {
      label: 'Occupancy Rate', val: `${(stats.occupancy_rate * 100).toFixed(1)}%`,
      icon: <Building2 className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/10',
    },
    {
      label: 'Active Tenants', val: String(stats.active_tenants),
      sub: `+${stats.new_this_month} this month`,
      icon: <UserCheck className="h-5 w-5" />, color: 'text-accent', bg: 'bg-accent/10',
    },
    {
      label: 'Outstanding', val: formatUGX(stats.total_outstanding),
      icon: <AlertTriangle className="h-5 w-5" />, color: 'text-rose-600', bg: 'bg-rose-50',
    },
  ] : [];

  // ── Monthly revenue (for demo: evenly distribute) ──
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const monthlyData = months.map((m, i) => ({
    month: m,
    amount: stats ? Math.round(stats.total_collected / 12 * (0.8 + Math.random() * 0.4)) : 0,
    active: i <= now.getMonth(),
  }));
  const maxAmount = Math.max(...monthlyData.filter(d => d.active).map(d => d.amount), 1);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-muted">
            <Menu className="h-5 w-5" />
          </button>
          <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">SA</div>
          <div>
            <h1 className="font-display font-bold text-base md:text-lg">Super Admin</h1>
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* ═══════════ OVERVIEW ═══════════ */}
          {tab === 'overview' && (
            <div className="space-y-6 max-w-5xl">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
                {kpiCards.map(s => (
                  <div key={s.label} className="bg-card border border-border rounded-2xl p-4 md:p-5 shadow-sm">
                    <div className={`${s.bg} ${s.color} w-9 h-9 rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
                    <div className="text-lg md:text-2xl font-display font-bold">
                      {loading ? <div className="h-6 w-20 bg-muted animate-pulse rounded" /> : s.val}
                    </div>
                    <div className="text-sm font-semibold text-foreground mt-0.5">{s.label}</div>
                    {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Monthly Revenue */}
              <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
                <h3 className="font-display font-semibold text-base mb-1">Monthly Revenue</h3>
                <p className="text-xs text-muted-foreground mb-6">Estimated distribution (UGX)</p>
                <div className="flex items-end gap-2 md:gap-3 h-36">
                  {monthlyData.map(d => (
                    <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {d.active ? formatUGX(d.amount).replace('UGX ', '').slice(0, 6) : ''}
                      </span>
                      <div
                        className={`w-full rounded-md transition-all duration-300 ${
                          d.active ? 'bg-accent/70 hover:bg-accent' : 'bg-muted/30'
                        }`}
                        style={{ height: d.active ? `${(d.amount / maxAmount) * 120}px` : '4px' }}
                      />
                      <span className={`text-[10px] font-semibold ${d.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {d.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Property + Users */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Property Breakdown */}
                <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
                  <h3 className="font-display font-semibold text-base mb-4">Property Breakdown</h3>
                  {loading ? (
                    <div className="h-20 bg-muted animate-pulse rounded" />
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-primary" />
                          <span className="text-sm">Occupied</span>
                        </div>
                        <span className="text-sm font-semibold">{stats?.occupied_properties ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-muted-foreground/40" />
                          <span className="text-sm">Vacant</span>
                        </div>
                        <span className="text-sm font-semibold">{stats?.vacant_properties ?? 0}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${((stats?.occupancy_rate ?? 0) * 100)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats?.total_properties ?? 0} total properties · {(stats?.occupancy_rate ?? 0) * 100}% occupied
                      </p>
                    </div>
                  )}
                </div>

                {/* User Summary */}
                <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
                  <h3 className="font-display font-semibold text-base mb-4">User Summary</h3>
                  {loading ? (
                    <div className="h-20 bg-muted animate-pulse rounded" />
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-accent" />
                          <span className="text-sm">Managers</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{stats?.active_managers ?? 0} active</span>
                          <span className="text-sm font-semibold">{stats?.total_managers ?? 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-primary" />
                          <span className="text-sm">Tenants</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{stats?.active_tenants ?? 0} active</span>
                          <span className="text-sm font-semibold">{stats?.total_tenants ?? 0}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Collection rate</span>
                          <span className="font-semibold text-foreground">
                            {((stats?.avg_collection_rate ?? 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                          <span>New this month</span>
                          <span className="font-semibold text-foreground">+{stats?.new_this_month ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ MANAGERS ═══════════ */}
          {tab === 'managers' && (
            <div className="space-y-5 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-xl">House Managers</h2>
                  <p className="text-sm text-muted-foreground">{managers.length} registered</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => openDialog('invite')}>
                    <Mail className="h-3.5 w-3.5" /> Invite
                  </Button>
                  <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => openDialog('create')}>
                    <Plus className="h-3.5 w-3.5" /> Create
                  </Button>
                </div>
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

          {/* ═══════════ SETTINGS ═══════════ */}
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

      {/* ── Combined Invite/Create Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {dialogMode === 'invite' ? 'Invite House Manager' : 'Create House Manager'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'invite'
                ? 'Send an invitation email to a new house manager.'
                : 'Create a manager account immediately. The manager will receive credentials.'}
            </DialogDescription>
          </DialogHeader>

          {createdPassword ? (
            /* Success state — show password */
            <div className="mt-4 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-emerald-800">Manager Account Created</p>
                <p className="text-xs text-emerald-600 mt-1">Share this temporary password with the manager</p>
              </div>
              <div className="bg-muted rounded-xl p-4">
                <label className="text-xs font-medium text-muted-foreground">Temporary Password</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono select-all">
                    {createdPassword}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyPassword} className="shrink-0 gap-1.5">
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
              <Button className="w-full" variant="outline" onClick={() => { setDialogOpen(false); setCreatedPassword(null); }}>
                Done
              </Button>
            </div>
          ) : (
            <>
              {/* Mode tabs */}
              <Tabs value={dialogMode} onValueChange={(v) => setDialogMode(v as 'invite' | 'create')} className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="invite" className="flex-1">Send Invite</TabsTrigger>
                  <TabsTrigger value="create" className="flex-1">Create Now</TabsTrigger>
                </TabsList>

                <TabsContent value="invite">
                  <form onSubmit={handleInvite} className="space-y-4 mt-4">
                    <div>
                      <Label>Email Address</Label>
                      <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                        placeholder="manager@example.com" required className="mt-1" />
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="create">
                  <form onSubmit={handleCreate} className="space-y-4 mt-4">
                    <div>
                      <Label>Full Name *</Label>
                      <Input type="text" value={createName} onChange={e => setCreateName(e.target.value)}
                        placeholder="John Mukasa" required className="mt-1" />
                    </div>
                    <div>
                      <Label>Email Address *</Label>
                      <Input type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)}
                        placeholder="manager@example.com" required className="mt-1" />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input type="tel" value={createPhone} onChange={e => setCreatePhone(e.target.value)}
                        placeholder="+256 700 000000" className="mt-1" />
                    </div>
                    <Button type="submit" disabled={submitting} className="w-full">
                      {submitting ? 'Creating...' : 'Create Account'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
