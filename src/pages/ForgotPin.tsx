import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, Key, Lock, CheckCircle, ChevronLeft } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';
const RESEND_DELAY = 30;

function phoneWarning(val: string): string | null {
  if (!val) return null;
  const cleaned = val.replace(/[+\d]/g, '');
  if (cleaned.length > 0) return 'Only digits and leading + allowed, no spaces or symbols';
  return null;
}

const STEPS = [
  { num: 1, label: 'Phone', icon: Phone },
  { num: 2, label: 'Verify', icon: Key },
  { num: 3, label: 'New PIN', icon: Lock },
];

export default function ForgotPin() {
  const nav = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [phoneWarn, setPhoneWarn] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  function handlePinChange(val: string) {
    return val.replace(/\D/g, '').slice(0, 6);
  }

  async function sendOtp() {
    setError('');
    if (!phone.trim()) { setError('Enter your phone number'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send OTP');
      setStep(2);
      setCountdown(RESEND_DELAY);
      toast({ title: 'Code sent', description: 'Check your phone for the verification code.' });
    } catch (e: any) { setError(e.message); toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }

  async function verifyOtp() {
    setError('');
    if (otp.length < 4) { setError('Enter the full verification code'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid OTP');
      if (!data.valid || !data.verify_token) throw new Error(data.message || 'Verification failed');
      setVerifyToken(data.verify_token);
      setStep(3);
      toast({ title: 'Verified', description: 'Now create a new PIN.' });
    } catch (e: any) { setError(e.message); toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
  }

  async function resendOtp() {
    if (countdown > 0) return;
    setError('');
    try {
      const res = await fetch(`${API}/auth/phone/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to resend');
      setCountdown(RESEND_DELAY);
      setOtp('');
      toast({ title: 'Code resent', description: 'Check your phone for the new code.' });
    } catch (e: any) { setError(e.message); toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  }

  async function resetPin() {
    setError(''); setMessage('');
    if (newPin.length < 4) { setError('PIN must be at least 4 digits'); return; }
    if (newPin !== confirmPin) { setError('PINs do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/forgot-pin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), verify_token: verifyToken, new_pin: newPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to reset PIN');
      setMessage(data.message || 'PIN reset successfully!');
      setStep(4);
      toast({ title: 'Success', description: 'Your PIN has been reset.' });
    } catch (e: any) { setError(e.message); toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    finally { setLoading(false); }
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
              <div className="font-display font-bold text-lg text-primary leading-tight">Axis</div>
              <div className="text-muted-foreground text-xs">Housing Made Easy</div>
            </div>
          </Link>

          {/* Step indicator */}
          {step < 4 && (
            <div className="flex items-center justify-center gap-0 mb-6">
              {STEPS.map((s, i) => (
                <div key={s.num} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
                    ${step === s.num ? 'bg-primary/10 text-primary' : step > s.num ? 'text-success' : 'text-muted-foreground'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                      ${step === s.num ? 'bg-primary text-primary-foreground' :
                        step > s.num ? 'bg-success text-white' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                      {step > s.num ? <CheckCircle className="h-3 w-3" /> : s.num}
                    </div>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-8 h-px mx-1 ${step > s.num ? 'bg-success/50' : 'bg-border'}`} />
                  )}
                </div>
              ))}
            </div>
          )}

          <Card className="border-0 shadow-card">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto bg-primary/10 text-primary rounded-full p-3 w-fit mb-3">
                {step === 4 ? <CheckCircle className="h-6 w-6" /> : <Key className="h-6 w-6" />}
              </div>
              <CardTitle className="font-display text-xl">Reset PIN</CardTitle>
              <CardDescription>
                {step === 1 && 'Enter your phone number to receive a reset code'}
                {step === 2 && `Enter the code sent to ${phone}`}
                {step === 3 && 'Choose a new PIN'}
                {step === 4 && 'Your PIN has been reset successfully'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 mb-4">{error}</div>
              )}
              {message && step === 4 && (
                <div className="text-sm text-success bg-success/10 rounded-lg p-3 mb-4">{message}</div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="phone" type="tel" placeholder="+256 7XX XXX XXX" value={phone}
                        onChange={e => { setPhone(e.target.value); setPhoneWarn(phoneWarning(e.target.value)); }}
                        className="pl-9 h-12" />
                    </div>
                    {phoneWarn && <p className="text-xs text-destructive">{phoneWarn}</p>}
                  </div>
                  <Button onClick={sendOtp} disabled={loading || !phone.trim()}
                    className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                      : <><Phone className="h-4 w-4" /> Send Verification Code</>}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Remember your PIN?{' '}
                    <Link to="/login" className="text-primary hover:underline font-semibold">Sign in</Link>
                  </p>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex justify-center py-2">
                    <InputOTP maxLength={6} value={otp}
                      onChange={v => { setOtp(v); setError(''); }}
                      onComplete={verifyOtp}
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
                  <Button onClick={verifyOtp} disabled={loading || otp.length < 4}
                    className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                      : <><Key className="h-4 w-4" /> Verify Code</>}
                  </Button>
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <span className="text-muted-foreground">
                      {countdown > 0 ? `Resend code in ${countdown}s` : "Didn't receive the code?"}
                    </span>
                    {countdown === 0 && (
                      <button type="button" onClick={resendOtp}
                        className="text-primary font-semibold hover:underline">
                        Resend
                      </button>
                    )}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPin">New PIN (4-6 digits)</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <PasswordInput id="newPin" inputMode="numeric" placeholder="1234"
                        value={newPin} onChange={e => setNewPin(handlePinChange(e.target.value))}
                        className="pl-9 h-12 tracking-widest font-mono" maxLength={6} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPin">Confirm New PIN</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                      <PasswordInput id="confirmPin" inputMode="numeric" placeholder="Re-enter PIN"
                        value={confirmPin} onChange={e => setConfirmPin(handlePinChange(e.target.value))}
                        className="pl-9 h-12 tracking-widest font-mono" maxLength={6} />
                    </div>
                  </div>
                  <Button onClick={resetPin} disabled={loading || newPin.length < 4 || !confirmPin}
                    className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</>
                      : <><Lock className="h-4 w-4" /> Reset PIN</>}
                  </Button>
                  <button type="button" onClick={() => setStep(2)}
                    className="flex items-center justify-center gap-1 w-full text-xs text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="h-3 w-3" /> Back to verification
                  </button>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="text-center py-2">
                    <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-3">
                      <CheckCircle className="h-8 w-8 text-success" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Your PIN has been reset. You can now sign in with your new PIN.
                    </p>
                  </div>
                  <Button onClick={() => nav('/phone-signin')}
                    className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold">
                    Go to Sign In
                  </Button>
                </div>
              )}
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
            <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">Need Help?</p>
            <h2 className="font-display text-5xl font-bold mb-4 leading-tight text-foreground">
              Reset Your PIN
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Follow the steps to verify your identity and create a new PIN for your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
