import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, User, Home, CalendarDays, DollarSign, Phone, Mail, FileText,
  Edit3, Ban, CheckCircle, XCircle, Clock, Share2, MapPin
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function ManagerTenancyDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lease, setLease] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (id) fetchData();
  }, [user, authLoading, id]);

  const fetchData = async () => {
    if (!user || !id) return;
    setLoading(true);
    const { data: l, error } = await supabase
      .from('leases')
      .select('*, properties(*), tenants(*)')
      .eq('id', id)
      .maybeSingle();
    if (error || !l) {
      toast({ title: 'Error', description: 'Tenancy not found', variant: 'destructive' });
      navigate('/dashboard/manager/tenancies');
      return;
    }
    setLease(l);

    if (l.tenant_id) {
      const { data: pays } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', l.tenant_id)
        .order('created_at', { ascending: false });
      setPayments(pays || []);
    }
    setLoading(false);
  };

  const handleDeactivate = async () => {
    if (!id) return;
    if (!confirm('Deactivate this tenancy? This will mark the lease as inactive.')) return;
    setDeactivating(true);
    const { error } = await supabase.from('leases').update({ status: 'inactive' }).eq('id', id);
    setDeactivating(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Tenancy deactivated' });
    fetchData();
  };

  const handleRenewalRequest = async () => {
    if (!id) return;
    const newEnd = prompt('Enter new end date (YYYY-MM-DD):');
    if (!newEnd) return;
    setDeactivating(true);
    const { error } = await supabase.from('leases').update({
      end_date: newEnd,
      status: 'active',
    }).eq('id', id);
    setDeactivating(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Lease renewed', description: `New end date: ${newEnd}` });
    fetchData();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!lease) return null;

  const t = lease.tenants || {};
  const p = lease.properties || {};
  const daysLeft = differenceInDays(new Date(lease.end_date), new Date());
  const isExpired = daysLeft < 0;
  const isEnding = daysLeft >= 0 && daysLeft <= 30;
  const totalPaid = payments.filter(pay => pay.status === 'confirmed').reduce((s: number, pay: any) => s + pay.amount, 0);
  const balance = Math.max(0, (lease.monthly_rent || 0) - totalPaid);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/manager/tenancies')} className="p-0 h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-xl">{t.first_name || ''} {t.last_name || ''}</h1>
              <p className="text-sm text-muted-foreground">{p.title || 'Unknown property'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {lease.status === 'active' && (
              <>
                <Button variant="outline" size="sm" onClick={handleRenewalRequest} disabled={deactivating}
                  className="gap-2 rounded-lg">
                  <Share2 className="h-4 w-4" /> Renew
                </Button>
                <Button variant="outline" size="sm" onClick={handleDeactivate} disabled={deactivating}
                  className="gap-2 rounded-lg border-destructive text-destructive hover:bg-destructive/10">
                  <Ban className="h-4 w-4" /> Deactivate
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/manager/tenancies/${id}/edit`)}
              className="gap-2 rounded-lg">
              <Edit3 className="h-4 w-4" /> Edit
            </Button>
          </div>
        </div>

        {/* Status card */}
        <div className={`rounded-xl p-5 border ${
          isExpired ? 'bg-destructive/5 border-destructive/20' :
          isEnding ? 'bg-accent/5 border-accent/20' :
          'bg-success/5 border-success/20'
        }`}>
          <div className="flex items-center gap-3">
            {isExpired ? <XCircle className="h-6 w-6 text-destructive" /> :
             isEnding ? <Clock className="h-6 w-6 text-accent" /> :
             <CheckCircle className="h-6 w-6 text-success" />}
            <div>
              <p className="font-bold">
                {isExpired ? 'Lease expired' : isEnding ? `Ending in ${daysLeft} days` : 'Lease active'}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(lease.start_date), 'MMM dd, yyyy')} - {format(new Date(lease.end_date), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Tenant info */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Tenant Details
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-semibold">{t.first_name || ''} {t.last_name || ''}</p>
                </div>
              </div>
              {t.phone && (
                <a href={`https://wa.me/${t.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 hover:bg-muted/30 rounded-lg p-1 -mx-1 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-semibold">{t.phone}</p>
                  </div>
                </a>
              )}
              {t.email && (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-semibold">{t.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Property info */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" /> Property Details
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Home className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Property</p>
                  <p className="text-sm font-semibold">{p.title || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-semibold">{p.state || ''}{p.area ? `, ${p.area}` : ''}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lease terms */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Lease Terms
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground">Monthly Rent</p>
              <p className="font-bold text-lg">UGX {(lease.monthly_rent || 0).toLocaleString()}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground">Deposit</p>
              <p className="font-bold text-lg">{lease.rent_deposit ? `UGX ${lease.rent_deposit.toLocaleString()}` : '—'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="font-bold text-lg text-success">UGX {totalPaid.toLocaleString()}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className={`font-bold text-lg ${balance > 0 ? 'text-gold' : 'text-success'}`}>
                {balance > 0 ? `UGX ${balance.toLocaleString()}` : 'Cleared'}
              </p>
            </div>
          </div>
        </div>

        {/* Payment history */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="font-bold text-sm mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Payment History
          </h2>
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
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(pay => (
                    <tr key={pay.id} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-3 px-4 font-medium capitalize">{pay.payment_type || 'Payment'}</td>
                      <td className="py-3 px-4 font-bold">UGX {(pay.amount || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {pay.created_at ? format(new Date(pay.created_at), 'MMM dd, yyyy') : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          pay.status === 'confirmed' ? 'bg-success/10 text-success border-success/20' :
                          pay.status === 'rejected' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          'bg-accent/10 text-accent border-accent/20'
                        }`}>{pay.status}</span>
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
