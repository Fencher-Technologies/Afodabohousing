import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Users, Home, DollarSign, Building2, Search, Shield, TrendingUp,
  CheckCircle, Clock, XCircle, RefreshCcw, Eye, Bell,
  AlertTriangle, BarChart3, ArrowUpRight, LayoutDashboard,
  LogOut, Menu, X, ChevronRight, Activity, Pencil, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface UserRow { id: string; email?: string; full_name?: string; phone?: string; role?: string; created_at: string; }
interface PropRow { id: string; title: string; district: string; rent_amount: number; status: string; property_type: string; manager_id: string; }
interface TenancyRow { id: string; property_id: string; tenant_id: string; manager_id: string; rent_amount: number; status: string; rent_end_date: string; rent_period: string; rent_start_date: string; }
interface PaymentRow { id: string; amount: number; status: string; created_at: string; tenant_id: string; manager_id: string; notes?: string; proof_url?: string; }

type Tab = 'overview' | 'users' | 'properties' | 'tenancies' | 'payments';

const statusBadge = (s: string) => ({
  available: 'bg-accent/10 text-accent border border-accent/20',
  occupied: 'bg-primary/10 text-primary border border-primary/20',
  inactive: 'bg-muted text-muted-foreground border border-border',
  active: 'bg-accent/10 text-accent border border-accent/20',
  expired: 'bg-muted text-muted-foreground border border-border',
  terminated: 'bg-destructive/10 text-destructive border border-destructive/20',
  pending: 'bg-muted text-muted-foreground border border-border',
  uploaded: 'bg-primary/10 text-primary border border-primary/20',
  confirmed: 'bg-accent/10 text-accent border border-accent/20',
  rejected: 'bg-destructive/10 text-destructive border border-destructive/20',
  tenant: 'bg-muted text-muted-foreground border border-border',
  house_manager: 'bg-primary/10 text-primary border border-primary/20',
  admin: 'bg-accent/20 text-accent border border-accent/30',
}[s] ?? 'bg-muted text-muted-foreground');

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" /> },
  { id: 'properties', label: 'Properties', icon: <Building2 className="h-4 w-4" /> },
  { id: 'tenancies', label: 'Tenancies', icon: <Home className="h-4 w-4" /> },
  { id: 'payments', label: 'Payments', icon: <DollarSign className="h-4 w-4" /> },
];

