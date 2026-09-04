import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Phone, Mail, MessageCircle, TrendingUp, FileText,
  Home, CalendarDays, DollarSign, Wallet, User, ChevronRight,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

/* ── helpers (inline, same pattern as TenantDashboard/Account) ── */
function initBg(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  const hues = [14, 182, 200, 340, 48, 260, 30];
  return `hsl(${hues[Math.abs(h) % hues.length]}, 50%, 45%)`;
}

import { formatCurrency } from '@/utils/currency';

function initials(name: string, email: string) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  }
  return email.charAt(0).toUpperCase();
}

/* ── health helpers ── */
type HealthTone = 'good' | 'warn' | 'bad';

function computeHealth(endDate: string, overdue: boolean): HealthTone {
  const days = differenceInDays(new Date(endDate), new Date());
  if (overdue || days < 0) return 'bad';
  if (days <= 30) return 'warn';
  return 'good';
}

const healthLabel: Record<HealthTone, string> = {
  good: 'Good',
  warn: 'Ending soon',
  bad: 'Overdue',
};

const healthBadgeClass: Record<HealthTone, string> = {
  good: 'bg-muted text-success border-success/20',
  warn: 'bg-muted text-accent border-accent/20',
  bad: 'bg-muted text-destructive border-destructive/20',
};

const healthBorderClass: Record<HealthTone, string> = {
  good: 'border-l-success',
  warn: 'border-l-accent',
  bad: 'border-l-destructive',
};

