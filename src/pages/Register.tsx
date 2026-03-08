import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logoImg from '@/assets/logo.png';
import heroBg from '@/assets/hero-bg.jpg';
import { Eye, EyeOff } from 'lucide-react';

type Role = 'tenant' | 'house_manager';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('tenant');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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
      await supabase.from('user_roles').insert({ user_id: data.user.id, role });
      // Update phone in profile
      if (phone) {
        await supabase.from('profiles').update({ phone }).eq('user_id', data.user.id);
      }
    }

    setLoading(false);
    toast({ title: 'Account created!', description: 'Please check your email to verify your account.' });
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-background max-w-lg">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <img src={logoImg} alt="Afodabohousing" className="h-10 w-10" />
            <span className="font-display font-bold text-xl text-primary">Afodabohousing</span>
          </Link>

          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Create account</h1>
          <p className="text-muted-foreground mb-6">Join Uganda's housing platform today</p>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRole('tenant')}
              className={`rounded-lg border-2 p-4 text-center transition-all ${
                role === 'tenant'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              <span className="text-2xl block mb-1">🏡</span>
              <span className="text-sm font-semibold block">Tenant</span>
              <span className="text-xs">Looking for a home</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('house_manager')}
              className={`rounded-lg border-2 p-4 text-center transition-all ${
                role === 'house_manager'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              <span className="text-2xl block mb-1">🏢</span>
              <span className="text-sm font-semibold block">House Manager</span>
              <span className="text-xs">Listing a property</span>
            </button>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="+256 700 000000" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground h-11 text-base font-semibold mt-2">
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>

      {/* Right hero */}
      <div className="hidden lg:flex flex-1 relative bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-primary-foreground">
          <h2 className="font-display text-4xl font-bold mb-3">Uganda's Trusted Housing App</h2>
          <p className="text-primary-foreground/80 text-lg">Listings from Kampala to Gulu — find your next home today.</p>
        </div>
      </div>
    </div>
  );
}
