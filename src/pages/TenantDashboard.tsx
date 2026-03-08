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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Home, Clock, DollarSign, Bell, FileText, Search, Upload,
  CheckCircle, AlertCircle, RefreshCcw, Eye, Calendar
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

type Tenancy = Database['public']['Tables']['tenancies']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  uploaded: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function TenantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenancies, setTenancies] = useState<(Tenancy & { property_title?: string; manager_name?: string })[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tab, setTab] = useState<'overview' | 'payments'>('overview');

  // Upload payment form
  const [paymentNote, setPaymentNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [tenRes, payRes] = await Promise.all([
      supabase.from('tenancies').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false }),
    ]);

    const myTenancies = tenRes.data || [];
    const propIds = [...new Set(myTenancies.map(t => t.property_id))];
    const managerIds = [...new Set(myTenancies.map(t => t.manager_id))];

    const propMap: Record<string, string> = {};
    if (propIds.length) {
      const { data: props } = await supabase.from('properties').select('id, title').in('id', propIds);
      props?.forEach(p => { propMap[p.id] = p.title; });
    }
    const managerMap: Record<string, string> = {};
    if (managerIds.length) {
      const { data: managers } = await supabase.from('profiles').select('user_id, full_name').in('user_id', managerIds);
      managers?.forEach(m => { managerMap[m.user_id] = m.full_name || 'Manager'; });
    }

    setTenancies(myTenancies.map(t => ({
      ...t,
      property_title: propMap[t.property_id],
      manager_name: managerMap[t.manager_id],
    })));
    setPayments(payRes.data || []);
    setLoading(false);
  };

  const activeTenancy = tenancies.find(t => t.status === 'active');
  const daysLeft = activeTenancy ? differenceInDays(new Date(activeTenancy.rent_end_date), new Date()) : null;
  const isRentDueSoon = daysLeft !== null && daysLeft <= 14;
  const isRentOverdue = daysLeft !== null && daysLeft < 0;

  const handleUploadPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenancy || !user) return;
    setUploading(true);

    let proofUrl = '';

    // Upload file if provided
    if (proofFile) {
      const ext = proofFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, proofFile);
      if (uploadErr) {
        toast({ title: 'Upload failed', description: uploadErr.message, variant: 'destructive' });
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(filePath);
      proofUrl = urlData?.publicUrl || uploadData.path;
    }

    // Create payment record
    const { error } = await supabase.from('payments').insert({
      tenancy_id: activeTenancy.id,
      tenant_id: user.id,
      manager_id: activeTenancy.manager_id,
      amount: activeTenancy.rent_amount,
      currency: 'UGX',
      period_start: activeTenancy.rent_start_date,
      period_end: activeTenancy.rent_end_date,
      status: proofFile ? 'uploaded' : 'pending',
      notes: paymentNote || null,
      proof_url: proofUrl || null,
    });

    setUploading(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '✓ Payment submitted!', description: proofFile ? 'Your proof has been sent to your house manager for review.' : 'Payment noted. Please upload proof when ready.' });
    setUploadOpen(false);
    setPaymentNote('');
    setProofFile(null);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">My Rental Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track your tenancy, payments and reminders</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Rent Alerts */}
        {isRentOverdue && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Rent Overdue!</p>
              <p className="text-sm text-muted-foreground">Your rent period ended on {activeTenancy ? format(new Date(activeTenancy.rent_end_date), 'MMM dd, yyyy') : ''}. Please pay immediately.</p>
            </div>
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive" className="ml-auto shrink-0">Pay Now</Button>
              </DialogTrigger>
            </Dialog>
          </div>
        )}
        {isRentDueSoon && !isRentOverdue && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Bell className="h-5 w-5 text-accent shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Rent Due in {daysLeft} Day{daysLeft !== 1 ? 's' : ''}!</p>
              <p className="text-sm text-muted-foreground">
                Your rent expires on {activeTenancy ? format(new Date(activeTenancy.rent_end_date), 'MMM dd, yyyy') : ''}. Please arrange payment.
              </p>
            </div>
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="ml-auto gradient-primary text-primary-foreground shrink-0">Upload Proof</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle className="font-display text-xl">Upload Payment Proof</DialogTitle></DialogHeader>
                <form onSubmit={handleUploadPayment} className="space-y-4 mt-4">
                  <div className="bg-secondary rounded-lg p-4 text-sm">
                    <div className="flex justify-between mb-1"><span className="text-muted-foreground">Amount Due</span><span className="font-bold text-primary">UGX {activeTenancy?.rent_amount.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span className="font-medium">{activeTenancy ? format(new Date(activeTenancy.rent_end_date), 'MMM dd, yyyy') : ''}</span></div>
                  </div>
                  <div>
                    <Label>Payment Reference / Notes</Label>
                    <Textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="e.g. MTN Mobile Money TXN#: 1234567890 or Airtel Money Ref: AM20250315" rows={3} className="mt-1" />
                  </div>
                  <div>
                    <Label>Upload Proof (bank slip / mobile money screenshot)</Label>
                    <div
                      className="mt-1 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                      onClick={() => fileRef.current?.click()}
                    >
                      {proofFile ? (
                        <div className="flex items-center justify-center gap-2 text-primary">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">{proofFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Click to upload image or PDF</p>
                          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF up to 5MB</p>
                        </>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} />
                  </div>
                  <Button type="submit" disabled={uploading} className="w-full gradient-primary text-primary-foreground">
                    {uploading ? 'Uploading…' : 'Submit Payment'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <Search className="h-5 w-5" />, label: 'Find Property', action: () => navigate('/properties') },
            {
              icon: <Upload className="h-5 w-5" />, label: 'Pay Rent', action: () => setUploadOpen(true),
              highlight: isRentDueSoon || isRentOverdue
            },
            { icon: <FileText className="h-5 w-5" />, label: 'Payment History', action: () => setTab('payments') },
            { icon: <Bell className="h-5 w-5" />, label: 'My Agreement', action: () => {} },
          ].map(a => (
            <button key={a.label} onClick={a.action}
              className={`bg-card border rounded-xl p-5 text-center hover:shadow-md transition-all group ${a.highlight ? 'border-accent/50 bg-accent/5' : 'border-border hover:border-primary/50'}`}>
              <div className={`mx-auto mb-2 flex justify-center transition-colors ${a.highlight ? 'text-accent' : 'text-primary group-hover:text-accent'}`}>{a.icon}</div>
              <div className={`text-sm font-medium ${a.highlight ? 'text-accent' : 'text-foreground'}`}>{a.label}</div>
            </button>
          ))}
        </div>

        {/* Upload dialog (standalone) */}
        {!isRentDueSoon && !isRentOverdue && (
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="font-display text-xl">Upload Payment Proof</DialogTitle></DialogHeader>
              {!activeTenancy ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>No active tenancy found.</p>
                  <Button className="mt-3 gradient-primary text-primary-foreground" onClick={() => { setUploadOpen(false); navigate('/properties'); }}>Find a Home</Button>
                </div>
              ) : (
                <form onSubmit={handleUploadPayment} className="space-y-4 mt-4">
                  <div className="bg-secondary rounded-lg p-4 text-sm">
                    <div className="flex justify-between mb-1"><span className="text-muted-foreground">Amount Due</span><span className="font-bold text-primary">UGX {activeTenancy.rent_amount.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span className="font-medium">{format(new Date(activeTenancy.rent_end_date), 'MMM dd, yyyy')}</span></div>
                  </div>
                  <div>
                    <Label>Payment Reference / Notes</Label>
                    <Textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="e.g. MTN Mobile Money TXN#: 1234567890" rows={3} className="mt-1" />
                  </div>
                  <div>
                    <Label>Upload Proof</Label>
                    <div className="mt-1 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => fileRef.current?.click()}>
                      {proofFile ? <div className="flex items-center justify-center gap-2 text-primary"><CheckCircle className="h-5 w-5" /><span className="text-sm font-medium">{proofFile.name}</span></div>
                        : <><Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Click to upload image or PDF</p></>
                      }
                    </div>
                    <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => setProofFile(e.target.files?.[0] || null)} />
                  </div>
                  <Button type="submit" disabled={uploading} className="w-full gradient-primary text-primary-foreground">
                    {uploading ? 'Uploading…' : 'Submit Payment'}
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6 w-fit">
          {['overview', 'payments'].map(t => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`px-5 py-2 rounded-md text-sm font-medium capitalize transition-all ${tab === t ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Active Tenancy Card */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Home className="h-5 w-5 text-primary" />
                <h2 className="font-display font-semibold text-lg">Current Tenancy</h2>
              </div>
              {loading ? (
                <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-muted animate-pulse rounded" />)}</div>
              ) : activeTenancy ? (
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="font-semibold text-foreground">{activeTenancy.property_title || 'Property'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">House Manager: {activeTenancy.manager_name || 'Manager'}</p>
                  </div>
                  {[
                    { label: 'Monthly Rent', val: `UGX ${activeTenancy.rent_amount.toLocaleString()}`, bold: true },
                    { label: 'Period', val: activeTenancy.rent_period, capitalize: true },
                    { label: 'Start Date', val: format(new Date(activeTenancy.rent_start_date), 'MMM dd, yyyy') },
                    { label: 'End Date', val: format(new Date(activeTenancy.rent_end_date), 'MMM dd, yyyy') },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className={`${r.bold ? 'font-bold text-primary' : ''} ${r.capitalize ? 'capitalize' : ''}`}>{r.val}</span>
                    </div>
                  ))}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className={`text-sm font-semibold ${isRentOverdue ? 'text-destructive' : isRentDueSoon ? 'text-accent' : 'text-foreground'}`}>
                          {isRentOverdue ? 'OVERDUE' : daysLeft !== null ? `${daysLeft} days remaining` : ''}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[activeTenancy.status] || 'bg-green-100 text-green-800'}`}>
                        {activeTenancy.status}
                      </span>
                    </div>
                    {/* Progress bar */}
                    {daysLeft !== null && daysLeft >= 0 && (
                      <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isRentDueSoon ? 'bg-accent' : 'bg-primary'}`}
                          style={{ width: `${Math.min(100, Math.max(0, (daysLeft / 30) * 100))}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Home className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No active tenancy</p>
                  <Button size="sm" className="mt-3 gradient-primary text-primary-foreground" onClick={() => navigate('/properties')}>Find a Home</Button>
                </div>
              )}
            </div>

            {/* Recent payments summary */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h2 className="font-display font-semibold text-lg">Recent Payments</h2>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setTab('payments')} className="text-xs text-muted-foreground">View all</Button>
              </div>
              {loading ? (
                <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
              ) : payments.slice(0, 4).length > 0 ? (
                <div className="space-y-3">
                  {payments.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">UGX {p.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'MMM dd, yyyy')}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor[p.status] || ''}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No payments yet</p>
                  {activeTenancy && (
                    <Button size="sm" className="mt-3 gradient-primary text-primary-foreground" onClick={() => setUploadOpen(true)}>Upload Payment Proof</Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payments tab */}
        {tab === 'payments' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display font-semibold text-xl">Payment History</h2>
              {activeTenancy && (
                <Button className="gradient-primary text-primary-foreground gap-2" onClick={() => setUploadOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Upload Payment Proof
                </Button>
              )}
            </div>
            {payments.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">No payment records yet</p>
                <p className="text-sm mt-1">When you upload rent proof, it will appear here</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
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
                        <td className="py-3 px-4 font-semibold">{p.amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">{p.period_start} → {p.period_end}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs max-w-[180px] truncate">{p.notes || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[p.status] || ''}`}>{p.status}</span>
                        </td>
                        <td className="py-3 px-4">
                          {p.receipt_url ? (
                            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs">
                              <FileText className="h-3 w-3" />Download
                            </Button>
                          ) : p.status === 'confirmed' ? (
                            <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" />Confirmed</span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 bg-primary rounded-2xl p-8 text-center">
          <h3 className="font-display text-2xl font-bold text-primary-foreground mb-2">Looking for a new home?</h3>
          <p className="text-primary-foreground/80 mb-5">Browse verified properties across all Ugandan districts.</p>
          <Button variant="secondary" className="bg-gold text-gold-foreground hover:bg-gold/90 font-semibold px-8" onClick={() => navigate('/properties')}>
            Browse Properties
          </Button>
        </div>
      </div>
    </div>
  );
}
