import { format } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  TrendingUp, AlertTriangle, Home, UserCheck, Calendar,
  ChevronRight, ArrowUp, ArrowDown, BarChart3, Search, Crown,
  MoreHorizontal, X, Download, ArrowUpDown, ChevronLeft, ChevronsLeft, ChevronsRight,
  KeyRound, Trash2, XCircle, Eye,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend
} from 'recharts';
import { PhoneInput } from '@/components/ui/phone-input';

type Tab = 'overview' | 'managers' | 'approvals' | 'settings';

type DashboardStats = {
  total_managers: number; total_tenants: number;
  active_managers: number; active_tenants: number;
  new_this_month: number;
  total_properties: number;
  occupied_properties: number; vacant_properties: number;
  occupancy_rate: number;
  total_collected: number; total_outstanding: number;
  avg_collection_rate: number; recent_payments_count: number;
  active_subscriptions: number;
  subscription_revenue_total: number;
  subscription_revenue_this_month: number;
  subscription_growth_pct: number;
};

type Manager = {
  id: string; user_id: string; email: string;
  full_name: string | null; photo_url?: string | null; role: string; status: string;
  created_at: string | null; property_count: number;
  overdue_tenants: number; total_outstanding: number;
  subscription_plan?: string | null; subscription_status?: string | null;
};

/** A listing waiting on a quality decision before it can go public. */
type PendingProperty = {
  id: string;
  title: string | null;
  description: string | null;
  images: string[] | null;
  address: string | null;
  city: string | null;
  monthly_rent: number | null;
  currency: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  created_at: string | null;
  submitted_for_review_at: string | null;
  review_status: string;
  manager_name: string | null;
  manager_email: string | null;
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
  suspended: 'text-rose-700 bg-rose-50 border-rose-200',
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
};

/** Real month-by-month series from /admin/stats/trends, oldest first. */
type DashboardTrends = {
  months: string[];
  rent_recorded: number[];
  new_tenants: number[];
  new_managers: number[];
  subscription_revenue: number[];
};

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'approvals', label: 'Approvals', icon: <UserCheck className="h-4 w-4" /> },
  { id: 'managers', label: 'Managers', icon: <Users className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <Shield className="h-4 w-4" /> },
];

