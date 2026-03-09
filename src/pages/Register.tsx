import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logoImg from '@/assets/logo.png';
import heroBg from '@/assets/hero-bg.jpg';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, CheckCircle } from 'lucide-react';

type Role = 'tenant' | 'house_manager';

const ROLE_OPTIONS = [
  {
    role: 'tenant' as Role,
    emoji: '🏡',
    label: 'Tenant',
    sub: 'Looking for a home to rent',
    perks: ['Browse all listings', 'Pay rent online or via mobile money', 'Message house managers directly'],
  },
  {
    role: 'house_manager' as Role,
    emoji: '🏢',
    label: 'House Manager',
    sub: 'Listing and managing properties',
    perks: ['List unlimited properties', 'Track tenant payments', 'Send SMS reminders'],
  },
];

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('tenant');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Please make sure both password fields are identical.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters long.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast({ title: 'Registration failed', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (data.user) {
      // Assign role
      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role });

      if (roleErr) console.error('Role assignment error:', roleErr.message);

      // Save phone
      if (phone) {
        await supabase.from('profiles').update({ phone, full_name: fullName }).eq('user_id', data.user.id);
      }

      // Send welcome SMS
      if (phone) {
        try {
          await supabase.functions.invoke('send-sms', {
            body: {
              phone,
              message: `Welcome to Afodabo Housing! Your account has been created as ${role === 'house_manager' ? 'House Manager' : 'Tenant'}. Start ${role === 'house_manager' ? 'listing properties' : 'browsing homes'} at afodabohousing.com. - info@afodabohousing.com`,
            },
          });
        } catch (e) {
          console.log('Welcome SMS failed:', e);
        }
      }
    }

    setLoading(false);
    toast({
      title: '✓ Account created!',
      description: `Welcome to Afodabo Housing! ${role === 'house_manager' ? 'Start listing your properties.' : 'Browse homes and find your perfect place.'}`,
    });
    navigate(role === 'house_manager' ? '/dashboard/manager' : '/dashboard/tenant');
  };

  const selectedRole = ROLE_OPTIONS.find(r => r.role === role)!;

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-background max-w-[560px] overflow-y-auto">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <img src={logoImg} alt="Afodabo Housing" className="h-11 w-11 rounded-xl" />
            <div>
              <div className="font-display font-bold text-lg text-primary leading-tight">Afodabo Housing</div>
              <div className="text-muted-foreground text-xs">Uganda's Housing Platform</div>
            </div>
          </Link>

          <h1 className="text-3xl font-display font-bold text-foreground mb-1.5">Create your account</h1>
          <p className="text-muted-foreground mb-6">Join Uganda's trusted housing community, free forever</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {ROLE_OPTIONS.map(r => (
              <button
                type="button"
                key={r.role}
                onClick={() => setRole(r.role)}
                className={`rounded-2xl border-2 p-4 text-left transition-all ${role === r.role ? 'border-primary bg-primary/8 shadow-sm' : 'border-border hover:border-primary/40 bg-card'}`}
              >
                <span className="text-2xl block mb-1.5">{r.emoji}</span>
                <span className={`text-sm font-bold block ${role === r.role ? 'text-primary' : 'text-foreground'}`}>{r.label}</span>
                <span className="text-xs text-muted-foreground mt-0.5 block">{r.sub}</span>
              </button>
            ))}
          </div>

          {/* Perks for selected role */}
          <div className="bg-secondary rounded-xl p-3 mb-5">
            <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-widest">As a {selectedRole.label} you can:</p>
            {selectedRole.perks.map(p => (
              <div key={p} className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                {p}
              </div>
            ))}
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="fullName" type="text" placeholder="John Mukasa" value={fullName} onChange={e => setFullName(e.target.value)} required className="pl-9" />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="pl-9" />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number (for SMS notifications)</Label>
              <div className="relative mt-1.5">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" type="tel" placeholder="+256 700 000000" value={phone} onChange={e => setPhone(e.target.value)} className="pl-9" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Optional but recommended for rent reminders via SMS</p>
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
              {loading ? 'Creating account…' : <>Create Account <ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>

          <p className="mt-4 text-xs text-muted-foreground text-center">
            By creating an account you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 relative bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative z-10 flex flex-col justify-end p-14 text-primary-foreground">
          <div className="max-w-sm">
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Uganda's #1 Housing App</p>
            <h2 className="font-display text-5xl font-bold mb-4 leading-tight">
              From Kampala to Gulu: Find Your Next Home
            </h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Join thousands of Ugandans already using Afodabo Housing for verified rentals across every district.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
