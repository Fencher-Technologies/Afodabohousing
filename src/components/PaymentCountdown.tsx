import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ExternalLink } from 'lucide-react';

interface PaymentCountdownProps {
  redirectUrl: string;
  message?: string;
  phone?: string;
  seconds?: number;
  onComplete: () => void;
  onSkip: () => void;
}

export default function PaymentCountdown({
  redirectUrl,
  message = 'Redirecting to Pesapal secure payment page',
  phone,
  seconds = 7,
  onComplete,
  onSkip,
}: PaymentCountdownProps) {
  const [count, setCount] = useState(seconds);
  const called = useRef(false);

  useEffect(() => {
    if (count <= 0 && !called.current) {
      called.current = true;
      onComplete();
    }
  }, [count, onComplete]);

  useEffect(() => {
    if (count <= 0) return;
    const id = setInterval(() => setCount(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [count]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-md rounded-xl bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">Payment Initiated</h3>
        <p className="mb-1 text-sm text-muted-foreground">{message}</p>
        {phone && (
          <p className="mb-2 text-sm text-muted-foreground">
            Paying from <span className="font-semibold text-foreground">{phone}</span>
          </p>
        )}
        <p className="mb-6 text-sm text-muted-foreground">
          You will be redirected in <span className="text-lg font-bold text-primary">{count}</span> second{count !== 1 ? 's' : ''}
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={onComplete} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Continue Now
          </Button>
          <Button variant="outline" onClick={onSkip}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
