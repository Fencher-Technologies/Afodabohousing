import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Users, Home, DollarSign, Building2, Search, Shield, TrendingUp,
  CheckCircle, Clock, XCircle, ChevronRight, RefreshCcw
} from 'lucide-react';
import { format } from 'date-fns';

interface UserRow { id: string; email: string; full_name?: string; phone?: string; role?: string; created_at: string; }
interface PropRow { id: string; title: string; district: string; rent_amount: number; status: string; manager_email?: string; property_type: string; }
interface TenancyRow { id: string; property_id: string; tenant_id: string; rent_amount: number; status: string; rent_end_date: string; rent_period: string; }
interface PaymentRow { id: string; amount: number; status: string; created_at: string; tenant_id: string; manager_id: string; notes?: string; }

type Tab = 'overview' | 'users' | 'properties' | 'tenancies' | 'payments';

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    available: 'bg-green-100 text-green-800',
    occupied: 'bg-blue-100 text-blue-800',
    inactive: 'bg-gray-100 text-gray-500',
    active: 'bg-green-100 text-green-800',
    expired: 'bg-yellow-100 text-yellow-800',
    terminated: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    uploaded: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    tenant: 'bg-secondary text-secondary-foreground',
    house_manager: 'bg-primary/10 text-primary',
    admin: 'bg-accent/20 text-accent',
  };
  return map[s] || 'bg-muted text-muted-foreground';
};

