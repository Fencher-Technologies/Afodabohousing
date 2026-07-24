import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  ArrowLeft, Home, Users, DollarSign, TrendingUp, AlertTriangle,
  Download, FileText, Calendar, CheckCircle, XCircle, Clock,
  Search, Filter, Percent,
} from 'lucide-react';
import {
  getFinancialSummary, getRentCollection, getOutstanding, getPaymentHistory,
  type FinancialSummary, type RentCollection, type OutstandingItem, type PaymentHistoryItem,
} from '@/services/reports';

type Tab = 'overview' | 'outstanding' | 'payments';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'outstanding', label: 'Outstanding' },
  { id: 'payments', label: 'Payment History' },
];

const EXPORTS = [
  { resource: 'properties', label: 'Properties' },
  { resource: 'tenants', label: 'Tenants' },
  { resource: 'leases', label: 'Leases' },
  { resource: 'payments', label: 'Payments' },
] as const;

function fmt(n: number) { return `UGX ${n.toLocaleString()}`; }

export default function ManagerReports() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [collection, setCollection] = useState<RentCollection | null>(null);
  const [outstanding, setOutstanding] = useState<OutstandingItem[]>([]);
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user, authLoading]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, o, p] = await Promise.all([
        getFinancialSummary(),
        getRentCollection(from || undefined, to || undefined),
        getOutstanding(0, 200),
        getPaymentHistory(from || undefined, to || undefined),
      ]);
      setSummary(s);
      setCollection(c);
      setOutstanding(o.items);
      setOutstandingTotal(o.total_outstanding);
      setPayments(p.items);
      setPaymentsTotal(p.summary.total_collected);
    } catch (e) {
      toast({ title: 'Failed to load reports', variant: 'destructive' });
    }
    setLoading(false);
  }, [from, to]);

  const downloadExport = async (resource: string) => {
    const base = import.meta.env.VITE_API_URL || '';
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const a = document.createElement('a');
    a.href = `${base}/exports/${resource}?format=csv`;
    a.target = '_blank';
    if (token) a.href += `&token=${token}`;
    a.click();
  };

  const summaryCards = summary ? [
    { label: 'Active Tenancies', value: summary.active_tenancies, icon: Home, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Expected Rent', value: fmt(summary.total_expected), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Collected', value: fmt(summary.total_collected), icon: DollarSign, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Outstanding', value: fmt(summary.total_outstanding), icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'Tenant Credit', value: fmt(summary.total_tenant_credit), icon: Users, color: 'text-gold', bg: 'bg-gold/10' },
    { label: 'Occupancy Rate', value: `${summary.occupancy_rate}%`, icon: Percent, color: 'text-accent', bg: 'bg-accent/10' },
  ] : [];

  const collectionBarData = collection ? [
    { name: 'Expected', amount: collection.total_expected, fill: '#94a3b8' },
    { name: 'Collected', amount: collection.total_collected, fill: '#22c55e' },
    { name: 'Outstanding', amount: collection.total_outstanding, fill: '#ef4444' },
  ] : [];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/manager')} className="p-0 h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-xl">Reports & Analytics</h1>
              <p className="text-sm text-muted-foreground">Portfolio performance and financial insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="border-0 p-0 h-8 w-32 text-sm bg-transparent" />
              <span className="text-muted-foreground">–</span>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="border-0 p-0 h-8 w-32 text-sm bg-transparent" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 h-9">
              <Filter className="h-4 w-4" /> Apply
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3">
              {summaryCards.map(c => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    <div className={`h-8 w-8 rounded-lg ${c.bg} flex items-center justify-center mb-2`}>
                      <Icon className={`h-4 w-4 ${c.color}`} />
                    </div>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-lg font-bold mt-0.5">{c.value}</p>
                  </div>
                );
              })}
            </div>

            {/* Rent Collection Overview + Chart */}
            {collection && (
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-sm mb-4">Collection Snapshot</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Collection Rate</span>
                      <span className="font-bold text-lg">{collection.collection_percentage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div className="bg-success h-2.5 rounded-full transition-all"
                        style={{ width: `${Math.min(collection.collection_percentage, 100)}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Paid in Full</p>
                        <p className="text-lg font-bold text-success">{collection.tenants_paid_in_full}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">With Balance</p>
                        <p className="text-lg font-bold text-destructive">{collection.tenants_with_balance}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Total Tenants</p>
                        <p className="text-lg font-bold">{collection.total_tenants}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Credit Balance</p>
                        <p className="text-lg font-bold text-gold">{fmt(collection.total_tenant_credit)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-bold text-sm mb-4">Amounts (UGX)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={collectionBarData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={60}>
                        {collectionBarData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Export Buttons */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm">Export Data</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Download className="h-3.5 w-3.5" /> CSV
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {EXPORTS.map(e => (
                  <Button key={e.resource} variant="outline" size="sm"
                    onClick={() => downloadExport(e.resource)} className="gap-2">
                    <FileText className="h-4 w-4" /> {e.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'outstanding' && (
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold">Outstanding Tenants</h3>
                <p className="text-xs text-muted-foreground">
                  {outstanding.length} tenants · <span className="text-destructive font-semibold">{fmt(outstandingTotal)}</span> total outstanding
                </p>
              </div>
              <Badge variant="outline" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" /> {outstanding.filter(o => o.balance_due > 0).length} overdue
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left p-3 font-semibold">Tenant</th>
                    <th className="text-left p-3 font-semibold">Property</th>
                    <th className="text-right p-3 font-semibold">Expected</th>
                    <th className="text-right p-3 font-semibold">Paid</th>
                    <th className="text-right p-3 font-semibold">Balance</th>
                    <th className="text-right p-3 font-semibold">Last Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No outstanding balances</td></tr>
                  ) : outstanding.map(o => (
                    <tr key={o.lease_id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-semibold">{o.tenant_name || 'Unknown'}</p>
                        {o.tenant_phone && <p className="text-xs text-muted-foreground">{o.tenant_phone}</p>}
                      </td>
                      <td className="p-3">
                        <p>{o.property_title || '—'}</p>
                        {o.unit_label && <p className="text-xs text-muted-foreground">{o.unit_label}</p>}
                      </td>
                      <td className="p-3 text-right">{fmt(o.expected_rent)}</td>
                      <td className="p-3 text-right text-success">{fmt(o.total_paid)}</td>
                      <td className="p-3 text-right">
                        <span className="text-destructive font-semibold">{fmt(o.balance_due)}</span>
                      </td>
                      <td className="p-3 text-right text-xs text-muted-foreground">
                        {o.last_payment_date ? new Date(o.last_payment_date).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'payments' && (
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-bold">Payment History</h3>
                <p className="text-xs text-muted-foreground">
                  {payments.length} payments · <span className="text-success font-semibold">{fmt(paymentsTotal)}</span> collected
                  {from || to ? ` · ${from || '…'} – ${to || '…'}` : ''}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadExport('payments')} className="gap-2">
                <Download className="h-4 w-4" /> Export
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left p-3 font-semibold">Date</th>
                    <th className="text-left p-3 font-semibold">Tenant</th>
                    <th className="text-left p-3 font-semibold">Property</th>
                    <th className="text-right p-3 font-semibold">Amount</th>
                    <th className="text-left p-3 font-semibold">Method</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No payments found</td></tr>
                  ) : payments.map(p => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3 text-xs text-muted-foreground">
                        {p.date ? new Date(p.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-3 font-semibold">{p.tenant_name || '—'}</td>
                      <td className="p-3 text-muted-foreground">{p.property_title || '—'}</td>
                      <td className="p-3 text-right font-semibold">{fmt(p.amount)}</td>
                      <td className="p-3 text-xs text-muted-foreground">{p.method || '—'}</td>
                      <td className="p-3">
                        <Badge className={`text-xs ${
                          p.status === 'confirmed' || p.status === 'completed'
                            ? 'bg-success/10 text-success'
                            : p.status === 'pending'
                            ? 'bg-gold/10 text-gold'
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {p.status === 'confirmed' || p.status === 'completed'
                            ? <><CheckCircle className="h-3 w-3 mr-1" /> Paid</>
                            : p.status === 'pending'
                            ? <><Clock className="h-3 w-3 mr-1" /> Pending</>
                            : <><XCircle className="h-3 w-3 mr-1" /> {p.status}</>
                          }
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
