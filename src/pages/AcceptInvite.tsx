import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logoImg from '@/assets/logo.png';
import heroBg from '@/assets/hero-bg.jpg';
import { User, Lock, Phone, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({ title: 'Invalid invitation', description: 'No invitation token found.', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Please make sure both password fields are identical.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters long.', variant: 'destructive' });
      return;
    }
    if (!fullName.trim()) {
      toast({ title: 'Name required', description: 'Please enter your full name.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/auth/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, full_name: fullName, phone: phone || null }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to accept invitation');
      }

      const data = await res.json();
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: '',
      });

      setAccepted(true);
      toast({ title: 'Account created!', description: 'You can now sign in.' });

      setTimeout(() => {
        if (data.role === 'house_manager') navigate('/dashboard/manager');
        else navigate('/dashboard/tenant');
      }, 1500);
    } catch (err: any) {
      toast({ title: 'Failed to accept invitation', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Invalid Invitation</h1>
          <p className="text-muted-foreground mb-6">
            No invitation token was provided. Please check the link you received.
          </p>
          <Button onClick={() => navigate('/login')} className="gradient-primary text-primary-foreground">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Account Created!</h1>
          <p className="text-muted-foreground mb-6">
            Your account has been set up. Redirecting you to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-background max-w-[560px] overflow-y-auto">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <img src={logoImg} alt="Afodabo Housing" className="h-11 w-11 rounded-xl" />
            <div>
              <div className="font-display font-bold text-lg text-primary leading-tight">Afodabo Housing</div>
              <div className="text-muted-foreground text-xs">Uganda's Housing Platform</div>
            </div>
          </Link>

          <h1 className="text-3xl font-display font-bold text-foreground mb-1.5">Accept Invitation</h1>
          <p className="text-muted-foreground mb-6">
            You've been invited to join Afodabo Housing. Set up your account below.
          </p>

          <form onSubmit={handleAccept} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="fullName" type="text" placeholder="John Mukasa" value={fullName} onChange={e => setFullName(e.target.value)} required className="pl-9" />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative mt-1.5">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" type="tel" placeholder="+256 700 000000" value={phone} onChange={e => setPhone(e.target.value)} className="pl-9" />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-9 pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className={`pl-9 ${confirmPassword && password !== confirmPassword ? 'border-destructive' : ''}`}
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive mt-1">Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2 mt-2"
            >
              {loading ? 'Setting up account…' : <>Accept & Create Account <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden lg:flex flex-1 relative bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative z-10 flex flex-col justify-end p-14 text-primary-foreground">
          <div className="max-w-sm">
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Uganda's #1 Housing App</p>
            <h2 className="font-display text-5xl font-bold mb-4 leading-tight">
              Welcome to Afodabo Housing
            </h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Your account has been set up by your property manager. Fill in your details to get started.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
