import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Crown, Check, X, Loader2 } from 'lucide-react';
import { listPlans, getCurrentSubscription, createSubscription, SubscriptionPlan } from '@/services/subscriptions';
import { format } from 'date-fns';

export default function TenantSubscription() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      const [p, c] = await Promise.all([
        listPlans(),
        getCurrentSubscription(),
      ]);
      setPlans(p);
      setCurrentSub(c);
    } catch {
      // Might not have subscription endpoints active; show empty state
    }
    setLoading(false);
  };

  const handleActivate = async (planId: string) => {
    setActivating(planId);
    try {
      const sub = await createSubscription(planId);
      setCurrentSub(sub);
      toast({ title: 'Subscription activated!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to activate subscription', variant: 'destructive' });
    }
    setActivating(null);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/tenant')} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Subscription</h1>
            <p className="text-sm text-muted-foreground">Manage your subscription plan</p>
          </div>
        </div>

        {currentSub && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Crown className="h-6 w-6 text-primary" />
              <div>
                <p className="font-bold text-lg">Current Plan</p>
                <p className="text-sm text-muted-foreground">
                  {currentSub.plan?.name || 'Active'} — Expires {currentSub.end_date ? format(new Date(currentSub.end_date), 'MMM dd, yyyy') : '—'}
                </p>
              </div>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              {currentSub.status}
            </Badge>
          </div>
        )}

        {plans.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Crown className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold">No subscription plans available</h3>
            <p className="text-sm text-muted-foreground mt-1">Check back later for available plans.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map(plan => {
              const isActive = currentSub?.plan_id === plan.id;
              return (
                <div key={plan.id} className={`bg-card border rounded-xl p-6 shadow-sm flex flex-col ${
                  isActive ? 'border-primary ring-1 ring-primary' : 'border-border'
                }`}>
                  <div className="mb-4">
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <p className="text-3xl font-bold mt-2">UGX {plan.price.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">/{plan.duration_days} days</p>
                  </div>
                  {plan.features && plan.features.length > 0 && (
                    <div className="flex-1 space-y-2 mb-6">
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-success shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button disabled={isActive || activating === plan.id}
                    onClick={() => handleActivate(plan.id)}
                    className={`w-full rounded-lg h-11 font-bold ${
                      isActive ? 'bg-muted text-muted-foreground cursor-default' : ''
                    }`}>
                    {activating === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isActive ? 'Current Plan' : 'Activate'}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
