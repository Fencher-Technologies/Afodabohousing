import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, DollarSign, Search, Download, ChevronRight, Plus, Wallet } from 'lucide-react';
import { format } from 'date-fns';

export default function TenantPayments() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lease, setLease] = useState<any>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchPayments();
  }, [user, authLoading]);

  const fetchPayments = async () => {
    if (!user) return;
    const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', user.id).maybeSingle();
    if (!tenant) { setLoading(false); return; }
    const { data } = await supabase
      .from('payments').select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
    setPayments(data || []);
    const { data: leases } = await supabase
      .from('leases').select('monthly_rent, rent_period, start_date, end_date, status')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });
    setLease(leases?.find((l: any) => l.status === 'active') ?? leases?.[0] ?? null);
    setLoading(false);
  };

  const filtered = payments.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.payment_type || '').toLowerCase().includes(s) ||
      (p.notes || '').toLowerCase().includes(s) ||
      (p.status || '').toLowerCase().includes(s);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const confirmedTotal = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);
  const monthRent = lease?.monthly_rent || 0;
  const balanceDue = Math.max(0, monthRent - confirmedTotal);
  const credit = Math.max(0, confirmedTotal - monthRent);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Payment History</h1>
            <p className="text-sm text-muted-foreground">{payments.length} total payments</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground">Total paid</p>
            <p className="text-2xl font-bold text-success">{confirmedTotal.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground">Expected</p>
            <p className="text-2xl font-bold text-foreground">{monthRent.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
          </div>
          {balanceDue > 0 ? (
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-xs text-muted-foreground">Balance Due</p>
              <p className="text-2xl font-bold text-destructive">{balanceDue.toLocaleString()}</p>
            </div>
          ) : credit > 0 ? (
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-xs text-muted-foreground">Credit</p>
              <p className="text-2xl font-bold text-gold">{credit.toLocaleString()}</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-5 text-center">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-2xl font-bold text-success">All good</p>
            </div>
          )}
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <p className="text-xs text-muted-foreground">Payments</p>
            <p className="text-2xl font-bold text-accent">{payments.length}</p>
          </div>
        </div>

        <Button className="w-full gap-2" onClick={() => navigate('/dashboard/tenant/payments/submit')}>
          <Plus className="h-4 w-4" /> Submit Payment for Verification
        </Button>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search payments..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 rounded-lg h-10" />
        </div>

        {pageItems.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <DollarSign className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold">No payments yet</h3>
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
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map(p => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 cursor-pointer"
                    onClick={() => navigate(`/dashboard/tenant/payments/${p.id}`)}>
                    <td className="py-3 px-4">
                      <span className="font-medium capitalize">{p.payment_type || 'Payment'}</span>
                      {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                    </td>
                    <td className="py-3 px-4 font-bold">{(p.amount || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {p.created_at ? format(new Date(p.created_at), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        p.status === 'confirmed' ? 'bg-muted text-success border-success/20' :
                        p.status === 'pending' ? 'bg-muted text-accent border-accent/20' :
                        p.status === 'rejected' ? 'bg-muted text-destructive border-destructive/20' :
                        'bg-muted text-muted-foreground border-border'
                      }`}>{p.status}</span>
                    </td>
                    <td className="py-3 px-4"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="rounded-lg h-9">Prev</Button>
            <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="rounded-lg h-9">Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
