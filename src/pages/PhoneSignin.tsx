import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Phone, Lock, KeyRound, ArrowRight } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

function phoneWarning(val: string): string | null {
  if (!val) return null;
  const cleaned = val.replace(/[+\d]/g, '');
  if (cleaned.length > 0) return 'Only digits and leading + allowed, no spaces or symbols';
  return null;
}

export default function PhoneSignin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [phoneWarn, setPhoneWarn] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handlePinChange(val: string) {
    return val.replace(/\D/g, '').slice(0, 6);
  }

  async function handleSignIn() {
    setError('');
    if (!phone.trim()) { setError('Please enter your phone number'); return; }
    if (pin.length < 4) { setError('PIN must be at least 4 digits'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Sign in failed');

      // Set Supabase session with returned tokens
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token || '',
      });

      toast({ title: 'Login successful!', description: 'Welcome back.' });

      // Navigate based on role
      const role = data.role || 'tenant';
      if (role === 'super_admin') navigate('/dashboard/super-admin');
      else if (role === 'house_manager') navigate('/dashboard/manager');
      else navigate('/dashboard/tenant');
    } catch (err: any) {
      const msg = err.message || 'Sign in failed';
      setError(msg);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
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
              <div className="font-display font-bold text-lg text-primary leading-tight">Axis</div>
              <div className="text-muted-foreground text-xs">Housing Made Easy</div>
            </div>
          </Link>

          <Card className="border-0 shadow-card">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-3">
                <KeyRound className="h-7 w-7 text-primary-foreground" />
              </div>
              <CardTitle className="font-display text-2xl">Sign in with Phone</CardTitle>
              <CardDescription>Use your phone number and PIN</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+256 7XX XXX XXX"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setPhoneWarn(phoneWarning(e.target.value)); }}
                    className="pl-9 h-12"
                    autoComplete="tel"
                  />
                </div>
                {phoneWarn && <p className="text-xs text-destructive">{phoneWarn}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pin">PIN</Label>
                  <Link to="/forgot-pin" className="text-xs text-primary hover:underline">
                    Forgot PIN?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <PasswordInput
                    id="pin"
                    inputMode="numeric"
                    placeholder="Your 4-6 digit PIN"
                    value={pin}
                    onChange={e => setPin(handlePinChange(e.target.value))}
                    className="pl-9 h-12 tracking-widest font-mono"
                    maxLength={6}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                onClick={handleSignIn}
                disabled={loading || !phone.trim() || pin.length < 4}
                className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <><KeyRound className="h-4 w-4" /> Sign In <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>

              <div className="text-center pt-2">
                <span className="text-sm text-muted-foreground">Don't have an account? </span>
                <Link to="/phone-auth" className="text-sm text-primary font-semibold hover:underline">
                  Register here
                </Link>
              </div>

              <div className="text-center">
                <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground underline">
                  Back to email sign in
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
            <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">Welcome Back</p>
            <h2 className="font-display text-5xl font-bold mb-4 leading-tight text-foreground">
              Sign In with Your Phone &amp; PIN
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Fast, secure access to your account. No passwords to remember.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
