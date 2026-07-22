import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Home, CalendarDays, DollarSign } from 'lucide-react';

export interface TenancyFormData {
  property_id?: string;
  tenant_id?: string;
  start_date: string;
  end_date: string;
  monthly_rent: string;
  rent_deposit: string;
  status?: string;
}

interface Property { id: string; title: string; state?: string | null; }
interface Tenant { id: string; first_name: string; last_name: string; phone?: string | null; }

interface Props {
  mode: 'create' | 'edit';
  initialData?: Partial<TenancyFormData>;
  onSave: (data: TenancyFormData) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
  properties?: Property[];
  tenants?: Tenant[];
}

export default function TenancyForm({ mode, initialData, onSave, onCancel, saving, properties = [], tenants = [] }: Props) {
  const [form, setForm] = useState<TenancyFormData>({
    property_id: '', tenant_id: '', start_date: '',
    end_date: '', monthly_rent: '', rent_deposit: '', status: 'active',
    ...initialData,
  });

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
              <p className="text-sm font-semibold mb-2">Select Tenant</p>
              <select value={form.tenant_id} onChange={e => setForm(f => ({ ...f, tenant_id: e.target.value }))}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm" required>
                <option value="">Choose a tenant...</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name} - {t.phone || 'No phone'}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="font-bold text-sm flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> Property</h2>
            <div>
              <p className="text-sm font-semibold mb-2">Select Property</p>
              <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
                className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm" required>
                <option value="">Choose a property...</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title} - {p.state || 'N/A'}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Lease Period</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2">Start Date</p>
            <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              required className="rounded-lg h-11" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">End Date</p>
            <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              required className="rounded-lg h-11" />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Rent Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2">Monthly Rent (UGX)</p>
            <Input type="number" min="0" value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))}
              required placeholder="e.g. 500000" className="rounded-lg h-11" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Deposit (UGX, optional)</p>
            <Input type="number" min="0" value={form.rent_deposit} onChange={e => setForm(f => ({ ...f, rent_deposit: e.target.value }))}
              placeholder="e.g. 500000" className="rounded-lg h-11" />
          </div>
        </div>
      </div>

      {mode === 'edit' && (
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <p className="text-sm font-semibold mb-2">Status</p>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 rounded-lg h-12" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving} className="flex-1 rounded-lg h-12 font-bold gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : mode === 'create' ? 'Create Tenancy' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
