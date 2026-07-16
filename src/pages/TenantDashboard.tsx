import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import {
  Home, MapPin, Phone, ChevronRight, Building2, Clock, Image, Settings, LogOut,
  DollarSign, ShieldCheck, Bell, Wrench, FileText, CheckCircle, XCircle,
  AlertTriangle, Menu, MessageSquare, Plus, User, KeyRound, CalendarDays,
  X, Download, Upload, ThumbsUp, ThumbsDown, FileUp, Sidebar
} from 'lucide-react';
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL || '';

type Tab = 'home' | 'payments' | 'requests' | 'agreements' | 'more';

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
  { id: 'payments', label: 'Payments', icon: <DollarSign className="h-5 w-5" /> },
  { id: 'requests', label: 'Maintenance', icon: <Wrench className="h-5 w-5" /> },
  { id: 'agreements', label: 'Agreements', icon: <FileText className="h-5 w-5" /> },
  { id: 'more', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function CalendarWidget({ dueDate }: { dueDate: string | null }) {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const days = eachDayOfInterval({ start, end });
  const startIdx = getDay(start);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-sm">{format(now, 'MMMM yyyy')}</span>
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="grid grid-cols-7 gap-0 text-center">
        {DAYS.map(d => (
          <span key={d} className="text-xs text-muted-foreground font-medium py-1">{d.slice(0, 2)}</span>
        ))}
        {Array.from({ length: startIdx }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(day => {
          const isDue = dueDate && isSameDay(day, new Date(dueDate));
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className={`py-1 text-sm rounded-lg ${
              isDue ? 'bg-primary text-primary-foreground font-bold' :
              today ? 'bg-primary/10 text-primary font-bold' :
              'text-foreground'
            }`}>
              {format(day, 'd')}
            </div>
          );
        })}
      </div>
      {dueDate && (
        <p className="text-xs text-center text-muted-foreground mt-2">
          Rent due: <span className="text-primary font-semibold">{format(new Date(dueDate), 'MMM dd')}</span>
        </p>
      )}
    </div>
  );
}

