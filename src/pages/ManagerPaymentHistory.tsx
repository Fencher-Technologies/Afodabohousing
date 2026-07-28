import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Receipt, ChevronRight, Pencil, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ManagerPaymentHistory() {
  const { tenancyId } = useParams<{ tenancyId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchPayments();
  }, [user, authLoading, tenancyId]);

  const fetchPayments = async () => {
    if (!tenancyId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('lease_id', tenancyId)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: 'Failed to load payment history', variant: 'destructive' });
    }
    setPayments(data || []);
    setLoading(false);
  };

  const totalPaid = payments
    .filter((p) => p.status === 'confirmed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('payments').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Payment deleted' });
    setPayments((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const statusClasses = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-success/10 text-success border-success/20';
      case 'pending':
        return 'bg-accent/10 text-accent border-accent/20';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="p-0 h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Payment History</h1>
            <p className="text-sm text-muted-foreground">Tenancy payment records</p>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-2">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-success">
                UGX {totalPaid.toLocaleString()}
              </p>
            </div>
            <div className="text-center border-l border-border">
              <p className="text-xs text-muted-foreground mb-1">Payments</p>
              <p className="text-2xl font-bold text-accent">{payments.length}</p>
            </div>
          </div>
        </div>

        {/* Payment List / Empty State */}
        {payments.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Receipt className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold">No payments recorded</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your payment history will appear here once your manager records payments.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground">
              {payments.length} payment{payments.length !== 1 ? 's' : ''}
            </p>
            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
              {payments.map((payment) => (
                <div key={payment.id}>
                  {/* Clickable row — navigates to detail */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() =>
                      navigate(`/dashboard/manager/payments/${payment.id}`)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">
                        UGX {Number(payment.amount).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(
                          new Date(payment.paid_date || payment.created_at),
                          'MMM dd, yyyy'
                        )}
                        {payment.method
                          ? ` · ${payment.method.replace(/_/g, ' ')}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant="outline"
                        className={statusClasses(payment.status)}
                      >
                        {payment.status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Manager action row */}
                  <div className="flex items-center gap-1 px-4 pb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs text-primary hover:text-primary/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/manager/payments/${payment.id}`);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive/80"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(payment);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this UGX{' '}
              {deleteTarget
                ? Number(deleteTarget.amount).toLocaleString()
                : ''}{' '}
              payment record? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
