import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { User, Phone, Mail, Send, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';
const RESEND_DELAY = 30;

type Step = 'form' | 'otp' | 'done';

export default function GettingStarted() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('form');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [verifyToken, setVerifyToken] = useState('');

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleSendOtp = async () => {
    setError('');
    if (!firstName.trim()) { setError('Enter your first name'); return; }
    if (!lastName.trim()) { setError('Enter your last name'); return; }
    if (!phone.trim()) { setError('Enter your phone number'); return; }
    setSending(true);
    try {
      const res = await fetch(`${API}/auth/phone/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send code');
      setStep('otp');
      setCountdown(RESEND_DELAY);
      toast({ title: 'Code sent', description: 'Check your phone for the verification code.' });
    } catch (err: any) {
      setError(err.message);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const handleVerify = async () => {
    setError('');
    if (otp.length < 4) { setError('Enter the full verification code'); return; }
    setSending(true);
    try {
      const res = await fetch(`${API}/auth/phone/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) throw new Error(data.detail || data.message || 'Invalid code');

      const regRes = await fetch(`${API}/auth/phone/register-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          verify_token: data.verify_token,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || undefined,
        }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.detail || 'Registration failed');

      setStep('done');
      toast({ title: 'Registration submitted', description: regData.message });
    } catch (err: any) {
      setError(err.message);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError('');
    try {
      const res = await fetch(`${API}/auth/phone/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to resend');
      setCountdown(RESEND_DELAY);
      setOtp('');
      toast({ title: 'Code resent' });
    } catch (err: any) {
      setError(err.message);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (step === 'done') {
    return (
      <div className="min-h-screen flex bg-background">
        <div className="flex-1 flex flex-col justify-center px-6 py-12 max-w-[520px]">
          <div className="mx-auto w-full max-w-sm text-center">
            <Link to="/" className="inline-flex items-center gap-3 mb-10">
              <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">A</span>
              </div>
              <div className="text-left">
                <div className="font-display font-bold text-lg text-primary leading-tight">Axis</div>
                <div className="text-muted-foreground text-xs">Housing Made Easy</div>
              </div>
            </Link>
            <Card className="border-0 shadow-card">
              <CardContent className="pt-10 pb-10 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="font-display text-xl">Verification Successful</CardTitle>
                <CardDescription className="text-base">
                  Your registration is pending admin approval. You'll be notified once your account is activated.
                </CardDescription>
                <Button onClick={() => navigate('/login')} className="w-full gradient-primary text-primary-foreground gap-2 mt-4">
                  Back to Sign In <ArrowRight className="h-4 w-4" />
                </Button>
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
              <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">Almost There</p>
              <h2 className="font-display text-5xl font-bold mb-4 leading-tight text-foreground">Pending Approval</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">An admin will review and activate your account shortly.</p>
            </div>
          </div>
        </div>
      </div>
    );
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

          <Card className="border-0 shadow-card">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-3">
                {step === 'otp' ? <KeyRound className="h-7 w-7 text-primary-foreground" /> : <User className="h-7 w-7 text-primary-foreground" />}
              </div>
              <CardTitle className="font-display text-2xl">Get Started</CardTitle>
              <CardDescription>
                {step === 'otp' ? `Enter the code sent to ${phone}` : 'Create your house manager account'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {error && (
                <div className="text-sm text-destructive bg-muted rounded-lg p-3">{error}</div>
              )}

              {step === 'form' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>First Name *</Label>
                      <Input value={firstName} onChange={e => setFirstName(e.target.value)}
                        placeholder="John" className="mt-1" />
                    </div>
                    <div>
                      <Label>Last Name *</Label>
                      <Input value={lastName} onChange={e => setLastName(e.target.value)}
                        placeholder="Mukasa" className="mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label>Phone Number *</Label>
                    <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="+256 700 000000" className="mt-1" />
                  </div>
                  <div>
                    <Label>Email Address (optional)</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="manager@example.com" className="mt-1" />
                  </div>
                  <Button onClick={handleSendOtp} disabled={sending}
                    className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2">
                    {sending ? 'Sending...' : <><Send className="h-4 w-4" /> Get Verification Code</>}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
                  </p>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <InputOTP maxLength={6} value={otp}
                      onChange={v => { setOtp(v); setError(''); }}
                      onComplete={handleVerify}>
                      <InputOTPGroup>
                        {[0,1,2,3,4,5].map(i => (
                          <InputOTPSlot key={i} index={i} className="h-14 w-12 text-xl font-bold border-2" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button onClick={handleVerify} disabled={sending || otp.length < 4}
                    className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2">
                    {sending ? 'Verifying...' : <><KeyRound className="h-4 w-4" /> Verify & Register</>}
                  </Button>
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <span className="text-muted-foreground">
                      {countdown > 0 ? `Resend code in ${countdown}s` : "Didn't receive it?"}
                    </span>
                    {countdown === 0 && (
                      <button type="button" onClick={handleResend}
                        className="text-primary font-semibold hover:underline">Resend</button>
                    )}
                  </div>
                  <button type="button" onClick={() => { setStep('form'); setOtp(''); setError(''); }}
                    className="text-xs text-muted-foreground hover:text-foreground underline mx-auto block">
                    Use a different number
                  </button>
                </>
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
            <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">
              {step === 'otp' ? 'Verify Your Number' : 'Join as House Manager'}
            </p>
            <h2 className="font-display text-5xl font-bold mb-4 leading-tight text-foreground">
              {step === 'otp' ? 'Check Your Phone' : 'Start Managing Properties'}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {step === 'otp'
                ? 'Enter the 6-digit code sent to your phone number.'
                : 'Register as a house manager to list and manage properties on Axis.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
