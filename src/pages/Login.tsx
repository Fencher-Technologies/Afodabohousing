import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logoImg from '@/assets/axis-logo.png';
import heroBg from '@/assets/hero-bg.jpg';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Smartphone, MessageSquare, KeyRound } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

function phoneWarning(val: string): string | null {
  if (!val) return null;
  const cleaned = val.replace(/[+\d]/g, '');
  if (cleaned.length > 0) return 'Only digits and leading + allowed, no spaces or symbols';
  return null;
}

export default function LoginPage() {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [phoneMethod, setPhoneMethod] = useState<'otp' | 'pin'>('otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [phoneWarn, setPhoneWarn] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem('pw_recovery')) {
      setResetting(true);
      sessionStorage.removeItem('pw_recovery');
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Password updated!', description: 'You can now sign in with your new password.' });
    sessionStorage.removeItem('pw_recovery');
    setResetting(false);
    await supabase.auth.signOut();
  };

  const navigateAfterLogin = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('user_id', userId)
      .maybeSingle();
    if (profile?.status && profile.status !== 'active') {
      await supabase.auth.signOut();
      toast({ title: 'Account not active', description: `Your account is ${profile.status}.`, variant: 'destructive' });
      return;
    }
    const role = profile?.role || 'tenant';
    if (role === 'super_admin') navigate('/dashboard/super-admin');
    else if (role === 'house_manager') navigate('/dashboard/manager');
    else navigate('/dashboard/tenant');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast({ title: 'Login failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Login successful', description: 'Welcome back!' });
    navigateAfterLogin(data.user.id);
  };

  const handleSendOtp = async () => {
    if (!phone.trim()) { toast({ title: 'Enter your phone number', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/signin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to send OTP');
      setOtpSent(true);
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
      const res = await fetch(`${API}/auth/phone/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), token: otp.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Verification failed');
      const data = await res.json();
      await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      toast({ title: 'Login successful', description: 'Welcome back!' });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) navigateAfterLogin(user.id);
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    setLoading(false);
  };

  const handlePinSignIn = async () => {
    if (!phone.trim() || !pin.trim()) { toast({ title: 'Enter phone number and PIN', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/signin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), pin: pin.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'PIN sign-in failed');
      }
      const data = await res.json();
      await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      toast({ title: 'Login successful', description: 'Welcome back!' });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) navigateAfterLogin(user.id);
    } catch (err: any) { toast({ title: 'Error', description: err.message, variant: 'destructive' }); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-background max-w-[520px]">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="flex items-center gap-3 mb-10">
            <img src={logoImg} alt="Axis" className="h-11 w-11 rounded-xl" />
            <div>
              <div className="font-display font-bold text-lg text-primary leading-tight">Axis</div>
              <div className="text-muted-foreground text-xs">Housing Made Easy</div>
            </div>
          </Link>

          {resetting ? (
            <>
              <h1 className="text-3xl font-display font-bold text-foreground mb-1.5">Set new password</h1>
              <p className="text-muted-foreground mb-8">Enter your new password below.</p>
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="new-password" type={showNewPw ? 'text' : 'password'} placeholder="At least 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} className="pl-9 pr-10" />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input id="confirm-password" type="password" placeholder="Repeat the new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} className="mt-1.5" />
                </div>
                <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2">
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-display font-bold text-foreground mb-1.5">Welcome back</h1>
              <p className="text-muted-foreground mb-6">Sign in to your account to continue</p>

              <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6">
                <button type="button" onClick={() => { setMethod('email'); setOtpSent(false); setOtp(''); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${method === 'email' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Mail className="h-3.5 w-3.5 inline mr-1.5" />Email
                </button>
                <button type="button" onClick={() => { setMethod('phone'); setOtpSent(false); setOtp(''); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${method === 'phone' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Smartphone className="h-3.5 w-3.5 inline mr-1.5" />Phone
                </button>
              </div>

              {method === 'email' ? (
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="you@example.com" value={email}
                        onChange={e => setEmail(e.target.value)} required className="pl-9" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="password">Password</Label>
                      <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="password" type={showPw ? 'text' : 'password'} placeholder="••••••••"
                        value={password} onChange={e => setPassword(e.target.value)} required className="pl-9 pr-10" />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading}
                    className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Signing in...
                      </span>
                    ) : (<>Sign In <ArrowRight className="h-4 w-4" /></>)}
                  </Button>
                </form>
              ) : (
                <div className="space-y-5">
                  <div className="flex gap-1 bg-muted rounded-lg p-1">
                    <button type="button" onClick={() => { setPhoneMethod('otp'); setOtpSent(false); setOtp(''); }}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${phoneMethod === 'otp' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                      <MessageSquare className="h-3 w-3 inline mr-1" />OTP
                    </button>
                    <button type="button" onClick={() => setPhoneMethod('pin')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${phoneMethod === 'pin' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                      <KeyRound className="h-3 w-3 inline mr-1" />PIN
                    </button>
                  </div>
                  <div>
                    <Label>Phone number</Label>
                    <div className="relative mt-1.5">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="tel" placeholder="+256 7XX XXX XXX" value={phone}
                        onChange={e => { setPhone(e.target.value); setPhoneWarn(phoneWarning(e.target.value)); }}
                        disabled={otpSent} className="pl-9" required />
                    </div>
                    {phoneWarn && <p className="text-xs text-destructive mt-1">{phoneWarn}</p>}
                  </div>
                  {phoneMethod === 'otp' ? (
                    !otpSent ? (
                      <Button type="button" onClick={handleSendOtp} disabled={loading || !phone.trim()}
                        className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2">
                        {loading ? 'Sending...' : <><MessageSquare className="h-4 w-4" /> Send OTP</>}
                      </Button>
                    ) : (
                      <>
                        <div>
                          <Label>Enter OTP</Label>
                          <Input type="text" inputMode="numeric" placeholder="000000" value={otp}
                            onChange={e => setOtp(e.target.value)} maxLength={6}
                            className="mt-1.5 text-center text-2xl tracking-[0.5em] font-mono h-14" />
                        </div>
                        <Button type="button" onClick={handleVerifyOtp} disabled={loading || otp.length < 4}
                          className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2">
                          {loading ? 'Verifying...' : <><ArrowRight className="h-4 w-4" /> Verify & Sign In</>}
                        </Button>
                        <div className="text-center">
                          <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setPhone(''); }}
                            className="text-xs text-muted-foreground hover:text-foreground underline">
                            Use a different number
                          </button>
                          {cooldown > 0 && (
                            <span className="text-xs text-muted-foreground ml-3">Resend in {cooldown}s</span>
                          )}
                          {cooldown === 0 && otpSent && (
                            <button type="button" onClick={handleSendOtp} disabled={loading}
                              className="text-xs text-primary hover:underline ml-3">Resend OTP</button>
                          )}
                        </div>
                      </>
                    )
                  ) : (
                    <>
                      <div>
                        <Label>PIN</Label>
                        <Input type="password" inputMode="numeric" placeholder="Enter your PIN" value={pin}
                          onChange={e => setPin(e.target.value)} maxLength={6}
                          className="mt-1.5 text-center text-xl tracking-widest font-mono h-14" />
                      </div>
                      <Button type="button" onClick={handlePinSignIn} disabled={loading || !phone.trim() || pin.length < 4}
                        className="w-full gap-2">
                        {loading ? 'Signing in...' : <><KeyRound className="h-4 w-4" /> Sign In with PIN</>}
                      </Button>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <Link to="/getting-started" className="text-primary hover:underline">Get Started</Link>
                        <Link to="/forgot-pin" className="text-primary hover:underline">Forgot PIN?</Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden lg:flex flex-1 relative">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative z-10 flex flex-col justify-end p-14 text-primary-foreground">
          <div className="max-w-sm">
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Trusted across Uganda</p>
            <h2 className="font-display text-5xl font-bold mb-4 leading-tight">Find Your Perfect Home in Uganda</h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Verified listings across all states of Uganda. Secure payments. Digital agreements. All in one platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
