import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Home, MapPin, DollarSign, Image } from 'lucide-react';

const DISTRICTS = ['Kampala', 'Wakiso', 'Mukono', 'Mbarara', 'Gulu', 'Jinja', 'Entebbe', 'Mbale', 'Lira', 'Arua', 'Fort Portal', 'Masaka', 'Kabale', 'Hoima', 'Kasese', 'Soroti', 'Tororo'];
const AMENITIES = ['Water', 'Electricity', 'WiFi', 'Parking', 'Security', 'Garden', 'Generator', 'DSTV', 'Borehole', 'Tiled Floors'];

export default function CreateProperty() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', property_type: 'Residential', state: '',
    area: '', address: '', bedrooms: 1, sitting_rooms: 1, kitchens: 1,
    bathrooms: 1, rent_amount: 0, rent_period: 'monthly',
    manager_phone: '', manager_email: '', amenities: [] as string[],
    images: [] as string[],
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (!['house_manager', 'super_admin'].includes(user.user_metadata?.role || '')) {
      supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (data?.role !== 'house_manager' && data?.role !== 'super_admin') navigate('/dashboard/tenant');
      });
    }
  }, [user, authLoading]);

  const toggleAmenity = (a: string) => {
    setForm(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('properties').insert({
      owner_id: user.id,
      title: form.title,
      description: form.description || null,
      property_type: form.property_type,
      state: form.state,
      area: form.area || null,
      address: form.address || null,
      bedrooms: form.bedrooms,
      sitting_rooms: form.sitting_rooms,
      kitchens: form.kitchens,
      bathrooms: form.bathrooms,
      rent_amount: form.rent_amount,
      rent_period: form.rent_period,
      manager_phone: form.manager_phone || null,
      manager_email: form.manager_email || null,
      amenities: form.amenities,
      images: form.images.length > 0 ? form.images : null,
      status: 'available',
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Property created!' });
    navigate('/dashboard/manager');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/manager')} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Add Property</h1>
            <p className="text-sm text-muted-foreground">List a new property for rent</p>
          </div>
        </div>

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
            <Button type="button" variant="outline" className="flex-1 rounded-lg h-12"
              onClick={() => navigate('/dashboard/manager')}>Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 rounded-lg h-12 font-bold gap-2">
              <Save className="h-4 w-4" /> {saving ? 'Creating...' : 'Create Property'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
