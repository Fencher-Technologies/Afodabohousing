import { useState, useEffect, useMemo } from 'react';
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
  TrendingUp, AlertTriangle, Home, UserCheck, Calendar, Activity,
  ChevronRight, ArrowUp, ArrowDown, BarChart3, Search,
  MoreHorizontal, X, Download, ArrowUpDown, ChevronLeft, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
  Legend
} from 'recharts';

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
  full_name: string | null; photo_url?: string | null; role: string; status: string;
  created_at: string | null; property_count: number;
};

function avatarInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  }
  return email.charAt(0).toUpperCase();
}

function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  const hues = [14, 182, 200, 340, 48, 260, 30];
  return `hsl(${hues[Math.abs(hash) % hues.length]}, 50%, ${40 + Math.abs(hash >> 4) % 20}%)`;
}

function ManagerAvatar({ photoUrl, fullName, email, userId, size = 'h-8 w-8 text-xs' }: { photoUrl?: string | null; fullName: string | null; email: string; userId: string; size?: string }) {
  return (
    <Avatar className={`${size} ring-2 ring-border shrink-0`}>
      <AvatarImage src={photoUrl || undefined} alt={fullName || email} />
      <AvatarFallback style={{ backgroundColor: avatarColor(userId), color: '#fff' }}>
        {avatarInitials(fullName, email)}
      </AvatarFallback>
    </Avatar>
  );
}

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  suspended: 'text-red-700 bg-red-50 border-red-200',
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
};

type TrendData = { month: string; amount: number; property?: string; manager?: string };
type RevenueShare = { name: string; value: number; color: string };
type ActivityRow = { id: string; name: string; action: string; status: 'completed' | 'pending' | 'overdue'; timestamp: string; };
type AuditEntry = { id: string; icon: React.ReactNode; description: string; time: string; };
type BarFilter = 'today' | 'week' | 'month';

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'managers', label: 'Managers', icon: <Users className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Shield className="h-4 w-4" /> },
];

const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatUGX(amount: number): string {
  return `UGX ${(amount || 0).toLocaleString()}`;
}

function MiniSparkline({ data, color = '#10b981' }: { data: number[]; color?: string }) {
  const w = 60; const h = 28;
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0" viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

function SparklineBar({ data, color = '#10b981' }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-8">
      {data.map((v, i) => (
        <div key={i} className="w-1.5 rounded-t-sm transition-all" style={{ height: `${(v / max) * 100}%`, background: color, opacity: 0.3 + 0.7 * (v / max) }} />
      ))}
    </div>
  );
}

function TrendBadge({ value, label }: { value: number; label?: string }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(value)}%{label ? ` ${label}` : ''}
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatUGX(p.value)}</p>
      ))}
    </div>
  );
};

const CenterLabel = ({ total }: { total: number }) => (
  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
    <tspan x="50%" dy="-0.5em" className="text-2xl font-bold fill-foreground">{formatUGX(total)}</tspan>
    <tspan x="50%" dy="1.5em" className="text-xs fill-muted-foreground">Total</tspan>
  </text>
);

