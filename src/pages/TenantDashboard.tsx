import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';
import { useToast } from '@/hooks/use-toast';
import VoiceRecorder from '@/components/VoiceRecorder';
import { listPayments, createPayment, PaymentData } from '@/services/payments';
import {
  Home, MessageSquare, Send, Upload, CheckCircle, X,
  Calendar, MapPin, Phone, Mail, ChevronRight, Building2, Clock, Image, Settings, LogOut
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

type Tab = 'home' | 'payments' | 'messages' | 'settings';

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { id: 'payments', label: 'Payments', icon: <span className="text-[10px] font-extrabold h-5 w-5 flex items-center justify-center">UGX</span> },
  { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-5 w-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

export default function TenantDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('home');
  const [activeLease, setActiveLease] = useState<any>(null);
  const [tenantRecord, setTenantRecord] = useState<any>(null);
  const [managerProfile, setManagerProfile] = useState<any>(null);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });
  const [sendingPassword, setSendingPassword] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user, authLoading]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [tenantResult, payResult] = await Promise.all([
      supabase.from('tenants').select('*, leases!inner(*, properties(*))').eq('user_id', user.id).maybeSingle(),
      listPayments().catch(() => ({ items: [], total: 0 })),
    ]);

    const tenant = tenantResult.data;
    setTenantRecord(tenant);
    const lease = tenant?.leases?.[0] || null;
    setActiveLease(lease);

    if (lease?.owner_id) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', lease.owner_id).maybeSingle();
      setManagerProfile(profile);
    }

    setPayments(payResult.items || []);

    if (user) {
      const msgRes = await supabase.from('messages').select('*, profiles!sender_id(full_name)').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: false });
      setMessages((msgRes.data || []).map(m => ({
        ...m,
        sender_name: m.sender_id === user.id ? 'You' : m.profiles?.full_name || 'Manager',
      })).reverse());
    } else {
      setMessages([]);
    }
    setLoading(false);
  };

  const daysLeft = activeLease ? differenceInDays(new Date(activeLease.end_date), new Date()) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
  const unreadMessages = messages.filter(m => !m.is_read && m.receiver_id === user?.id).length;
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const totalPaid = confirmedPayments.reduce((s, p) => s + p.amount, 0);
  const lastPayment = payments[0];
  const nextDue = activeLease ? new Date(activeLease.end_date) : null;

  const property = activeLease?.properties;

  const activityFeed = [
    ...payments.map(p => ({
      id: `pay-${p.id}`,
      type: 'payment' as const,
      title: p.status === 'confirmed' ? 'Payment confirmed' : p.status === 'uploaded' ? 'Payment submitted' : 'Payment recorded',
      detail: `UGX ${p.amount?.toLocaleString()} — ${p.status}`,
      date: p.paid_date || p.created_at,
      status: p.status,
    })),
    ...messages.filter(m => m.sender_id !== user?.id).map(m => ({
      id: `msg-${m.id}`,
      type: 'message' as const,
      title: `Message from ${m.sender_name || 'Manager'}`,
      detail: m.content || 'Voice note',
      date: m.created_at,
      isUnread: !m.is_read,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  const handleUploadPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLease || !tenantRecord || !user) return;
    setUploading(true);

    let proofUrl = '';
    if (proofFile) {
      const ext = proofFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('payment-proofs').upload(filePath, proofFile);
      if (uploadErr) {
        toast({ title: 'Upload failed', description: uploadErr.message, variant: 'destructive' });
        setUploading(false); return;
      }
      proofUrl = filePath;
    }

    try {
      await createPayment({
        lease_id: activeLease.id,
        tenant_id: tenantRecord.id,
        amount: activeLease.monthly_rent,
        payment_type: 'rent',
        payment_method: proofFile ? 'mobile_money' : undefined,
        due_date: activeLease.end_date,
        status: proofFile ? 'uploaded' : 'pending',
        notes: paymentNote || null,
      });
      toast({ title: 'Payment submitted!' });
      setMemoOpen(false);
      setProofFile(null);
      setPaymentNote('');
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setUploading(false);
  };

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
    toast({ title: 'Password updated', description: 'Use your new password next time you sign in.' });
    setPasswordDialogOpen(false);
    setPasswordForm({ new: '', confirm: '' });
  };

  const handleSendMessage = async () => {
    if (!user || !activeLease?.owner_id || (!messageText.trim() && !voiceUrl)) return;
    setSendingMessage(true);
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeLease.owner_id,
      property_id: activeLease.property_id,
      content: messageText.trim() || null,
      voice_note_url: voiceUrl,
    });
    setSendingMessage(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Message sent!' });
    setMessageText('');
    setVoiceUrl(null);
    fetchData();
  };

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
    <div className="min-h-screen bg-background flex flex-col pb-16">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Building2 className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate">
              {property?.title || 'My Dashboard'}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {property?.state ? `${property.state} · UGX ${(property.monthly_rent || property.rent_amount || 0).toLocaleString()}/mo` : 'No active lease'}
            </p>
          </div>
        </div>
        {unreadMessages > 0 && (
          <span className="h-2 w-2 rounded-full bg-primary" />
        )}
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {/* HOME TAB */}
        {tab === 'home' && (
          <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
            {/* Lease Status Card */}
            {activeLease ? (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Lease</p>
                    <h2 className="text-lg font-bold mt-0.5">{property?.title || 'Property'}</h2>
                    {property && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5" /> {property.state}{property.area ? ` · ${property.area}` : ''}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isOverdue ? 'bg-destructive/10 text-destructive' :
                    isDueSoon ? 'bg-accent/10 text-accent' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-muted/50 rounded-xl p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Rent</p>
                    <p className="text-base font-bold mt-0.5">UGX {activeLease.monthly_rent?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Days Left</p>
                    <p className={`text-base font-bold mt-0.5 ${isOverdue ? 'text-destructive' : ''}`}>
                      {daysLeft !== null ? (isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">End Date</p>
                    <p className="text-sm font-semibold mt-0.5">{activeLease.end_date ? format(new Date(activeLease.end_date), 'MMM dd') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                    <p className="text-sm font-semibold mt-0.5 text-primary">UGX {totalPaid.toLocaleString()}</p>
                  </div>
                </div>

                {daysLeft !== null && daysLeft <= 30 && (
                  <button className="w-full mt-3 text-sm font-semibold text-primary bg-primary/5 border border-primary/20 rounded-xl py-2.5 hover:bg-primary/10 transition-colors">
                    Request Renewal
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
                <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-bold">No active lease</h3>
                <p className="text-sm text-muted-foreground mt-1">Contact your house manager to set up your lease.</p>
              </div>
            )}

            {/* Rent Summary */}
            {activeLease && (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <span className="text-xs font-extrabold text-primary h-4 w-4 flex items-center justify-center">UGX</span> Rent Overview
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">Current month</span>
                    <span className={`text-sm font-bold ${lastPayment?.status === 'confirmed' ? 'text-primary' : lastPayment?.status === 'uploaded' ? 'text-accent' : 'text-muted-foreground'}`}>
                      {lastPayment?.status === 'confirmed' ? 'Paid ✓' : lastPayment?.status === 'uploaded' ? 'Pending review' : 'Due'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">Next due</span>
                    <span className="text-sm font-bold">{nextDue ? format(nextDue, 'MMM dd') : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">Lifetime paid</span>
                    <span className="text-sm font-bold text-primary">UGX {totalPaid.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Feed */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Recent Activity
              </h3>
              {activityFeed.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
              ) : (
                <div className="space-y-0">
                  {activityFeed.map(item => (
                    <div key={item.id} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                        item.type === 'payment'
                          ? item.status === 'confirmed' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent'
                          : item.isUnread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {item.type === 'payment' ? <span className="text-[9px] font-extrabold">UGX</span> : <MessageSquare className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{format(new Date(item.date), 'MMM dd')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Property Snapshot */}
            {property && (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Image className="h-4 w-4 text-primary" /> Your Home
                </h3>
                {property.images && property.images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-3">
                    {property.images.slice(0, 5).map((url: string, i: number) => (
                      <img key={i} src={url} alt={`${property.title} ${i + 1}`}
                        className="h-24 w-36 object-cover rounded-xl shrink-0" />
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Bedrooms</p>
                    <p className="font-bold">{property.bedrooms}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Bathrooms</p>
                    <p className="font-bold">{property.bathrooms}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-bold capitalize">{property.property_type?.replace('_', ' ')}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">District</p>
                    <p className="font-bold">{property.state}</p>
                  </div>
                </div>
                {property.amenities && property.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {property.amenities.map((a: string) => (
                      <span key={a} className="text-xs bg-primary/5 text-primary px-2.5 py-1 rounded-full font-medium">{a}</span>
                    ))}
                  </div>
                )}
                {property.manager_phone && (
                  <a href={`tel:${property.manager_phone}`}
                    className="flex items-center gap-2 text-sm text-primary font-semibold mt-3 pt-3 border-t border-border">
                    <Phone className="h-4 w-4" /> {property.manager_phone}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* PAYMENTS TAB */}
        {tab === 'payments' && (
          <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
            {/* Pay Rent Button */}
            {activeLease && (
              <Drawer open={memoOpen} onOpenChange={setMemoOpen}>
                <DrawerTrigger asChild>
                  <Button className="w-full h-12 rounded-xl gap-2 text-base font-bold shadow-sm">
                    <Upload className="h-5 w-5" /> Pay Rent
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader className="text-left">
                    <DrawerTitle>Submit Rent Payment</DrawerTitle>
                    <DrawerDescription>Upload payment proof or confirm mobile money transfer.</DrawerDescription>
                  </DrawerHeader>
                  <form onSubmit={handleUploadPayment} className="px-4 pb-6 space-y-4">
                    <div className="bg-muted/50 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground">Amount Due</p>
                      <p className="text-2xl font-bold mt-1">UGX {activeLease.monthly_rent?.toLocaleString()}</p>
                    </div>

                    <div>
                      <p className="text-sm font-semibold mb-2">Upload Payment Proof</p>
                      <div onClick={() => fileRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors">
                        {proofFile ? (
                          <p className="text-sm font-medium text-primary flex items-center justify-center gap-2">
                            <CheckCircle className="h-4 w-4" /> {proofFile.name}
                          </p>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Tap to upload screenshot or receipt</p>
                          </>
                        )}
                        <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold mb-2">Note (optional)</p>
                      <Textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
                        placeholder="MTN Mobile Money, ref number..."
                        className="rounded-xl" rows={2} />
                    </div>

                    <div className="flex gap-3">
                      <DrawerClose asChild>
                        <Button type="button" variant="outline" className="flex-1 rounded-xl h-11">Cancel</Button>
                      </DrawerClose>
                      <Button type="submit" disabled={uploading}
                        className="flex-1 rounded-xl h-11 font-bold">
                        {uploading ? 'Submitting...' : 'Submit Payment'}
                      </Button>
                    </div>
                  </form>
                </DrawerContent>
              </Drawer>
            )}

            {/* Payment History */}
            <div className="bg-card border border-border rounded-2xl shadow-sm">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-bold text-sm">Payment History</h3>
              </div>
              {payments.length === 0 ? (
                <div className="text-center py-10 px-5">
                  <span className="text-lg font-extrabold text-muted-foreground/30 h-10 w-10 flex items-center justify-center mx-auto mb-3">UGX</span>
                  <p className="text-sm font-medium">No payments yet</p>
                  {activeLease && (
                    <p className="text-xs text-muted-foreground mt-1">Tap "Pay Rent" to make your first payment.</p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {payments.map(p => (
                    <div key={p.id} className="px-5 py-4 flex items-center gap-4">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        p.status === 'confirmed' ? 'bg-primary/10 text-primary' :
                        p.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                        'bg-accent/10 text-accent'
                      }`}>
                        {p.status === 'confirmed' ? <CheckCircle className="h-4 w-4" /> :
                         p.status === 'rejected' ? <X className="h-4 w-4" /> :
                         <Clock className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">UGX {p.amount?.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.due_date ? format(new Date(p.due_date), 'MMM dd, yyyy') : ''}
                          {p.paid_date ? ` · Paid ${format(new Date(p.paid_date), 'MMM dd')}` : ''}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        p.status === 'confirmed' ? 'bg-primary/10 text-primary' :
                        p.status === 'uploaded' ? 'bg-accent/10 text-accent' :
                        p.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MESSAGES TAB */}
        {tab === 'messages' && (
          <div className="flex flex-col h-[calc(100vh-10rem)]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-lg mx-auto w-full">
              {messages.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Say hello to {managerProfile?.full_name || 'your property manager'}!
                  </p>
                </div>
              ) : messages.map(m => {
                const isMe = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${isMe ? 'order-1' : 'order-1'}`}>
                      {!isMe && (
                        <p className="text-xs text-muted-foreground mb-1 px-1">{m.sender_name || 'Manager'}</p>
                      )}
                      <div className={`rounded-2xl px-4 py-2.5 ${
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      }`}>
                        {m.content && <p className="text-sm">{m.content}</p>}
                        {m.voice_note_url && <audio src={m.voice_note_url} controls className="h-8 mt-1" />}
                      </div>
                      <p className={`text-xs text-muted-foreground mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                        {format(new Date(m.created_at), 'h:mm a')}
                        {!m.is_read && !isMe && <span className="ml-2 text-primary font-bold">· New</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {activeLease && (
              <div className="sticky bottom-0 bg-card border-t border-border p-3">
                <div className="flex gap-2 max-w-lg mx-auto w-full">
                  <Input
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    className="rounded-xl h-11"
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  />
                  <VoiceRecorder
                    onRecordingComplete={setVoiceUrl}
                    onClear={() => setVoiceUrl(null)}
                    audioUrl={voiceUrl}
                  />
                  <Button onClick={handleSendMessage}
                    disabled={sendingMessage || (!messageText.trim() && !voiceUrl)}
                    className="rounded-xl h-11 w-11 p-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
            {/* Profile Card */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-display font-bold text-xl shadow-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-base truncate">{user?.email?.split('@')[0]}</p>
                  <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-card border border-border rounded-2xl shadow-sm divide-y divide-border">
              <button
                onClick={() => setPasswordDialogOpen(true)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                <Settings className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Change Password</p>
                  <p className="text-xs text-muted-foreground">Update your account password</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => supabase.auth.signOut().then(() => navigate('/'))}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">Sign Out</p>
                  <p className="text-xs text-muted-foreground">Log out of your account</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-card border-t border-border">
        <div className="max-w-lg mx-auto flex">
          {NAV_ITEMS.map(item => {
            const badge = item.id === 'messages' ? unreadMessages : 0;
            return (
              <button key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                  tab === item.id
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>
                <span className="relative">
                  {item.icon}
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {/* Change Password Dialog */}
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
                required placeholder="At least 6 characters" className="rounded-xl h-11" />
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Confirm New Password</p>
              <Input type="password" minLength={6} value={passwordForm.confirm}
                onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
                required placeholder="Repeat the new password" className="rounded-xl h-11" />
            </div>
            <div className="flex gap-3">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1 rounded-xl h-11">Cancel</Button>
              </DrawerClose>
              <Button type="submit" disabled={sendingPassword}
                className="flex-1 rounded-xl h-11 font-bold">
                {sendingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
