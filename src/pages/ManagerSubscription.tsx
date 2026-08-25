import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Crown, Check, Loader2, ShieldCheck, ExternalLink, XCircle } from 'lucide-react';
import { listPlans, getCurrentSubscription, createSubscription, SubscriptionPlan } from '@/services/subscriptions';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

type Step = 'plans' | 'success' | 'failed';

export default function ManagerSubscription() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('plans');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [currency, setCurrency] = useState<'UGX' | 'USD'>('UGX');
  const [activating, setActivating] = useState(false);
  const calledRef = useRef(false);

  const doRedirect = (url: string) => {
    if (calledRef.current) return;
    calledRef.current = true;
    window.location.href = url;
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      const [p, c] = await Promise.all([
        listPlans(),
        getCurrentSubscription().catch(() => null),
      ]);
      setPlans(p);
      setCurrentSub(c);
    } catch (e: any) {
      console.error('Failed to load subscription data:', e);
    }
    setLoading(false);
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setStep('plans');
  };

  const handlePay = async () => {
    if (!selectedPlan) return;
    setActivating(true);
    try {
      const result = await createSubscription(selectedPlan.id, undefined, window.location.origin, currency);
      if (result.redirect_url) doRedirect(result.redirect_url);
    } catch (err: any) {
      toast({ title: 'Payment failed', description: err.message || 'Could not initiate payment', variant: 'destructive' });
      setStep('failed');
    }
    setActivating(false);
  };

  const daysLeft = currentSub?.days_remaining ?? 0;
  const isActive = currentSub?.status === 'active';
  const dashboardRoute = role === 'super_admin' ? '/dashboard/super-admin' : '/dashboard/manager';

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => step === 'plans' ? navigate(-1) : setStep('plans')} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Subscription</h1>
            <p className="text-sm text-muted-foreground">Manage your subscription plan</p>
          </div>
        </div>

        {step === 'success' && (
          <div className="text-center py-12 space-y-4">
            <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <Crown className="h-12 w-12 text-success" />
            </div>
            <h2 className="text-xl font-bold">Payment Successful!</h2>
            <p className="text-muted-foreground">Your {selectedPlan?.name} subscription is now active.</p>
            <p className="text-sm text-primary font-semibold">Redirecting to account...</p>
          </div>
        )}

        {step === 'failed' && (
          <div className="text-center py-12 space-y-4">
            <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">Payment Failed</h2>
            <p className="text-muted-foreground">Your payment could not be processed. Please try again.</p>
            <Button onClick={() => setStep('plans')} className="rounded-lg">Try Again</Button>
          </div>
        )}

        {step === 'plans' && (
          <>
            {currentSub && (
              <div className={`bg-card border-2 rounded-xl p-6 shadow-sm ${isActive ? 'border-success' : 'border-destructive'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                    <Crown className="h-6 w-6 text-gold" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Current Plan</p>
                    <p className="font-bold text-lg">{currentSub.plan_name || 'No plan'}</p>
                  </div>
                  <Badge className={isActive ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                    {isActive ? 'Active' : 'Expired'}
                  </Badge>
                </div>
                {isActive && (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Expires</p>
                        <p className="text-sm font-semibold">{currentSub.expires_at ? format(new Date(currentSub.expires_at), 'MMM dd, yyyy') : '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Days left</p>
                        <p className={`text-sm font-semibold ${daysLeft <= 14 ? 'text-destructive' : daysLeft <= 60 ? 'text-gold' : 'text-success'}`}>{daysLeft} days</p>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${daysLeft > 60 ? 'bg-success' : daysLeft > 14 ? 'bg-gold' : 'bg-destructive'}`}
                        style={{ width: `${Math.min(100, Math.round((daysLeft / 365) * 100))}%` }} />
                    </div>
                  </>
                )}
                {!isActive && (
                  <p className="text-sm text-destructive">Your subscription has expired. Renew to continue managing properties.</p>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <button onClick={() => setCurrency('UGX')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-colors ${currency === 'UGX' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}>UGX — Mobile Money</button>
              <button onClick={() => setCurrency('USD')} className={`flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-colors ${currency === 'USD' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'}`}>USD — Card (Virtual)</button>
            </div>
            <p className="text-xs text-center text-muted-foreground">Default is UGX. Pesapal accepts both — UGX for mobile money, USD for international/virtual cards.</p>

            {plans.filter(p => p.is_active).length === 0 ? (
              <div className="text-center py-16 bg-card border border-border rounded-xl">
                <Crown className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-lg font-bold">No plans available</h3>
                <p className="text-sm text-muted-foreground mt-1">Check back later.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="font-bold text-lg">{isActive ? 'Change Plan' : 'Choose Your Plan'}</h2>
                  <p className="text-sm text-muted-foreground">Unlock unlimited properties, payment recording, reports, and WhatsApp reminders.</p>
                </div>
                {plans.filter(p => p.is_active).sort((a, b) => a.sort_order - b.sort_order).map(plan => {
                  const isCurrent = currentSub?.plan_id === plan.id;
                  const isSelected = selectedPlan?.id === plan.id;
                  return (
                    <div key={plan.id}
                      className={`relative bg-card border-2 rounded-xl p-6 cursor-pointer transition-all hover:border-primary/50 ${
                        plan.popular && !isSelected ? 'border-gold' : isSelected ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => setSelectedPlan(plan)}>
                      {plan.popular && !isSelected && (
                        <div className="absolute -top-3 right-4 bg-gold text-gold-foreground text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                          <Crown className="h-3 w-3" /> POPULAR
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-lg">{plan.name}</h3>
                        {isCurrent && <Badge variant="outline" className="text-xs">Current</Badge>}
                      </div>
                      <p className="text-3xl font-bold text-primary">UGX {plan.price_ugx.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ {plan.duration_days} days</span></p>
                      {plan.benefits.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {plan.benefits.map((b, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-success shrink-0" />
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {selectedPlan && (
              <Button onClick={handlePay} disabled={activating} className="w-full h-12 rounded-xl font-bold text-base gap-2 bg-gold hover:bg-gold/90 text-gold-foreground">
                {activating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crown className="h-5 w-5" />}
                {activating ? 'Redirecting...' : `Pay UGX ${selectedPlan.price_ugx.toLocaleString()} via Pesapal`}
              </Button>
            )}

            <p className="text-xs text-muted-foreground text-center">Pay securely via Pesapal. Cards and mobile money accepted.</p>
          </>
        )}
      </div>
    </div>
  );
}
