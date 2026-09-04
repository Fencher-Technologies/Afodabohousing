import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Mail, Check, User } from 'lucide-react';
import logoImg from '@/assets/axis-logo.png';
import heroBg from '@/assets/hero-bg.jpg';

interface SignupFormData {
  email: string;
  password: string;
  full_name: string;
  role: 'tenant' | 'house_manager';
}

const API = import.meta.env.VITE_API_URL || '';

export default function EmailSignup() {
  const [form, setForm] = useState<SignupFormData>({
    email: '',
    password: '',
    full_name: '',
    role: 'tenant',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setForm({ email: '', password: '', full_name: '', role: 'tenant' });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.role) {
      setError('All fields are required');
      return;
    }
    if (!acceptedTerms) {
      setError('You must accept the Terms of Service and Privacy Policy');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, accepted_terms: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Signup failed');
      toast({ title: 'Account created', description: 'You can now sign in', variant: 'default' });
      navigate('/login');
    } catch (e: any) {
      const msg = e.message || 'Signup failed';
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(msg);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-background max-w-[560px] overflow-y-auto">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <img src={logoImg} alt="Axis" className="h-11 w-11 rounded-xl" />
            <div>
              <div className="font-display font-bold text-lg text-primary leading-tight">Axis</div>
              <div className="text-muted-foreground text-xs">Housing Made Easy</div>
            </div>
          </Link>

          <h1 className="text-3xl font-display font-bold text-foreground mb-1.5">Create Account</h1>
          <p className="text-muted-foreground mb-6">
            Sign up with your email to get started.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Your full name"
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@email.com"
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div>
              <Label>Password</Label>
              <div className="relative mt-1.5">
                <PasswordInput
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as SignupFormData['role'] }))}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant">Tenant</SelectItem>
                  <SelectItem value="house_manager">House Manager</SelectItem>
                </SelectContent>
              </Select>
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
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-destructive text-sm">{error}</p>
                {error.includes('already exists') && (
                  <Link to="/login" className="text-primary text-sm font-semibold hover:underline mt-1 inline-block">
                    Go to Sign In →
                  </Link>
                )}
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2">
              {loading ? 'Creating account...' : <><Check className="h-4 w-4" /> Create Account</>}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-semibold">Sign In</Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative z-10 flex flex-col justify-end p-14 text-primary-foreground">
          <div className="max-w-sm">
            <p className="mini-title">Housing Made Easy</p>
            <h2 className="font-display text-5xl font-bold mb-4 leading-tight">Join Axis Today</h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Create your account and get access to verified properties, secure payments, and digital agreements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
