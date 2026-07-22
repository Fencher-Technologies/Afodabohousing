import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Home, MapPin, DollarSign, Image } from 'lucide-react';

const DISTRICTS = ['Kampala', 'Wakiso', 'Mukono', 'Mbarara', 'Gulu', 'Jinja', 'Entebbe', 'Mbale', 'Lira', 'Arua', 'Fort Portal', 'Masaka', 'Kabale', 'Hoima', 'Kasese', 'Soroti', 'Tororo'];
const AMENITIES = ['Water', 'Electricity', 'WiFi', 'Parking', 'Security', 'Garden', 'Generator', 'DSTV', 'Borehole', 'Tiled Floors'];

export interface PropertyFormData {
  title: string; description: string; property_type: string; state: string;
  area: string; address: string; bedrooms: number; sitting_rooms: number;
  kitchens: number; bathrooms: number; rent_amount: number; rent_period: string;
  manager_phone: string; manager_email: string; amenities: string[];
}

interface Props {
  initialData?: Partial<PropertyFormData>;
  onSave: (data: PropertyFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  saving?: boolean;
}

export default function PropertyForm({ initialData, onSave, onCancel, submitLabel, saving }: Props) {
  const [form, setForm] = useState<PropertyFormData>({
    title: '', description: '', property_type: 'Residential', state: '',
    area: '', address: '', bedrooms: 1, sitting_rooms: 1, kitchens: 1,
    bathrooms: 1, rent_amount: 0, rent_period: 'monthly',
    manager_phone: '', manager_email: '', amenities: [],
    ...initialData,
  });

  const toggleAmenity = (a: string) => {
    setForm(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> Basic Info</h2>
        <div>
          <p className="text-sm font-semibold mb-2">Property Title</p>
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required placeholder="e.g. Spacious 3-Bedroom House in Ntinda" className="rounded-lg h-11" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2">Type</p>
            <select value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))}
              className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="Residential">Residential</option>
              <option value="Office Space">Office Space</option>
            </select>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Rent Period</p>
            <select value={form.rent_period} onChange={e => setForm(f => ({ ...f, rent_period: e.target.value }))}
              className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold mb-2">Description</p>
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3} placeholder="Describe the property, surroundings, access..." className="rounded-lg" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Location</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2">District</p>
            <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
              className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm" required>
              <option value="">Select district...</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Area / Neighbourhood</p>
            <Input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
              placeholder="e.g. Ntinda, Bukoto" className="rounded-lg h-11" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold mb-2">Full Address</p>
          <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            placeholder="Plot 45, Road name..." className="rounded-lg h-11" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> Rooms</h2>
        <div className="grid grid-cols-4 gap-4">
          {(['bedrooms', 'sitting_rooms', 'kitchens', 'bathrooms'] as const).map(field => (
            <div key={field}>
              <p className="text-sm font-semibold mb-2 capitalize">{field.replace('_', ' ')}</p>
              <Input type="number" min={0} value={form[field]} onChange={e => setForm(f2 => ({ ...f2, [field]: Number(e.target.value) }))}
                className="rounded-lg h-11" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Pricing</h2>
        <div>
          <p className="text-sm font-semibold mb-2">Rent Amount (UGX)</p>
          <Input type="number" min={0} value={form.rent_amount || ''} onChange={e => setForm(f => ({ ...f, rent_amount: Number(e.target.value) }))}
            required placeholder="e.g. 500000" className="rounded-lg h-11" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><Image className="h-4 w-4 text-primary" /> Amenities & Contact</h2>
        <div>
          <p className="text-sm font-semibold mb-2">Amenities</p>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map(a => (
              <button key={a} type="button" onClick={() => toggleAmenity(a)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${form.amenities.includes(a) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary'}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2">Contact Phone</p>
            <Input value={form.manager_phone} onChange={e => setForm(f => ({ ...f, manager_phone: e.target.value }))}
              placeholder="+256 788 100145" className="rounded-lg h-11" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Contact Email</p>
            <Input type="email" value={form.manager_email} onChange={e => setForm(f => ({ ...f, manager_email: e.target.value }))}
              placeholder="manager@example.com" className="rounded-lg h-11" />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 rounded-lg h-12" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving} className="flex-1 rounded-lg h-12 font-bold gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
