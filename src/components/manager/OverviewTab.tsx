import { Building2, Users, DollarSign, BarChart2, Clock, CheckCircle, AlertTriangle, Home, Plus, ArrowUpRight, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import type { PaymentData } from '@/services/payments';

type Property = { id: string; title: string; status: string; rent_amount: number; monthly_rent?: number; property_type: string; state?: string | null; city?: string | null; area?: string | null; };
type Lease = { id: string; status: string; start_date: string; end_date: string; monthly_rent?: number; rent_amount?: number; tenant_name?: string; tenant_phone?: string; tenant_user_id?: string; property_title?: string; owner_id?: string; balance_due?: number; is_overdue?: boolean; };

interface Props {
  loading: boolean;
  properties: Property[];
  leases: Lease[];
  payments: PaymentData[];
  onSetTab: (tab: string) => void;
  onSendReminder: (lease: Lease) => void;
  onConfirmPayment: (p: PaymentData) => void;
  onRejectPayment: (p: PaymentData) => void;
  onAddProperty: () => void;
  sendingAction: string;
  onNavigate: (path: string) => void;
}

const statusBadge = (s: string) => ({
  pending: 'status-pending', uploaded: 'status-uploaded', confirmed: 'status-confirmed',
  rejected: 'status-rejected', active: 'status-confirmed', expired: 'status-pending',
  occupied: 'status-uploaded', available: 'status-confirmed', inactive: 'status-pending', terminated: 'status-rejected',
}[s] ?? 'status-pending');

export function OverviewTab({ loading, properties, leases, payments, onSetTab, onSendReminder, onConfirmPayment, onRejectPayment, onAddProperty, sendingAction }: Props) {
  const pendingPayments = payments.filter(p => p.status === 'uploaded');
  const confirmedRevenue = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);
  const dueSoonTenancies = leases.filter(l => {
    if (l.status !== 'active') return false;
    const d = differenceInDays(new Date(l.end_date), new Date());
    return d <= 14 && d >= 0;
  });
  const available = properties.filter(p => p.status === 'available').length;
  const occupied = properties.filter(p => p.status === 'occupied').length;

  const statCards = [
    { label: 'Total Listings', val: properties.length, sub: `${available} available · ${occupied} occupied`, icon: <Building2 className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Active Tenants', val: leases.filter(t => t.status === 'active').length, sub: `${dueSoonTenancies.length} rent due soon`, icon: <Users className="h-5 w-5" />, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Revenue Confirmed', val: `UGX ${confirmedRevenue >= 1000000 ? (confirmedRevenue / 1000000).toFixed(1) + 'M' : confirmedRevenue.toLocaleString()}`, sub: `${pendingPayments.length} awaiting review`, icon: <DollarSign className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  return (
    <div className="space-y-6">
      {pendingPayments.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-primary/10 rounded-xl p-2 shrink-0"><DollarSign className="h-4 w-4 text-primary" /></div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">{pendingPayments.length} payment proof{pendingPayments.length > 1 ? 's' : ''} awaiting your review</p>
            <p className="text-xs text-muted-foreground">Review and confirm or reject to notify tenants</p>
          </div>
          <Button size="sm" className="gradient-primary text-primary-foreground shrink-0 gap-1 text-xs h-8" onClick={() => onSetTab('payments')}>
            Review <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      {dueSoonTenancies.length > 0 && (
        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-start gap-3">
          <div className="bg-accent/10 rounded-xl p-2 shrink-0"><AlertTriangle className="h-4 w-4 text-accent" /></div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm mb-2">{dueSoonTenancies.length} tenant{dueSoonTenancies.length > 1 ? 's' : ''} with rent expiring within 14 days</p>
            <div className="flex flex-wrap gap-2">
              {dueSoonTenancies.map(t => {
                const d = differenceInDays(new Date(t.end_date), new Date());
                return (
                  <div key={t.id} className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-1 border border-border text-xs">
                    <span className="font-semibold">{t.tenant_name}</span>
                    <Badge className={`text-xs py-0 ${d <= 7 ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'}`}>{d}d</Badge>
                    <button className="text-accent hover:text-accent/80 font-medium ml-1" onClick={() => onSendReminder(t)} disabled={sendingAction === `remind-${t.id}`}>
                      {sendingAction === `remind-${t.id}` ? '...' : 'Remind'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5 shadow-card hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`${s.bg} ${s.color} w-10 h-10 rounded-xl flex items-center justify-center`}>{s.icon}</div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-2xl font-display font-bold text-foreground">{loading ? <div className="h-7 w-16 bg-muted animate-pulse rounded" /> : s.val}</div>
            <div className="text-sm font-semibold text-foreground mt-1">{s.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-base">Revenue Breakdown</h3>
          </div>
          {[
            { label: 'Confirmed', val: payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0), color: 'bg-accent', textColor: 'text-accent' },
            { label: 'Awaiting Review', val: payments.filter(p => p.status === 'uploaded').reduce((s, p) => s + p.amount, 0), color: 'bg-primary', textColor: 'text-primary' },
            { label: 'Pending Upload', val: payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0), color: 'bg-muted-foreground', textColor: 'text-muted-foreground' },
          ].map(r => {
            const total = payments.reduce((s, p) => s + p.amount, 0);
            const pct = total > 0 ? Math.round((r.val / total) * 100) : 0;
            return (
              <div key={r.label} className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm text-muted-foreground">{r.label}</span>
                  <span className={`text-sm font-bold ${r.textColor}`}>UGX {(r.val || 0).toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${r.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              <h3 className="font-display font-semibold text-base">Payment Queue</h3>
            </div>
            {pendingPayments.length > 0 && (
              <Badge className="bg-accent/10 text-accent border border-accent/20 text-xs">{pendingPayments.length} pending</Badge>
            )}
          </div>
          {pendingPayments.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-10 w-10 text-accent/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm font-medium">All caught up!</p>
              <p className="text-muted-foreground text-xs mt-1">No payments awaiting review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPayments.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {(p.tenant_name || 'T').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.tenant_name || 'Tenant'}</p>
                    <p className="text-xs text-muted-foreground">UGX {(p.amount || 0).toLocaleString()} · {format(new Date(p.created_at), 'MMM dd')}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" className="gradient-primary text-primary-foreground h-7 w-7 p-0" disabled={!!sendingAction} onClick={() => onConfirmPayment(p)}>
                      <CheckCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="destructive" className="h-7 w-7 p-0" disabled={!!sendingAction} onClick={() => onRejectPayment(p)}>
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {pendingPayments.length > 4 && (
                <button onClick={() => onSetTab('payments')} className="w-full text-xs text-center text-primary hover:underline py-1">
                  View all {pendingPayments.length} pending →
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" />
              <h3 className="font-display font-semibold text-base">Properties</h3>
            </div>
            <button onClick={() => onSetTab('properties')} className="text-xs text-primary hover:underline flex items-center gap-1">
              Manage <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-accent/5 rounded-xl p-3 text-center"><span className="text-lg font-bold text-accent">{available}</span><p className="text-xs text-muted-foreground">Available</p></div>
            <div className="bg-primary/5 rounded-xl p-3 text-center"><span className="text-lg font-bold text-primary">{occupied}</span><p className="text-xs text-muted-foreground">Occupied</p></div>
          </div>
          {properties.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm font-medium">No properties yet</p>
              <Button size="sm" className="mt-3 gradient-primary text-primary-foreground text-xs" onClick={onAddProperty}>
                <Plus className="h-3 w-3 mr-1" /> Add First Property
              </Button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {properties.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Home className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.state || p.city} · UGX {(p.rent_amount || 0).toLocaleString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize shrink-0 ${statusBadge(p.status)}`}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="font-display font-semibold text-base">Overdue</h3>
            </div>
            {leases.filter(l => l.is_overdue).length > 0 && (
              <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-xs">{leases.filter(l => l.is_overdue).length} overdue</Badge>
            )}
          </div>
          {leases.filter(l => l.is_overdue).length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-10 w-10 text-accent/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm font-medium">All caught up!</p>
              <p className="text-muted-foreground text-xs mt-1">No overdue balances</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {leases.filter(l => l.is_overdue).slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                  <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <DollarSign className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{t.tenant_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{t.property_title || ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-destructive">UGX {(t.balance_due || 0).toLocaleString()}</p>
                    {t.end_date && (
                      <p className={`text-xs font-semibold ${differenceInDays(new Date(t.end_date), new Date()) < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {differenceInDays(new Date(t.end_date), new Date()) < 0
                          ? `${Math.abs(differenceInDays(new Date(t.end_date), new Date()))}d past`
                          : `${differenceInDays(new Date(t.end_date), new Date())}d left`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
