import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, CheckCircle2, ArrowLeft } from 'lucide-react';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Landing page for the emailed password recovery link.
 *
 * ForgotPassword previously sent users to /login, which has no recovery
 * handling — the link opened the sign-in form and the reset silently went
 * nowhere. Supabase puts the recovery tokens in the URL fragment and the
 * client picks them up as a PASSWORD_RECOVERY session, which is what lets
 * updateUser() set the new password here.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase surfaces link failures as query/fragment params rather than
    // throwing, so read them before waiting on a session that won't arrive.
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    const description = fragment.get('error_description') || query.get('error_description');
    if (description) {
      setLinkError(description.replace(/\+/g, ' '));
      setReady(true);
      return;
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });

    // Cold loads may have consumed the fragment before the listener attached.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else {
        setTimeout(() => {
          setReady((current) => {
            if (!current) {
              setLinkError('This reset link is invalid or has expired. Please request a new one.');
            }
            return true;
          });
        }, 2000);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast({
        title: 'Password too short',
        description: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
        variant: 'destructive',
      });
      return;
    }
    if (password !== confirm) {
      toast({
        title: 'Passwords do not match',
        description: 'Please re-enter the same password in both fields.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({ title: 'Could not update password', description: error.message, variant: 'destructive' });
      return;
    }
    setDone(true);
    toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
    setTimeout(() => navigate('/login'), 2000);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm w-full text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Password updated</h1>
          <p className="text-muted-foreground mb-6">
            Redirecting you to sign in…
          </p>
          <Link to="/login" className="text-primary hover:underline text-sm">Go to sign in</Link>
        </div>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-2xl font-display font-bold mb-2">Link not valid</h1>
          <p className="text-muted-foreground mb-6">{linkError}</p>
          <Button onClick={() => navigate('/forgot-password')} className="w-full">
            Request a new link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm w-full">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>

        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold mb-2">Choose a new password</h1>
        <p className="text-muted-foreground mb-6">
          Enter a new password for your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              disabled={!ready || loading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              disabled={!ready || loading}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={!ready || loading}>
            {loading ? 'Updating…' : ready ? 'Update password' : 'Checking link…'}
          </Button>
        </form>
      </div>
    </div>
  );
}
