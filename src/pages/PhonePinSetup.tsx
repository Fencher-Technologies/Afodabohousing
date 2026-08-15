import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Lock, User, ShieldCheck, ArrowRight } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

export default function PhonePinSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const verifyToken = searchParams.get('verifyToken') || '';
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handlePinChange(val: string) {
    return val.replace(/\D/g, '').slice(0, 6);
  }

  async function handleRegister() {
    setError('');
    if (!fullName.trim()) { setError('Please enter your full name'); return; }
    if (pin.length < 4) { setError('PIN must be at least 4 digits'); return; }
    if (pin !== confirmPin) { setError('PINs do not match'); return; }
    if (!termsAccepted) { setError('You must agree to the Terms of Service'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          verify_token: verifyToken,
          full_name: fullName.trim(),
          pin,
          accepted_terms: true,
          terms_version: '1.0',
          privacy_version: '1.0',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');

      // Set Supabase session with the returned tokens
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token || '',
      });

      toast({ title: 'Account created!', description: 'Welcome to Axis.' });
      navigate('/onboarding');
    } catch (err: any) {
      const msg = err.message || 'Registration failed';
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
                <ShieldCheck className="h-7 w-7 text-primary-foreground" />
              </div>
              <CardTitle className="font-display text-2xl">Create Your PIN</CardTitle>
              <CardDescription>Secure your account with a PIN</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Mukasa"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="pl-9 h-12"
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin">Create PIN (4-6 digits)</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    placeholder="1234"
                    value={pin}
                    onChange={e => setPin(handlePinChange(e.target.value))}
                    className="pl-9 h-12 tracking-widest font-mono"
                    maxLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPin">Confirm PIN</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPin"
                    type="password"
                    inputMode="numeric"
                    placeholder="Re-enter PIN"
                    value={confirmPin}
                    onChange={e => setConfirmPin(handlePinChange(e.target.value))}
                    className="pl-9 h-12 tracking-widest font-mono"
                    maxLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 pt-1">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(v) => setTermsAccepted(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                  I agree to the{' '}
                  <Link to="/terms" className="text-gold font-semibold hover:underline">Terms of Service</Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-gold font-semibold hover:underline">Privacy Policy</Link>
                </Label>
              </div>

              <Button
                onClick={handleRegister}
                disabled={loading || !termsAccepted}
                className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  <><ShieldCheck className="h-4 w-4" /> Create Account <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>

              <div className="text-center pt-1">
                <span className="text-sm text-muted-foreground">Already have an account? </span>
                <Link to="/phone-signin" className="text-sm text-primary font-semibold hover:underline">
                  Sign In
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
            <p className="text-gold font-semibold text-sm uppercase tracking-widest mb-3">One Last Step</p>
            <h2 className="font-display text-5xl font-bold mb-4 leading-tight text-foreground">
              Create Your Secure PIN
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Set a 4-6 digit PIN to securely access your account. Make it memorable but not obvious.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
