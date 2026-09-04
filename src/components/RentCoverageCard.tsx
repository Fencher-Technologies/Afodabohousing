import { useEffect, useState } from 'react';
import { apiGet } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Hourglass } from 'lucide-react';
import { format } from 'date-fns';

interface RentCoverageData {
  rent_effective_date?: string | null;
  paid_until_date?: string | null;
  rent_days_remaining?: number | null;
  rent_days_in_arrears?: number | null;
  next_payment_due_date?: string | null;
}

interface RentCoverageCardProps {
  leaseId: string;
  canSetDate?: boolean;
  onSetDate?: () => void;
}

export default function RentCoverageCard({ leaseId, canSetDate = false, onSetDate }: RentCoverageCardProps) {
  const [data, setData] = useState<RentCoverageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiGet(`/leases/${leaseId}`)
      .then((d: RentCoverageData) => { if (mounted) { setData(d); setError(false); } })
      .catch(() => { if (mounted) setError(true); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [leaseId]);

  if (loading) return null;
  if (error) return null;

  const fmt = (d?: string | null) => (d ? format(new Date(d), 'MMM dd, yyyy') : '—');
  const hasAnchor = !!data?.rent_effective_date;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-display font-bold">Rent Coverage</h3>
      </div>

      {!hasAnchor ? (
        <>
          <p className="text-sm text-muted-foreground">
            Rent coverage tracking has not been started yet. Set an effective date to see how long
            payments cover the rent (paid until, days remaining, days in arrears).
          </p>
          {canSetDate && onSetDate && (
            <Button variant="outline" size="sm" onClick={onSetDate} className="mt-4 gap-2 rounded-lg">
              <CalendarDays className="h-4 w-4 text-primary" /> Set Effective Date
            </Button>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-medium">Effective Date</p>
              <p className="text-sm font-semibold mt-1">{fmt(data?.rent_effective_date)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-medium">Paid Until</p>
              <p className="text-sm font-semibold mt-1">{fmt(data?.paid_until_date)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className={`rounded-lg p-3 ${(data?.rent_days_in_arrears ?? 0) > 0 ? 'bg-muted' : 'bg-muted'}`}>
              <p className="text-xs text-muted-foreground font-medium">
                {(data?.rent_days_in_arrears ?? 0) > 0 ? 'Days in Arrears' : 'Days Remaining'}
              </p>
              <p className={`text-sm font-bold mt-1 ${(data?.rent_days_in_arrears ?? 0) > 0 ? 'text-destructive' : 'text-success'}`}>
                {(data?.rent_days_in_arrears ?? 0) > 0 ? data?.rent_days_in_arrears : data?.rent_days_remaining}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-medium">Next Payment Due</p>
              <p className="text-sm font-bold mt-1">{fmt(data?.next_payment_due_date)}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Rent coverage uses 30-day months and is separate from the tenancy start/end dates.
          </p>
        </>
      )}
    </Card>
  );
}
