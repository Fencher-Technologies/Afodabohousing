import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logoImg from '@/assets/logo.png';
import heroBg from '@/assets/hero-bg.jpg';
import { Mail, Smartphone, ArrowRight, MessageSquare, KeyRound, User, Check } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [method, setMethod] = useState<'invite' | 'phone'>('invite');
  const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const handleSendOtp = async () => {
    if (!phone.trim()) { toast({ title: 'Enter your phone number', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to send OTP');
      setStep('otp');
      toast({ title: 'OTP sent!', description: 'Check your phone for the code.' });
      setCooldown(60);
      const t = setInterval(() => setCooldown(c => { if (c <= 1) clearInterval(t); return c - 1; }), 1000);
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) { toast({ title: 'Enter the OTP code', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Verification failed');
      const data = await res.json();
      if (!data.valid || !data.verify_token) throw new Error('Invalid OTP');
      setVerifyToken(data.verify_token);
      setStep('details');
      toast({ title: 'Phone verified!', description: 'Now set up your account.' });
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!fullName.trim()) { toast({ title: 'Enter your full name', variant: 'destructive' }); return; }
    if (pin.length < 4) { toast({ title: 'PIN must be at least 4 digits', variant: 'destructive' }); return; }
    if (!acceptedTerms) { toast({ title: 'Accept terms to continue', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          verify_token: verifyToken,
          full_name: fullName.trim(),
          pin: pin.trim(),
          accepted_terms: true,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Registration failed');
      toast({ title: 'Account created!', description: 'Welcome to Afodabo Housing.' });
      navigate('/login');
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-background max-w-[560px] overflow-y-auto">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <img src={logoImg} alt="Afodabo Housing" className="h-11 w-11 rounded-xl" />
            <div>
              <div className="font-display font-bold text-lg text-primary leading-tight">Afodabo Housing</div>
              <div className="text-muted-foreground text-xs">Uganda's Housing Platform</div>
            </div>
          </Link>

          <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
            <button type="button" onClick={() => setMethod('invite')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${method === 'invite' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Mail className="h-3.5 w-3.5 inline mr-1.5" />Invite
            </button>
            <button type="button" onClick={() => { setMethod('phone'); setStep('phone'); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${method === 'phone' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Smartphone className="h-3.5 w-3.5 inline mr-1.5" />Phone
            </button>
          </div>

          {method === 'invite' ? (
            <>
              <h1 className="text-3xl font-display font-bold text-foreground mb-1.5">Registration is invite-only</h1>
              <p className="text-muted-foreground mb-6">
                New accounts can only be created through an invitation from a property manager or administrator.
              </p>
              <div className="bg-secondary rounded-2xl p-6 mb-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Received an invitation?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check your email for a link from your property manager or admin.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Button onClick={() => navigate('/login')} className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold">
                  Sign In
                </Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-display font-bold text-foreground mb-1.5">
                {step === 'phone' && 'Register with Phone'}
                {step === 'otp' && 'Verify your phone'}
                {step === 'details' && 'Set up your account'}
              </h1>
              <p className="text-muted-foreground mb-6">
                {step === 'phone' && 'Enter your phone number to get started.'}
                {step === 'otp' && `Enter the code sent to ${phone}`}
                {step === 'details' && 'Enter your name and create a PIN for quick sign-in.'}
              </p>

              {step === 'phone' && (
                <div className="space-y-5">
                  <div>
                    <Label>Phone number</Label>
                    <div className="relative mt-1.5">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="tel" placeholder="+256 7XX XXX XXX" value={phone}
                        onChange={e => setPhone(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <Button type="button" onClick={handleSendOtp} disabled={loading || !phone.trim()}
                    className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2">
                    {loading ? 'Sending...' : <><MessageSquare className="h-4 w-4" /> Send OTP</>}
                  </Button>
                </div>
              )}

              {step === 'otp' && (
                <div className="space-y-5">
                  <div>
                    <Label>Enter OTP</Label>
                    <Input type="text" inputMode="numeric" placeholder="000000" value={otp}
                      onChange={e => setOtp(e.target.value)} maxLength={6}
                      className="mt-1.5 text-center text-2xl tracking-[0.5em] font-mono h-14" />
                  </div>
                  <Button type="button" onClick={handleVerifyOtp} disabled={loading || otp.length < 4}
                    className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2">
                    {loading ? 'Verifying...' : <><ArrowRight className="h-4 w-4" /> Verify</>}
                  </Button>
                  <div className="text-center">
                    <button type="button" onClick={() => { setStep('phone'); setOtp(''); }}
                      className="text-xs text-muted-foreground hover:text-foreground underline">
                      Change phone number
                    </button>
                    {cooldown > 0 && (
                      <span className="text-xs text-muted-foreground ml-3">Resend in {cooldown}s</span>
                    )}
                    {cooldown === 0 && (
                      <button type="button" onClick={handleSendOtp} disabled={loading}
                        className="text-xs text-primary hover:underline ml-3">Resend OTP</button>
                    )}
                  </div>
                </div>
              )}

              {step === 'details' && (
                <div className="space-y-5">
                  <div>
                    <Label>Full name</Label>
                    <div className="relative mt-1.5">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="text" placeholder="Your full name" value={fullName}
                        onChange={e => setFullName(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                  <div>
                    <Label>Create PIN</Label>
                    <div className="relative mt-1.5">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="password" inputMode="numeric" placeholder="4-6 digit PIN" value={pin}
                        onChange={e => setPin(e.target.value)} maxLength={6} className="pl-9 text-center text-xl tracking-widest font-mono" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Use this PIN to sign in quickly next time.</p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={acceptedTerms}
                      onChange={e => setAcceptedTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                    <span className="text-xs text-muted-foreground">
                      I accept the <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and{' '}
                      <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                    </span>
                  </label>
                  <Button type="button" onClick={handleRegister} disabled={loading || !fullName.trim() || pin.length < 4 || !acceptedTerms}
                    className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2">
                    {loading ? 'Creating account...' : <><Check className="h-4 w-4" /> Create Account</>}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative z-10 flex flex-col justify-end p-14 text-primary-foreground">
          <div className="max-w-sm">
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Uganda's #1 Housing App</p>
            <h2 className="font-display text-5xl font-bold mb-4 leading-tight">Join Afodabo Housing Today</h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Register with your phone number and get access to verified properties, secure payments, and digital agreements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
