import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, DollarSign, CheckCircle, XCircle, Clock, FileText,
  CalendarDays, Hash, CreditCard, Download
} from 'lucide-react';
import { format } from 'date-fns';

export default function TenantPaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (id) fetchPayment();
  }, [user, authLoading, id]);

  const fetchPayment = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('payments').select('*, leases(*, properties(*))')
      .eq('id', id).maybeSingle();
    if (error || !data) {
      toast({ title: 'Error', description: 'Payment not found', variant: 'destructive' });
      navigate('/dashboard/tenant');
      return;
    }
    setPayment(data);
    setLoading(false);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return { icon: CheckCircle, bg: 'bg-success/10 text-success', border: 'border-success/20' };
      case 'pending': return { icon: Clock, bg: 'bg-accent/10 text-accent', border: 'border-accent/20' };
      case 'rejected': return { icon: XCircle, bg: 'bg-destructive/10 text-destructive', border: 'border-destructive/20' };
      default: return { icon: Clock, bg: 'bg-muted text-muted-foreground', border: 'border-border' };
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!payment) return null;

  const sc = statusColor(payment.status);
  const StatusIcon = sc.icon;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/tenant/payments')} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Payment Detail</h1>
            <p className="text-sm text-muted-foreground">Transaction #{payment.id?.slice(0, 8)}</p>
          </div>
        </div>

        <div className={`rounded-xl p-6 border ${sc.border} ${sc.bg}`}>
          <div className="flex items-center gap-3">
            <StatusIcon className="h-8 w-8" />
            <div>
              <p className="font-bold text-lg capitalize">{payment.status}</p>
              <p className="text-sm opacity-80">{payment.payment_type || 'Payment'}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-1">Amount</p>
            <p className="text-4xl font-bold">UGX {(payment.amount || 0).toLocaleString()}</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Hash className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Transaction ID</p>
                <p className="text-sm font-semibold">{payment.transaction_id || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Method</p>
                <p className="text-sm font-semibold capitalize">{payment.payment_method || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CalendarDays className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className="text-sm font-semibold">
                  {payment.due_date ? format(new Date(payment.due_date), 'MMM dd, yyyy') : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Paid Date</p>
                <p className="text-sm font-semibold">
                  {payment.paid_date ? format(new Date(payment.paid_date), 'MMM dd, yyyy') : 'Not yet paid'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {payment.notes && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Notes
            </h3>
            <p className="text-sm text-muted-foreground">{payment.notes}</p>
          </div>
        )}

        {payment.lease_id && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Related Lease
            </h3>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="font-semibold">{payment.leases?.properties?.title || 'Property'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {payment.leases?.start_date ? format(new Date(payment.leases.start_date), 'MMM dd, yyyy') : '—'} - {payment.leases?.end_date ? format(new Date(payment.leases.end_date), 'MMM dd, yyyy') : '—'}
              </p>
              <p className="text-xs text-muted-foreground">UGX {(payment.leases?.monthly_rent || 0).toLocaleString()}/mo</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
