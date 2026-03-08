import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Home, Clock, DollarSign, Bell, FileText, Search } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

type Tenancy = Database['public']['Tables']['tenancies']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

export default function TenantDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [tenRes, payRes] = await Promise.all([
      supabase.from('tenancies').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('tenant_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]);
    if (tenRes.data) setTenancies(tenRes.data);
    if (payRes.data) setPayments(payRes.data);
    setLoading(false);
  };

  const activeTenancy = tenancies.find(t => t.status === 'active');
  const daysLeft = activeTenancy
    ? differenceInDays(new Date(activeTenancy.rent_end_date), new Date())
    : null;
  const isRentDueSoon = daysLeft !== null && daysLeft <= 14;

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    uploaded: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Tenant Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your rental and payments</p>
        </div>

        {/* Rent Due Alert */}
        {isRentDueSoon && daysLeft !== null && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Bell className="h-5 w-5 text-accent shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Rent Due Soon!</p>
              <p className="text-sm text-muted-foreground">
                Your rent expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> on{' '}
                {activeTenancy ? format(new Date(activeTenancy.rent_end_date), 'MMM dd, yyyy') : ''}.
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <Search className="h-5 w-5" />, label: 'Find Property', action: () => navigate('/properties') },
            { icon: <FileText className="h-5 w-5" />, label: 'My Agreement', action: () => {} },
            { icon: <DollarSign className="h-5 w-5" />, label: 'Pay Rent', action: () => {} },
            { icon: <Bell className="h-5 w-5" />, label: 'Reminders', action: () => {} },
          ].map(a => (
            <button
              key={a.label}
              onClick={a.action}
              className="bg-card border border-border rounded-xl p-5 text-center hover:shadow-md hover:border-primary/50 transition-all group"
            >
              <div className="text-primary group-hover:text-accent mx-auto mb-2 flex justify-center transition-colors">{a.icon}</div>
              <div className="text-sm font-medium text-foreground">{a.label}</div>
            </button>
          ))}
        </div>

        {/* Active Tenancy */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Home className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold text-lg">Current Tenancy</h2>
            </div>
            {loading ? (
              <div className="space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
              </div>
            ) : activeTenancy ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-primary font-semibold capitalize">{activeTenancy.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rent Amount</span>
                  <span className="font-semibold">UGX {activeTenancy.rent_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date</span>
                  <span>{format(new Date(activeTenancy.rent_start_date), 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Date</span>
                  <span className={isRentDueSoon ? 'text-accent font-semibold' : ''}>
                    {format(new Date(activeTenancy.rent_end_date), 'MMM dd, yyyy')}
                  </span>
                </div>
                {daysLeft !== null && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className={`text-sm font-medium ${isRentDueSoon ? 'text-accent' : 'text-foreground'}`}>
                        {daysLeft >= 0 ? `${daysLeft} days remaining` : 'Rent period expired'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Home className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No active tenancy</p>
                <Button size="sm" className="mt-3 gradient-primary text-primary-foreground" onClick={() => navigate('/properties')}>
                  Find a Home
                </Button>
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <h2 className="font-display font-semibold text-lg">Recent Payments</h2>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
              </div>
            ) : payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">UGX {p.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(p.created_at), 'MMM dd, yyyy')}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[p.status] || ''}`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No payments yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Browse properties CTA */}
        <div className="bg-primary rounded-2xl p-8 text-center">
          <h3 className="font-display text-2xl font-bold text-primary-foreground mb-2">
            Looking for a new home?
          </h3>
          <p className="text-primary-foreground/80 mb-5">Browse verified properties across all Ugandan districts.</p>
          <Button
            variant="secondary"
            className="bg-gold text-gold-foreground hover:bg-gold/90 font-semibold px-8"
            onClick={() => navigate('/properties')}
          >
            Browse Properties
          </Button>
        </div>
      </div>
    </div>
  );
}