export default function SuperAdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [boostStats, setBoostStats] = useState<{ total_revenue: number; active_boosts: number } | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Managers table state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<'name' | 'properties' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtered & sorted managers
  const filteredManagers = useMemo(() => {
    let list = [...managers];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => (m.full_name || '').toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') list = list.filter(m => m.status === statusFilter);
    if (sortColumn) {
      list.sort((a, b) => {
        let cmp = 0;
        if (sortColumn === 'name') cmp = (a.full_name || a.email).localeCompare(b.full_name || b.email);
        else if (sortColumn === 'properties') cmp = a.property_count - b.property_count;
        else if (sortColumn === 'status') cmp = a.status.localeCompare(b.status);
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [managers, searchQuery, statusFilter, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredManagers.length / pageSize));
  const paginatedManagers = filteredManagers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const allSelected = paginatedManagers.length > 0 && paginatedManagers.every(m => selectedRows.has(m.id));

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, pageSize]);

  const toggleSort = (col: 'name' | 'properties' | 'status') => {
    if (sortColumn === col) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(col); setSortDirection('asc'); }
  };

  const toggleRow = (id: string) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelectedRows(new Set());
    else setSelectedRows(new Set(paginatedManagers.map(m => m.id)));
  };

  const clearSelection = () => setSelectedRows(new Set());

  const handleBulkSuspend = async () => {
    const headers = await getHeaders();
    const ids = Array.from(selectedRows);
    for (const id of ids) {
      await fetch(`${apiBase}/admin/users/${id}/status`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'suspended' }),
      }).catch(() => {});
    }
    toast({ title: `Suspended ${ids.length} manager(s)` });
    clearSelection();
    fetchData();
  };

  const handleBulkExport = () => {
    const selected = managers.filter(m => selectedRows.has(m.id));
    const csv = [['Name', 'Email', 'Status', 'Properties', 'Joined'].join(',')];
    selected.forEach(m => csv.push([m.full_name || '', m.email, m.status, m.property_count, m.created_at || ''].join(',')));
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'managers.csv'; a.click();
    URL.revokeObjectURL(url);
    clearSelection();
  };

  // Bar chart filters
  const [registrationsFilter, setRegistrationsFilter] = useState<BarFilter>('month');
  const [leasesFilter, setLeasesFilter] = useState<BarFilter>('month');

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

  // ─── Data Fetching ──────────────────────────────────────────

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const [statsRes, usersRes, boostRes] = await Promise.all([
        fetch(`${apiBase}/admin/stats`, { headers }),
        fetch(`${apiBase}/admin/users?role=house_manager`, { headers }),
        fetch(`${apiBase}/boosts/stats`, { headers }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setManagers(await usersRes.json());
      if (boostRes.ok) setBoostStats(await boostRes.json());
    } catch (err: any) {
      console.error('Failed to fetch admin data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user]);

  // ─── Derived / Mock Data ────────────────────────────────────

  const now = new Date();
  const curMonth = now.getMonth();

  // TODO: Replace with real Supabase queries when backend endpoints exist
  // Stat card trend percentages (mock)
  const propertyTrend = 12;
  const managerTrend = -3;
  const tenantTrend = 8;
  const rentTrend = 15;

  // Sparkline data for stat cards (mock — last 8 periods)
  // TODO: query from payments/tenancies tables
  const propertySparkline = [12, 14, 13, 15, 16, 15, 17, 18];
  const managerSparkline = [8, 9, 9, 10, 10, 9, 10, 10];
  const tenantSparkline = [24, 26, 28, 30, 32, 35, 38, 42];
  const rentSparkline = [18000000, 19500000, 21000000, 20500000, 22000000, 21500000, 23000000, 25000000];

  // Rent Collection Trend — multi-line per property/manager
  // TODO: query Supabase for monthly collection grouped by property
  const rentTrendLines = [
    { name: 'Ntinda Apts', data: MONTHS.slice(0, curMonth + 1).map((_, i) => 3000000 + Math.random() * 2000000) },
    { name: 'Bukoto Heights', data: MONTHS.slice(0, curMonth + 1).map((_, i) => 2500000 + Math.random() * 1500000) },
    { name: 'Muyenga Villas', data: MONTHS.slice(0, curMonth + 1).map((_, i) => 2000000 + Math.random() * 2500000) },
  ];
  const collectionTrendData = MONTHS.slice(0, curMonth + 1).map((month, i) => ({
    month,
    ...Object.fromEntries(rentTrendLines.map(l => [l.name, l.data[i]])),
  }));
  const rangeLabel = `${MONTHS[Math.max(0, curMonth - 5)]} – ${MONTHS[curMonth]} ${now.getFullYear()}`;

  // Revenue Breakdown — donut
  // TODO: query by property or manager
  const revenueShares: RevenueShare[] = [
    { name: 'Ntinda Apts', value: 45000000, color: CHART_COLORS[0] },
    { name: 'Bukoto Heights', value: 32000000, color: CHART_COLORS[1] },
    { name: 'Muyenga Villas', value: 28000000, color: CHART_COLORS[2] },
    { name: 'Kololo Residency', value: 15000000, color: CHART_COLORS[3] },
    { name: 'Other', value: 8000000, color: CHART_COLORS[4] },
  ];
  const totalRevenue = revenueShares.reduce((s, r) => s + r.value, 0);

  // Bar chart — New Tenant Registrations
  // TODO: query from tenants table grouped by created_at
  const genBarData = (len: number) => Array.from({ length: len }, (_, i) => ({
    label: len <= 7 ? `Day ${i + 1}` : MONTHS[i] || `M${i + 1}`,
    value: Math.floor(Math.random() * 20 + 5),
  }));
  const registrationsData = registrationsFilter === 'today' ? genBarData(7)
    : registrationsFilter === 'week' ? genBarData(7)
    : genBarData(curMonth + 1);

  // Bar chart — Active Leases
  // TODO: query from tenancies/leases table
  const leasesData = leasesFilter === 'today' ? genBarData(7)
    : leasesFilter === 'week' ? genBarData(7)
    : genBarData(curMonth + 1);

  // Pending Manager Invites
  // TODO: query from invitations table
  const pendingInvitesData = [{ label: 'Pending', value: 3 }, { label: 'Accepted', value: 7 }, { label: 'Expired', value: 1 }];

  // Recent Activity
  // TODO: replace with real data from activity_log or events table
  const recentActivity: ActivityRow[] = [
    { id: '1', name: 'Sarah Nakato', action: 'Lease Signed — Ntinda Apts', status: 'completed', timestamp: '2 hours ago' },
    { id: '2', name: 'John Mukasa', action: 'Payment Made — UGX 450,000', status: 'completed', timestamp: '4 hours ago' },
    { id: '3', name: 'Grace Akello', action: 'Maintenance Request — Plumbing', status: 'pending', timestamp: '1 day ago' },
    { id: '4', name: 'Peter Ssali', action: 'Rent Overdue — Bukoto Heights', status: 'overdue', timestamp: '2 days ago' },
    { id: '5', name: 'Amina Wasso', action: 'Lease Renewed — Muyenga Villas', status: 'completed', timestamp: '3 days ago' },
    { id: '6', name: 'David Okello', action: 'Payment Pending — UGX 320,000', status: 'pending', timestamp: '4 days ago' },
  ];

  // Audit Log
  // TODO: replace with real data from audit_logs table
  const auditLog: AuditEntry[] = [
    { id: '1', icon: <Shield className="h-3.5 w-3.5" />, description: 'Role changed: John Mukasa → house_manager', time: '1 hour ago' },
    { id: '2', icon: <Mail className="h-3.5 w-3.5" />, description: 'Invite sent to grace@example.com', time: '3 hours ago' },
    { id: '3', icon: <Building2 className="h-3.5 w-3.5" />, description: 'Property added: Kololo Residency by Sarah', time: '1 day ago' },
    { id: '4', icon: <Users className="h-3.5 w-3.5" />, description: 'Tenant registered: Peter Ssali', time: '1 day ago' },
    { id: '5', icon: <AlertTriangle className="h-3.5 w-3.5" />, description: 'Account suspended: mike@example.com', time: '2 days ago' },
    { id: '6', icon: <CheckCircle2 className="h-3.5 w-3.5" />, description: 'Manager approved: Grace Akello', time: '3 days ago' },
  ];

  // ── Manager dialogs ──

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

  // ── Status badge helper ──
  const statusBadge = (s: string) => ({
    completed: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-amber-50 text-amber-700',
    overdue: 'bg-rose-50 text-rose-700',
  }[s] ?? 'bg-muted text-muted-foreground');

  // ── Render ──

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
            <div className="space-y-6 max-w-7xl">

              {/* ── TOP STAT CARDS ── */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
                {[
                  {
                    label: 'Total Properties', icon: <Building2 className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/10',
                    val: String(stats?.total_properties ?? 0), sub: `${stats?.occupied_properties ?? 0} occupied · ${stats?.vacant_properties ?? 0} vacant`,
                    trend: propertyTrend, spark: propertySparkline, sparkColor: '#6366f1',
                  },
                  {
                    label: 'House Managers', icon: <Users className="h-5 w-5" />, color: 'text-accent', bg: 'bg-accent/10',
                    // TODO: pending invites count from invitations table
                    val: String(stats?.active_managers ?? 0), sub: `${(stats?.total_managers ?? 0) - (stats?.active_managers ?? 0)} pending invite`,
                    trend: managerTrend, spark: managerSparkline, sparkColor: '#10b981',
                  },
                  {
                    label: 'Active Tenants', icon: <UserCheck className="h-5 w-5" />, color: 'text-sky-600', bg: 'bg-sky-50',
                    val: String(stats?.active_tenants ?? 0), sub: `+${stats?.new_this_month ?? 0} this month`,
                    trend: tenantTrend, spark: tenantSparkline, sparkColor: '#06b6d4',
                  },
                  {
                    label: 'Monthly Rent Collected', icon: <DollarSign className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50',
                    val: formatUGX(stats?.total_collected ?? 0), sub: `${stats?.recent_payments_count ?? 0} payments this period`,
                    trend: rentTrend, spark: rentSparkline, sparkColor: '#10b981',
                  },
                ].map(card => (
                  <div key={card.label} className="bg-card border border-border rounded-2xl p-4 md:p-5 shadow-sm relative overflow-hidden">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`${card.bg} ${card.color} w-9 h-9 rounded-xl flex items-center justify-center`}>{card.icon}</div>
                      <MiniSparkline data={card.spark} color={card.sparkColor} />
                    </div>
                    <div className="text-xl md:text-2xl font-display font-bold">
                      {loading ? <div className="h-6 w-24 bg-muted animate-pulse rounded" /> : card.val}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-semibold text-foreground">{card.label}</span>
                      <TrendBadge value={card.trend} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                  </div>
                ))}
              </div>

              {/* ── MAIN CHART ROW ── */}
              <div className="grid lg:grid-cols-2 gap-4">

                {/* Rent Collection Trend — Multi-line */}
                <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-display font-semibold text-base">Rent Collection Trend</h3>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{rangeLabel}</p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={collectionTrendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => `UGX ${(v / 1000000).toFixed(1)}M`} />
                        <Tooltip content={<CustomTooltip />} />
                        {rentTrendLines.map((l, i) => (
                          <Line key={l.name} type="monotone" dataKey={l.name} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        ))}
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Showing collection activity from {rangeLabel}</p>
                </div>

                {/* Revenue Breakdown — Donut */}
                <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-display font-semibold text-base">Revenue Breakdown</h3>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Split by property</p>
                  <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={revenueShares} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2}>
                          {revenueShares.map((entry, i) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground">
                          <tspan x="50%" dy="-0.5em" className="text-lg font-bold">{formatUGX(totalRevenue)}</tspan>
                          <tspan x="50%" dy="1.3em" className="text-xs fill-muted-foreground">Total</tspan>
                        </text>
                        <Tooltip formatter={(v: number) => formatUGX(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {revenueShares.map(s => (
                      <div key={s.name} className="flex items-center gap-1.5 text-xs">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-muted-foreground">{s.name}</span>
                        <span className="font-semibold text-foreground">{((s.value / totalRevenue) * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── SECONDARY ROW (Filterable Bar Charts) ── */}
              <div className="grid md:grid-cols-3 gap-4">
                {/* New Tenant Registrations */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-display font-semibold text-sm">New Tenant Registrations</h4>
                    <div className="flex gap-1">
                      {(['today', 'week', 'month'] as BarFilter[]).map(f => (
                        <button key={f} onClick={() => setRegistrationsFilter(f)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${registrationsFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                          {f === 'today' ? 'Today' : f === 'week' ? 'Week' : 'Month'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={registrationsData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Active Leases */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-display font-semibold text-sm">Active Leases</h4>
                    <div className="flex gap-1">
                      {(['today', 'week', 'month'] as BarFilter[]).map(f => (
                        <button key={f} onClick={() => setLeasesFilter(f)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${leasesFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                          {f === 'today' ? 'Today' : f === 'week' ? 'Week' : 'Month'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leasesData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pending Manager Invites */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-display font-semibold text-sm">Pending Manager Invites</h4>
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pendingInvitesData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={70} />
                        <Tooltip contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {pendingInvitesData.map((entry, i) => (
                            <Cell key={entry.label} fill={[CHART_COLORS[2], CHART_COLORS[0], CHART_COLORS[3]][i]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ── TABLES ROW ── */}
              <div className="grid lg:grid-cols-2 gap-4">

                {/* Recent Activity Table */}
                <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-display font-semibold text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" /> Recent Activity
                    </h3>
                    <button className="text-xs text-primary hover:underline flex items-center gap-1">
                      View all <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left py-2.5 px-4 font-semibold text-xs text-muted-foreground">Person</th>
                          <th className="text-left py-2.5 px-4 font-semibold text-xs text-muted-foreground">Action</th>
                          <th className="text-left py-2.5 px-4 font-semibold text-xs text-muted-foreground">Status</th>
                          <th className="text-right py-2.5 px-4 font-semibold text-xs text-muted-foreground">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentActivity.map(row => (
                          <tr key={row.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4 font-semibold text-foreground text-xs">{row.name}</td>
                            <td className="py-3 px-4 text-muted-foreground text-xs">{row.action}</td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusBadge(row.status)}`}>{row.status}</span>
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground text-xs">{row.timestamp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Audit Log Feed */}
                <div className="bg-card border border-border rounded-2xl shadow-sm">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-display font-semibold text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" /> Audit Log
                    </h3>
                    <button className="text-xs text-primary hover:underline flex items-center gap-1">
                      View all <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
                    {auditLog.map(entry => (
                      <div key={entry.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                        <div className="h-7 w-7 rounded-lg bg-primary/5 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          {entry.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground">{entry.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{entry.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ═══════════ MANAGERS ═══════════ */}
          {tab === 'managers' && (
            <div className="space-y-5 max-w-6xl">
              {/* Header */}
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

              {/* Stat strip */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total Managers', value: managers.length, color: 'bg-primary/10 text-primary' },
                  { label: 'Active', value: managers.filter(m => m.status === 'active').length, color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Suspended', value: managers.filter(m => m.status === 'suspended').length, color: 'bg-red-50 text-red-700' },
                  { label: 'Pending Invite', value: managers.filter(m => m.status === 'pending').length, color: 'bg-amber-50 text-amber-700' },
                ].map(s => (
                  <div key={s.label} className="bg-card border border-border rounded-xl p-3 shadow-sm">
                    <div className={`text-2xl font-display font-bold ${s.color.split(' ')[1]}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-9 w-16 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>per page</span>
                </div>
              </div>

              {/* Bulk action bar */}
              {selectedRows.size > 0 && (
                <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-2">
                  <span className="text-sm font-medium text-foreground">{selectedRows.size} selected</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleBulkSuspend}>
                    <X className="h-3 w-3" /> Suspend All
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleBulkExport}>
                    <Download className="h-3 w-3" /> Export CSV
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              )}

              {/* Table */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  {loading ? (
                    // Skeleton loading
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted border-b border-border">
                          <th className="py-3 px-4 w-10"><div className="h-4 w-4 bg-muted-foreground/20 rounded" /></th>
                          <th className="text-left py-3 px-4 font-semibold">Name</th>
                          <th className="text-left py-3 px-4 font-semibold">Properties</th>
                          <th className="text-left py-3 px-4 font-semibold">Status</th>
                          <th className="text-left py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="border-b border-border">
                            <td className="py-3 px-4"><div className="h-4 w-4 bg-muted rounded animate-pulse" /></td>
                            <td className="py-3 px-4"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-muted animate-pulse" /><div className="h-4 w-32 bg-muted rounded animate-pulse" /></div></td>
                            <td className="py-3 px-4"><div className="h-4 w-12 bg-muted rounded animate-pulse" /></td>
                            <td className="py-3 px-4"><div className="h-5 w-16 bg-muted rounded-full animate-pulse" /></td>
                            <td className="py-3 px-4"><div className="h-6 w-8 bg-muted rounded animate-pulse" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : filteredManagers.length === 0 ? (
                    // Empty state
                    <div className="py-16 text-center">
                      <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="font-display font-semibold text-foreground text-lg">No managers yet</p>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">Invite your first house manager to get started</p>
                      <Button size="sm" className="gap-1.5" onClick={() => openDialog('invite')}>
                        <Mail className="h-4 w-4" /> Invite House Manager
                      </Button>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted border-b border-border">
                          <th className="py-3 px-4 w-10">
                            <input type="checkbox" className="rounded border-border accent-primary cursor-pointer"
                              checked={allSelected} onChange={toggleAll} />
                          </th>
                          <th className="text-left py-3 px-4 font-semibold cursor-pointer select-none" onClick={() => toggleSort('name')}>
                            <span className="inline-flex items-center gap-1">
                              Name {sortColumn === 'name' && <ArrowUpDown className="h-3 w-3" />}
                            </span>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold cursor-pointer select-none" onClick={() => toggleSort('properties')}>
                            <span className="inline-flex items-center gap-1">
                              Properties {sortColumn === 'properties' && <ArrowUpDown className="h-3 w-3" />}
                            </span>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold cursor-pointer select-none" onClick={() => toggleSort('status')}>
                            <span className="inline-flex items-center gap-1">
                              Status {sortColumn === 'status' && <ArrowUpDown className="h-3 w-3" />}
                            </span>
                          </th>
                          <th className="text-left py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedManagers.map(m => (
                          <tr key={m.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('.actions-cell, input[type="checkbox"]')) return;
                              navigate(`/dashboard/super-admin/managers/${m.user_id}`);
                            }}>
                            <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                              <input type="checkbox" className="rounded border-border accent-primary cursor-pointer"
                                checked={selectedRows.has(m.id)} onChange={() => toggleRow(m.id)} />
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <ManagerAvatar photoUrl={m.photo_url} fullName={m.full_name} email={m.email} userId={m.user_id} />
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground truncate">{m.full_name || '—'}</p>
                                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={m.property_count === 0 ? 'text-muted-foreground' : 'font-semibold text-foreground'}>
                                {m.property_count === 0 ? 'Unassigned' : m.property_count}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[m.status] || 'bg-muted text-muted-foreground border-border'}`}>
                                {m.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 actions-cell" onClick={e => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[140px]">
                                  <DropdownMenuItem onClick={() => navigate(`/dashboard/super-admin/managers/${m.user_id}`)}>
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setCreateName(m.full_name || '');
                                    setCreateEmail(m.email);
                                    setDialogMode('create');
                                    setDialogOpen(true);
                                  }}>
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className={m.status === 'active' ? 'text-destructive' : ''}
                                    onClick={() => handleToggleStatus(m)}
                                  >
                                    {m.status === 'active' ? 'Suspend' : 'Reactivate'}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {/* Pagination */}
                {!loading && filteredManagers.length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredManagers.length)} of {filteredManagers.length}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                        <ChevronsLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-xs font-medium text-foreground px-2">{currentPage} / {totalPages}</span>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
                        <ChevronsRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
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
