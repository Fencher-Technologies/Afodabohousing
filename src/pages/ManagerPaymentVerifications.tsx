import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getOwnerVerifications, approveVerification, rejectVerification } from '@/services/payment-verifications';
import { format } from 'date-fns';

type FilterTab = 'pending' | 'approved' | 'rejected';

export default function ManagerPaymentVerifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('pending');
  const [search, setSearch] = useState('');
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [sending, setSending] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, filterTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getOwnerVerifications(filterTab === 'pending' ? 'pending' : filterTab, search || undefined);
      setSubmissions(data);
    } catch { setSubmissions([]); }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    setSending(id);
    try {
      await approveVerification(id);
      toast({ title: 'Payment approved', description: 'Official payment record created.' });
      fetchData();
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    setSending('');
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setSending(rejectTarget.id);
    try {
      await rejectVerification(rejectTarget.id, rejectReason.trim());
      toast({ title: 'Payment rejected' });
      setRejectTarget(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    setSending('');
  };

  useEffect(() => {
    if (!search) return;
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/manager')} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Payment Verifications</h1>
            <p className="text-sm text-muted-foreground">Tenant-submitted payment proofs awaiting review</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
            {(['pending', 'approved', 'rejected'] as const).map(t => (
              <button key={t} onClick={() => setFilterTab(t)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors capitalize ${
                  filterTab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {t} ({submissions.length})
              </button>
            ))}
          </div>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tenant/property..." value={search}
              onChange={e => setSearch(e.target.value)} className="pl-9 rounded-lg h-10" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}</div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-24 bg-card border border-border rounded-2xl">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
            <p className="text-xl font-display font-bold text-foreground">No {filterTab} verifications</p>
            <p className="text-sm mt-2 text-muted-foreground">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((s: any) => (
              <div key={s.id} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        s.status === 'pending' ? 'bg-primary/10 text-primary' :
                        s.status === 'approved' ? 'bg-success/10 text-success' :
                        'bg-destructive/10 text-destructive'
                      }`}>{s.status}</span>
                      <span className="font-bold text-lg">UGX {s.amount?.toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">via {s.payment_method?.replace('_', ' ')}</p>
                    {s.transaction_reference && <p className="text-xs text-muted-foreground">Ref: {s.transaction_reference}</p>}
                    <p className="text-xs text-muted-foreground">{s.payment_date} · {s.created_at ? format(new Date(s.created_at), 'MMM dd') : ''}</p>
                    {s.notes && <p className="text-xs text-muted-foreground italic">{s.notes}</p>}
                    {s.rejection_reason && <p className="text-xs text-destructive">Reason: {s.rejection_reason}</p>}
                  </div>
                  {s.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" className="gradient-primary text-primary-foreground h-8 gap-1"
                        disabled={!!sending} onClick={() => handleApprove(s.id)}>
                        <CheckCircle className="h-4 w-4" /> {sending === s.id ? '...' : 'Approve'}
                      </Button>
                      <Button size="sm" variant="destructive" className="h-8 gap-1"
                        disabled={!!sending} onClick={() => setRejectTarget(s)}>
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!rejectTarget} onOpenChange={o => { if (!o) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>Enter a reason for rejecting this payment verification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {rejectTarget && (
              <p className="text-sm font-semibold">UGX {rejectTarget.amount?.toLocaleString()} via {rejectTarget.payment_method}</p>
            )}
            <div>
              <Label>Reason for rejection</Label>
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Describe why this payment was rejected..." className="mt-1" rows={3} required />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>Cancel</Button>
              <Button variant="destructive" disabled={!rejectReason.trim() || !!sending} onClick={handleReject}>
                {sending ? 'Rejecting...' : 'Reject Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}