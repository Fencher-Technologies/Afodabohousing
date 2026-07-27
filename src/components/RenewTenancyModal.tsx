import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, CalendarDays } from 'lucide-react';

const MONTHS = [
  { label: 'January', value: '01' }, { label: 'February', value: '02' },
  { label: 'March', value: '03' }, { label: 'April', value: '04' },
  { label: 'May', value: '05' }, { label: 'June', value: '06' },
  { label: 'July', value: '07' }, { label: 'August', value: '08' },
  { label: 'September', value: '09' }, { label: 'October', value: '10' },
  { label: 'November', value: '11' }, { label: 'December', value: '12' },
];

function currentYear() { return String(new Date().getFullYear()); }

function pad2(n: string) { return n.length === 1 ? '0' + n : n; }

function toIso(day: string, month: string, year: string) {
  if (!day || !month || !year) return '';
  return `${year}-${month}-${pad2(day)}`;
}

interface RenewTenancyModalProps {
  open: boolean;
  onClose: () => void;
  currentEndDate: string;
  currentRent?: number;
  tenantName?: string;
  onRenew: (values: { newEndDate: string; monthlyRent?: number; notes?: string }) => Promise<void>;
}

export default function RenewTenancyModal({ open, onClose, currentEndDate, currentRent, tenantName, onRenew }: RenewTenancyModalProps) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(currentYear());
  const [rent, setRent] = useState(currentRent != null ? String(currentRent) : '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const newEndDate = useMemo(() => toIso(day, month, year), [day, month, year]);

  const handleRenew = async () => {
    if (!newEndDate) { setError('Select a valid end date'); return; }
    if (newEndDate <= currentEndDate) { setError('New end date must be after the current end date'); return; }
    setError(null);
    setBusy(true);
    try {
      await onRenew({ newEndDate, monthlyRent: rent ? parseInt(rent, 10) : undefined, notes: notes || undefined });
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
            <div className="grid grid-cols-3 gap-2 mt-1">
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1).padStart(2, '0')}>{i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input value={year} onChange={e => setYear(e.target.value)} placeholder="Year" />
            </div>
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
