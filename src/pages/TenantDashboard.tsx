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
  Home, Clock, DollarSign, Bell, FileText, Search, Upload,
  CheckCircle, AlertCircle, RefreshCcw, Eye, CreditCard,
  MessageSquare, Send, Smartphone, ArrowRight, ChevronRight
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

type Tenancy = Database['public']['Tables']['tenancies']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

const statusClass = (s: string) => ({
  pending: 'bg-secondary text-foreground border border-border',
  uploaded: 'bg-primary/10 text-primary border border-primary/20',
  confirmed: 'bg-accent/10 text-accent border border-accent/20',
  rejected: 'bg-destructive/10 text-destructive border border-destructive/20',
}[s] || 'bg-muted text-muted-foreground');

type Tab = 'overview' | 'payments' | 'messages';

export default function TenantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tenancies, setTenancies] = useState<(Tenancy & { property_title?: string; manager_name?: string; manager_phone?: string })[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [messages, setMessages] = useState<(Message & { sender_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');

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
      supabase.from('messages').select('*').eq('receiver_id', user.id).order('created_at', { ascending: false }),
    ]);

    const myTenancies = tenRes.data || [];
    const propIds = [...new Set(myTenancies.map(t => t.property_id))];
    const managerIds = [...new Set(myTenancies.map(t => t.manager_id))];
    const senderIds = [...new Set((msgRes.data || []).map(m => m.sender_id))];

    const propMap: Record<string, string> = {};
    if (propIds.length) {
      const { data: props } = await supabase.from('properties').select('id, title').in('id', propIds);
      props?.forEach(p => { propMap[p.id] = p.title; });
    }

    const managerMap: Record<string, { name: string; phone: string }> = {};
    const allProfileIds = [...new Set([...managerIds, ...senderIds])];
    if (allProfileIds.length) {
      const { data: managers } = await supabase.from('profiles').select('user_id, full_name, phone').in('user_id', allProfileIds);
      managers?.forEach(m => { managerMap[m.user_id] = { name: m.full_name || 'Manager', phone: m.phone || '' }; });
    }

    setTenancies(myTenancies.map(t => ({
      ...t,
      property_title: propMap[t.property_id],
      manager_name: managerMap[t.manager_id]?.name,
      manager_phone: managerMap[t.manager_id]?.phone,
    })));
    setPayments(payRes.data || []);
    setMessages((msgRes.data || []).map(m => ({ ...m, sender_name: managerMap[m.sender_id]?.name })));
    setLoading(false);
  };

  const activeTenancy = tenancies.find(t => t.status === 'active');
  const daysLeft = activeTenancy ? differenceInDays(new Date(activeTenancy.rent_end_date), new Date()) : null;
  const isRentOverdue = daysLeft !== null && daysLeft < 0;
  const isRentDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
  const unreadMessages = messages.filter(m => !m.is_read).length;

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
      description: proofFile
        ? 'Your proof has been sent to your house manager for review. You will receive an SMS confirmation.'
        : 'Payment noted. Upload a proof so your manager can confirm.',
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
        toast({ title: 'Payment Error', description: msg.includes('amount_exceeds') ? 'Payment limit exceeded on this gateway account. Please upload a mobile money proof instead.' : msg, variant: 'destructive' });
        setPaymentLoading(false);
        return;
      }
      if (response.data?.success && response.data?.redirectUrl) {
        await supabase.from('payments').insert({
          tenancy_id: activeTenancy.id, tenant_id: user.id, manager_id: activeTenancy.manager_id,
          amount: activeTenancy.rent_amount, currency: 'UGX',
          period_start: activeTenancy.rent_start_date, period_end: activeTenancy.rent_end_date,
          status: 'pending', notes: `Online payment initiated`,
        });
        window.open(response.data.redirectUrl, '_blank');
        toast({ title: 'Payment page opened!', description: 'Complete your payment via mobile money or card in the new window.' });
      } else {
        const errMsg = response.data?.error || 'Could not initiate online payment.';
        const friendly = errMsg.includes('amount_exceeds') || errMsg.includes('exceeds limit')
          ? 'Your rent amount exceeds the current payment gateway limit. Please send payment via mobile money and upload proof below.'
          : errMsg.includes('PesaPal auth') ? 'Payment gateway credentials not configured. Please contact support.'
          : 'Could not initiate online payment. Please upload your mobile money proof instead.';
        toast({ title: 'Payment Gateway Unavailable', description: friendly, variant: 'destructive' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Payment Error', description: msg || 'Could not connect to payment gateway. Please upload proof of mobile money transfer.', variant: 'destructive' });
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container max-w-5xl py-6 px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-secondary border border-border flex items-center justify-center text-foreground font-display font-bold text-xl">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-accent font-semibold text-xs uppercase tracking-widest">My Account</p>
                <h1 className="font-display text-2xl font-bold text-foreground">Tenant Dashboard</h1>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 h-9">
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl py-6 px-4 flex-1">
        {/* Alerts */}
        {isRentOverdue && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-5 mb-4 flex items-start gap-4">
            <div className="bg-destructive/20 rounded-xl p-2 shrink-0">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground text-base">Your Rent is Overdue</p>
              <p className="text-muted-foreground text-sm mt-1">
                Your rent period ended on <strong>{activeTenancy ? format(new Date(activeTenancy.rent_end_date), 'MMMM dd, yyyy') : ''}</strong>.
                Please arrange payment immediately.
              </p>
            </div>
            <Button size="sm" variant="destructive" className="shrink-0" onClick={() => setUploadOpen(true)}>Pay Now</Button>
          </div>
        )}

        {isRentDueSoon && !isRentOverdue && (
          <div className="bg-accent/10 border border-accent/30 rounded-2xl p-5 mb-4 flex items-start gap-4">
            <div className="bg-accent/20 rounded-xl p-2 shrink-0">
              <Bell className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground text-base">
                Rent Due in {daysLeft} Day{daysLeft !== 1 ? 's' : ''}
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Your rent of <strong className="text-primary">UGX {activeTenancy?.rent_amount.toLocaleString()}</strong> expires on{' '}
                <strong>{activeTenancy ? format(new Date(activeTenancy.rent_end_date), 'MMMM dd, yyyy') : ''}</strong>.
              </p>
            </div>
            <div className="flex gap-2 shrink-0 flex-col sm:flex-row">
              <Button size="sm" variant="outline" onClick={handlePayOnline} disabled={paymentLoading} className="gap-1 border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                {paymentLoading ? 'Opening...' : 'Pay Online'}
              </Button>
              <Button size="sm" className="gradient-primary text-primary-foreground gap-1" onClick={() => setUploadOpen(true)}>
                <Upload className="h-3.5 w-3.5" />
                Upload Proof
              </Button>
            </div>
          </div>
        )}

        {unreadMessages > 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <p className="text-sm font-medium text-foreground flex-1">
              You have <strong>{unreadMessages}</strong> unread message{unreadMessages > 1 ? 's' : ''} from your house manager
            </p>
            <Button size="sm" variant="outline" onClick={() => setTab('messages')}>View <ChevronRight className="h-3.5 w-3.5 ml-1" /></Button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { icon: <Search className="h-5 w-5" />, label: 'Find a Home', sub: 'Browse properties', action: () => navigate('/properties'), highlight: false },
            { icon: <Upload className="h-5 w-5" />, label: 'Upload Proof', sub: 'Submit payment', action: () => setUploadOpen(true), highlight: isRentDueSoon || isRentOverdue },
            { icon: <CreditCard className="h-5 w-5" />, label: 'Pay Online', sub: 'Mobile money or card', action: handlePayOnline, highlight: false, loading: paymentLoading },
            { icon: <MessageSquare className="h-5 w-5" />, label: 'Message Manager', sub: 'Send a message', action: () => setMessageOpen(true), highlight: false, badge: unreadMessages },
          ].map(a => (
            <button
              key={a.label}
              onClick={a.action}
              disabled={a.loading}
              className={`bg-card border rounded-2xl p-5 text-center hover:shadow-md transition-all group relative ${a.highlight ? 'border-accent/60 bg-accent/5' : 'border-border hover:border-primary/40'}`}
            >
              {a.badge ? <span className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">{a.badge}</span> : null}
              <div className={`mx-auto mb-2 flex justify-center transition-colors ${a.highlight ? 'text-accent' : 'text-primary group-hover:text-accent'}`}>
                {a.icon}
              </div>
              <div className={`text-sm font-semibold ${a.highlight ? 'text-accent' : 'text-foreground'}`}>{a.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{a.loading ? 'Opening...' : a.sub}</div>
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6 w-fit">
          {([
            { id: 'overview', label: 'Overview' },
            { id: 'payments', label: 'Payments' },
            { id: 'messages', label: `Messages${unreadMessages ? ` (${unreadMessages})` : ''}` },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <div className="flex items-center gap-2 mb-5">
                <div className="bg-primary/10 rounded-xl p-2">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-display font-bold text-xl">Current Tenancy</h2>
              </div>
              {loading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-muted animate-pulse rounded" />)}</div>
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
                    { label: 'Rent Period', val: activeTenancy.rent_period, capitalize: true },
                    { label: 'Start Date', val: format(new Date(activeTenancy.rent_start_date), 'MMMM dd, yyyy') },
                    { label: 'Expiry Date', val: format(new Date(activeTenancy.rent_end_date), 'MMMM dd, yyyy') },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">{r.label}</span>
                      <span className={`text-sm ${r.bold ? 'font-bold text-primary text-base' : 'font-medium'} ${r.capitalize ? 'capitalize' : ''}`}>{r.val}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-bold ${isRentOverdue ? 'text-destructive' : isRentDueSoon ? 'text-accent' : 'text-foreground'}`}>
                        {isRentOverdue ? 'Overdue' : daysLeft !== null ? `${daysLeft} days remaining` : ''}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${activeTenancy.status === 'active' ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-muted text-muted-foreground'}`}>
                        {activeTenancy.status}
                      </span>
                    </div>
                    {daysLeft !== null && (
                      <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full rounded-full transition-all ${isRentOverdue ? 'bg-destructive w-full' : isRentDueSoon ? 'bg-accent' : 'bg-primary'}`}
                          style={{ width: isRentOverdue ? '100%' : `${Math.min(100, Math.max(5, ((30 - (daysLeft || 0)) / 30) * 100))}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Home className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-display font-semibold text-foreground">No active tenancy</p>
                  <p className="text-sm mt-1">You are not currently linked to any property</p>
                  <Button size="sm" className="mt-4 gradient-primary text-primary-foreground" onClick={() => navigate('/properties')}>
                    Find a Home
                  </Button>
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="bg-accent/10 rounded-xl p-2">
                    <DollarSign className="h-5 w-5 text-accent" />
                  </div>
                  <h2 className="font-display font-bold text-xl">Recent Payments</h2>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setTab('payments')} className="text-xs text-muted-foreground">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
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
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${statusClass(p.status)}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-display font-semibold text-foreground">No payments yet</p>
                  {activeTenancy && (
                    <Button size="sm" className="mt-4 gradient-primary text-primary-foreground" onClick={() => setUploadOpen(true)}>
                      Upload Payment Proof
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payments */}
        {tab === 'payments' && (
          <div>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display font-bold text-2xl">Payment History</h2>
              {activeTenancy && (
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground" onClick={handlePayOnline} disabled={paymentLoading}>
                    <CreditCard className="h-4 w-4" />
                    {paymentLoading ? 'Opening...' : 'Pay Online'}
                  </Button>
                  <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => setUploadOpen(true)}>
                    <Upload className="h-4 w-4" />
                    Upload Proof
                  </Button>
                </div>
              )}
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground">
                <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-xl font-display font-bold text-foreground">No payment records yet</p>
                <p className="text-sm mt-2">Upload rent proof or pay online to see your history here</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold">Date</th>
                        <th className="text-left py-3 px-4 font-semibold">Amount (UGX)</th>
                        <th className="text-left py-3 px-4 font-semibold">Period</th>
                        <th className="text-left py-3 px-4 font-semibold">Notes</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                        <th className="text-left py-3 px-4 font-semibold">Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id} className="border-t border-border hover:bg-secondary/50">
                          <td className="py-3 px-4 text-muted-foreground text-xs">{format(new Date(p.created_at), 'MMM dd, yyyy')}</td>
                          <td className="py-3 px-4 font-bold text-foreground">{p.amount.toLocaleString()}</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">{p.period_start} to {p.period_end}</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs max-w-[200px] truncate">{p.notes || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusClass(p.status)}`}>{p.status}</span>
                          </td>
                          <td className="py-3 px-4">
                            {p.status === 'confirmed' ? (
                              <span className="text-accent text-xs flex items-center gap-1 font-semibold">
                                <CheckCircle className="h-3 w-3" />Confirmed
                              </span>
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

        {/* Messages */}
        {tab === 'messages' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-display font-bold text-2xl">Messages</h2>
              {activeTenancy && (
                <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => setMessageOpen(true)}>
                  <Send className="h-4 w-4" />Message Manager
                </Button>
              )}
            </div>
            {messages.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-xl font-display font-bold text-foreground">No messages yet</p>
                <p className="text-sm mt-2">Messages from your house manager will appear here</p>
              </div>
            ) : (
              messages.map(m => (
                <div
                  key={m.id}
                  onClick={() => !m.is_read && markRead(m.id)}
                  className={`bg-card border rounded-2xl p-5 transition-all cursor-pointer ${!m.is_read ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-border hover:border-border/80'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-full gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">
                      {(m.sender_name || 'M').charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-semibold text-foreground text-sm">{m.sender_name || 'House Manager'}</span>
                        {!m.is_read && <Badge className="bg-primary text-primary-foreground text-xs">New</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{m.content}</p>
                      <p className="text-xs text-muted-foreground/60 mt-2">{format(new Date(m.created_at), 'MMMM dd, yyyy')} at {format(new Date(m.created_at), 'HH:mm')}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Browse CTA */}
        <div className="mt-10 gradient-primary rounded-3xl p-8 text-center">
          <h3 className="font-display text-2xl font-bold text-primary-foreground mb-2">Looking for a Better Home?</h3>
          <p className="text-primary-foreground/80 mb-5">Browse verified properties across all 135 Ugandan districts.</p>
          <Button className="bg-gold text-gold-foreground hover:bg-gold/90 font-semibold px-8" onClick={() => navigate('/properties')}>
            Browse Properties
          </Button>
        </div>
      </div>

      {/* Upload Proof Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Upload Payment Proof</DialogTitle>
            <DialogDescription>Submit your rent payment proof for your house manager to review.</DialogDescription>
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
                <div className="flex justify-between"><span className="text-muted-foreground">Property</span><span className="font-semibold">{activeTenancy.property_title}</span></div>
              </div>
              <div>
                <Label>Payment Reference / Transaction ID</Label>
                <Textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="e.g. MTN Mobile Money TXN: 1234567890 or Airtel Money Ref: AM20250315" rows={3} className="mt-1" />
              </div>
              <div>
                <Label>Upload Proof (bank slip, mobile money screenshot)</Label>
                <div
                  className="mt-1 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {proofFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-semibold">{proofFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload image or PDF</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG or PDF. Max 5MB.</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground" onClick={handlePayOnline} disabled={paymentLoading}>
                  <CreditCard className="h-4 w-4" />
                  {paymentLoading ? 'Opening...' : 'Pay Online'}
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
            <DialogDescription>Send a message to your house manager about your tenancy.</DialogDescription>
          </DialogHeader>
          {!activeTenancy ? (
            <p className="text-muted-foreground text-sm mt-4">You need an active tenancy to message your house manager.</p>
          ) : (
            <form onSubmit={handleSendMessage} className="space-y-4 mt-4">
              <div className="bg-secondary rounded-xl p-3 text-sm">
                <p className="font-medium">{activeTenancy.property_title}</p>
                <p className="text-muted-foreground text-xs mt-0.5">Manager: {activeTenancy.manager_name}</p>
              </div>
              <div>
                <Label>Your Message</Label>
                <Textarea value={messageText} onChange={e => setMessageText(e.target.value)} rows={4} required placeholder="Write your message to your house manager..." className="mt-1" />
              </div>
              <Button type="submit" disabled={sendingMessage} className="w-full gradient-primary text-primary-foreground gap-2">
                <Send className="h-4 w-4" />
                {sendingMessage ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