/* ─────────────────────────────────────────── */
export default function ManagerTenantDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tenant, setTenant] = useState<any>(null);
  const [activeLease, setActiveLease] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (id) fetchData();
  }, [user, authLoading, id]);

  const fetchData = async () => {
    if (!user || !id) return;
    setLoading(true);

    // 1. Tenant info
    const { data: t, error: terr } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (terr || !t) {
      toast({ title: 'Error', description: 'Tenant not found', variant: 'destructive' });
      navigate('/dashboard/manager/tenants');
      return;
    }
    setTenant(t);

    // 2. Active leases for this tenant (non-terminated)
    const { data: leases } = await supabase
      .from('leases')
      .select('*, properties(*)')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false });

    const active = (leases ?? []).find(
      (l: any) => l.status !== 'terminated' && l.status !== 'inactive'
    );
    setActiveLease(active ?? null);

    // 3. Payments
    const { data: pays } = await supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false });
    setPayments(pays || []);

    setLoading(false);
  };

  /* ── derived values ── */
  const displayName = tenant
    ? `${tenant.first_name ?? ''} ${tenant.last_name ?? ''}`.trim() || tenant.email || 'Tenant'
    : '';
  const displayPhone = tenant?.phone ?? null;
  const displayEmail = tenant?.email ?? null;

  const totalPaid = payments
    .filter((p: any) => p.status === 'confirmed')
    .reduce((s: number, p: any) => s + Number(p.amount), 0);

  const leaseProp = activeLease?.properties ?? {};
  const propertyCurrency = leaseProp.rent_currency || activeLease?.rent_currency || 'UGX';
  const balanceDue = Math.max(0, (activeLease?.monthly_rent ?? 0) - totalPaid);
  const daysLeft = activeLease ? differenceInDays(new Date(activeLease.end_date), new Date()) : null;
  const isOverdue = balanceDue > 0 && (daysLeft !== null && daysLeft < 0);
  const health: HealthTone = activeLease
    ? computeHealth(activeLease.end_date, isOverdue)
    : 'bad';

  /* ── handlers ── */
  const handleWhatsApp = () => {
    if (!displayPhone) return;
    const cleaned = displayPhone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Hello ${displayName},`);
    window.open(`https://wa.me/${cleaned}?text=${msg}`, '_blank');
  };

  const handleSendReminder = () => {
    if (!displayPhone) return;
    const cleaned = displayPhone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `Dear ${displayName}, this is a friendly reminder that your rent payment is due. Please make your payment promptly to avoid any inconvenience. Thank you.`
    );
    window.open(`https://wa.me/${cleaned}?text=${msg}`, '_blank');
  };

  const handleViewTenancy = () => {
    if (activeLease) navigate(`/dashboard/manager/tenancies/${activeLease.id}`);
  };

  /* ── loading ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!tenant) return null;

  /* ───────────────────────────── RENDER ───────────────────────────── */
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/manager/tenants')}
            className="p-0 h-9 w-9 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-sm"
              style={{ backgroundColor: initBg(tenant.id ?? tenant.email ?? '') }}
            >
              {initials(displayName, tenant.email ?? '')}
            </div>
            <div>
              <h1 className="text-xl font-bold">{displayName}</h1>
              <p className="text-sm text-muted-foreground">Tenant profile</p>
            </div>
          </div>
        </div>

        {/* ── Contact Card ── */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="grid sm:grid-cols-2 gap-4">
            {displayPhone && (
              <a
                href={`https://wa.me/${displayPhone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/30 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-semibold">{displayPhone}</p>
                </div>
              </a>
            )}
            {displayEmail && (
              <a
                href={`mailto:${displayEmail}`}
                className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/30 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-semibold break-all">{displayEmail}</p>
                </div>
              </a>
            )}
          </div>
        </div>

        {/* ── Active Tenancy ── */}
        {activeLease ? (
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5">
            {/* header + badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-base truncate">{leaseProp.title ?? 'Unknown Property'}</p>
                  {activeLease.unit_label && (
                    <p className="text-sm text-muted-foreground">Unit {activeLease.unit_label}</p>
                  )}
                </div>
              </div>
              <Badge className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${healthBadgeClass[health]}`}>
                {healthLabel[health]}
              </Badge>
            </div>

            {/* rent + period */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold amount">{formatCurrency(activeLease.monthly_rent ?? 0, propertyCurrency)}</span>
              <span className="text-sm text-muted-foreground capitalize">
                / {activeLease.rent_period ?? 'monthly'}
              </span>
            </div>

            {/* Health progress card */}
            <div className={`rounded-xl border-l-4 p-4 bg-muted/30 ${healthBorderClass[health]}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm capitalize">
                  {health === 'good' ? 'Paid up' : isOverdue ? 'Overdue' : 'Balance due'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {daysLeft !== null
                    ? daysLeft >= 0
                      ? `${daysLeft} days left`
                      : `${-daysLeft} days over`
                    : 'No end date'}
                </span>
              </div>
              {/* progress bar */}
              {activeLease.start_date && activeLease.end_date && (
                <div className="mt-3 h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.round(
                        ((Date.now() - new Date(activeLease.start_date).getTime()) /
                          (new Date(activeLease.end_date).getTime() - new Date(activeLease.start_date).getTime())) * 100
                      ))}%`,
                      backgroundColor:
                        health === 'bad'
                          ? 'hsl(var(--destructive))'
                          : health === 'warn'
                          ? 'hsl(var(--warning))'
                          : 'hsl(var(--success))',
                    }}
                  />
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Balance: <span className={balanceDue > 0 ? 'text-destructive font-bold' : 'text-success font-bold'}>
                  {formatCurrency(balanceDue, propertyCurrency)}
                </span>
                {' · '}Total paid: <span className="font-semibold">{formatCurrency(totalPaid, propertyCurrency)}</span>
              </p>
            </div>

            {/* stat boxes */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Expected</p>
                <p className="font-bold amount">{formatCurrency(activeLease.monthly_rent ?? 0, propertyCurrency)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Paid</p>
                <p className="font-bold amount text-success">{formatCurrency(totalPaid, propertyCurrency)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Balance</p>
                <p className={`font-bold amount ${balanceDue > 0 ? 'text-destructive' : 'text-success'}`}>
                  {balanceDue > 0 ? formatCurrency(balanceDue, propertyCurrency) : 'Cleared'}
                </p>
              </div>
            </div>

            {/* dates */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Started {activeLease.start_date ? format(new Date(activeLease.start_date), 'MMM dd, yyyy') : '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                Ends {activeLease.end_date ? format(new Date(activeLease.end_date), 'MMM dd, yyyy') : '—'}
              </span>
            </div>
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="bg-card border border-border rounded-xl p-8 shadow-sm text-center">
            <User className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No active tenancy linked to this tenant yet.</p>
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleWhatsApp}
            disabled={!displayPhone}
            className="flex flex-col items-center gap-2 bg-card border border-border rounded-xl p-4 hover:border-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-semibold">WhatsApp</span>
          </button>
          <button
            onClick={handleSendReminder}
            disabled={!displayPhone || !activeLease}
            className="flex flex-col items-center gap-2 bg-card border border-border rounded-xl p-4 hover:border-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <span className="text-xs font-semibold">Remind</span>
          </button>
          <button
            onClick={handleViewTenancy}
            disabled={!activeLease}
            className="flex flex-col items-center gap-2 bg-card border border-border rounded-xl p-4 hover:border-border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-semibold">Tenancy</span>
          </button>
        </div>

        {/* ── Payment History ── */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Payment History
              <span className="text-muted-foreground font-normal">({payments.length})</span>
            </h2>
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No payments recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Method</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pay: any) => (
                    <tr
                      key={pay.id}
                      onClick={() => navigate(`/dashboard/manager/payments/${pay.id}`)}
                      className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        {pay.paid_date
                          ? format(new Date(pay.paid_date), 'MMM dd, yyyy')
                          : pay.created_at
                          ? format(new Date(pay.created_at), 'MMM dd, yyyy')
                          : '—'}
                      </td>
                      <td className="py-3 px-4 font-bold amount whitespace-nowrap">
                        {formatCurrency(pay.amount ?? 0, propertyCurrency)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground capitalize whitespace-nowrap">
                        {(pay.payment_method ?? pay.method ?? '—').replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            pay.status === 'confirmed'
                              ? 'bg-muted text-success border-success/20'
                              : pay.status === 'rejected'
                              ? 'bg-muted text-destructive border-destructive/20'
                              : pay.status === 'uploaded'
                              ? 'bg-muted text-primary border-border'
                              : 'bg-muted text-accent border-accent/20'
                          }`}
                        >
                          {pay.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
