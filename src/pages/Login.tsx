import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { useToast } from '@/hooks/use-toast';
import logoImg from '@/assets/axis-logo-official.png';
import heroBg from '@/assets/hero-bg.jpg';
import { Mail, Lock, ArrowRight, Smartphone, MessageSquare, KeyRound } from 'lucide-react';
import { savePasswordCredential } from '@/lib/save-credentials';
import { PhoneInput } from '@/components/ui/phone-input';

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
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [phoneWarn, setPhoneWarn] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

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
    await savePasswordCredential(email, password);
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
          <Link to="/" className="inline-block mb-10">
            <img src={logoImg} alt="Axis Housing" className="h-14 w-auto" />
          </Link>

          <h1 className="text-3xl font-display font-bold text-foreground mb-1.5">Welcome back</h1>
          <p className="text-muted-foreground mb-6">Sign in to your account to continue</p>

              {/* PHONE LOGIN HIDDEN — the phone sign-in tab is preserved for future
              restore. The phone OTP/PIN flow below and the /auth/phone/* endpoints
              stay in place: accounts created by phone hold a synthetic
              phone_<digits>@axis.app email, so removing the backend would lock
              those users out permanently. */}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email" name="email" type="email" placeholder="you@example.com" value={email}
                        onChange={e => setEmail(e.target.value)} required className="pl-9" autoComplete="username" />
                    </div>
              </div>
              <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="password">Password</Label>
                      <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <PasswordInput id="password" name="password" placeholder="••••••••"
                        value={password} onChange={e => setPassword(e.target.value)} required className="pl-9 pr-10" autoComplete="current-password" />
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
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden lg:flex flex-1 relative">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative z-10 flex flex-col justify-end p-14 text-primary-foreground">
          <div className="max-w-sm">
            <p className="mini-title">Trusted worldwide</p>
            <h2 className="font-display text-5xl font-bold mb-4 leading-tight">Find Your Perfect Home, Anywhere</h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Verified listings worldwide. Secure payments. Digital agreements. All in one platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
