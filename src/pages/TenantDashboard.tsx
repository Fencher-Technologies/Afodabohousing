import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';
import {
  Home, Clock, DollarSign, Bell, FileText, Upload,
  CheckCircle, AlertCircle, RefreshCcw, Eye, CreditCard,
  MessageSquare, Send, ChevronRight, LayoutDashboard,
  LogOut, Menu, X, ArrowUpRight, Calendar, Building2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

type Tenancy = Database['public']['Tables']['tenancies']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

const statusBadge = (s: string) => ({
  pending: 'bg-muted text-muted-foreground border border-border',
  uploaded: 'bg-primary/10 text-primary border border-primary/20',
  confirmed: 'bg-accent/10 text-accent border border-accent/20',
  rejected: 'bg-destructive/10 text-destructive border border-destructive/20',
}[s] ?? 'bg-muted text-muted-foreground');

type Tab = 'overview' | 'payments' | 'messages';

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'payments', label: 'Payments', icon: <DollarSign className="h-4 w-4" /> },
  { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
];

export default function TenantDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tenancies, setTenancies] = useState<(Tenancy & { property_title?: string; manager_name?: string; manager_phone?: string })[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [messages, setMessages] = useState<(Message & { sender_name?: string; receiver_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [paymentNote, setPaymentNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [tenRes, payRes, msgRes] = await Promise.all([
      supabase.from('tenancies').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false }),
      // Fetch all messages involving this tenant (sent or received)
      supabase.from('messages').select('*').or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`).order('created_at', { ascending: false }),
    ]);

    const myTenancies = tenRes.data || [];
    const propIds = [...new Set(myTenancies.map(t => t.property_id))];
    const managerIds = [...new Set(myTenancies.map(t => t.manager_id))];
    const allMsgUserIds = [...new Set([...(msgRes.data || []).map(m => m.sender_id), ...(msgRes.data || []).map(m => m.receiver_id)])];

    const propMap: Record<string, string> = {};
    if (propIds.length) {
      const { data: props } = await supabase.from('properties').select('id, title').in('id', propIds);
      props?.forEach(p => { propMap[p.id] = p.title; });
    }

    const profileMap: Record<string, { name: string; phone: string }> = {};
    const allProfileIds = [...new Set([...managerIds, ...allMsgUserIds])];
    if (allProfileIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, phone').in('user_id', allProfileIds);
      profiles?.forEach(m => { profileMap[m.user_id] = { name: m.full_name || 'Manager', phone: m.phone || '' }; });
    }

    setTenancies(myTenancies.map(t => ({
      ...t,
      property_title: propMap[t.property_id],
      manager_name: profileMap[t.manager_id]?.name,
      manager_phone: profileMap[t.manager_id]?.phone,
    })));
    setPayments(payRes.data || []);
    setMessages((msgRes.data || []).map(m => ({
      ...m,
      sender_name: m.sender_id === user.id ? 'You' : profileMap[m.sender_id]?.name || 'House Manager',
      receiver_name: m.receiver_id === user.id ? 'You' : profileMap[m.receiver_id]?.name || 'House Manager',
    })));
    setLoading(false);
  };

  const activeTenancy = tenancies.find(t => t.status === 'active');
  const daysLeft = activeTenancy ? differenceInDays(new Date(activeTenancy.rent_end_date), new Date()) : null;
  const isRentOverdue = daysLeft !== null && daysLeft < 0;
  const isRentDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
  const unreadMessages = messages.filter(m => !m.is_read && m.receiver_id === user?.id).length;
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const totalPaid = confirmedPayments.reduce((s, p) => s + p.amount, 0);

  const handleUploadPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenancy || !user) return;
    setUploading(true);

    let proofUrl = '';
    if (proofFile) {
      const ext = proofFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage.from('payment-proofs').upload(filePath, proofFile);
      if (uploadErr) {
        toast({ title: 'Upload failed', description: uploadErr.message, variant: 'destructive' });
        setUploading(false); return;
      }
      proofUrl = uploadData.path;
    }

    const { error } = await supabase.from('payments').insert({
      tenancy_id: activeTenancy.id, tenant_id: user.id, manager_id: activeTenancy.manager_id,
      amount: activeTenancy.rent_amount, currency: 'UGX',
      period_start: activeTenancy.rent_start_date, period_end: activeTenancy.rent_end_date,
      status: proofFile ? 'uploaded' : 'pending',
      notes: paymentNote || null, proof_url: proofUrl || null,
    });

    setUploading(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

    toast({
      title: 'Payment submitted!',
      description: proofFile ? 'Your proof has been sent to your house manager for review.' : 'Payment noted. Upload a proof so your manager can confirm.',
    });
    setUploadOpen(false); setPaymentNote(''); setProofFile(null); fetchData();
  };

  const handlePayOnline = async () => {
    if (!activeTenancy || !user) return;
    setPaymentLoading(true);
    try {
      const { data: profileData } = await supabase.from('profiles').select('full_name, phone').eq('user_id', user.id).single();
      const nameParts = (profileData?.full_name || 'Tenant').split(' ');
      const response = await supabase.functions.invoke('pesapal-pay', {
        body: {
          action: 'initiate',
          paymentId: `pay-${activeTenancy.id}-${Date.now()}`,
          amount: activeTenancy.rent_amount,
          currency: 'UGX',
          description: `Rent for ${activeTenancy.property_title || 'Property'} - ${format(new Date(activeTenancy.rent_end_date), 'MMMM yyyy')}`,
          email: user.email, phone: profileData?.phone || '',
          firstName: nameParts[0], lastName: nameParts.slice(1).join(' ') || '',
          callbackUrl: `${window.location.origin}/dashboard/tenant?payment=success`,
        },
      });
      if (response.error) {
        const msg = response.error?.message || 'Payment gateway error';
        toast({ title: 'Payment Error', description: msg.includes('amount_exceeds') ? 'Payment limit exceeded. Please upload a mobile money proof instead.' : msg, variant: 'destructive' });
        setPaymentLoading(false); return;
      }
      if (response.data?.success && response.data?.redirectUrl) {
        await supabase.from('payments').insert({
          tenancy_id: activeTenancy.id, tenant_id: user.id, manager_id: activeTenancy.manager_id,
          amount: activeTenancy.rent_amount, currency: 'UGX',
          period_start: activeTenancy.rent_start_date, period_end: activeTenancy.rent_end_date,
          status: 'pending', notes: 'Online payment initiated',
        });
        window.open(response.data.redirectUrl, '_blank');
        toast({ title: 'Payment page opened!', description: 'Complete your payment in the new window.' });
      } else {
        const errMsg = response.data?.error || 'Could not initiate online payment.';
        const friendly = errMsg.includes('amount_exceeds') || errMsg.includes('exceeds limit')
          ? 'Your rent amount exceeds the current payment gateway limit. Please send via mobile money and upload proof.'
          : 'Could not initiate online payment. Please upload your mobile money proof instead.';
        toast({ title: 'Payment Gateway Unavailable', description: friendly, variant: 'destructive' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Payment Error', description: msg || 'Could not connect to payment gateway.', variant: 'destructive' });
    }
    setPaymentLoading(false); fetchData();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenancy || !user || !messageText.trim()) return;
    setSendingMessage(true);
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id, receiver_id: activeTenancy.manager_id,
      content: messageText, property_id: activeTenancy.property_id,
    });
    setSendingMessage(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Message sent!', description: 'Your house manager will respond soon.' });
    setMessageOpen(false); setMessageText(''); fetchData();
  };

  const markRead = async (id: string) => {
    await supabase.from('messages').update({ is_read: true }).eq('id', id);
    fetchData();
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground font-display font-bold text-base">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sidebar-foreground font-semibold text-sm truncate">{user?.email?.split('@')[0]}</p>
            <p className="text-sidebar-foreground/50 text-xs">Tenant</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const badge = item.id === 'messages' ? unreadMessages : 0;
          return (
            <button key={item.id} onClick={() => { setTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === item.id
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}>
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {badge > 0 && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-sidebar-primary/30 text-sidebar-primary min-w-[20px] text-center">{badge}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <button onClick={() => { navigate('/properties'); setSidebarOpen(false); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all">
          <Building2 className="h-4 w-4" /><span>Browse Properties</span>
        </button>
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
                <span className="text-sidebar-foreground font-display font-bold">Menu</span>
                <button onClick={() => setSidebarOpen(false)} className="text-sidebar-foreground/60"><X className="h-5 w-5" /></button>
              </div>
              <Sidebar />
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-64px)] flex flex-col">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors">
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="font-display font-bold text-xl text-foreground capitalize">{tab === 'overview' ? 'My Dashboard' : tab}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Tenant · Afodabohousing</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={fetchData} disabled={loading} className="gap-2 h-8 text-xs">
              <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>

          <div className="p-6 space-y-6 flex-1">
            {/* Urgent alerts */}
            {isRentOverdue && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="bg-destructive/10 rounded-xl p-2 shrink-0"><AlertCircle className="h-5 w-5 text-destructive" /></div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">Your Rent is Overdue</p>
                  <p className="text-muted-foreground text-sm">Ended on <strong>{activeTenancy ? format(new Date(activeTenancy.rent_end_date), 'MMMM dd, yyyy') : ''}</strong>. Please arrange payment immediately.</p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => setUploadOpen(true)}>Pay Now</Button>
              </div>
            )}
            {isRentDueSoon && !isRentOverdue && (
              <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="bg-accent/10 rounded-xl p-2 shrink-0"><Bell className="h-5 w-5 text-accent" /></div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">Rent Due in {daysLeft} Day{daysLeft !== 1 ? 's' : ''}</p>
                  <p className="text-muted-foreground text-sm">UGX {activeTenancy?.rent_amount.toLocaleString()} due on {activeTenancy ? format(new Date(activeTenancy.rent_end_date), 'MMMM dd, yyyy') : ''}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={handlePayOnline} disabled={paymentLoading} className="gap-1 border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                    <CreditCard className="h-3.5 w-3.5" />{paymentLoading ? '...' : 'Pay Online'}
                  </Button>
                  <Button size="sm" className="gradient-primary text-primary-foreground gap-1" onClick={() => setUploadOpen(true)}>
                    <Upload className="h-3.5 w-3.5" />Proof
                  </Button>
                </div>
              </div>
            )}
            {unreadMessages > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 cursor-pointer" onClick={() => setTab('messages')}>
                <MessageSquare className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm font-medium text-foreground flex-1">
                  <strong>{unreadMessages}</strong> unread message{unreadMessages > 1 ? 's' : ''} from your house manager
                </p>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { icon: <Home className="h-5 w-5" />, label: 'Tenancy Status', val: activeTenancy ? 'Active' : 'No Active', sub: activeTenancy?.property_title || 'No property linked', color: 'text-accent', bg: 'bg-accent/10' },
                    { icon: <Calendar className="h-5 w-5" />, label: 'Days Remaining', val: daysLeft !== null ? (isRentOverdue ? 'Overdue' : `${daysLeft}d`) : '—', sub: activeTenancy ? format(new Date(activeTenancy.rent_end_date), 'MMM dd, yyyy') : 'No active tenancy', color: isRentOverdue ? 'text-destructive' : isRentDueSoon ? 'text-accent' : 'text-primary', bg: isRentOverdue ? 'bg-destructive/10' : 'bg-primary/10' },
                    { icon: <DollarSign className="h-5 w-5" />, label: 'Total Paid', val: `UGX ${totalPaid >= 1000000 ? (totalPaid / 1000000).toFixed(1) + 'M' : totalPaid.toLocaleString()}`, sub: `${confirmedPayments.length} confirmed payments`, color: 'text-primary', bg: 'bg-primary/10' },
                    { icon: <MessageSquare className="h-5 w-5" />, label: 'Messages', val: unreadMessages, sub: `${messages.length} total`, color: unreadMessages > 0 ? 'text-accent' : 'text-muted-foreground', bg: unreadMessages > 0 ? 'bg-accent/10' : 'bg-muted' },
                  ].map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-2xl p-5 shadow-card">
                      <div className={`${s.bg} ${s.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
                      <div className={`text-2xl font-display font-bold ${s.color}`}>{loading ? <div className="h-7 w-12 bg-muted animate-pulse rounded" /> : s.val}</div>
                      <div className="text-sm font-semibold text-foreground mt-1">{s.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                  <h3 className="font-display font-semibold text-base mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { icon: <Upload className="h-5 w-5" />, label: 'Upload Proof', sub: 'Submit payment', action: () => setUploadOpen(true), highlight: isRentDueSoon || isRentOverdue },
                      { icon: <CreditCard className="h-5 w-5" />, label: 'Pay Online', sub: 'Mobile money / card', action: handlePayOnline, loading: paymentLoading },
                      { icon: <MessageSquare className="h-5 w-5" />, label: 'Message Manager', sub: 'Send a message', action: () => setMessageOpen(true), badge: unreadMessages },
                      { icon: <Building2 className="h-5 w-5" />, label: 'Browse Homes', sub: 'Find a property', action: () => navigate('/properties') },
                    ].map(a => (
                      <button key={a.label} onClick={a.action} disabled={a.loading}
                        className={`relative bg-secondary border rounded-xl p-4 text-left hover:shadow-sm transition-all group ${a.highlight ? 'border-accent/40 bg-accent/5' : 'border-border hover:border-primary/30'}`}>
                        {a.badge ? <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{a.badge}</span> : null}
                        <div className={`mb-2.5 transition-colors ${a.highlight ? 'text-accent' : 'text-primary group-hover:text-accent'}`}>{a.icon}</div>
                        <div className={`text-sm font-semibold ${a.highlight ? 'text-accent' : 'text-foreground'}`}>{a.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{a.loading ? 'Opening...' : a.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Current Tenancy */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="bg-primary/10 rounded-xl p-2"><Home className="h-5 w-5 text-primary" /></div>
                      <h2 className="font-display font-bold text-lg">Current Tenancy</h2>
                    </div>
                    {loading ? (
                      <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-muted animate-pulse rounded" />)}</div>
                    ) : activeTenancy ? (
                      <div className="space-y-4">
                        <div className="p-4 bg-secondary rounded-xl">
                          <p className="font-bold text-foreground">{activeTenancy.property_title || 'Your Property'}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">Manager: {activeTenancy.manager_name || 'Your House Manager'}</p>
                          {activeTenancy.manager_phone && (
                            <a href={`tel:${activeTenancy.manager_phone}`} className="text-xs text-primary hover:underline">{activeTenancy.manager_phone}</a>
                          )}
                        </div>
                        {[
                          { label: 'Monthly Rent', val: `UGX ${activeTenancy.rent_amount.toLocaleString()}`, bold: true },
                          { label: 'Start Date', val: format(new Date(activeTenancy.rent_start_date), 'MMMM dd, yyyy') },
                          { label: 'Expiry Date', val: format(new Date(activeTenancy.rent_end_date), 'MMMM dd, yyyy') },
                        ].map(r => (
                          <div key={r.label} className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm">{r.label}</span>
                            <span className={`text-sm ${r.bold ? 'font-bold text-primary text-base' : 'font-medium text-foreground'}`}>{r.val}</span>
                          </div>
                        ))}
                        <div className="pt-3 border-t border-border">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-sm font-bold ${isRentOverdue ? 'text-destructive' : isRentDueSoon ? 'text-accent' : 'text-foreground'}`}>
                              {isRentOverdue ? 'Overdue' : daysLeft !== null ? `${daysLeft} days remaining` : ''}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${activeTenancy.status === 'active' ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-muted text-muted-foreground'}`}>{activeTenancy.status}</span>
                          </div>
                          {daysLeft !== null && (
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${isRentOverdue ? 'bg-destructive w-full' : isRentDueSoon ? 'bg-accent' : 'bg-primary'}`}
                                style={{ width: isRentOverdue ? '100%' : `${Math.min(100, Math.max(5, ((30 - (daysLeft || 0)) / 30) * 100))}%` }} />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Home className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="font-display font-semibold text-foreground">No active tenancy</p>
                        <p className="text-sm mt-1">You are not currently linked to any property</p>
                        <Button size="sm" className="mt-4 gradient-primary text-primary-foreground" onClick={() => navigate('/properties')}>Find a Home</Button>
                      </div>
                    )}
                  </div>

                  {/* Recent Payments */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <div className="bg-accent/10 rounded-xl p-2"><DollarSign className="h-5 w-5 text-accent" /></div>
                        <h2 className="font-display font-bold text-lg">Recent Payments</h2>
                      </div>
                      <button onClick={() => setTab('payments')} className="text-xs text-primary hover:underline flex items-center gap-1">All <ChevronRight className="h-3 w-3" /></button>
                    </div>
                    {loading ? (
                      <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
                    ) : payments.slice(0, 4).length > 0 ? (
                      <div className="space-y-3">
                        {payments.slice(0, 4).map(p => (
                          <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                            <div>
                              <p className="text-sm font-semibold text-foreground">UGX {p.amount.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'MMM dd, yyyy')}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${statusBadge(p.status)}`}>{p.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="font-display font-semibold text-foreground">No payments yet</p>
                        {activeTenancy && (
                          <Button size="sm" className="mt-3 gradient-primary text-primary-foreground" onClick={() => setUploadOpen(true)}>Upload Payment Proof</Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PAYMENTS */}
            {tab === 'payments' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-xl">Payment History</h2>
                    <p className="text-sm text-muted-foreground">{confirmedPayments.length} confirmed · UGX {totalPaid.toLocaleString()} total paid</p>
                  </div>
                  {activeTenancy && (
                    <div className="flex gap-2">
                      <Button variant="outline" className="gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground h-8 text-xs" onClick={handlePayOnline} disabled={paymentLoading}>
                        <CreditCard className="h-3.5 w-3.5" />{paymentLoading ? 'Opening...' : 'Pay Online'}
                      </Button>
                      <Button className="gradient-primary text-primary-foreground gap-2 h-8 text-xs" onClick={() => setUploadOpen(true)}>
                        <Upload className="h-3.5 w-3.5" />Upload Proof
                      </Button>
                    </div>
                  )}
                </div>
                {payments.length === 0 ? (
                  <div className="text-center py-24 bg-card border border-border rounded-2xl">
                    <DollarSign className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
                    <p className="text-xl font-display font-bold text-foreground">No payment records yet</p>
                    <p className="text-sm mt-2 text-muted-foreground">Upload rent proof or pay online to see your history here</p>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-secondary border-b border-border">
                            <th className="text-left py-3 px-4 font-semibold">Date</th>
                            <th className="text-left py-3 px-4 font-semibold">Amount</th>
                            <th className="text-left py-3 px-4 font-semibold">Period</th>
                            <th className="text-left py-3 px-4 font-semibold">Notes</th>
                            <th className="text-left py-3 px-4 font-semibold">Status</th>
                            <th className="text-left py-3 px-4 font-semibold">Receipt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map(p => (
                            <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors last:border-0">
                              <td className="py-3.5 px-4 text-muted-foreground text-xs">{format(new Date(p.created_at), 'MMM dd, yyyy')}</td>
                              <td className="py-3.5 px-4 font-bold text-foreground">UGX {p.amount.toLocaleString()}</td>
                              <td className="py-3.5 px-4 text-muted-foreground text-xs">{p.period_start} – {p.period_end}</td>
                              <td className="py-3.5 px-4 text-muted-foreground text-xs max-w-[200px] truncate">{p.notes || '—'}</td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(p.status)}`}>{p.status}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                {p.status === 'confirmed' ? (
                                  <span className="text-accent text-xs flex items-center gap-1 font-semibold"><CheckCircle className="h-3 w-3" />Confirmed</span>
                                ) : <span className="text-muted-foreground text-xs">Pending</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MESSAGES */}
            {tab === 'messages' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-xl">Messages</h2>
                    <p className="text-sm text-muted-foreground">{unreadMessages} unread · conversations with your manager</p>
                  </div>
                  {activeTenancy && (
                    <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5 text-xs h-8" onClick={() => setMessageOpen(true)}>
                      <Send className="h-3.5 w-3.5" /> New Message
                    </Button>
                  )}
                </div>
                {messages.length === 0 ? (
                  <div className="text-center py-24 bg-card border border-border rounded-2xl">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
                    <p className="text-xl font-display font-bold text-foreground">No messages yet</p>
                    <p className="text-sm mt-2 text-muted-foreground">Messages from your house manager will appear here</p>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
                    {messages.map(m => {
                      const isFromManager = m.sender_id !== user?.id;
                      return (
                        <div key={m.id} onClick={() => !m.is_read && isFromManager && markRead(m.id)}
                          className={`flex items-start gap-4 p-5 border-b border-border last:border-0 transition-all ${!m.is_read && isFromManager ? 'bg-primary/5 cursor-pointer' : 'hover:bg-muted/20'}`}>
                          <div className={`h-10 w-10 rounded-xl font-bold text-sm flex items-center justify-center shrink-0 ${isFromManager ? 'bg-primary/10 text-primary' : 'gradient-primary text-primary-foreground'}`}>
                            {isFromManager ? (m.sender_name || 'M').charAt(0) : 'You'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-foreground text-sm">{isFromManager ? (m.sender_name || 'House Manager') : `You → Manager`}</span>
                              {!m.is_read && isFromManager && <Badge className="bg-primary text-primary-foreground text-xs py-0">New</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{m.content}</p>
                            <p className="text-xs text-muted-foreground/50 mt-1.5">{format(new Date(m.created_at), 'MMMM dd, yyyy')} at {format(new Date(m.created_at), 'HH:mm')}</p>
                          </div>
                          {isFromManager && (
                            <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={e => { e.stopPropagation(); setMessageOpen(true); }}>
                              Reply
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <Footer />
        </main>
      </div>

      {/* Upload Proof Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Upload Payment Proof</DialogTitle>
            <DialogDescription>Submit your rent payment proof for your house manager to review and confirm.</DialogDescription>
          </DialogHeader>
          {!activeTenancy ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No active tenancy found.</p>
              <Button className="mt-3 gradient-primary text-primary-foreground" onClick={() => { setUploadOpen(false); navigate('/properties'); }}>Find a Home</Button>
            </div>
          ) : (
            <form onSubmit={handleUploadPayment} className="space-y-4 mt-4">
              <div className="bg-secondary rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Amount Due</span><span className="font-bold text-primary text-base">UGX {activeTenancy.rent_amount.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span className="font-semibold">{format(new Date(activeTenancy.rent_end_date), 'MMMM dd, yyyy')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Property</span><span className="font-semibold truncate max-w-[180px]">{activeTenancy.property_title}</span></div>
              </div>
              <div>
                <Label>Payment Reference / Transaction ID</Label>
                <Textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="e.g. MTN Mobile Money TXN: 1234567890" rows={3} className="mt-1" />
              </div>
              <div>
                <Label>Upload Proof (bank slip, mobile money screenshot)</Label>
                <div className="mt-1 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => fileRef.current?.click()}>
                  {proofFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-semibold">{proofFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload image or PDF</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG or PDF · Max 5MB</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground" onClick={handlePayOnline} disabled={paymentLoading}>
                  <CreditCard className="h-4 w-4" />{paymentLoading ? 'Opening...' : 'Pay Online'}
                </Button>
                <Button type="submit" disabled={uploading} className="flex-1 gradient-primary text-primary-foreground">
                  {uploading ? 'Uploading...' : 'Submit Proof'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Message Manager Dialog */}
      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Message {activeTenancy?.manager_name || 'House Manager'}</DialogTitle>
            <DialogDescription>Send a message about your tenancy. They will see it in their dashboard.</DialogDescription>
          </DialogHeader>
          {!activeTenancy ? (
            <p className="text-muted-foreground text-sm mt-4">You need an active tenancy to message your house manager.</p>
          ) : (
            <form onSubmit={handleSendMessage} className="space-y-4 mt-4">
              <div className="bg-secondary rounded-xl p-3 text-sm">
                <p className="font-semibold">{activeTenancy.property_title}</p>
                <p className="text-muted-foreground text-xs mt-0.5">Manager: {activeTenancy.manager_name}</p>
              </div>
              <div>
                <Label>Your Message</Label>
                <Textarea value={messageText} onChange={e => setMessageText(e.target.value)} rows={4} required placeholder="Write your message to your house manager..." className="mt-1" maxLength={500} />
                <p className="text-xs text-muted-foreground mt-1">{messageText.length}/500</p>
              </div>
              <Button type="submit" disabled={sendingMessage} className="w-full gradient-primary text-primary-foreground gap-2">
                <Send className="h-4 w-4" />{sendingMessage ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
