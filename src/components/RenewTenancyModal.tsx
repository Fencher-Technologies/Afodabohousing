import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, CalendarDays } from 'lucide-react';

interface RenewTenancyModalProps {
  open: boolean;
  onClose: () => void;
  currentEndDate: string;
  currentRent?: number;
  tenantName?: string;
  onRenew: (values: { newEndDate: string; monthlyRent?: number; notes?: string }) => Promise<void>;
}

export default function RenewTenancyModal({ open, onClose, currentEndDate, currentRent, tenantName, onRenew }: RenewTenancyModalProps) {
  const [newEndDate, setNewEndDate] = useState('');
  const [rent, setRent] = useState(currentRent != null ? String(currentRent) : '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleRenew = async () => {
    if (!newEndDate) { setError('Select a valid end date'); return; }
    if (newEndDate <= currentEndDate) { setError('New end date must be after the current end date'); return; }
    setError(null);
    setBusy(true);
    try {
      await onRenew({ newEndDate, monthlyRent: rent ? parseFloat(rent) : undefined, notes: notes || undefined });
      onClose();
    } catch { setError('Failed to renew. Try again.'); }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Renew Tenancy
          </DialogTitle>
          <DialogDescription>
            {tenantName ? `Set a new end date for ${tenantName}.` : 'Extend the tenancy end date.'}
            <br />Current end: <strong>{currentEndDate}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>New End Date</Label>
            <DatePickerField value={newEndDate} onChange={setNewEndDate} min={currentEndDate} />
            {newEndDate && <p className="text-xs text-muted-foreground mt-1">New end: <strong>{newEndDate}</strong></p>}
          </div>
          <div>
            <Label>Monthly Rent (optional)</Label>
            <Input value={rent} onChange={e => setRent(e.target.value)} placeholder="Leave blank to keep current" className="mt-1 h-11" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Renewal notes…" className="mt-1" rows={2} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button onClick={handleRenew} disabled={busy || !newEndDate} className="flex-1 rounded-xl gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Renew Tenancy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
