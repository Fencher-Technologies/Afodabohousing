import { DollarSign, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import type { PaymentData } from '@/services/payments';

const statusBadge = (s: string) => ({
  pending: 'status-pending', uploaded: 'status-uploaded', confirmed: 'status-confirmed', rejected: 'status-rejected',
}[s] ?? 'status-pending');

interface Props {
  payments: PaymentData[];
  loading: boolean;
  onConfirmPayment: (p: PaymentData) => void;
  onRejectPayment: (p: PaymentData) => void;
  sendingAction: string;
}

export function PaymentsTab({ payments, loading, onConfirmPayment, onRejectPayment, sendingAction }: Props) {
  const pendingPayments = payments.filter(p => p.status === 'uploaded');

  if (loading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Payments</h2>
          <p className="text-sm text-muted-foreground">{payments.length} records · {pendingPayments.length} awaiting review</p>
        </div>
        <div className="flex gap-2 text-xs">
          {[
            { label: 'Confirmed', val: payments.filter(p => p.status === 'confirmed').length, color: 'text-accent' },
            { label: 'Pending', val: pendingPayments.length, color: 'text-primary' },
            { label: 'Rejected', val: payments.filter(p => p.status === 'rejected').length, color: 'text-destructive' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl px-3 py-1.5 text-center">
              <div className={`font-bold ${s.color}`}>{s.val}</div>
              <div className="text-muted-foreground text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary border-b border-border">
                <th className="text-left py-3 px-4 font-semibold">Tenant</th>
                <th className="text-left py-3 px-4 font-semibold">Amount</th>
                <th className="text-left py-3 px-4 font-semibold">Period</th>
                <th className="text-left py-3 px-4 font-semibold">Date</th>
                <th className="text-left py-3 px-4 font-semibold">Notes</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-left py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-display font-semibold text-foreground">No payments yet</p>
                </td></tr>
              ) : payments.map(p => (
                <tr key={p.id} className={`border-b border-border hover:bg-muted/30 transition-colors last:border-0 ${p.status === 'uploaded' ? 'bg-primary/3' : ''}`}>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-secondary text-muted-foreground font-bold text-xs flex items-center justify-center shrink-0">
                        {(p.tenant_name || 'T').charAt(0)}
                      </div>
                      <span className="font-semibold text-foreground">{p.tenant_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-foreground">UGX {(p.amount || 0).toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-muted-foreground text-xs">{p.period_start} – {p.period_end}</td>
                  <td className="py-3.5 px-4 text-muted-foreground text-xs">{format(new Date(p.created_at), 'MMM dd, yyyy')}</td>
                  <td className="py-3.5 px-4 text-muted-foreground text-xs max-w-[160px] truncate">{p.notes || '—'}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(p.status)}`}>{p.status}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    {p.status === 'uploaded' ? (
                      <div className="flex gap-1.5">
                        <Button size="sm" className="gradient-primary text-primary-foreground h-7 text-xs gap-1" disabled={!!sendingAction} onClick={() => onConfirmPayment(p)}>
                          <CheckCircle className="h-3 w-3" />Confirm
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" disabled={!!sendingAction} onClick={() => onRejectPayment(p)}>
                          <XCircle className="h-3 w-3" />Reject
                        </Button>
                      </div>
                    ) : p.proof_url ? (
                      <a href={p.proof_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"><Eye className="h-3 w-3" />Proof</Button>
                      </a>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
