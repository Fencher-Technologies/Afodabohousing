import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Home, CalendarDays, DollarSign, Save, Mail, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/services/api';

export interface TenancyFormData {
  property_id?: string;
  tenant_id?: string;
  tenant_email?: string;
  start_date: string;
  end_date: string;
  monthly_rent: string;
  rent_deposit: string;
  unit_label: string;
  status?: string;
}

interface Property { id: string; title: string; state?: string | null; monthly_rent?: number | null; rent_amount?: number | null; security_deposit?: number | null; }
interface Tenant { id: string; first_name: string; last_name: string; email?: string | null; phone?: string | null; }

interface Props {
  mode: 'create' | 'edit';
  initialData?: Partial<TenancyFormData>;
  onSave: (data: TenancyFormData) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  properties?: Property[];
  tenants?: Tenant[];
}

export default function TenancyForm({ mode, initialData, onSave, onCancel, saving, properties = [] }: Props) {
  const { toast } = useToast();
  const [resolving, setResolving] = useState(false);
  const [resolvedTenant, setResolvedTenant] = useState<Tenant | null>(null);
  const [tenantEmail, setTenantEmail] = useState(initialData?.tenant_email || '');

  const [form, setForm] = useState<TenancyFormData>({
    property_id: '', tenant_id: '', tenant_email: '', start_date: '',
    end_date: '', monthly_rent: '', rent_deposit: '', unit_label: '', status: 'active',
    ...initialData,
  });

  const handleResolveTenant = async () => {
    if (!tenantEmail.trim()) return;
    setResolving(true);
    setResolvedTenant(null);
    try {
      const tenant = await apiGet<Tenant>(`/tenants/resolve-by-email?email=${encodeURIComponent(tenantEmail.trim())}`);
      setResolvedTenant(tenant);
      setForm(f => ({ ...f, tenant_id: tenant.id, tenant_email: tenantEmail.trim() }));
      toast({ title: 'Tenant found', description: `${tenant.first_name} ${tenant.last_name}` });
    } catch (e: any) {
      const msg = e.message || 'Tenant not found';
      if (msg.includes('404') || msg.toLowerCase().includes('no registered user')) {
        toast({ title: 'Tenant not found', description: 'No registered user matched that email', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: msg, variant: 'destructive' });
      }
    }
    setResolving(false);
  };

  const handleSelectProperty = (id: string) => {
    setForm(f => ({ ...f, property_id: id }));
    const prop = properties.find(p => p.id === id);
    if (prop) {
      const rent = prop.monthly_rent || prop.rent_amount || 0;
      setForm(f => ({
        ...f,
        property_id: id,
        monthly_rent: rent ? String(rent) : f.monthly_rent,
        rent_deposit: prop.security_deposit ? String(prop.security_deposit) : f.rent_deposit,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {mode === 'create' && (
        <>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="font-bold text-sm flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Tenant</h2>
            <div>
              <Label className="text-sm font-semibold">Tenant Email</Label>
              <div className="flex gap-2 mt-1.5">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={tenantEmail}
                    onChange={e => { setTenantEmail(e.target.value); setResolvedTenant(null); setForm(f => ({ ...f, tenant_id: '' })); }}
                    placeholder="tenant@example.com"
                    className="pl-9"
                    required
                  />
                </div>
                <Button type="button" variant="outline" onClick={handleResolveTenant} disabled={resolving || !tenantEmail.trim()}>
                  {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find'}
                </Button>
              </div>
              {resolvedTenant && (
                <p className="text-sm text-green-600 mt-2">
                  Found: {resolvedTenant.first_name} {resolvedTenant.last_name}
                  {resolvedTenant.phone ? ` (${resolvedTenant.phone})` : ''}
                </p>
              )}
              {!resolvedTenant && tenantEmail && !resolving && (
                <p className="text-xs text-muted-foreground mt-1.5">Enter the email of a registered user. They'll be auto-added as a tenant.</p>
              )}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="font-bold text-sm flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> Property</h2>
            <div>
              <Label className="text-sm font-semibold">Select Property</Label>
              <select value={form.property_id} onChange={e => handleSelectProperty(e.target.value)}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm mt-1.5" required>
                <option value="">Choose a property...</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title} - {p.state || 'N/A'}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-semibold">Unit Label (optional)</Label>
              <Input value={form.unit_label} onChange={e => setForm(f => ({ ...f, unit_label: e.target.value }))}
                placeholder="e.g. A1, Shop 1, Room 3" className="mt-1.5 rounded-lg h-11" />
            </div>
          </div>
        </>
      )}

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Lease Period</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-semibold">Start Date</Label>
            <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              required className="rounded-lg h-11 mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-semibold">End Date</Label>
            <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              required className="rounded-lg h-11 mt-1.5" />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Rent Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-semibold">Monthly Rent</Label>
            <Input type="number" min="0" value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))}
              required placeholder="e.g. 500000" className="rounded-lg h-11 mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-semibold">Deposit (optional)</Label>
            <Input type="number" min="0" value={form.rent_deposit} onChange={e => setForm(f => ({ ...f, rent_deposit: e.target.value }))}
              placeholder="e.g. 500000" className="rounded-lg h-11 mt-1.5" />
          </div>
        </div>
      </div>

      {mode === 'edit' && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <Label className="text-sm font-semibold">Status</Label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm mt-1.5">
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 rounded-lg h-12" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving || (mode === 'create' && !form.tenant_id)} className="flex-1 rounded-lg h-12 font-bold gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : mode === 'create' ? 'Create Tenancy' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
