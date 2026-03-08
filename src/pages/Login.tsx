import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logoImg from '@/assets/logo.png';
import heroBg from '@/assets/hero-bg.jpg';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Zap } from 'lucide-react';

const DEMO = [
  { email: 'admin@afodabo.ug', role: 'Admin', desc: 'Full platform control' },
  { email: 'john@afodabo.ug', role: 'Manager', desc: 'Manage properties and tenants' },
  { email: 'sarah@afodabo.ug', role: 'Tenant', desc: 'Pay rent and view tenancy' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
      return;
    }

    // Role is fetched by AuthContext via onAuthStateChange — navigate immediately
    // Fetch role once here just for redirect decision (fast single query)
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle();

    setLoading(false);

    if (roleData?.role === 'admin') navigate('/dashboard/admin');
    else if (roleData?.role === 'house_manager') navigate('/dashboard/manager');
    else navigate('/dashboard/tenant');
  };

  const quickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Demo@1234');
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: 'Demo@1234',
    });

    if (error) {
      setLoading(false);
      toast({ title: 'Demo login failed', description: error.message, variant: 'destructive' });
      return;
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle();

    setLoading(false);

    if (roleData?.role === 'admin') navigate('/dashboard/admin');
    else if (roleData?.role === 'house_manager') navigate('/dashboard/manager');
    else navigate('/dashboard/tenant');
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-background max-w-[520px]">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="flex items-center gap-3 mb-10">
            <img src={logoImg} alt="Afodabohousing" className="h-11 w-11 rounded-xl" />
            <div>
              <div className="font-display font-bold text-lg text-primary leading-tight">Afodabohousing</div>
              <div className="text-muted-foreground text-xs">Uganda's Housing Platform</div>
            </div>
          </Link>

          <h1 className="text-3xl font-display font-bold text-foreground mb-1.5">Welcome back</h1>
          <p className="text-muted-foreground mb-8">Sign in to your account to continue</p>

          <form ref={formRef} onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="email">Email address</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
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
                <>Sign In <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">Create account</Link>
          </p>

          {/* Demo accounts */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center gap-2 mb-3 justify-center">
              <Zap className="h-3.5 w-3.5 text-accent" />
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Quick Demo Access</p>
            </div>
            <div className="space-y-2">
              {DEMO.map(d => (
                <button
                  key={d.email}
                  onClick={() => quickLogin(d.email)}
                  disabled={loading}
                  className="w-full text-left flex items-center justify-between bg-secondary hover:bg-muted rounded-xl px-4 py-3 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div>
                    <span className="text-xs font-bold text-foreground">{d.role}</span>
                    <span className="text-xs text-muted-foreground ml-2">{d.desc}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
              <p className="text-xs text-muted-foreground text-center mt-2">
                Password: <code className="bg-card border border-border px-2 py-0.5 rounded font-mono text-primary font-bold">Demo@1234</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="hidden lg:flex flex-1 relative bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative z-10 flex flex-col justify-end p-14 text-primary-foreground">
          <div className="max-w-sm">
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Trusted across Uganda</p>
            <h2 className="font-display text-5xl font-bold mb-4 leading-tight">Find Your Perfect Home in Uganda</h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Verified listings across 135 districts. Secure payments. Digital agreements. All in one platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