function PercentRing({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width="110" height="110" viewBox="0 0 110 110" className="transform -rotate-90">
        <circle cx="55" cy="55" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
        <circle cx="55" cy="55" r={r} fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <span className="text-2xl font-bold text-foreground absolute mt-7">{pct}%</span>
      <div className="text-center mt-2">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="bg-card border border-border rounded-xl p-5 animate-pulse space-y-3">
    <div className="h-4 bg-muted rounded w-1/3" />
    <div className="h-8 bg-muted rounded w-2/3" />
    <div className="h-4 bg-muted rounded w-1/2" />
  </div>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    confirmed: 'bg-success/10 text-success border-success/20',
    pending: 'text-muted-foreground bg-muted border-border',
    uploaded: 'text-primary bg-primary/10 border-primary/20',
    rejected: 'text-destructive bg-destructive/10 border-destructive/20',
    open: 'text-accent bg-accent/10 border-accent/20',
    in_progress: 'text-accent bg-accent/10 border-accent/20',
    resolved: 'text-success bg-success/10 border-success/20',
    completed: 'text-success bg-success/10 border-success/20',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${colors[status] || 'text-muted-foreground bg-muted border-border'}`}>
      {status === 'completed' ? 'Done' : status === 'in_progress' ? 'In progress' : status}
    </span>
  );
}

function initBg(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  const hues = [14, 182, 200, 340, 48, 260, 30];
  return `hsl(${hues[Math.abs(h) % hues.length]}, 50%, 45%)`;
}

function initials(name: string, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  }
  return email.charAt(0).toUpperCase();
}

export default function TenantDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeLease, setActiveLease] = useState<any>(null);
  const [tenantRecord, setTenantRecord] = useState<any>(null);
  const [managerProfile, setManagerProfile] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [maintenanceReqs, setMaintenanceReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });
  const [sendingPassword, setSendingPassword] = useState(false);

  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({ title: '', description: '', priority: 'medium' });
  const [sendingMaintenance, setSendingMaintenance] = useState(false);

  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentPage, setPaymentPage] = useState(0);
  const PAGE_SIZE = 5;

  const [requestFilter, setRequestFilter] = useState<'all' | 'open' | 'resolved'>('all');

  // Agreement state
  const [agreementState, setAgreementState] = useState<any>(null);
  const [agreementLoading, setAgreementLoading] = useState(false);
  const [consenting, setConsenting] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadingAgreement, setUploadingAgreement] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user, authLoading]);

  const fetchAgreementState = async (leaseId: string) => {
    setAgreementLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${API_BASE}/agreements/${leaseId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setAgreementState(await res.json());
    } catch { /* ignore */ }
    setAgreementLoading(false);
  };

  const handleConsent = async (agree: boolean) => {
    if (!activeLease) return;
    setConsenting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch(`${API_BASE}/agreements/${activeLease.id}/consent`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        toast({ title: agree ? 'Agreement accepted' : 'Response recorded' });
        fetchAgreementState(activeLease.id);
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.detail || 'Failed to record consent', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    }
    setConsenting(false);
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const tenantResult = await supabase.from('tenants').select('*, leases!inner(*, properties(*))').eq('user_id', user.id).maybeSingle();
    const tenant = tenantResult.data;
    setTenantRecord(tenant);

    const lease = tenant?.leases?.[0] || null;
    setActiveLease(lease);

    const tenantId = tenant?.id;

    if (lease?.owner_id) {
      const { data: mp } = await supabase.from('profiles').select('*').eq('user_id', lease.owner_id).maybeSingle();
      setManagerProfile(mp);
    }

    const { data: p } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    setProfile(p);

    if (tenantId) {
      const { data: pays } = await supabase.from('payments').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
      setPayments(pays || []);
      const { data: reqs } = await supabase.from('maintenance_requests').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
      setMaintenanceReqs(reqs || []);
    }

    if (lease) fetchAgreementState(lease.id);

    setLoading(false);
  };

  const daysLeft = activeLease ? differenceInDays(new Date(activeLease.end_date), new Date()) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
  const property = activeLease?.properties;

  const monthRent = activeLease?.monthly_rent || property?.monthly_rent || property?.rent_amount || 0;
  const totalPaid = payments.filter(p => p.status === 'confirmed').reduce((s: number, p: any) => s + p.amount, 0);
  const remainingBalance = Math.max(0, monthRent - totalPaid);

  const leaseMonths = activeLease
    ? Math.max(1, Math.ceil(differenceInDays(new Date(activeLease.end_date), new Date(activeLease.start_date)) / 30))
    : 1;
  const paidMonths = payments.filter(p => p.status === 'confirmed').length;
  const payPct = Math.min(100, Math.round((paidMonths / leaseMonths) * 100));

  const onTimeCount = payments.filter((p: any) => p.status === 'confirmed' && p.paid_date && p.due_date && new Date(p.paid_date) <= new Date(p.due_date)).length;
  const onTimePct = payments.length > 0 ? Math.round((onTimeCount / payments.length) * 100) : 0;

  const renewalNeeded = daysLeft !== null && daysLeft <= 30 && daysLeft > 0;
  const openRequests = maintenanceReqs.filter(r => r.status === 'open' || r.status === 'in_progress');
  const hasAction = renewalNeeded || openRequests.length > 0;

  const filteredPayments = payments.filter((p: any) => {
    if (!paymentSearch) return true;
    const s = paymentSearch.toLowerCase();
    return (p.notes || '').toLowerCase().includes(s) ||
      (p.payment_type || '').toLowerCase().includes(s) ||
      (p.status || '').toLowerCase().includes(s);
  });
  const totalPaymentPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const pagePayments = filteredPayments.slice(paymentPage * PAGE_SIZE, (paymentPage + 1) * PAGE_SIZE);

  const filteredReqs = maintenanceReqs.filter(r => requestFilter === 'all' || r.status === requestFilter);

  const dueDate = activeLease?.end_date || null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' }); return;
    }
    if (passwordForm.new.length < 6) {
      toast({ title: 'Password too short', description: 'Must be at least 6 characters.', variant: 'destructive' }); return;
    }
    setSendingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
    setSendingPassword(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Password updated' });
    setPasswordDialogOpen(false);
    setPasswordForm({ new: '', confirm: '' });
  };

  const handleSubmitMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantRecord?.id || !activeLease?.property_id) return;
    setSendingMaintenance(true);
    const { error } = await supabase.from('maintenance_requests').insert({
      property_id: activeLease.property_id,
      tenant_id: tenantRecord.id,
      title: maintenanceForm.title,
      description: maintenanceForm.description,
      priority: maintenanceForm.priority,
      status: 'open',
    });
    setSendingMaintenance(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Request sent!' });
    setMaintenanceDialogOpen(false);
    setMaintenanceForm({ title: '', description: '', priority: 'medium' });
    fetchData();
  };

  const SidebarNav = () => (
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-base">Tenant Portal</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                tab === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="" className="h-9 w-9 rounded-lg object-cover ring-2 ring-border" />
            ) : (
              <div className="h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: initBg(user?.id || '') }}>
                {initials(profile?.full_name || '', user?.email || '')}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{profile?.full_name?.split(' ')[0] || 'Tenant'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full h-9 text-xs gap-2"
            onClick={() => { supabase.auth.signOut().then(() => navigate('/')); }}>
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </div>
    </aside>
  );

  // Overlay for mobile sidebar
  const SidebarOverlay = () => sidebarOpen ? (
    <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
  ) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <SidebarOverlay />
      <SidebarNav />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-foreground">
                {NAV_ITEMS.find(n => n.id === tab)?.label || 'Dashboard'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {property?.title || 'Tenant Portal'} {property?.state ? `· ${property.state}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="" className="h-8 w-8 rounded-lg object-cover ring-2 ring-border" />
            ) : (
              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: initBg(user?.id || '') }}>
                {initials(profile?.full_name || '', user?.email || '')}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* ==================== HOME TAB ==================== */}
          {tab === 'home' && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Welcome banner */}
              {!bannerDismissed && (
                <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl p-6 shadow-md relative">
                  <button onClick={() => setBannerDismissed(true)}
                    className="absolute top-4 right-4 text-primary-foreground/70 hover:text-primary-foreground">
                    <XCircle className="h-5 w-5" />
                  </button>
                  <p className="text-xl font-bold">
                    Welcome, {tenantRecord?.first_name || profile?.full_name?.split(' ')[0] || 'Tenant'}!
                  </p>
                  <p className="text-sm text-primary-foreground/80 mt-1">Manage your home and payments here.</p>
                  {activeLease && (
                    <Button size="sm" variant="secondary" className="mt-3 rounded-lg text-xs font-semibold"
                      onClick={() => setTab('more')}>
                      View Lease <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              )}

              {!activeLease ? (
                <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
                  <Building2 className="h-20 w-20 text-muted-foreground/20 mx-auto mb-4" />
                  <h3 className="text-xl font-bold">No active lease</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Contact your house manager to set up your lease.</p>
                </div>
              ) : (
                <>
                  {/* Top row: My Home + Rent Summary */}
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* My Home */}
                    {property && (
                      <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                          <Image className="h-4 w-4 text-primary" /> My Home
                        </h3>
                        {property.images && property.images.length > 0 && (
                          <img src={property.images[0]} alt={property.title}
                            className="w-full h-44 object-cover rounded-lg mb-4" />
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <p className="text-xs text-muted-foreground">Bedrooms</p>
                            <p className="font-bold text-xl">{property.bedrooms}</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <p className="text-xs text-muted-foreground">Bathrooms</p>
                            <p className="font-bold text-xl">{property.bathrooms}</p>
                          </div>
                        </div>
                        {property.amenities && property.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {property.amenities.slice(0, 6).map((a: string) => (
                              <span key={a} className="text-xs bg-primary/5 text-primary px-2.5 py-1 rounded-full font-medium">{a}</span>
                            ))}
                          </div>
                        )}
                        {property.manager_phone && (
                          <a href={`https://wa.me/${property.manager_phone.replace(/[^0-9]/g, '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary font-semibold mt-4 pt-4 border-t border-border">
                            <Phone className="h-4 w-4" /> Chat on WhatsApp
                          </a>
                        )}
                      </div>
                    )}

                    {/* Rent Summary */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <h3 className="font-bold">Rent Summary</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                          <p className="text-xs text-muted-foreground">Monthly Rent</p>
                          <p className="text-2xl font-bold text-foreground">UGX {monthRent.toLocaleString()}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <p className="text-xs text-muted-foreground">Paid</p>
                            <p className="text-lg font-bold text-success">UGX {totalPaid.toLocaleString()}</p>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-3 text-center">
                            <p className="text-xs text-muted-foreground">Balance</p>
                            <p className={`text-lg font-bold ${remainingBalance > 0 ? 'text-gold' : 'text-success'}`}>
                              UGX {remainingBalance.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {dueDate && (
                          <div className="flex items-center justify-center gap-2 text-sm bg-primary/5 rounded-lg py-2">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            <span>Due: <span className="font-bold">{format(new Date(dueDate), 'MMMM dd, yyyy')}</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action needed */}
                  {hasAction && (
                    <div className={`rounded-xl p-5 ${renewalNeeded ? 'bg-accent/5 border border-accent/20' : 'bg-primary/5 border border-primary/20'}`}>
                      <div className="flex items-start gap-3">
                        {renewalNeeded ? (
                          <AlertTriangle className="h-6 w-6 text-accent shrink-0 mt-0.5" />
                        ) : (
                          <Bell className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-bold text-foreground text-sm">
                            {renewalNeeded ? 'Lease ending soon' : 'Maintenance update'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {renewalNeeded
                              ? `Your lease ends in ${daysLeft} days. Talk to your manager about renewal.`
                              : `${openRequests.length} request${openRequests.length > 1 ? 's' : ''} need${openRequests.length > 1 ? '' : 's'} attention`}
                          </p>
                          {renewalNeeded && (
                            <Button size="sm" variant="outline" className="mt-2 text-xs rounded-lg h-8">
                              Contact Manager
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Middle row: My Agreement + Lease Health + Calendar */}
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Tenancy Agreement Card */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">My Agreement</p>
                          <h2 className="text-xl font-bold mt-1">{property?.title || 'Property'}</h2>
                          {property && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3.5 w-3.5" /> {property.state}{property.area ? ` · ${property.area}` : ''}
                            </p>
                          )}
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          isOverdue ? 'bg-destructive/10 text-destructive' :
                          isDueSoon ? 'bg-accent/10 text-accent' :
                          'bg-success/10 text-success'
                        }`}>
                          {isOverdue ? 'EXPIRED' : isDueSoon ? 'Ending Soon' : 'Active'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div className="bg-muted/50 rounded-lg p-4 flex-1 min-w-[200px] space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Start</span>
                            <span className="font-semibold">{activeLease.start_date ? format(new Date(activeLease.start_date), 'MMM dd, yyyy') : '—'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">End</span>
                            <span className="font-semibold">{activeLease.end_date ? format(new Date(activeLease.end_date), 'MMM dd, yyyy') : '—'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Rent</span>
                            <span className="font-bold text-foreground">UGX {monthRent.toLocaleString()}/mo</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <p className="text-sm text-muted-foreground mb-2">Payment progress</p>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${payPct}%` }} />
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="font-semibold text-foreground">{paidMonths} of {leaseMonths} months</span>
                            {payPct >= 100 ? (
                              <span className="text-success font-semibold">All paid!</span>
                            ) : (
                              <span className="text-muted-foreground">{leaseMonths - paidMonths} left</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Lease Health */}
                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col items-center">
                      <h3 className="font-bold text-sm mb-4 flex items-center gap-2 self-start">
                        <ShieldCheck className="h-4 w-4 text-primary" /> My Record
                      </h3>
                      <PercentRing pct={onTimePct} label="On-time payments" sub={`${onTimeCount} of ${payments.length} months paid on time`} />
                    </div>

                    {/* Calendar */}
                    <CalendarWidget dueDate={dueDate} />
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" /> Recent Activity
                    </h3>
                    {payments.length === 0 && maintenanceReqs.length === 0 ? (
                      <div className="text-center py-8">
                        <Bell className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No activity yet</p>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {payments.slice(0, 3).map((p: any) => (
                          <div key={p.id} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              p.status === 'confirmed' ? 'bg-success/10 text-success' :
                              p.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                              'bg-primary/10 text-primary'
                            }`}>
                              <DollarSign className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold">
                                {p.payment_type === 'rent' ? 'Rent payment' : 'Payment'} — UGX {(p.amount || 0).toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{p.notes || `${p.payment_type || 'Rent'} payment`}</p>
                            </div>
                            <StatusBadge status={p.status} />
                          </div>
                        ))}
                        {maintenanceReqs.slice(0, 2).map((r: any) => (
                          <div key={r.id} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                              r.status === 'resolved' || r.status === 'completed' ? 'bg-success/10 text-success' :
                              'bg-accent/10 text-accent'
                            }`}>
                              <Wrench className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold">{r.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                            </div>
                            <StatusBadge status={r.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ==================== PAYMENTS TAB ==================== */}
          {tab === 'payments' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="font-bold text-xl">Payment History</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl p-5 text-center">
                  <p className="text-xs text-muted-foreground">This month</p>
                  <p className="text-2xl font-bold text-foreground">{payments.filter(p => {
                    const d = new Date(p.created_at);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                  }).length}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 text-center">
                  <p className="text-xs text-muted-foreground">Total paid</p>
                  <p className="text-2xl font-bold text-success">UGX {totalPaid.toLocaleString()}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 text-center">
                  <p className="text-xs text-muted-foreground">On time</p>
                  <p className="text-2xl font-bold text-accent">{onTimePct}%</p>
                </div>
              </div>
              <Input placeholder="Search payments..."
                value={paymentSearch} onChange={e => { setPaymentSearch(e.target.value); setPaymentPage(0); }}
                className="rounded-lg h-11 max-w-sm" />
              {pagePayments.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-xl">
                  <DollarSign className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="font-bold text-foreground">No payments yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Your manager will record payments here.</p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold">Type</th>
                        <th className="text-left py-3 px-4 font-semibold">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold">Date</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagePayments.map((p: any) => (
                        <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="py-3 px-4">
                            <span className="font-medium">{p.payment_type ? `${p.payment_type.charAt(0).toUpperCase() + p.payment_type.slice(1)}` : 'Payment'}</span>
                            {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                          </td>
                          <td className="py-3 px-4 font-bold">UGX {(p.amount || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-muted-foreground">{p.created_at ? format(new Date(p.created_at), 'MMM dd, yyyy') : '—'}</td>
                          <td className="py-3 px-4"><StatusBadge status={p.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {totalPaymentPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" className="rounded-lg h-9"
                    disabled={paymentPage === 0} onClick={() => setPaymentPage(p => p - 1)}>Prev</Button>
                  <span className="text-xs text-muted-foreground">{paymentPage + 1} / {totalPaymentPages}</span>
                  <Button variant="outline" size="sm" className="rounded-lg h-9"
                    disabled={paymentPage >= totalPaymentPages - 1} onClick={() => setPaymentPage(p => p + 1)}>Next</Button>
                </div>
              )}
            </div>
          )}

          {/* ==================== REQUESTS TAB ==================== */}
          {tab === 'requests' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-xl">Maintenance Requests</h2>
                <Button size="sm" className="gradient-primary text-primary-foreground rounded-lg text-xs h-9 gap-1"
                  onClick={() => setMaintenanceDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> New Request
                </Button>
              </div>
              <div className="flex gap-2">
                {(['all', 'open', 'resolved'] as const).map(f => (
                  <button key={f} onClick={() => setRequestFilter(f)}
                    className={`text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${
                      requestFilter === f
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                    }`}>
                    {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Done'}
                  </button>
                ))}
              </div>
              {filteredReqs.length === 0 ? (
                <div className="text-center py-12 bg-card border border-border rounded-xl">
                  <Wrench className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="font-bold text-foreground">No requests yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Click "New Request" to report a maintenance issue.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredReqs.map((r: any) => (
                    <div key={r.id} className="bg-card border border-border rounded-xl p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                              r.priority === 'high' ? 'bg-destructive' :
                              r.priority === 'medium' ? 'bg-gold' : 'bg-success'
                            }`} />
                            <p className="font-bold text-foreground">{r.title}</p>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <StatusBadge status={r.status} />
                            <span className="text-xs text-muted-foreground">
                              {r.created_at ? format(new Date(r.created_at), 'MMM dd, yyyy') : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== AGREEMENTS TAB ==================== */}
          {tab === 'agreements' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="font-bold text-xl">Tenancy Agreement</h2>
              {!activeLease ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <FileText className="h-16 w-16 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-lg font-bold">No active lease</p>
                  <p className="text-sm text-muted-foreground mt-1">An agreement will appear once your lease is set up.</p>
                </div>
              ) : agreementLoading ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Loading agreement...</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {/* Current document card */}
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="h-6 w-6 text-primary" />
                      <h3 className="font-bold text-lg">Current Agreement</h3>
                    </div>
                    {agreementState?.current_document ? (
                      <div className="space-y-4">
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{agreementState.current_document.file_name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Uploaded {agreementState.current_document.created_at ? format(new Date(agreementState.current_document.created_at), 'MMM dd, yyyy') : ''}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(agreementState.current_document.file_size / 1024).toFixed(1)} KB · {agreementState.current_document.file_mime_type}
                              </p>
                            </div>
                            <a href={agreementState.current_document.agreement_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                              <Download className="h-4 w-4" /> View Document
                            </a>
                          </div>
                        </div>

                        {/* Consent status */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className={`rounded-lg border p-4 ${agreementState.manager?.consented ? 'border-success/50 bg-success/5' : 'border-border bg-muted/30'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              {agreementState.manager?.consented ? (
                                <CheckCircle className="h-5 w-5 text-success" />
                              ) : (
                                <Clock className="h-5 w-5 text-muted-foreground" />
                              )}
                              <span className="font-semibold text-sm">Manager</span>
                            </div>
                            {agreementState.manager?.consented ? (
                              <p className="text-xs text-success">Signed {agreementState.manager.consented_at ? format(new Date(agreementState.manager.consented_at), 'MMM dd, yyyy') : ''}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Awaiting signature</p>
                            )}
                          </div>
                          <div className={`rounded-lg border p-4 ${agreementState.tenant?.consented ? 'border-success/50 bg-success/5' : 'border-border bg-muted/30'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              {agreementState.tenant?.consented ? (
                                <CheckCircle className="h-5 w-5 text-success" />
                              ) : (
                                <Clock className="h-5 w-5 text-muted-foreground" />
                              )}
                              <span className="font-semibold text-sm">You (Tenant)</span>
                            </div>
                            {agreementState.tenant?.consented ? (
                              <p className="text-xs text-success">Signed {agreementState.tenant.consented_at ? format(new Date(agreementState.tenant.consented_at), 'MMM dd, yyyy') : ''}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Not yet signed</p>
                            )}
                          </div>
                        </div>

                        {/* Consent buttons */}
                        {!agreementState.tenant?.consented && (
                          <div className="flex gap-3 pt-2">
                            <Button onClick={() => handleConsent(true)} disabled={consenting}
                              className="flex-1 h-11 gap-2 rounded-lg font-semibold bg-success hover:bg-success/90 text-success-foreground">
                              <ThumbsUp className="h-4 w-4" /> {consenting ? 'Processing...' : 'I Agree'}
                            </Button>
                            <Button onClick={() => handleConsent(false)} disabled={consenting}
                              variant="outline" className="flex-1 h-11 gap-2 rounded-lg font-semibold border-destructive text-destructive hover:bg-destructive/10">
                              <ThumbsDown className="h-4 w-4" /> Disagree
                            </Button>
                          </div>
                        )}
                        {agreementState.manager?.consented && agreementState.tenant?.consented && (
                          <div className="bg-success/10 border border-success/20 rounded-lg p-4 text-center">
                            <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                            <p className="font-bold text-success">Agreement fully signed</p>
                            <p className="text-xs text-muted-foreground mt-1">Both parties have consented to this agreement.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileUp className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                        <h4 className="font-bold text-foreground">No agreement uploaded yet</h4>
                        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                          Your manager hasn't uploaded a tenancy agreement document yet. You'll be able to review and sign it here once available.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== SETTINGS TAB ==================== */}
          {tab === 'more' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <h2 className="font-bold text-xl">Settings</h2>
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Profile */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                  <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" /> Profile
                  </h3>
                  <div className="flex items-center gap-4 mb-4">
                    {profile?.photo_url ? (
                      <img src={profile.photo_url} alt="" className="h-16 w-16 rounded-xl object-cover ring-2 ring-border" />
                    ) : (
                      <div className="h-16 w-16 rounded-xl flex items-center justify-center text-xl font-bold text-white" style={{ backgroundColor: initBg(user?.id || '') }}>
                        {initials(profile?.full_name || '', user?.email || '')}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-base truncate">
                        {profile?.full_name || tenantRecord?.first_name + ' ' + tenantRecord?.last_name || user?.email?.split('@')[0]}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                      {tenantRecord?.phone && <p className="text-xs text-muted-foreground mt-0.5">{tenantRecord.phone}</p>}
                    </div>
                  </div>
                  {managerProfile && (
                    <div className="bg-primary/5 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Your Manager</p>
                      <p className="font-bold text-foreground text-sm mt-0.5">{managerProfile.full_name}</p>
                      {managerProfile.phone && (
                        <a href={`https://wa.me/${managerProfile.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-primary font-semibold mt-1">
                          <Phone className="h-3 w-3" /> {managerProfile.phone}
                        </a>
                      )}
                      {managerProfile.email && <p className="text-xs text-muted-foreground">{managerProfile.email}</p>}
                    </div>
                  )}
                </div>

                {/* Lease Info */}
                {activeLease && (
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" /> Lease Details
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Property</span>
                        <span className="font-semibold text-right">{property?.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Unit</span>
                        <span className="font-semibold">{property?.property_type} · {property?.bedrooms} bed</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Address</span>
                        <span className="font-semibold text-right">{property?.state}{property?.area ? `, ${property.area}` : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lease period</span>
                        <span className="font-semibold text-right">{activeLease.start_date ? format(new Date(activeLease.start_date), 'MMM dd, yyyy') : '—'} - {activeLease.end_date ? format(new Date(activeLease.end_date), 'MMM dd, yyyy') : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Monthly rent</span>
                        <span className="font-bold">UGX {monthRent.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="bg-card border border-border rounded-xl shadow-sm">
                <div className="divide-y divide-border">
                  <button onClick={() => setPasswordDialogOpen(true)}
                    className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-muted/30 transition-colors">
                    <KeyRound className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Change Password</p>
                      <p className="text-xs text-muted-foreground">Update your account password</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => { supabase.auth.signOut().then(() => navigate('/')); }}
                    className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-destructive/5 transition-colors">
                    <LogOut className="h-5 w-5 text-destructive" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-destructive">Sign Out</p>
                      <p className="text-xs text-muted-foreground">Log out of your account</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Change Password Drawer */}
      <Drawer open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Change Password</DrawerTitle>
            <DrawerDescription>Update your account password.</DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleChangePassword} className="px-4 pb-6 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">New Password</p>
              <Input type="password" minLength={6} value={passwordForm.new}
                onChange={e => setPasswordForm(f => ({ ...f, new: e.target.value }))}
                required placeholder="At least 6 characters" className="rounded-lg h-11" />
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Confirm New Password</p>
              <Input type="password" minLength={6} value={passwordForm.confirm}
                onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
                required placeholder="Repeat the new password" className="rounded-lg h-11" />
            </div>
            <div className="flex gap-3">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1 rounded-lg h-11">Cancel</Button>
              </DrawerClose>
              <Button type="submit" disabled={sendingPassword} className="flex-1 rounded-lg h-11 font-bold">
                {sendingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>

      {/* New Maintenance Request Drawer */}
      <Drawer open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>New Maintenance Request</DrawerTitle>
            <DrawerDescription>Tell us what needs fixing.</DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleSubmitMaintenance} className="px-4 pb-6 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">What's the issue?</p>
              <Input value={maintenanceForm.title}
                onChange={e => setMaintenanceForm(f => ({ ...f, title: e.target.value }))}
                required placeholder="e.g. Leaking tap" className="rounded-lg h-11" />
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Details (optional)</p>
              <Input value={maintenanceForm.description}
                onChange={e => setMaintenanceForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description" className="rounded-lg h-11" />
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">How urgent?</p>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map(p => (
                  <button key={p} type="button" onClick={() => setMaintenanceForm(f => ({ ...f, priority: p }))}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                      maintenanceForm.priority === p
                        ? p === 'high' ? 'bg-destructive text-destructive-foreground border-destructive'
                          : p === 'medium' ? 'bg-gold text-gold-foreground border-gold'
                          : 'bg-success text-success-foreground border-success'
                        : 'bg-card text-muted-foreground border-border'
                    }`}>
                    {p === 'low' ? 'Low' : p === 'medium' ? 'Medium' : 'Urgent'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1 rounded-lg h-11">Cancel</Button>
              </DrawerClose>
              <Button type="submit" disabled={sendingMaintenance} className="flex-1 rounded-lg h-11 font-bold">
                {sendingMaintenance ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
