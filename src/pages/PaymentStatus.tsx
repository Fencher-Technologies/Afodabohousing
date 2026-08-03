import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Clock, LayoutDashboard, User } from 'lucide-react';
import { apiGet } from '@/services/api';

type Status = 'pending' | 'completed' | 'failed';
type PaymentType = 'boost' | 'subscription' | 'unknown';

const POLL_INTERVAL = 5000;
const POLL_LIMIT = 24; // ~2 minutes

export default function PaymentStatus() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('OrderMerchantReference') || '';
  const trackingId = searchParams.get('OrderTrackingId') || '';
  const [status, setStatus] = useState<Status>('pending');
  const [type, setType] = useState<PaymentType>('unknown');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!reference) return;
    let tries = 0;
    timerRef.current = setInterval(async () => {
      tries += 1;
      try {
        const res = await apiGet<{ type: PaymentType; status: string; payment_status?: string }>(
          `/payments/pesapal/status?reference=${encodeURIComponent(reference)}`
        );
        setType(res.type);
        const done =
          res.status === 'active' ||
          res.status === 'completed' ||
          res.status === 'expired' ||
          res.payment_status === 'completed';
        const failed = res.status === 'failed' || res.status === 'cancelled';
        if (done || failed || tries >= POLL_LIMIT) {
          setStatus(failed ? 'failed' : done ? 'completed' : 'pending');
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch {
        if (tries >= POLL_LIMIT && timerRef.current) clearInterval(timerRef.current);
      }
    }, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [reference]);

  const destination = type === 'subscription' ? '/account' : '/dashboard/manager';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md text-center py-10">
        <CardContent className="space-y-4 pt-2">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
            status === 'completed' ? 'bg-success/10' : status === 'failed' ? 'bg-destructive/10' : 'bg-primary/10'
          }`}>
            {status === 'completed' ? (
              <CheckCircle2 className="h-10 w-10 text-success" />
            ) : status === 'failed' ? (
              <XCircle className="h-10 w-10 text-destructive" />
            ) : (
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            )}
          </div>

          <div>
            <CardTitle className="text-xl">
              {status === 'completed'
                ? 'Payment Successful'
                : status === 'failed'
                  ? 'Payment Failed'
                  : trackingId
                    ? 'Confirming your payment...'
                    : 'No payment found'}
            </CardTitle>
            <CardDescription className="mt-2">
              {status === 'completed'
                ? type === 'subscription'
                  ? 'Your subscription is now active.'
                  : 'Your listing boost is now active.'
                : status === 'failed'
                  ? 'Your payment could not be processed. Please try again.'
                  : trackingId
                    ? 'We are checking the payment status with Pesapal. This can take a minute.'
                    : 'This page expects the merchant reference from the Pesapal callback.'}
            </CardDescription>
          </div>

          {status === 'pending' && trackingId && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> Checking with Pesapal...
            </div>
          )}

          {status !== 'pending' && (
            <Button
              onClick={() => navigate(destination)}
              className="w-full gap-2 rounded-xl"
            >
              {type === 'subscription' ? <User className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
              {type === 'subscription' ? 'Go to My Account' : 'Back to Dashboard'}
            </Button>
          )}

          {status === 'pending' && !trackingId && (
            <Button onClick={() => navigate('/')} variant="outline" className="w-full rounded-xl">
              Go Home
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
