import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import logoImg from '@/assets/logo.png';
import heroBg from '@/assets/hero-bg.jpg';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setSent(true);
    toast({ title: 'Check your email', description: 'If that email is registered, you\'ll receive a reset link.' });
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm w-full text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Check your email</h1>
          <p className="text-muted-foreground mb-6">We sent a password reset link to <strong>{email}</strong></p>
          <Link to="/login" className="text-primary hover:underline text-sm font-medium">Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-background max-w-[520px]">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="flex items-center gap-3 mb-10">
            <img src={logoImg} alt="Afodabo Housing" className="h-11 w-11 rounded-xl" />
            <div>
              <div className="font-display font-bold text-lg text-primary leading-tight">Afodabo Housing</div>
              <div className="text-muted-foreground text-xs">Uganda's Housing Platform</div>
            </div>
          </Link>

          <h1 className="text-3xl font-display font-bold text-foreground mb-1.5">Forgot password?</h1>
          <p className="text-muted-foreground mb-8">Enter your email and we'll send you a reset link.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">Email address</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="pl-9" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold gap-2">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          <Link to="/login" className="flex items-center gap-1.5 justify-center mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="absolute inset-0 gradient-hero" />
      </div>
    </div>
  );
}