const CHART_COLORS = ['#1A2332', '#0F1A2A', '#D32F2F', '#15202B', '#6366F5', '#10B981', '#F59E0B', '#8B5CF6'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatAmount(amount: number): string {
  return `$${(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
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

export default function SuperAdminDashboard({ initialTab = 'overview' }: { initialTab?: Tab }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const pathSeg = location.pathname.split('/').filter(Boolean).pop() ?? '';
  const tab = (['overview', 'approvals', 'managers', 'settings'] as const).includes(pathSeg as Tab)
    ? (pathSeg as Tab)
    : initialTab;
  const setTab = (t: Tab) => navigate(`/dashboard/super-admin${t === 'overview' ? '' : `/${t}`}`);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trends, setTrends] = useState<DashboardTrends | null>(null);
  const [boostStats, setBoostStats] = useState<{ total_revenue: number; active_boosts: number } | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [pendingManagers, setPendingManagers] = useState<Manager[]>([]);
  // Listings awaiting a quality decision. A property is public only once it
  // is approved, which is the promise every subscription plan makes.
  const [pendingProperties, setPendingProperties] = useState<PendingProperty[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Managers table state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<'name' | 'status' | null>(null);
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
    if (statusFilter !== 'all') {
      list = list.filter(m => m.status === statusFilter);
    }
    if (sortColumn) {
      list.sort((a, b) => {
        let cmp = 0;
        if (sortColumn === 'name') cmp = (a.full_name || a.email).localeCompare(b.full_name || b.email);
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

  const toggleSort = (col: 'name' | 'status') => {
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
    const csv = [['Name', 'Email', 'Status', 'Subscription', 'Sub Status', 'Joined'].join(',')];
    selected.forEach(m => csv.push([m.full_name || '', m.email, m.status, m.subscription_plan || '—', m.subscription_status || '', m.created_at || ''].join(',')));
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'managers.csv'; a.click();
    URL.revokeObjectURL(url);
    clearSelection();
  };

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'invite' | 'create'>('create');
  const [inviteEmail, setInviteEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [passwordDialogTitle, setPasswordDialogTitle] = useState('Manager Account Created');
  const [passwordDialogDesc, setPasswordDialogDesc] = useState('Share this temporary password with the manager');
  const [removeTarget, setRemoveTarget] = useState<Manager | null>(null);
  const [removing, setRemoving] = useState(false);

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
      const [statsRes, usersRes, boostRes, pendingRes, propsRes, trendsRes] = await Promise.all([
        fetch(`${apiBase}/admin/stats`, { headers }),
        fetch(`${apiBase}/admin/users?role=house_manager`, { headers }),
        fetch(`${apiBase}/boosts/stats`, { headers }),
        fetch(`${apiBase}/admin/pending-managers`, { headers }),
        fetch(`${apiBase}/admin/properties/pending`, { headers }),
        fetch(`${apiBase}/admin/stats/trends?months=6`, { headers }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (trendsRes.ok) setTrends(await trendsRes.json());
      if (usersRes.ok) setManagers(await usersRes.json());
      if (boostRes.ok) setBoostStats(await boostRes.json());
      if (pendingRes.ok) setPendingManagers(await pendingRes.json());
      if (propsRes.ok) {
        const payload = await propsRes.json();
        setPendingProperties(payload?.items ?? []);
      }
    } catch (err: any) {
      console.error('Failed to fetch admin data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user]);

  // ─── Chart data (real, from /admin/stats/trends) ────────────

  const monthLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return format(new Date(y, m - 1, 1), 'MMM');
  };
  const trendRows = (trends?.months ?? []).map((key, i) => ({
    month: monthLabel(key),
    rent: trends!.rent_recorded[i] ?? 0,
    subscriptions: trends!.subscription_revenue[i] ?? 0,
    tenants: trends!.new_tenants[i] ?? 0,
    managers: trends!.new_managers[i] ?? 0,
  }));
  const rangeLabel = trends && trends.months.length
    ? `${monthLabel(trends.months[0])} – ${monthLabel(trends.months[trends.months.length - 1])} ${trends.months[trends.months.length - 1].slice(0, 4)}`
    : '';
  const hasData = (key: 'rent' | 'subscriptions' | 'tenants' | 'managers') => trendRows.some(r => r[key] > 0);

  // ── Manager dialogs ──

  const openDialog = (mode: 'invite' | 'create') => {
    setDialogMode(mode);
    setCreatedPassword(null);
    setPasswordDialogTitle('Manager Account Created');
    setPasswordDialogDesc('Share this temporary password with the manager');
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
    if (!createName.trim() || !createPhone.trim()) return;
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

  const handleResetPassword = async (m: Manager) => {
    setSubmitting(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}/admin/reset-tenant-password`, {
        method: 'POST', headers,
        body: JSON.stringify({ user_id: m.user_id }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Failed'); }
      const data = await res.json();
      setPasswordDialogTitle('Password Reset');
      setPasswordDialogDesc(`One-time password for ${m.full_name || m.email}. The manager must sign in with it next time.`);
      setCreatedPassword(data.temporary_password);
      setDialogMode('create');
      setDialogOpen(true);
      toast({ title: 'Password reset', description: 'New one-time password generated.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleRemoveManager = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}/admin/users/${removeTarget.user_id}`, {
        method: 'DELETE', headers,
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Failed'); }
      toast({ title: 'Manager removed', description: `${removeTarget.full_name || removeTarget.email} was removed.` });
      setRemoveTarget(null);
      clearSelection();
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setRemoving(false);
  };

  const handleApproveManager = async (m: Manager) => {    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}/admin/users/${m.user_id}/status`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'active' }),
      });
      if (!res.ok) throw new Error('Failed to approve');
      toast({ title: 'Manager approved', description: `${m.full_name || m.email} is now active.` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  /** Approve or reject a listing. Rejection needs a reason, because without
   *  one the house manager has nothing to act on. */
  const handleReviewProperty = async (p: PendingProperty, decision: 'approved' | 'rejected') => {
    let notes = '';
    if (decision === 'rejected') {
      notes = (window.prompt(`What needs to change on "${p.title || 'this listing'}"?`) || '').trim();
      if (!notes) return;
    }
    setReviewingId(p.id);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}/admin/properties/${p.id}/review`, {
        method: 'POST', headers,
        body: JSON.stringify({ decision, notes: notes || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || 'Failed to record the decision');
      }
      toast({
        title: decision === 'approved' ? 'Listing approved' : 'Listing sent back',
        description:
          decision === 'approved'
            ? `"${p.title}" is now live and the manager has been notified.`
            : `The manager has been told what to change on "${p.title}".`,
      });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setReviewingId(null);
    }
  };

  const handleRejectManager = async (m: Manager) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}/admin/users/${m.user_id}/status`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      toast({ title: 'Manager rejected', description: `${m.full_name || m.email} has been rejected.` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ── Render ──

  return (
    <div>
      <div className="p-4 md:p-6">
          {/* ── Tab navigation ── */}
          <div className="flex items-center gap-1 border-b border-border mb-6 pb-px overflow-x-auto">
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => {
                setTab(item.id);
                navigate(`/dashboard/super-admin${item.id === 'overview' ? '' : `/${item.id}`}`);
              }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                  tab === item.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                {item.icon} {item.label}
              </button>
            ))}
          </div>
          {/* ═══════════ OVERVIEW ═══════════ */}
          {tab === 'overview' && (
            <div className="space-y-6 max-w-7xl">

              {/* ── TOP STAT CARDS ──
                  Every figure here is a real count. There are deliberately no
                  sparklines or percentage arrows except subscription growth,
                  which the API computes; the charts below use real history. */}
              <div className="grid grid-cols-2 xl:grid-cols-6 gap-3 md:gap-4">
                {[
                  {
                    label: 'Total Properties', icon: <Building2 className="h-5 w-5" />, color: 'text-primary', bg: 'bg-muted',
                    val: String(stats?.total_properties ?? 0), sub: `${stats?.occupied_properties ?? 0} occupied · ${stats?.vacant_properties ?? 0} vacant`,
                  },
                  {
                    label: 'House Managers', icon: <Users className="h-5 w-5" />, color: 'text-accent', bg: 'bg-muted',
                    val: String(stats?.active_managers ?? 0), sub: `${(stats?.total_managers ?? 0) - (stats?.active_managers ?? 0)} not active`,
                  },
                  {
                    label: 'Active Tenants', icon: <UserCheck className="h-5 w-5" />, color: 'text-sky-600', bg: 'bg-sky-50',
                    val: String(stats?.active_tenants ?? 0), sub: `${stats?.new_this_month ?? 0} new accounts this month`,
                  },
                  {
                    label: 'Active Subs', icon: <Crown className="h-5 w-5" />, color: 'text-gold', bg: 'bg-muted',
                    val: String(stats?.active_subscriptions ?? 0), sub: 'Currently running plans',
                    trend: stats?.subscription_growth_pct || 0,
                  },
                  {
                    label: 'Sub Revenue (MTD)', icon: <DollarSign className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50',
                    val: formatAmount(stats?.subscription_revenue_this_month ?? 0), sub: `Total: ${formatAmount(stats?.subscription_revenue_total ?? 0)}`,
                  },
                  {
                    label: 'Rent Recorded', icon: <BarChart3 className="h-5 w-5" />, color: 'text-primary', bg: 'bg-muted',
                    val: formatAmount(stats?.total_collected ?? 0), sub: `${stats?.recent_payments_count ?? 0} confirmed payments, all time`,
                  },
                ].map(card => (
                  <div key={card.label} className="bg-card border border-border rounded-2xl p-4 md:p-5 shadow-sm relative overflow-hidden">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`${card.bg} ${card.color} w-9 h-9 rounded-xl flex items-center justify-center`}>{card.icon}</div>
                    </div>
                    <div className="text-xl md:text-2xl font-display font-bold">
                      {loading ? <div className="h-6 w-24 bg-muted animate-pulse rounded" /> : card.val}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-semibold text-foreground">{card.label}</span>
                      {card.trend ? <TrendBadge value={card.trend} /> : null}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
                  </div>
                ))}
              </div>

              {/* ── TRENDS (real history; empty months are shown as empty) ── */}
              {(() => {
                const panel = (
                  title: string, note: string, icon: React.ReactNode, hasAny: boolean, chart: React.ReactNode,
                ) => (
                  <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-display font-semibold text-base">{title}</h3>
                      {icon}
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{note}{rangeLabel ? ` · ${rangeLabel}` : ''}</p>
                    <div className="h-64">
                      {!trends ? (
                        <div className="h-full bg-muted/40 animate-pulse rounded-xl" />
                      ) : !hasAny ? (
                        <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-6">
                          Nothing recorded in this period yet. It will appear here as activity comes in.
                        </div>
                      ) : chart}
                    </div>
                  </div>
                );
                const axis = { tick: { fontSize: 11 }, stroke: 'hsl(var(--muted-foreground))' };
                return (
                  <div className="grid lg:grid-cols-2 gap-4">
                    {panel('Rent recorded per month', 'Confirmed payments, US$', <TrendingUp className="h-4 w-4 text-muted-foreground" />, hasData('rent'),
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendRows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" {...axis} />
                          <YAxis {...axis} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                          <Tooltip formatter={(v: number) => formatAmount(v)} />
                          <Line type="monotone" dataKey="rent" name="Rent recorded" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>)}
                    {panel('Subscription revenue per month', 'Paid plans, US$', <DollarSign className="h-4 w-4 text-muted-foreground" />, hasData('subscriptions'),
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendRows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="month" {...axis} />
                          <YAxis {...axis} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                          <Tooltip formatter={(v: number) => formatAmount(v)} />
                          <Bar dataKey="subscriptions" name="Subscription revenue" fill={CHART_COLORS[5]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>)}
                    <div className="lg:col-span-2">
                      {panel('New sign-ups per month', 'Accounts created', <Users className="h-4 w-4 text-muted-foreground" />, hasData('tenants') || hasData('managers'),
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={trendRows} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="month" {...axis} />
                            <YAxis {...axis} allowDecimals={false} />
                            <Tooltip />
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="tenants" name="Tenants" fill={CHART_COLORS[4]} radius={[4, 4, 0, 0]} />
                            <Bar dataKey="managers" name="House managers" fill={CHART_COLORS[6]} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>)}
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* ═══════════ APPROVALS ═══════════ */}
          {tab === 'approvals' && (
            <div className="space-y-5 max-w-4xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-xl">Pending Approvals</h2>
                  <p className="text-sm text-muted-foreground">
                    {pendingManagers.length} manager{pendingManagers.length === 1 ? '' : 's'} and{' '}
                    {pendingProperties.length} listing{pendingProperties.length === 1 ? '' : 's'} awaiting review
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
                  <RefreshCcw className="h-3.5 w-3.5" /> Refresh
                </Button>
              </div>

              {pendingManagers.length === 0 ? (
                <div className="text-center py-24 bg-card border border-border rounded-2xl">
                  <UserCheck className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
                  <p className="text-xl font-display font-bold text-foreground">All caught up!</p>
                  <p className="text-sm mt-2 text-muted-foreground">No pending manager registrations.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingManagers.map(m => (
                    <div key={m.id} className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <ManagerAvatar photoUrl={m.photo_url} fullName={m.full_name} email={m.email} userId={m.user_id} size="h-12 w-12 text-sm" />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{m.full_name || 'Unnamed'}</p>
                          <p className="text-sm text-muted-foreground">{m.email}</p>
                          <p className="text-xs text-muted-foreground">Registered {m.created_at ? format(new Date(m.created_at), 'MMM dd, yyyy') : ''}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="gradient-primary text-primary-foreground h-9 gap-1"
                          onClick={() => handleApproveManager(m)}>
                          <CheckCircle2 className="h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="h-9 gap-1"
                          onClick={() => handleRejectManager(m)}>
                          <XCircle className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Listing quality review ──
                  Every plan promises "Listings reviewed and approved by our QA
                  team". A property stays invisible to house seekers until it
                  is approved here. */}
              <div className="pt-4">
                <h3 className="font-display font-bold text-lg">Listings in review</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  A listing is not visible to house seekers until it is approved.
                </p>

                {pendingProperties.length === 0 ? (
                  <div className="text-center py-16 bg-card border border-border rounded-2xl">
                    <CheckCircle2 className="h-14 w-14 mx-auto mb-3 text-muted-foreground/20" />
                    <p className="text-lg font-display font-bold text-foreground">Nothing in the queue</p>
                    <p className="text-sm mt-1.5 text-muted-foreground">Every listing has been reviewed.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingProperties.map(p => (
                      <div key={p.id} className="bg-card border border-border rounded-2xl p-5">
                        <div className="flex gap-4">
                          {p.images?.[0] ? (
                            <img
                              src={p.images[0]}
                              alt=""
                              className="h-24 w-32 rounded-xl object-cover shrink-0 bg-muted"
                            />
                          ) : (
                            <div className="h-24 w-32 rounded-xl bg-muted shrink-0 flex items-center justify-center">
                              <Building2 className="h-7 w-7 text-muted-foreground/30" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground truncate">{p.title || 'Untitled listing'}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {[p.address, p.city].filter(Boolean).join(', ') || 'No address given'}
                            </p>
                            <p className="text-sm text-foreground mt-1">
                              {p.monthly_rent != null
                                ? `${p.currency || 'USD'} ${Number(p.monthly_rent).toLocaleString()}/month`
                                : 'No rent set'}
                              {p.bedrooms != null && p.bedrooms > 0 && ` · ${p.bedrooms} bed`}
                              {p.bathrooms != null && ` · ${p.bathrooms} bath`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1.5">
                              Listed by {p.manager_name || p.manager_email || 'unknown manager'}
                              {p.submitted_for_review_at &&
                                ` · submitted ${format(new Date(p.submitted_for_review_at), 'MMM dd, yyyy')}`}
                            </p>
                            {p.description && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4 justify-end">
                          <Button
                            size="sm" variant="outline" className="h-9 gap-1.5"
                            onClick={() => window.open(`/properties/${p.id}`, '_blank', 'noopener')}
                          >
                            <Eye className="h-4 w-4" /> View listing
                          </Button>
                          <Button
                            size="sm" variant="destructive" className="h-9 gap-1"
                            disabled={reviewingId === p.id}
                            onClick={() => handleReviewProperty(p, 'rejected')}
                          >
                            <XCircle className="h-4 w-4" /> Needs changes
                          </Button>
                          <Button
                            size="sm" className="gradient-primary text-primary-foreground h-9 gap-1"
                            disabled={reviewingId === p.id}
                            onClick={() => handleReviewProperty(p, 'approved')}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Approve
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: 'Total Managers', value: managers.length, color: 'bg-muted text-primary' },
                  { label: 'Active', value: managers.filter(m => m.status === 'active').length, color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Suspended', value: managers.filter(m => m.status === 'suspended').length, color: 'bg-red-50 text-red-700' },
                  { label: 'Pending Invite', value: managers.filter(m => m.status === 'pending').length, color: 'bg-amber-50 text-amber-700' },
                  { label: 'Subscribed', value: managers.filter(m => m.subscription_status === 'completed').length, color: 'bg-violet-50 text-violet-700' },
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
                <div className="flex items-center gap-3 bg-muted/60 border border-border rounded-xl px-4 py-2">
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
                          <th className="text-left py-3 px-4 font-semibold">Subscription</th>
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
                          <th className="text-left py-3 px-4 font-semibold">Subscription</th>
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
                              {m.subscription_plan && m.subscription_status === 'completed' ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                                    {m.subscription_plan}
                                  </span>
                                  <span className="text-xs text-muted-foreground capitalize">{m.subscription_status}</span>
                                </div>
                              ) : m.subscription_plan ? (
                                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                                  {m.subscription_plan} · pending
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
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
                                  <DropdownMenuItem onClick={() => handleResetPassword(m)} className="gap-2">
                                    <KeyRound className="h-3.5 w-3.5" /> Reset Password
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive gap-2"
                                    onClick={() => setRemoveTarget(m)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Remove
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
                <p className="text-sm font-semibold text-emerald-800">{passwordDialogTitle}</p>
                <p className="text-xs text-emerald-600 mt-1">{passwordDialogDesc}</p>
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
                      <Label>Email Address (optional)</Label>
                      <Input type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)}
                        placeholder="manager@example.com" className="mt-1" />
                    </div>
                    <div>
                      <Label>Phone Number *</Label>
                      <PhoneInput value={createPhone} onChange={setCreatePhone} required className="mt-1" />
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

      {/* ── Remove Manager Confirm ── */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">Remove Manager?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {removeTarget?.full_name || removeTarget?.email}'s account,
              profile, properties, leases and tenants. This cannot be undone. If they have boosts,
              subscriptions or agreement documents the removal will be blocked — suspend instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveManager}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? 'Removing...' : 'Remove Manager'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
