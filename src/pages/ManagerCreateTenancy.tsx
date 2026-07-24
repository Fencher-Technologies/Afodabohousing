import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, User, Home, CalendarDays, DollarSign } from 'lucide-react';

export default function ManagerCreateTenancy() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    property_id: '',
    tenant_id: '',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    rent_deposit: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    const [propRes, tenRes] = await Promise.all([
      supabase.from('properties').select('*').eq('owner_id', user.id).eq('status', 'available'),
      supabase.from('tenants').select('*').eq('owner_id', user.id),
    ]);
    setProperties(propRes.data || []);
    setTenants(tenRes.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.property_id || !form.tenant_id || !form.start_date || !form.end_date || !form.monthly_rent) {
      toast({ title: 'Missing fields', description: 'Property, Tenant, Start Date, End Date, and Rent are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('leases').insert({
      property_id: form.property_id,
      tenant_id: form.tenant_id,
      owner_id: user.id,
      start_date: form.start_date,
      end_date: form.end_date,
      monthly_rent: parseFloat(form.monthly_rent),
      rent_deposit: form.rent_deposit ? parseFloat(form.rent_deposit) : null,
      status: 'active',
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Tenancy created successfully' });
    navigate('/dashboard/manager/tenancies');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/manager/tenancies')} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">New Tenancy</h1>
            <p className="text-sm text-muted-foreground">Create a new lease agreement</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Tenant
            </h2>
            <div>
              <p className="text-sm font-semibold mb-2">Select Tenant</p>
              <select value={form.tenant_id} onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required>
                <option value="">Choose a tenant...</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name} - {t.phone || 'No phone'}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" /> Property
            </h2>
            <div>
              <p className="text-sm font-semibold mb-2">Select Property</p>
              <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required>
                <option value="">Choose a property...</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title} - {p.state}</option>
                ))}
              </select>
              {properties.length === 0 && (
                <p className="text-xs text-destructive mt-1">No available properties. <button type="button" onClick={() => navigate('/dashboard/manager')}
                  className="text-primary underline">Add one in your dashboard.</button></p>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" /> Lease Period
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold mb-2">Start Date</p>
                <Input type="date" value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  required className="rounded-lg h-11" />
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">End Date</p>
                <Input type="date" value={form.end_date}
                  onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  required className="rounded-lg h-11" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="font-bold text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Rent Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold mb-2">Monthly Rent (UGX)</p>
                <Input type="number" min="0" value={form.monthly_rent}
                  onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))}
                  required placeholder="e.g. 500000" className="rounded-lg h-11" />
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">Deposit (UGX, optional)</p>
                <Input type="number" min="0" value={form.rent_deposit}
                  onChange={e => setForm(f => ({ ...f, rent_deposit: e.target.value }))}
                  placeholder="e.g. 500000" className="rounded-lg h-11" />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 rounded-lg h-12"
              onClick={() => navigate('/dashboard/manager/tenancies')}>Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 rounded-lg h-12 font-bold gap-2">
              <Save className="h-4 w-4" /> {saving ? 'Creating...' : 'Create Tenancy'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
