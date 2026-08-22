import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, DollarSign, CheckCircle, XCircle, Clock, Pencil, Trash2, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function ManagerPaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ amount: '', paid_date: '', method: 'mobile_money', notes: '' });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (id) fetchPayment();
  }, [user, authLoading, id]);

  const fetchPayment = async () => {
    if (!id) return;
    const { data, error } = await supabase.from('payments').select('*, leases(*, properties(*))').eq('id', id).maybeSingle();
    if (error || !data) {
      toast({ title: 'Error', description: 'Payment not found', variant: 'destructive' });
      navigate('/dashboard/manager');
      return;
    }
    setPayment(data);
    setForm({ amount: String(data.amount), paid_date: data.paid_date || data.due_date || '', method: data.method || 'mobile_money', notes: data.notes || '' });
    setLoading(false);
  };

  const startEdit = () => { setEditing(true); };

  const handleSave = async () => {
    const numericAmount = parseInt(form.amount.replace(/[^0-9]/g, ''), 10) || 0;
    if (numericAmount <= 0) { toast({ title: 'Invalid amount', variant: 'destructive' }); return; }
    setSaving(true);
    const { error } = await supabase.from('payments').update({ amount: numericAmount, paid_date: form.paid_date, method: form.method, notes: form.notes }).eq('id', id);
    setSaving(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payment updated' });
    setEditing(false);
    fetchPayment();
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from('payments').delete().eq('id', id);
    setDeleting(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payment deleted' });
    navigate(-1);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'confirmed': return { icon: CheckCircle, className: 'bg-success/10 text-success border-success/20' };
      case 'pending': return { icon: Clock, className: 'bg-accent/10 text-accent border-accent/20' };
      case 'rejected': return { icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' };
      default: return { icon: Clock, className: 'bg-muted text-muted-foreground border-border' };
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
  const lease = payment.leases || {};
  const property = lease.properties || {};

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Payment Detail</h1>
            <p className="text-sm text-muted-foreground">{property.title || 'Payment'} · {(payment.amount || 0).toLocaleString()}</p>
          </div>
          {!editing && (
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={startEdit} className="gap-1.5">
                <Pencil className="h-4 w-4" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          )}
        </div>

        {/* Status card */}
        <div className={`rounded-xl p-5 border ${sc.className}`}>
          <div className="flex items-center gap-3">
            <StatusIcon className="h-6 w-6" />
            <div>
              <p className="font-bold capitalize">{payment.status}</p>
              <p className="text-sm text-muted-foreground">{payment.created_at ? format(new Date(payment.created_at), 'MMM dd, yyyy HH:mm') : '—'}</p>
            </div>
          </div>
        </div>

        {editing ? (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-sm">Edit Payment</h2>
            <div>
              <Label>Amount</Label>
              <Input value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="50000" className="mt-1" />
            </div>
            <div>
              <Label>Paid Date</Label>
              <Input type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.method} onValueChange={v => setForm(f => ({ ...f, method: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" className="mt-1" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => { setEditing(false); setForm({ amount: String(payment.amount), paid_date: payment.paid_date || '', method: payment.method || 'mobile_money', notes: payment.notes || '' }); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-sm">Payment Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-bold text-lg">{(payment.amount || 0).toLocaleString()}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground">Method</p>
                <p className="font-bold text-lg capitalize">{payment.method?.replace(/_/g, ' ') || '—'}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground">Paid Date</p>
                <p className="font-bold text-lg">{payment.paid_date ? format(new Date(payment.paid_date), 'MMM dd, yyyy') : '—'}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-bold text-lg capitalize">{payment.payment_type || 'Payment'}</p>
              </div>
            </div>
            {payment.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm bg-muted/30 rounded-lg p-3">{payment.notes}</p>
              </div>
            )}
            {lease.id && (
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-2">Related Lease</p>
                <p className="text-sm font-semibold">{property.title || 'Unknown property'}</p>
                <p className="text-xs text-muted-foreground">Start: {lease.start_date ? format(new Date(lease.start_date), 'MMM dd, yyyy') : '—'} · End: {lease.end_date ? format(new Date(lease.end_date), 'MMM dd, yyyy') : '—'}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the payment record of {(payment.amount || 0).toLocaleString()}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