export default function AdminDashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [props, setProps] = useState<PropRow[]>([]);
  const [tenancies, setTenancies] = useState<TenancyRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');

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

    // Fetch profiles for all users
    if (rolesRes.data) {
      const allProfiles = await supabase.from('profiles').select('user_id, full_name, phone');
      const profileMap: Record<string, { full_name?: string; phone?: string }> = {};
      allProfiles.data?.forEach(p => { profileMap[p.user_id] = { full_name: p.full_name ?? undefined, phone: p.phone ?? undefined }; });

      const enriched: UserRow[] = rolesRes.data.map(r => ({
        id: r.user_id,
        email: '',
        full_name: profileMap[r.user_id]?.full_name,
        phone: profileMap[r.user_id]?.phone,
        role: r.role,
        created_at: r.created_at,
      }));
      setUsers(enriched);
    }

    if (propsRes.data) setProps(propsRes.data as PropRow[]);
    if (tenRes.data) setTenancies(tenRes.data as TenancyRow[]);
    if (payRes.data) setPayments(payRes.data as PaymentRow[]);
    setLoading(false);
  };

  const totalRevenue = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);
  const pendingPayments = payments.filter(p => p.status === 'uploaded').length;

  const stats = [
    { icon: <Users className="h-5 w-5" />, label: 'Total Users', val: users.length, color: 'text-primary', sub: `${users.filter(u => u.role === 'tenant').length} tenants, ${users.filter(u => u.role === 'house_manager').length} managers` },
    { icon: <Building2 className="h-5 w-5" />, label: 'Properties', val: props.length, color: 'text-accent', sub: `${props.filter(p => p.status === 'available').length} available, ${props.filter(p => p.status === 'occupied').length} occupied` },
    { icon: <Home className="h-5 w-5" />, label: 'Active Tenancies', val: tenancies.filter(t => t.status === 'active').length, color: 'text-green-600', sub: `${tenancies.filter(t => t.status === 'expired').length} expired` },
    { icon: <DollarSign className="h-5 w-5" />, label: 'Confirmed Revenue', val: `UGX ${(totalRevenue / 1000000).toFixed(1)}M`, color: 'text-primary', sub: `${pendingPayments} pending review` },
  ];

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: `Users (${users.length})` },
    { id: 'properties', label: `Properties (${props.length})` },
    { id: 'tenancies', label: `Tenancies (${tenancies.length})` },
    { id: 'payments', label: `Payments (${payments.length})` },
  ];

  const filteredUsers = users.filter(u =>
    !userSearch || u.full_name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleDeactivateProperty = async (id: string) => {
    await supabase.from('properties').update({ status: 'inactive' }).eq('id', id);
    toast({ title: 'Property deactivated' });
    fetchAll();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-accent" />
              <span className="text-accent font-medium text-sm uppercase tracking-wide">Admin Panel</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">Afodabohousing Admin</h1>
            <p className="text-muted-foreground mt-1">Full platform management console</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-5 shadow-card">
              <div className={`${s.color} mb-2`}>{s.icon}</div>
              <div className="text-2xl font-display font-bold text-foreground">{loading ? '…' : s.val}</div>
              <div className="text-sm text-muted-foreground font-medium">{s.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Payments needing action */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-card">
              <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                Payments Awaiting Review ({pendingPayments})
              </h3>
              {payments.filter(p => p.status === 'uploaded').length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">All payments reviewed ✓</p>
              ) : (
                <div className="space-y-3">
                  {payments.filter(p => p.status === 'uploaded').map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">UGX {p.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'MMM dd, yyyy')}</p>
                      </div>
                      <Badge className={statusBadge(p.status)}>{p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Role breakdown */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-card">
              <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                User Breakdown
              </h3>
              {[
                { label: 'Tenants', count: users.filter(u => u.role === 'tenant').length, color: 'bg-secondary', pct: users.length ? Math.round(users.filter(u => u.role === 'tenant').length / users.length * 100) : 0 },
                { label: 'House Managers', count: users.filter(u => u.role === 'house_manager').length, color: 'bg-primary', pct: users.length ? Math.round(users.filter(u => u.role === 'house_manager').length / users.length * 100) : 0 },
                { label: 'Admins', count: users.filter(u => u.role === 'admin').length, color: 'bg-accent', pct: users.length ? Math.round(users.filter(u => u.role === 'admin').length / users.length * 100) : 0 },
              ].map(r => (
                <div key={r.label} className="mb-4">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-foreground">{r.label}</span>
                    <span className="text-muted-foreground">{r.count} ({r.pct}%)</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${r.color} rounded-full transition-all`} style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── USERS ───────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name…" value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold">Role</th>
                      <th className="text-left py-3 px-4 font-semibold">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="border-t border-border hover:bg-secondary/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{u.full_name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 8)}…</div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{u.phone || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(u.role || '')}`}>
                            {u.role?.replace('_', ' ') || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">{format(new Date(u.created_at), 'MMM dd, yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── PROPERTIES ──────────────────────────────────────────── */}
        {tab === 'properties' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Property</th>
                    <th className="text-left py-3 px-4 font-semibold">Location</th>
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Rent (UGX)</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {props.map(p => (
                    <tr key={p.id} className="border-t border-border hover:bg-secondary/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground line-clamp-1 max-w-[200px]">{p.title}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{p.district}</td>
                      <td className="py-3 px-4 text-muted-foreground capitalize">{(p.property_type as string).replace('_', ' ')}</td>
                      <td className="py-3 px-4 font-medium">{p.rent_amount?.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/properties/${p.id}`)}>
                            View
                          </Button>
                          {p.status !== 'inactive' && (
                            <Button size="sm" variant="destructive" onClick={() => handleDeactivateProperty(p.id)}>
                              Deactivate
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
        )}

        {/* ── TENANCIES ───────────────────────────────────────────── */}
        {tab === 'tenancies' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Tenancy ID</th>
                    <th className="text-left py-3 px-4 font-semibold">Rent Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Period</th>
                    <th className="text-left py-3 px-4 font-semibold">Start → End</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tenancies.map(t => (
                    <tr key={t.id} className="border-t border-border hover:bg-secondary/50">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{t.id.slice(0, 12)}…</td>
                      <td className="py-3 px-4 font-medium">UGX {t.rent_amount?.toLocaleString()}</td>
                      <td className="py-3 px-4 capitalize text-muted-foreground">{t.rent_period}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{t.rent_end_date}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PAYMENTS ────────────────────────────────────────────── */}
        {tab === 'payments' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Amount (UGX)</th>
                    <th className="text-left py-3 px-4 font-semibold">Notes</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-t border-border hover:bg-secondary/50">
                      <td className="py-3 px-4 text-muted-foreground text-xs">{format(new Date(p.created_at), 'MMM dd, yyyy')}</td>
                      <td className="py-3 px-4 font-semibold">{p.amount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs max-w-[160px] truncate">{p.notes || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {p.notes ? (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Uploaded
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
