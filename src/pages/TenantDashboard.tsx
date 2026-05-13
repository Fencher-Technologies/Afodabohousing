import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';
import { listPayments, createPayment, PaymentData } from '@/services/payments';
import {
  Home, DollarSign, Bell, Upload, CheckCircle, AlertCircle,
  MessageSquare, Send, ChevronRight, LayoutDashboard, LogOut, Calendar
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

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

  const [activeLease, setActiveLease] = useState<any>(null);
  const [tenantRecord, setTenantRecord] = useState<any>(null);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [memoDialog, setMemoDialog] = useState(false);
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

    const [tenantResult, payResult] = await Promise.all([
      supabase.from('tenants').select('*, leases!inner(*, properties(*))').eq('user_id', user.id).maybeSingle(),
      listPayments().catch(() => ({ items: [], total: 0 })),
    ]);

    const tenant = tenantResult.data;
    setTenantRecord(tenant);

    const lease = tenant?.leases?.[0] || null;
    setActiveLease(lease);

    setPayments(payResult.items || []);
    setMessages([]);
    setLoading(false);
  };

  const daysLeft = activeLease ? differenceInDays(new Date(activeLease.end_date), new Date()) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;
  const unreadMessages = messages.filter(m => !m.is_read && m.receiver_id === user?.id).length;
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const totalPaid = confirmedPayments.reduce((s, p) => s + p.amount, 0);

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
      setMemoDialog(false);
      setProofFile(null);
      setPaymentNote('');
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const handleSendMessage = async () => {
    setSendingMessage(false);
    toast({ title: 'Messaging unavailable', description: 'Chat feature is not available in this version.' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-noise">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-body">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-noise">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 fade-in">
          <div>
            <h1 className="text-2xl sm:text-3xl">Your Home</h1>
            <p className="text-muted-foreground font-body text-sm mt-1">
              {activeLease ? activeLease.properties?.title : 'No active lease'}
            </p>
          </div>
          <button onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors p-2">
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation tabs */}
        <nav className="flex gap-1 mb-8 border-b border-border pb-1">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-body transition-all rounded-t-md ${
                tab === item.id ? 'nav-active text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {item.icon} {item.label}
              {item.id === 'messages' && unreadMessages > 0 && (
                <span className="ml-1 w-2 h-2 rounded-full bg-primary" />
              )}
              {item.id === 'payments' && !activeLease && (
                <span className="ml-1 w-2 h-2 rounded-full bg-warning" />
              )}
            </button>
          ))}
        </nav>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Lease status card */}
            {activeLease ? (
              <div className="bg-card border border-border rounded-sm p-6 card-lift">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">Current Lease</p>
                    <h2 className="text-xl mt-1">{activeLease.properties?.title || 'Property'}</h2>
                    {activeLease.properties && (
                      <p className="text-sm text-muted-foreground font-body mt-1">
                        {activeLease.properties.city}, {activeLease.properties.district}
                      </p>
                    )}
                  </div>
                  <div className={`px-3 py-1 text-xs font-body rounded-sm ${
                    isOverdue ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                    isDueSoon ? 'bg-warning/10 text-warning border border-warning/20' :
                    'status-confirmed'
                  }`}>
                    {isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : 'Active'}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground font-body">Monthly Rent</p>
                    <p className="amount text-lg mt-0.5">UGX {activeLease.monthly_rent?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-body">End Date</p>
                    <p className="text-sm font-body mt-0.5">{format(new Date(activeLease.end_date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-body">Days Left</p>
                    <p className={`text-sm font-body mt-0.5 ${isOverdue ? 'text-destructive' : ''}`}>
                      {daysLeft !== null ? (isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days`) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-body">Total Paid</p>
                    <p className="amount text-lg mt-0.5 text-accent">UGX {totalPaid?.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-sm p-8 text-center">
                <Home className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg">No active lease</h3>
                <p className="text-sm text-muted-foreground font-body mt-1">Contact your house manager to set up your lease.</p>
              </div>
            )}

            {/* Recent payments */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3>Recent Payments</h3>
                {payments.length > 4 && (
                  <button onClick={() => setTab('payments')} className="text-xs text-primary hover:underline font-body flex items-center gap-1">
                    View All <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body py-4 text-center border border-dashed border-border rounded-sm">
                  No payments yet
                </p>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 4).map(p => (
                    <div key={p.id} className="bg-card border border-border rounded-sm px-4 py-3 flex items-center justify-between card-lift">
                      <div>
                        <p className="font-body text-sm font-medium">{p.payment_type}</p>
                        <p className="text-xs text-muted-foreground font-body">
                          {p.due_date ? format(new Date(p.due_date), 'MMM dd, yyyy') : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="amount text-sm">{p.amount?.toLocaleString()}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-sm font-body ${
                          p.status === 'confirmed' ? 'status-confirmed' :
                          p.status === 'uploaded' ? 'status-uploaded' :
                          p.status === 'rejected' ? 'status-rejected' : 'status-pending'
                        }`}>{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {tab === 'payments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2>Payment History</h2>
              {activeLease && (
                <Button onClick={() => setMemoDialog(true)} className="bg-primary text-primary-foreground font-body text-sm h-9 px-4 rounded-sm">
                  <Upload className="h-4 w-4 mr-2" /> Pay Rent
                </Button>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-sm">
                <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-body text-muted-foreground">No payments yet</p>
                {activeLease && (
                  <Button onClick={() => setMemoDialog(true)} variant="outline" className="mt-4 font-body text-sm rounded-sm">
                    Make your first payment
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto border border-border rounded-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted font-body text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-3 px-4 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-left py-3 px-4 font-medium">Due Date</th>
                      <th className="text-left py-3 px-4 font-medium">Paid Date</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 amount">{p.amount?.toLocaleString()}</td>
                        <td className="py-3 px-4 font-body text-muted-foreground">{p.payment_type}</td>
                        <td className="py-3 px-4 font-body text-muted-foreground">
                          {p.due_date ? format(new Date(p.due_date), 'MMM dd, yyyy') : '—'}
                        </td>
                        <td className="py-3 px-4 font-body text-muted-foreground">
                          {p.paid_date ? format(new Date(p.paid_date), 'MMM dd, yyyy') : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-xs rounded-sm font-body ${
                            p.status === 'confirmed' ? 'status-confirmed' :
                            p.status === 'uploaded' ? 'status-uploaded' :
                            p.status === 'rejected' ? 'status-rejected' : 'status-pending'
                          }`}>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MESSAGES TAB */}
        {tab === 'messages' && (
          <div className="space-y-6">
            <h2>Messages</h2>

            {/* Message input */}
            {activeLease && (
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Type your message..."
                  className="font-body text-sm rounded-sm"
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                />
                <Button onClick={handleSendMessage} disabled={sendingMessage || !messageText.trim()}
                  className="bg-primary text-primary-foreground font-body text-sm rounded-sm h-10 px-4">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Message list */}
            <div className="space-y-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body text-center py-8 border border-dashed border-border rounded-sm">
                  No messages yet
                </p>
              ) : messages.map(m => (
                <div key={m.id} className={`bg-card border border-border rounded-sm p-4 card-lift ${!m.is_read && m.receiver_id === user?.id ? 'border-l-4 border-l-primary' : ''}`}>
                  <div className="flex items-start justify-between">
                    <p className="font-body text-sm font-medium">
                      {m.sender_name || 'System'} <span className="text-muted-foreground font-normal">→ {m.receiver_name || 'User'}</span>
                    </p>
                    <p className="text-xs text-muted-foreground font-body">
                      {format(new Date(m.created_at), 'MMM dd, h:mm a')}
                    </p>
                  </div>
                  <p className="font-body text-sm mt-2">{m.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment dialog */}
      <Dialog open={memoDialog} onOpenChange={setMemoDialog}>
        <DialogContent className="sm:max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Submit Rent Payment</DialogTitle>
            <DialogDescription className="font-body text-sm">
              Upload your payment proof or confirm mobile money transfer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadPayment} className="space-y-4">
            <div>
              <p className="text-sm font-body font-medium mb-1">Amount</p>
              <p className="amount text-xl">{activeLease?.monthly_rent?.toLocaleString()} UGX</p>
            </div>
            <div>
              <p className="text-sm font-body font-medium mb-2">Upload Payment Proof (optional)</p>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-sm p-6 text-center cursor-pointer hover:border-primary transition-colors"
              >
                {proofFile ? (
                  <p className="font-body text-sm text-primary">{proofFile.name}</p>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground font-body">Tap to upload screenshot or receipt</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <div>
              <p className="text-sm font-body font-medium mb-1">Note (optional)</p>
              <Textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
                placeholder="MTN Mobile Money, ref number..."
                className="font-body text-sm rounded-sm" rows={2} />
            </div>
            <Button type="submit" disabled={uploading}
              className="w-full bg-primary text-primary-foreground font-body text-sm h-10 rounded-sm">
              {uploading ? 'Submitting...' : 'Submit Payment'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
