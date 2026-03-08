import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Users, Home, DollarSign, Building2, Search, Shield, TrendingUp,
  CheckCircle, Clock, XCircle, RefreshCcw, PhoneCall, Eye, Bell,
  AlertTriangle, BarChart3, ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface UserRow { id: string; email?: string; full_name?: string; phone?: string; role?: string; created_at: string; }
interface PropRow { id: string; title: string; district: string; rent_amount: number; status: string; property_type: string; manager_id: string; }
interface TenancyRow { id: string; property_id: string; tenant_id: string; manager_id: string; rent_amount: number; status: string; rent_end_date: string; rent_period: string; rent_start_date: string; }
interface PaymentRow { id: string; amount: number; status: string; created_at: string; tenant_id: string; manager_id: string; notes?: string; proof_url?: string; }

type Tab = 'overview' | 'users' | 'properties' | 'tenancies' | 'payments';

const statusClass = (s: string) => ({
  available: 'bg-accent/10 text-accent border border-accent/20',
  occupied: 'bg-primary/10 text-primary border border-primary/20',
  inactive: 'bg-muted text-muted-foreground border border-border',
  active: 'bg-accent/10 text-accent border border-accent/20',
  expired: 'bg-secondary text-muted-foreground border border-border',
  terminated: 'bg-destructive/10 text-destructive border border-destructive/20',
  pending: 'bg-secondary text-foreground border border-border',
  uploaded: 'bg-primary/10 text-primary border border-primary/20',
  confirmed: 'bg-accent/10 text-accent border border-accent/20',
  rejected: 'bg-destructive/10 text-destructive border border-destructive/20',
  tenant: 'bg-secondary text-secondary-foreground border border-border',
  house_manager: 'bg-primary/10 text-primary border border-primary/20',
  admin: 'bg-accent/20 text-accent border border-accent/30',
}[s] || 'bg-muted text-muted-foreground');

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
  const [sendingAction, setSendingAction] = useState('');

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
        id: r.user_id,
        full_name: profileMap[r.user_id]?.full_name,
        phone: profileMap[r.user_id]?.phone,
        role: r.role,
        created_at: r.created_at,
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

  const sendAdminSMS = async (phone: string, message: string) => {
    if (!phone) { toast({ title: 'No phone number', variant: 'destructive' }); return; }
    setSendingAction(`sms-${phone}`);
    try {
      await supabase.functions.invoke('send-sms', { body: { phone, message } });
      toast({ title: 'SMS sent!', description: `Message delivered to ${phone}` });
    } catch { toast({ title: 'SMS failed', variant: 'destructive' }); }
    setSendingAction('');
  };

  const totalRevenue = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);
  const pendingPayments = payments.filter(p => p.status === 'uploaded');
  const filteredUsers = users.filter(u =>
    !userSearch || (u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.phone?.includes(userSearch))
  );

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users', badge: users.length },
    { id: 'properties', label: 'Properties', badge: props.length },
    { id: 'tenancies', label: 'Tenancies', badge: tenancies.length },
    { id: 'payments', label: 'Payments', badge: pendingPayments.length || undefined },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container max-w-7xl py-6 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
                <Shield className="h-7 w-7 text-accent" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-accent font-semibold text-xs uppercase tracking-widest">Super Admin</span>
                  <Badge className="bg-accent/20 text-accent border border-accent/30 text-xs">Full Access</Badge>
                </div>
                <h1 className="font-display text-2xl font-bold text-foreground">Admin Control Panel</h1>
                <p className="text-muted-foreground text-sm">Full platform management - Afodabohousing</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAll} className="gap-2 h-9">
              <RefreshCcw className="h-3.5 w-3.5" />Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl py-6 px-4">
        {pendingPayments.length > 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-primary shrink-0" />
            <p className="font-semibold text-foreground flex-1">
              {pendingPayments.length} payment{pendingPayments.length > 1 ? 's' : ''} awaiting manager review across the platform
            </p>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setTab('payments')}>
              View <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: <Users className="h-5 w-5" />, label: 'Total Users', val: users.length, bg: 'bg-primary/10', color: 'text-primary', sub: `${users.filter(u => u.role === 'tenant').length} tenants / ${users.filter(u => u.role === 'house_manager').length} managers` },
            { icon: <Building2 className="h-5 w-5" />, label: 'All Properties', val: props.length, bg: 'bg-accent/10', color: 'text-accent', sub: `${props.filter(p => p.status === 'available').length} available` },
            { icon: <Home className="h-5 w-5" />, label: 'Active Tenancies', val: tenancies.filter(t => t.status === 'active').length, bg: 'bg-accent/10', color: 'text-accent', sub: `${tenancies.filter(t => t.status === 'expired').length} expired` },
            { icon: <DollarSign className="h-5 w-5" />, label: 'Confirmed Revenue', val: `UGX ${(totalRevenue / 1000000).toFixed(2)}M`, bg: 'bg-primary/10', color: 'text-primary', sub: `${pendingPayments.length} awaiting review` },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-5 shadow-card hover:shadow-md transition-shadow">
              <div className={`${s.bg} ${s.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
              <div className="text-2xl font-display font-bold text-foreground">{loading ? '...' : s.val}</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className="text-xs font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-display font-bold text-lg mb-5 flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />Payments Awaiting Review
              </h3>
              {pendingPayments.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-10 w-10 text-accent mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground text-sm">All payments reviewed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPayments.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-bold text-foreground">UGX {p.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'MMM dd, yyyy')}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="gradient-primary text-primary-foreground h-7 text-xs gap-1" disabled={!!sendingAction} onClick={() => handleConfirmPayment(p.id)}>
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={!!sendingAction} onClick={() => handleRejectPayment(p.id)}>
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-display font-bold text-lg mb-5 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />User Role Breakdown
              </h3>
              {[
                { label: 'Tenants', count: users.filter(u => u.role === 'tenant').length, bar: 'bg-secondary border border-border' },
                { label: 'House Managers', count: users.filter(u => u.role === 'house_manager').length, bar: 'bg-primary' },
                { label: 'Administrators', count: users.filter(u => u.role === 'admin').length, bar: 'bg-accent' },
              ].map(r => (
                <div key={r.label} className="mb-5">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-foreground">{r.label}</span>
                    <span className="text-muted-foreground">{r.count} users ({users.length ? Math.round(r.count / users.length * 100) : 0}%)</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${r.bar} rounded-full`} style={{ width: users.length ? `${Math.round(r.count / users.length * 100)}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users */}
        {tab === 'users' && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or phone..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Full Name</th>
                      <th className="text-left py-3 px-4 font-semibold">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold">Role</th>
                      <th className="text-left py-3 px-4 font-semibold">Joined</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No users found</td></tr>
                    ) : filteredUsers.map(u => (
                      <tr key={u.id} className="border-t border-border hover:bg-secondary/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{u.full_name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 12)}...</div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{u.phone || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${statusClass(u.role || '')}`}>
                            {u.role?.replace('_', ' ') || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">{format(new Date(u.created_at), 'MMM dd, yyyy')}</td>
                        <td className="py-3 px-4">
                          {u.phone && (
                            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" disabled={sendingAction === `sms-${u.phone}`}
                              onClick={() => sendAdminSMS(u.phone!, `Hello from Afodabohousing Admin. This is an important notice regarding your account. Please contact info@afodabohousing.com. - +256788100145`)}>
                              <PhoneCall className="h-3 w-3" />SMS
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

        {/* Properties */}
        {tab === 'properties' && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold">All Properties</h3>
              <Badge className="bg-muted text-muted-foreground">{props.length} total</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Title</th>
                    <th className="text-left py-3 px-4 font-semibold">District</th>
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Rent (UGX)</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {props.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No properties</td></tr>
                  ) : props.map(p => (
                    <tr key={p.id} className="border-t border-border hover:bg-secondary/50 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground max-w-[200px]"><div className="truncate">{p.title}</div></td>
                      <td className="py-3 px-4 text-muted-foreground">{p.district}</td>
                      <td className="py-3 px-4 text-muted-foreground capitalize">{(p.property_type as string).replace('_', ' ')}</td>
                      <td className="py-3 px-4 font-bold text-foreground">{p.rent_amount?.toLocaleString()}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${statusClass(p.status)}`}>{p.status}</span></td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate(`/properties/${p.id}`)}>
                            <Eye className="h-3 w-3" />View
                          </Button>
                          {p.status !== 'inactive' ? (
                            <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={sendingAction === p.id} onClick={() => handleDeactivateProperty(p.id)}>Deactivate</Button>
                          ) : (
                            <Button size="sm" className="h-7 text-xs gradient-primary text-primary-foreground" disabled={sendingAction === `activate-${p.id}`} onClick={() => handleActivateProperty(p.id)}>Activate</Button>
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

        {/* Tenancies */}
        {tab === 'tenancies' && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold">All Tenancies</h3>
              <Badge className="bg-accent/10 text-accent border border-accent/30">{tenancies.filter(t => t.status === 'active').length} active</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Tenancy ID</th>
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
                    <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No tenancies</td></tr>
                  ) : tenancies.map(t => (
                    <tr key={t.id} className="border-t border-border hover:bg-secondary/50 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{t.id.slice(0, 14)}...</td>
                      <td className="py-3 px-4 font-bold text-foreground">UGX {t.rent_amount?.toLocaleString()}</td>
                      <td className="py-3 px-4 capitalize text-muted-foreground">{t.rent_period}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{t.rent_start_date}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{t.rent_end_date}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${statusClass(t.status)}`}>{t.status}</span></td>
                      <td className="py-3 px-4">
                        {t.status === 'active' && (
                          <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={sendingAction === `term-${t.id}`} onClick={() => handleTerminateTenancy(t.id)}>
                            Terminate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments */}
        {tab === 'payments' && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold">All Payments</h3>
              <Badge className={pendingPayments.length > 0 ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-muted text-muted-foreground'}>{pendingPayments.length} pending</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Amount (UGX)</th>
                    <th className="text-left py-3 px-4 font-semibold">Notes</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No payments</td></tr>
                  ) : payments.map(p => (
                    <tr key={p.id} className={`border-t border-border hover:bg-secondary/50 transition-colors ${p.status === 'uploaded' ? 'bg-primary/5' : ''}`}>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{format(new Date(p.created_at), 'MMM dd, yyyy')}</td>
                      <td className="py-3 px-4 font-bold text-foreground">{p.amount?.toLocaleString()}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs max-w-[200px] truncate">{p.notes || 'None'}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${statusClass(p.status)}`}>{p.status}</span></td>
                      <td className="py-3 px-4">
                        {p.status === 'uploaded' ? (
                          <div className="flex gap-2">
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
                        ) : <span className="text-xs text-muted-foreground">N/A</span>}
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
