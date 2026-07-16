import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import logoImg from '@/assets/logo.png';
import heroBg from '@/assets/hero-bg.jpg';
import { Mail, Lock } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-6 py-12 bg-background max-w-[560px] overflow-y-auto">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <img src={logoImg} alt="Afodabo Housing" className="h-11 w-11 rounded-xl" />
            <div>
              <div className="font-display font-bold text-lg text-primary leading-tight">Afodabo Housing</div>
              <div className="text-muted-foreground text-xs">Uganda's Housing Platform</div>
            </div>
          </Link>

          <h1 className="text-3xl font-display font-bold text-foreground mb-1.5">Registration is invite-only</h1>
          <p className="text-muted-foreground mb-6">
            New accounts can only be created through an invitation from a property manager or administrator.
          </p>

          <div className="bg-secondary rounded-2xl p-6 mb-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Received an invitation?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check your email for a link from your property manager or admin. Click the link to set up your account.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Already have an account?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sign in below to access your dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button onClick={() => navigate('/login')} className="w-full gradient-primary text-primary-foreground h-12 text-base font-semibold">
              Sign In
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full h-11">
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative z-10 flex flex-col justify-end p-14 text-primary-foreground">
          <div className="max-w-sm">
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Uganda's #1 Housing App</p>
            <h2 className="font-display text-5xl font-bold mb-4 leading-tight">Registration is by Invitation Only</h2>
            <p className="text-primary-foreground/80 text-lg leading-relaxed">
              Afodabo Housing uses an invite-only system to ensure all tenants and managers are verified. If you need access, please contact your property manager.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
