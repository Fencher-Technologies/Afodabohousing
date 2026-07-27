import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, ArrowRight, Smartphone } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';
const RESEND_DELAY = 30;

export default function PhoneOtp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const { toast } = useToast();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(RESEND_DELAY);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    if (!phone) navigate('/phone-auth');
  }, [phone, navigate]);

  async function handleVerify() {
    setError('');
    if (otp.length < 4) { setError('Please enter the full verification code'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid code');
      if (!data.valid || !data.verify_token) throw new Error(data.message || 'Verification failed');
      navigate(`/phone-pin-setup?phone=${encodeURIComponent(phone)}&verifyToken=${encodeURIComponent(data.verify_token)}`);
    } catch (err: any) {
      const msg = err.message || 'Invalid code';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    setError('');
    try {
      const res = await fetch(`${API}/auth/phone/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to resend code');
      setCountdown(RESEND_DELAY);
      setOtp('');
      toast({ title: 'Code resent', description: 'Check your phone for the new code.' });
    } catch (err: any) {
      const msg = err.message || 'Failed to resend';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    }
  }

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 max-w-[520px]">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="flex items-center gap-3 mb-10">
            <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">A</span>
            </div>
            <div>
              <div className="font-display font-bold text-lg text-primary leading-tight">Afodabo Housing</div>
              <div className="text-muted-foreground text-xs">Uganda's Housing Platform</div>
            </div>
          </Link>

          <Card className="border-0 shadow-card">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-3">
                <KeyRound className="h-7 w-7 text-primary-foreground" />
              </div>
              <CardTitle className="font-display text-2xl">Verify Code</CardTitle>
              <CardDescription>Enter the code sent to {phone}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</div>
              )}

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={v => { setOtp(v); setError(''); }}
                  onComplete={handleVerify}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-14 w-12 text-xl font-bold border-2" />
                    <InputOTPSlot index={1} className="h-14 w-12 text-xl font-bold border-2" />
                    <InputOTPSlot index={2} className="h-14 w-12 text-xl font-bold border-2" />
                    <InputOTPSlot index={3} className="h-14 w-12 text-xl font-bold border-2" />
                    <InputOTPSlot index={4} className="h-14 w-12 text-xl font-bold border-2" />
                    <InputOTPSlot index={5} className="h-14 w-12 text-xl font-bold border-2" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={handleVerify}
                disabled={loading || otp.length < 4}
                className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  <><KeyRound className="h-4 w-4" /> Verify Code <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>

              <div className="flex items-center justify-center gap-1 text-sm">
                <span className="text-muted-foreground">
                  {countdown > 0
                    ? `Resend code in ${countdown}s`
                    : "Didn't receive the code?"}
                </span>
                {countdown === 0 && (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-primary font-semibold hover:underline"
                  >
                    Resend
                  </button>
                )}
              </div>

              <div className="text-center pt-1">
                <Link to="/phone-auth" className="text-xs text-muted-foreground hover:text-foreground underline">
                  Use a different number
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-primary/5 via-background to-gold/5">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary)) 0%, transparent 50%),
                              radial-gradient(circle at 75% 75%, hsl(var(--gold)) 0%, transparent 50%)`,
          }}
        />
        <div className="relative z-10 flex flex-col justify-end p-14">
          <div className="max-w-sm">
            <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">Secure Verification</p>
            <h2 className="font-display text-5xl font-bold mb-4 leading-tight text-foreground">
              Enter Your Verification Code
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              A 6-digit code has been sent to your phone. Enter it below to continue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
