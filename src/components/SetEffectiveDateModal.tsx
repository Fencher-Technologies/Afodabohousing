import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, CalendarDays } from 'lucide-react';
import { apiPatch } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface SetEffectiveDateModalProps {
  open: boolean;
  onClose: () => void;
  leaseId: string;
  onSet?: () => void;
}

export default function SetEffectiveDateModal({ open, onClose, leaseId, onSet }: SetEffectiveDateModalProps) {
  const { toast } = useToast();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Enter the date as YYYY-MM-DD');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await apiPatch(`/leases/${leaseId}/effective-date`, { rent_effective_date: date });
      toast({ title: 'Effective Date Set', description: 'Rent coverage tracking is now active for this tenancy.' });
      onClose();
      onSet?.();
    } catch {
      setError('Could not set the effective date. Please try again.');
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Set Effective Date
          </DialogTitle>
          <DialogDescription>
            Start of the first rent coverage cycle — used to track paid-until, days remaining and
            arrears. This can only be set once. Usually the date the tenant first moved in or started
            paying rent.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Effective Date (YYYY-MM-DD)</Label>
            <Input
              value={date}
              onChange={e => setDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              className="mt-1 h-11"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button onClick={handleSave} disabled={busy} className="flex-1 rounded-xl gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Set Date
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
