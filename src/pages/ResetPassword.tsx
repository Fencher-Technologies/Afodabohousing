import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, CheckCircle2, ArrowLeft, AlertCircle } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { savePasswordCredential } from '@/lib/save-credentials';

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);
  const [resetEmail, setResetEmail] = useState('');
  const submitLock = useRef(false);
  const readyRef = useRef(false);
  const markReady = () => { readyRef.current = true; setReady(true); setLinkError(null); setChecking(false); };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    for (const k of ['error', 'error_description']) {
      if (!params.get(k) && hash.get(k)) params.set(k, hash.get(k) as string);
    }
    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error || errorDescription) {
      const msg = errorDescription || error || 'Unknown error';
      setLinkError(msg.replace(/\+/g, ' '));
      setChecking(false);
      return;
    }

    // Branded email link: https://www.axishousings.com/reset-password?token_hash=…&type=recovery
    // (Supabase "Reset Password" template). The one-time token is only used
    // here, when a person opens the page, so mail scanners that pre-open
    // links can no longer expire it, and the link shows our own domain
    // instead of *.supabase.co, which spam filters treat as phishing.
    const tokenHash = params.get('token_hash');
    if (tokenHash) {
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        .then(({ error: verifyError }) => {
          if (verifyError) {
            setLinkError('This reset link is invalid or has expired. Please request a new one.');
            setChecking(false);
          } else {
            window.history.replaceState({}, '', '/reset-password');
            markReady();
          }
        });
      return;
    }

    if (!code) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setReady(true);
          setChecking(false);
        } else {
          setLinkError('This reset link is invalid or has expired. Please request a new one.');
          setChecking(false);
        }
      });
      return;
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') markReady();
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady();
    });

    const timeout = setTimeout(() => {
      if (readyRef.current) return;
      setChecking(false);
      {
        setLinkError('This reset link is invalid or has expired. Please request a new one.');
      }
    }, 3000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    supabase.auth.getSession().then(({ data }) => setResetEmail(data.session?.user?.email || ''));
  }, [ready]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLock.current) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast({ title: 'Password too short', description: `Use at least ${MIN_PASSWORD_LENGTH} characters.`, variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', description: 'Please re-enter the same password in both fields.', variant: 'destructive' });
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    submitLock.current = false;

    if (error) {
      toast({ title: 'Could not update password', description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.auth.signOut();
    setDone(true);
    toast({ title: 'Password updated', description: 'Sign in with your new password.' });
    if (resetEmail) await savePasswordCredential(resetEmail, password);
    setTimeout(() => navigate('/login'), 1500);
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
            Your password has been changed. Sign in with your new password on the website or in the Axis app.
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
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
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
          At least {MIN_PASSWORD_LENGTH} characters. Enter a new password for your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="email" name="email" autoComplete="username" value={resetEmail} readOnly hidden />
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!ready || loading || submitting}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <PasswordInput
              id="confirm"
              placeholder="Re-enter your new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={!ready || loading || submitting}
              required
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={!ready || loading || submitting}>
            {submitting ? 'Updating…' : ready ? 'Update password' : 'Checking link…'}
          </Button>
        </form>
      </div>
    </div>
  );
}
