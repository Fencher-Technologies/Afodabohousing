import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import AgreementFlowCard from '@/components/AgreementFlowCard';
import {
  Home, MapPin, Phone, MessageCircle, Wallet,
  ChevronRight, ArrowLeft, Building2, User, Mail,
  CalendarDays, AlertTriangle
} from 'lucide-react';

function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysBetween(from: string, to: string): number {
  const start = new Date(from);
  const end = new Date(to);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function getHealth(daysLeft: number): { label: string; color: string; barColor: string } {
  if (daysLeft > 60) return { label: 'Good', color: 'text-success', barColor: 'bg-success' };
  if (daysLeft > 14) return { label: 'Expiring', color: 'text-gold', barColor: 'bg-gold' };
  return { label: 'Critical', color: 'text-destructive', barColor: 'bg-destructive' };
}

export default function TenantMyTenancy() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tenantRecord, setTenantRecord] = useState<any>(null);
  const [lease, setLease] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, first_name, last_name')
      .eq('user_id', user.id)
      .maybeSingle();

    setTenantRecord(tenant);

    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setProfile(p);

    if (tenant?.id) {
      const { data: leases } = await supabase
        .from('leases')
        .select('*, properties(*)')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      const activeLease = leases?.find((l: any) => l.status === 'active') ?? leases?.[0] ?? null;
      setLease(activeLease);

      const { data: pays } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });
      setPayments(pays || []);
    }

    setLoading(false);
  };

  const property = lease?.properties;

  const daysLeft = lease ? daysBetween(new Date().toISOString(), lease.end_date) : 0;
  const isOverdue = daysLeft < 0;
  const health = getHealth(daysLeft);

  const monthRent = lease?.monthly_rent || property?.monthly_rent || property?.rent_amount || 0;
  const totalPaid = payments
    .filter((p: any) => p.status === 'confirmed')
    .reduce((s: number, p: any) => s + p.amount, 0);
  const balanceDue = Math.max(0, monthRent - totalPaid);
  const hasBalance = balanceDue > 0;
  const credit = Math.max(0, totalPaid - monthRent);
  const hasCredit = credit > 0;

  const leaseMonths = lease
    ? Math.max(1, Math.ceil(daysBetween(lease.start_date, lease.end_date) / 30))
    : 1;
  const paidMonths = payments.filter((p: any) => p.status === 'confirmed').length;
  const payPct = Math.min(100, Math.round((paidMonths / leaseMonths) * 100));

  const managerName = property?.manager_name || 'Property Manager';
  const managerPhone = property?.manager_phone || '';
  const managerEmail = property?.manager_email || '';
  const tenantName = profile?.full_name || tenantRecord?.first_name || user?.user_metadata?.full_name || '';
  const tenantPhone = profile?.phone || user?.phone || '';
  const tenantEmail = user?.email || '';

  const statusLabel = lease?.status === 'active' ? 'Active'
    : lease?.status === 'expired' ? 'Expired'
    : lease?.status || 'Unknown';

  const statusVariant = lease?.status === 'active' ? 'default'
    : lease?.status === 'expired' ? 'destructive'
    : 'secondary' as 'default' | 'destructive' | 'secondary';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-lg font-bold">My Tenancy</h1>
          </div>
        </header>
        <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-5">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!lease && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-lg font-bold">My Tenancy</h1>
          </div>
        </header>
        <div className="max-w-4xl mx-auto p-4 lg:p-6">
          <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
            <Building2 className="h-20 w-20 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold">No active tenancy</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              You don't have an active tenancy right now. Browse available homes to find your next place.
            </p>
            <Button className="mt-6 gap-2" onClick={() => navigate('/dashboard/tenant/browse')}>
              <Home className="h-4 w-4" /> Browse Homes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-lg font-bold">My Tenancy</h1>
          </div>
          <Badge variant={statusVariant} className="text-xs">{statusLabel}</Badge>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-5 animate-fade-in">
        {/* Property Card */}
        <Card className="overflow-hidden">
          {property?.images?.[0] && (
            <div className="relative h-48 sm:h-56 overflow-hidden">
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="p-5 space-y-4">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                {property?.title || 'Property'}
              </h2>
              {(property?.state || property?.area) && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {[property.state, property.area].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>

            {/* Tenant Identity */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              {tenantName && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{tenantName}</span>
                </div>
              )}
              {tenantPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{tenantPhone}</span>
                </div>
              )}
              {tenantEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{tenantEmail}</span>
                </div>
              )}
            </div>

            {/* Tenancy Dates Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground font-medium">Rent</p>
                <p className="text-sm font-bold text-foreground mt-1">
                  {formatUGX(monthRent)}<span className="text-xs font-normal text-muted-foreground">/{lease?.rent_period === 'quarterly' ? 'qtr' : lease?.rent_period === 'annually' ? 'yr' : 'mo'}</span>
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground font-medium">Started</p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {formatDate(lease?.start_date)}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground font-medium">Ends</p>
                <p className="text-sm font-semibold text-foreground mt-1">
                  {formatDate(lease?.end_date)}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground font-medium">Days Left</p>
                <p className={`text-sm font-bold mt-1 ${isOverdue ? 'text-destructive' : 'text-foreground'}`}>
                  {isOverdue ? `${Math.abs(daysLeft)} overdue` : `${daysLeft} days`}
                </p>
              </div>
            </div>

            {/* Health Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${health.color}`}>{health.label}</span>
                <span className={`text-xs font-medium ${health.color}`}>
                  {isOverdue
                    ? `${Math.abs(daysLeft)} days over`
                    : `${daysLeft} days left`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${health.barColor}`}
                  style={{ width: `${Math.max(2, Math.min(100, (daysLeft / 365) * 100))}%` }}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="default"
                size="sm"
                className="flex-1 gap-2"
                disabled={!managerPhone}
                onClick={() => {
                  if (!managerPhone) return;
                  const clean = managerPhone.replace(/[^0-9]/g, '');
                  window.open(`https://wa.me/${clean}?text=Hello%2C%20I'm%20${encodeURIComponent(tenantName || 'a tenant')}%20from%20${encodeURIComponent(property?.title || '')}.%20I%20have%20a%20question%20about%20my%20tenancy.`, '_blank');
                }}
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => navigate('/dashboard/tenant/payments/submit')}
              >
                <Wallet className="h-4 w-4" /> Submit Payment
              </Button>
            </div>
          </div>
        </Card>

        {/* Rent Summary */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display font-bold">Rent Summary</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground font-medium">Expected Rent</p>
              <p className="text-lg font-bold amount text-foreground mt-1">{formatUGX(monthRent)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground font-medium">Total Paid</p>
              <p className="text-lg font-bold amount text-success mt-1">{formatUGX(totalPaid)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground font-medium">Balance Due</p>
              <p className={`text-lg font-bold amount mt-1 ${hasBalance ? 'text-destructive' : 'text-success'}`}>
                {formatUGX(balanceDue)}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground font-medium">Status</p>
              <Badge variant={statusVariant} className="mt-1 text-xs">{statusLabel}</Badge>
            </div>
          </div>

          {/* Payment progress */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Payment progress</span>
              <span className="text-xs font-semibold">{paidMonths} of {leaseMonths} months</span>
            </div>
            <Progress value={payPct} className="h-2" />
          </div>

          {hasBalance && (
            <div className="mt-4 bg-destructive/5 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive font-medium">Outstanding balance due</p>
            </div>
          )}

          {hasCredit && (
            <div className="mt-4 bg-gold/5 border border-gold/20 rounded-lg p-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gold">Credit balance</p>
              <p className="text-sm font-bold text-gold">{formatUGX(credit)}</p>
            </div>
          )}
          {!hasBalance && !hasCredit && totalPaid > 0 && (
            <div className="mt-4 bg-success/5 border border-success/20 rounded-lg p-3 text-center">
              <p className="text-sm font-semibold text-success">All caught up!</p>
            </div>
          )}
        </Card>

        {/* Payment History Link */}
        <button
          onClick={() => navigate(`/dashboard/tenant/payments`)}
          className="w-full bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Payment History</p>
              <p className="text-xs text-muted-foreground">View all your payments</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Agreement Flow Card */}
        {lease && (
          <AgreementFlowCard leaseId={lease.id} />
        )}

        {/* Manager Contact */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display font-bold">Your Manager</h3>
          </div>
          <p className="font-semibold text-foreground">{managerName}</p>

          <div className="mt-3 space-y-2">
            {managerPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{managerPhone}</span>
              </div>
            )}
            {managerEmail && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{managerEmail}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              disabled={!managerPhone}
              onClick={() => {
                if (!managerPhone) return;
                const clean = managerPhone.replace(/[^0-9+]/g, '');
                window.location.href = `tel:${clean}`;
              }}
            >
              <Phone className="h-4 w-4" /> Call
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1 gap-2"
              disabled={!managerPhone}
              onClick={() => {
                if (!managerPhone) return;
                const clean = managerPhone.replace(/[^0-9]/g, '');
                window.open(`https://wa.me/${clean}?text=Hello%2C%20I'm%20${encodeURIComponent(tenantName || 'a tenant')}%20from%20${encodeURIComponent(property?.title || '')}.%20I%20have%20a%20question%20about%20my%20tenancy.`, '_blank');
              }}
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
          </div>
        </Card>

        <div className="h-8" />
      </div>
    </div>
  );
}