export default function AdminDashboard() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [props, setProps] = useState<PropRow[]>([]);
  const [tenancies, setTenancies] = useState<TenancyRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [sendingAction, setSendingAction] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deleteConfirmProp, setDeleteConfirmProp] = useState<PropRow | null>(null);
  const [editDialogProp, setEditDialogProp] = useState<PropRow | null>(null);
  const [editForm, setEditForm] = useState({ title: '', district: '', rent_amount: 0, status: 'available' });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (role && role !== 'admin') { navigate('/'); return; }
    fetchAll();
  }, [user, role]);

  const fetchAll = async () => {
    setLoading(true);
    const [rolesRes, propsRes, tenRes, payRes] = await Promise.all([
      supabase.from('user_roles').select('user_id, role, created_at'),
      supabase.from('properties').select('*').order('created_at', { ascending: false }),
      supabase.from('tenancies').select('*').order('created_at', { ascending: false }),
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
    ]);

    if (rolesRes.data) {
      const allProfiles = await supabase.from('profiles').select('user_id, full_name, phone');
      const profileMap: Record<string, { full_name?: string; phone?: string }> = {};
      allProfiles.data?.forEach(p => { profileMap[p.user_id] = { full_name: p.full_name ?? undefined, phone: p.phone ?? undefined }; });
      setUsers(rolesRes.data.map(r => ({
        id: r.user_id, full_name: profileMap[r.user_id]?.full_name, phone: profileMap[r.user_id]?.phone,
        role: r.role, created_at: r.created_at,
      })));
    }
    if (propsRes.data) setProps(propsRes.data as PropRow[]);
    if (tenRes.data) setTenancies(tenRes.data as TenancyRow[]);
    if (payRes.data) setPayments(payRes.data as PaymentRow[]);
    setLoading(false);
  };

  const handleDeactivateProperty = async (id: string) => {
    setSendingAction(id);
    await supabase.from('properties').update({ status: 'inactive' }).eq('id', id);
    toast({ title: 'Property deactivated' }); setSendingAction(''); fetchAll();
  };

  const handleActivateProperty = async (id: string) => {
    setSendingAction(`activate-${id}`);
    await supabase.from('properties').update({ status: 'available' }).eq('id', id);
    toast({ title: 'Property reactivated!' }); setSendingAction(''); fetchAll();
  };

  const handleConfirmPayment = async (id: string) => {
    setSendingAction(`confirm-${id}`);
    await supabase.from('payments').update({ status: 'confirmed' }).eq('id', id);
    toast({ title: 'Payment confirmed!' }); setSendingAction(''); fetchAll();
  };

  const handleRejectPayment = async (id: string) => {
    setSendingAction(`reject-${id}`);
    await supabase.from('payments').update({ status: 'rejected' }).eq('id', id);
    toast({ title: 'Payment rejected', variant: 'destructive' }); setSendingAction(''); fetchAll();
  };

  const handleTerminateTenancy = async (id: string) => {
    setSendingAction(`term-${id}`);
    await supabase.from('tenancies').update({ status: 'terminated' }).eq('id', id);
    toast({ title: 'Tenancy terminated' }); setSendingAction(''); fetchAll();
  };

  const totalRevenue = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);
  const pendingPayments = payments.filter(p => p.status === 'uploaded');
  const filteredUsers = users.filter(u =>
    !userSearch || (u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.phone?.includes(userSearch))
  );

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-accent/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-sidebar-foreground font-semibold text-sm truncate">{user?.email?.split('@')[0]}</p>
            <p className="text-sidebar-foreground/50 text-xs flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-accent rounded-full" />Super Admin
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const badge = item.id === 'payments' ? pendingPayments.length : item.id === 'users' ? users.length : 0;
          return (
            <button key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === item.id
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}>
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {badge > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${tab === item.id ? 'bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground' : 'bg-sidebar-primary/30 text-sidebar-primary'}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-sidebar-border">
        <button onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all">
          <LogOut className="h-4 w-4" /><span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border min-h-[calc(100vh-64px)] sticky top-16 self-start h-[calc(100vh-64px)] overflow-y-auto w-60 shrink-0">
          <Sidebar />
        </aside>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-sidebar flex flex-col shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border">
                <span className="text-sidebar-foreground font-display font-bold">Admin Panel</span>
                <button onClick={() => setSidebarOpen(false)} className="text-sidebar-foreground/60"><X className="h-5 w-5" /></button>
              </div>
              <Sidebar />
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-64px)]">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors">
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex h-7 w-7 rounded-lg bg-accent/10 items-center justify-center">
                  <Shield className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-xl text-foreground capitalize">{tab === 'overview' ? 'Admin Overview' : tab}</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">Full Platform Access · Afodabohousing</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingPayments.length > 0 && (
                <Badge className="bg-accent/10 text-accent border border-accent/20 hidden sm:flex gap-1">
                  <Clock className="h-3 w-3" />{pendingPayments.length} pending
                </Badge>
              )}
              <Button size="sm" variant="outline" onClick={fetchAll} disabled={loading} className="gap-2 h-8 text-xs">
                <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Alert Banner */}
            {pendingPayments.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="bg-primary/10 rounded-xl p-2 shrink-0"><AlertTriangle className="h-4 w-4 text-primary" /></div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">{pendingPayments.length} payment{pendingPayments.length > 1 ? 's' : ''} awaiting manager review across the platform</p>
                  <p className="text-xs text-muted-foreground">Admin can intervene and confirm directly if needed</p>
                </div>
                <Button size="sm" className="gradient-primary text-primary-foreground shrink-0 gap-1 text-xs h-8" onClick={() => setTab('payments')}>
                  Review <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  {[
                    { icon: <Users className="h-5 w-5" />, label: 'Total Users', val: users.length, sub: `${users.filter(u => u.role === 'tenant').length} tenants · ${users.filter(u => u.role === 'house_manager').length} managers`, bg: 'bg-primary/10', color: 'text-primary' },
                    { icon: <Building2 className="h-5 w-5" />, label: 'All Properties', val: props.length, sub: `${props.filter(p => p.status === 'available').length} available · ${props.filter(p => p.status === 'occupied').length} occupied`, bg: 'bg-accent/10', color: 'text-accent' },
                    { icon: <Home className="h-5 w-5" />, label: 'Active Tenancies', val: tenancies.filter(t => t.status === 'active').length, sub: `${tenancies.filter(t => t.status === 'expired').length} expired · ${tenancies.filter(t => t.status === 'terminated').length} terminated`, bg: 'bg-accent/10', color: 'text-accent' },
                    { icon: <DollarSign className="h-5 w-5" />, label: 'Confirmed Revenue', val: `UGX ${totalRevenue >= 1000000 ? (totalRevenue / 1000000).toFixed(2) + 'M' : totalRevenue.toLocaleString()}`, sub: `${pendingPayments.length} awaiting review`, bg: 'bg-primary/10', color: 'text-primary' },
                  ].map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-2xl p-5 shadow-card hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`${s.bg} ${s.color} w-10 h-10 rounded-xl flex items-center justify-center`}>{s.icon}</div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className={`text-2xl font-display font-bold text-foreground`}>{loading ? <div className="h-7 w-16 bg-muted animate-pulse rounded" /> : s.val}</div>
                      <div className="text-sm font-semibold text-foreground mt-1">{s.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Pending Payments */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-accent" />
                        <h3 className="font-display font-semibold text-base">Payment Queue</h3>
                      </div>
                      {pendingPayments.length > 0 && <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs">{pendingPayments.length} pending</Badge>}
                    </div>
                    {pendingPayments.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="h-10 w-10 text-accent/40 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm font-medium">All clear — no payments pending review</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingPayments.slice(0, 5).map(p => (
                          <div key={p.id} className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              <DollarSign className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground">UGX {p.amount.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'MMM dd, yyyy')}</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <Button size="sm" className="gradient-primary text-primary-foreground h-7 w-7 p-0" disabled={!!sendingAction} onClick={() => handleConfirmPayment(p.id)}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 w-7 p-0" disabled={!!sendingAction} onClick={() => handleRejectPayment(p.id)}>
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {pendingPayments.length > 5 && (
                          <button onClick={() => setTab('payments')} className="w-full text-xs text-center text-primary hover:underline py-1">
                            View all {pendingPayments.length} pending →
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Role Breakdown */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    <div className="flex items-center gap-2 mb-5">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <h3 className="font-display font-semibold text-base">User Distribution</h3>
                    </div>
                    {[
                      { label: 'Tenants', count: users.filter(u => u.role === 'tenant').length, bar: 'bg-muted-foreground' },
                      { label: 'House Managers', count: users.filter(u => u.role === 'house_manager').length, bar: 'bg-primary' },
                      { label: 'Administrators', count: users.filter(u => u.role === 'admin').length, bar: 'bg-accent' },
                    ].map(r => (
                      <div key={r.label} className="mb-5">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-semibold text-foreground">{r.label}</span>
                          <span className="text-muted-foreground">{r.count} ({users.length ? Math.round(r.count / users.length * 100) : 0}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${r.bar} rounded-full transition-all`} style={{ width: users.length ? `${Math.round(r.count / users.length * 100)}%` : '0%' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Revenue Summary */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    <div className="flex items-center gap-2 mb-5">
                      <TrendingUp className="h-5 w-5 text-accent" />
                      <h3 className="font-display font-semibold text-base">Platform Revenue</h3>
                    </div>
                    {[
                      { label: 'Confirmed', val: payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0), textColor: 'text-accent', barColor: 'bg-accent' },
                      { label: 'Awaiting Review', val: payments.filter(p => p.status === 'uploaded').reduce((s, p) => s + p.amount, 0), textColor: 'text-primary', barColor: 'bg-primary' },
                      { label: 'Rejected', val: payments.filter(p => p.status === 'rejected').reduce((s, p) => s + p.amount, 0), textColor: 'text-destructive', barColor: 'bg-destructive' },
                    ].map(r => {
                      const total = payments.reduce((s, p) => s + p.amount, 0);
                      const pct = total > 0 ? Math.round((r.val / total) * 100) : 0;
                      return (
                        <div key={r.label} className="mb-4">
                          <div className="flex justify-between mb-1.5">
                            <span className="text-sm text-muted-foreground">{r.label}</span>
                            <span className={`text-sm font-bold ${r.textColor}`}>UGX {r.val.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${r.barColor} rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recent Properties */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        <h3 className="font-display font-semibold text-base">Recent Listings</h3>
                      </div>
                      <button onClick={() => setTab('properties')} className="text-xs text-primary hover:underline flex items-center gap-1">View all <ChevronRight className="h-3 w-3" /></button>
                    </div>
                    <div className="space-y-3">
                      {props.slice(0, 5).map(p => (
                        <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                          <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
                            <p className="text-xs text-muted-foreground">{p.district} · UGX {p.rent_amount.toLocaleString()}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize shrink-0 ${statusBadge(p.status)}`}>{p.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* USERS */}
            {tab === 'users' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-xl">Platform Users</h2>
                    <p className="text-sm text-muted-foreground">{users.length} registered · {users.filter(u => u.role === 'tenant').length} tenants · {users.filter(u => u.role === 'house_manager').length} managers</p>
                  </div>
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name or phone..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9 h-8 text-sm" />
                  </div>
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold">User</th>
                          <th className="text-left py-3 px-4 font-semibold">Phone</th>
                          <th className="text-left py-3 px-4 font-semibold">Role</th>
                          <th className="text-left py-3 px-4 font-semibold">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">No users found</td></tr>
                        ) : filteredUsers.map(u => (
                          <tr key={u.id} className="border-b border-border hover:bg-muted/30 transition-colors last:border-0">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className={`h-8 w-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${u.role === 'admin' ? 'bg-accent/10 text-accent' : u.role === 'house_manager' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                  {(u.full_name || u.id).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground">{u.full_name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 12)}…</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground">{u.phone || '—'}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${statusBadge(u.role || '')}`}>
                                {u.role?.replace('_', ' ') || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-muted-foreground text-xs">{format(new Date(u.created_at), 'MMM dd, yyyy')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PROPERTIES */}
            {tab === 'properties' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-xl">All Properties</h2>
                    <p className="text-sm text-muted-foreground">{props.length} total · {props.filter(p => p.status === 'available').length} available · {props.filter(p => p.status === 'occupied').length} occupied</p>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold">Property</th>
                          <th className="text-left py-3 px-4 font-semibold">District</th>
                          <th className="text-left py-3 px-4 font-semibold">Type</th>
                          <th className="text-left py-3 px-4 font-semibold">Rent</th>
                          <th className="text-left py-3 px-4 font-semibold">Status</th>
                          <th className="text-left py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {props.length === 0 ? (
                          <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No properties yet</td></tr>
                        ) : props.map(p => (
                          <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors last:border-0">
                            <td className="py-3.5 px-4 font-semibold text-foreground max-w-[220px]"><div className="truncate">{p.title}</div></td>
                            <td className="py-3.5 px-4 text-muted-foreground">{p.district}</td>
                            <td className="py-3.5 px-4 text-muted-foreground capitalize">{(p.property_type as string).replace('_', ' ')}</td>
                            <td className="py-3.5 px-4 font-bold text-foreground">UGX {p.rent_amount?.toLocaleString()}</td>
                            <td className="py-3.5 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${statusBadge(p.status)}`}>{p.status}</span></td>
                            <td className="py-3.5 px-4">
                              <div className="flex gap-1.5">
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate(`/properties/${p.id}`)}>
                                  <Eye className="h-3 w-3" />View
                                </Button>
                                {p.status !== 'inactive' ? (
                                  <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={sendingAction === p.id} onClick={() => handleDeactivateProperty(p.id)}>
                                    {sendingAction === p.id ? '...' : 'Deactivate'}
                                  </Button>
                                ) : (
                                  <Button size="sm" className="h-7 text-xs gradient-primary text-primary-foreground" disabled={sendingAction === `activate-${p.id}`} onClick={() => handleActivateProperty(p.id)}>
                                    {sendingAction === `activate-${p.id}` ? '...' : 'Activate'}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TENANCIES */}
            {tab === 'tenancies' && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display font-bold text-xl">All Tenancies</h2>
                  <p className="text-sm text-muted-foreground">{tenancies.length} total · {tenancies.filter(t => t.status === 'active').length} active · {tenancies.filter(t => t.status === 'expired').length} expired</p>
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold">ID</th>
                          <th className="text-left py-3 px-4 font-semibold">Rent Amount</th>
                          <th className="text-left py-3 px-4 font-semibold">Period</th>
                          <th className="text-left py-3 px-4 font-semibold">Start</th>
                          <th className="text-left py-3 px-4 font-semibold">Expires</th>
                          <th className="text-left py-3 px-4 font-semibold">Status</th>
                          <th className="text-left py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenancies.length === 0 ? (
                          <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No tenancies yet</td></tr>
                        ) : tenancies.map(t => (
                          <tr key={t.id} className="border-b border-border hover:bg-muted/30 transition-colors last:border-0">
                            <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">{t.id.slice(0, 14)}…</td>
                            <td className="py-3.5 px-4 font-bold text-foreground">UGX {t.rent_amount?.toLocaleString()}</td>
                            <td className="py-3.5 px-4 capitalize text-muted-foreground">{t.rent_period}</td>
                            <td className="py-3.5 px-4 text-muted-foreground text-xs">{t.rent_start_date}</td>
                            <td className="py-3.5 px-4 text-muted-foreground text-xs">{t.rent_end_date}</td>
                            <td className="py-3.5 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${statusBadge(t.status)}`}>{t.status}</span></td>
                            <td className="py-3.5 px-4">
                              {t.status === 'active' && (
                                <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={sendingAction === `term-${t.id}`} onClick={() => handleTerminateTenancy(t.id)}>
                                  {sendingAction === `term-${t.id}` ? '...' : 'Terminate'}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PAYMENTS */}
            {tab === 'payments' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-xl">All Payments</h2>
                    <p className="text-sm text-muted-foreground">{payments.length} records · {pendingPayments.length} awaiting review</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    {[
                      { label: 'Confirmed', val: payments.filter(p => p.status === 'confirmed').length, color: 'text-accent' },
                      { label: 'Pending', val: pendingPayments.length, color: 'text-primary' },
                      { label: 'Rejected', val: payments.filter(p => p.status === 'rejected').length, color: 'text-destructive' },
                    ].map(s => (
                      <div key={s.label} className="bg-card border border-border rounded-xl px-3 py-1.5 text-center hidden sm:block">
                        <div className={`font-bold ${s.color}`}>{s.val}</div>
                        <div className="text-muted-foreground text-xs">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold">Date</th>
                          <th className="text-left py-3 px-4 font-semibold">Amount</th>
                          <th className="text-left py-3 px-4 font-semibold">Notes</th>
                          <th className="text-left py-3 px-4 font-semibold">Status</th>
                          <th className="text-left py-3 px-4 font-semibold">Admin Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 ? (
                          <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No payments yet</td></tr>
                        ) : payments.map(p => (
                          <tr key={p.id} className={`border-b border-border hover:bg-muted/30 transition-colors last:border-0 ${p.status === 'uploaded' ? 'bg-primary/3' : ''}`}>
                            <td className="py-3.5 px-4 text-muted-foreground text-xs">{format(new Date(p.created_at), 'MMM dd, yyyy')}</td>
                            <td className="py-3.5 px-4 font-bold text-foreground">UGX {p.amount?.toLocaleString()}</td>
                            <td className="py-3.5 px-4 text-muted-foreground text-xs max-w-[200px] truncate">{p.notes || '—'}</td>
                            <td className="py-3.5 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${statusBadge(p.status)}`}>{p.status}</span></td>
                            <td className="py-3.5 px-4">
                              {(p.status === 'uploaded' || p.status === 'pending') ? (
                                <div className="flex gap-1.5">
                                  <Button size="sm" className="gradient-primary text-primary-foreground h-7 text-xs gap-1" disabled={!!sendingAction} onClick={() => handleConfirmPayment(p.id)}>
                                    <CheckCircle className="h-3 w-3" />Confirm
                                  </Button>
                                  <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" disabled={!!sendingAction} onClick={() => handleRejectPayment(p.id)}>
                                    <XCircle className="h-3 w-3" />Reject
                                  </Button>
                                </div>
                              ) : p.proof_url ? (
                                <a href={p.proof_url} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"><Eye className="h-3 w-3" />Proof</Button>
                                </a>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
