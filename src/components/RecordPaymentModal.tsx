import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  leaseId: string;
  tenantId: string;
  monthlyRent: number;
  balanceDue: number;
  onRecorded: () => void;
}

export default function RecordPaymentModal({ open, onClose, leaseId, tenantId, monthlyRent, balanceDue, onRecorded }: RecordPaymentModalProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('mobile_money');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  const numericAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10) || 0;
  const exceedsBalance = numericAmount > balanceDue && balanceDue > 0;
  const monthsCovered = monthlyRent > 0 ? numericAmount / monthlyRent : 0;
  const daysCovered = Math.round(monthsCovered * 30);

  const handleRecord = async () => {
    if (numericAmount <= 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' }); return;
    }
    if (date > new Date().toISOString().split('T')[0]) {
      toast({ title: 'Date cannot be in the future', variant: 'destructive' }); return;
    }
    setSending(true);
    const { error } = await supabase.from('payments').insert({
      lease_id: leaseId, tenant_id: tenantId,
      amount: numericAmount, payment_method: method, payment_type: 'rent',
      paid_date: date, status: 'confirmed', notes: notes || null,
    });
    setSending(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payment recorded', description: `${numericAmount.toLocaleString()} recorded` });
    setAmount(''); setMethod('mobile_money'); setNotes(''); setDate(new Date().toISOString().split('T')[0]);
    onRecorded();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Agreed rent: <strong>{monthlyRent.toLocaleString()}/month</strong> &middot;
            Balance due: <strong>{balanceDue.toLocaleString()}</strong>
            {exceedsBalance && <span className="text-gold ml-2">Amount exceeds balance</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Amount</Label>
            <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="mt-1 h-11 text-lg font-bold" />
          </div>
          {numericAmount > 0 && monthlyRent > 0 && (
            <div className="bg-muted rounded-xl p-3 text-sm space-y-1">
              <p>Covers <strong>{monthsCovered >= 1 ? `${monthsCovered.toFixed(1)} months` : ''}{monthsCovered >= 1 && daysCovered % 30 !== 0 ? ' + ' : ''}{daysCovered % 30 > 0 ? `${daysCovered % 30} days` : ''}</strong></p>
              <p className="text-muted-foreground">{numericAmount.toLocaleString()} &divide; {monthlyRent.toLocaleString()} = {monthsCovered.toFixed(2)} months &times; 30 = {daysCovered} days</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 h-11" />
            </div>
            <div>
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes…" className="mt-1" rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button onClick={handleRecord} disabled={sending || numericAmount <= 0} className="flex-1 rounded-xl gap-2">
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
