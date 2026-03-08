import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import Navbar from '@/components/Navbar';
import PropertyCard from '@/components/PropertyCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Home, Users, DollarSign, Building2, LogOut, CheckCircle, Clock } from 'lucide-react';

type Property = Database['public']['Tables']['properties']['Row'];
type Tenancy = Database['public']['Tables']['tenancies']['Row'];

const AMENITIES_LIST = ['Water', 'Electricity', 'WiFi', 'Parking', 'Security', 'Garden', 'Generator', 'DSTV'];

export default function ManagerDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'properties' | 'tenancies' | 'payments'>('properties');

  // New property form
  const [form, setForm] = useState({
    title: '', description: '', property_type: 'house', district: '', city: '',
    area: '', address: '', bedrooms: 1, sitting_rooms: 1, kitchens: 1, bathrooms: 1,
    rent_amount: 0, rent_period: 'monthly', manager_phone: '', manager_email: '',
    amenities: [] as string[],
  });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [propsRes, tenRes] = await Promise.all([
      supabase.from('properties').select('*').eq('manager_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tenancies').select('*').eq('manager_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (propsRes.data) setProperties(propsRes.data);
    if (tenRes.data) setTenancies(tenRes.data);
    setLoading(false);
  };

  const toggleAmenity = (a: string) => {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
    }));
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from('properties').insert({
      ...form,
      manager_id: user.id,
      rent_amount: Number(form.rent_amount),
      property_type: form.property_type as Database['public']['Enums']['property_type'],
      rent_period: form.rent_period as Database['public']['Enums']['rent_period'],
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Property added!', description: 'Your listing is now live.' });
      setDialogOpen(false);
      fetchData();
    }
  };

  const handleDeactivate = async (id: string) => {
    await supabase.from('properties').update({ status: 'inactive' }).eq('id', id);
    fetchData();
    toast({ title: 'Property deactivated' });
  };

  const occupied = properties.filter(p => p.status === 'occupied').length;
  const available = properties.filter(p => p.status === 'available').length;
  const activeTenancies = tenancies.filter(t => t.status === 'active').length;

  const stats = [
    { icon: <Building2 className="h-5 w-5" />, label: 'Total Properties', val: properties.length, color: 'text-primary' },
    { icon: <CheckCircle className="h-5 w-5" />, label: 'Available', val: available, color: 'text-green-600' },
    { icon: <Home className="h-5 w-5" />, label: 'Occupied', val: occupied, color: 'text-accent' },
    { icon: <Users className="h-5 w-5" />, label: 'Active Tenancies', val: activeTenancies, color: 'text-primary' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Manager Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your properties and tenants</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground gap-2">
                <Plus className="h-4 w-4" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Add New Property</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddProperty} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Title *</Label>
                    <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="e.g. 3-Bedroom House in Kampala" className="mt-1" />
                  </div>
                  <div>
                    <Label>Property Type *</Label>
                    <Select value={form.property_type} onValueChange={v => setForm({...form, property_type: v})}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="self_contained">Self-Contained</SelectItem>
                        <SelectItem value="room">Room</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="bungalow">Bungalow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>District *</Label>
                    <Input value={form.district} onChange={e => setForm({...form, district: e.target.value})} required placeholder="e.g. Kampala" className="mt-1" />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="e.g. Kampala" className="mt-1" />
                  </div>
                  <div>
                    <Label>Area/Neighborhood</Label>
                    <Input value={form.area} onChange={e => setForm({...form, area: e.target.value})} placeholder="e.g. Ntinda" className="mt-1" />
                  </div>
                  <div className="col-span-2">
                    <Label>Full Address</Label>
                    <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Plot 12, Block 3, Ntinda" className="mt-1" />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {['bedrooms', 'sitting_rooms', 'kitchens', 'bathrooms'].map(f => (
                    <div key={f}>
                      <Label className="capitalize text-xs">{f.replace('_', ' ')}</Label>
                      <Input type="number" min={0} value={(form as any)[f]} onChange={e => setForm({...form, [f]: Number(e.target.value)})} className="mt-1" />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Rent Amount (UGX) *</Label>
                    <Input type="number" min={0} value={form.rent_amount || ''} onChange={e => setForm({...form, rent_amount: Number(e.target.value)})} required placeholder="500000" className="mt-1" />
                  </div>
                  <div>
                    <Label>Rent Period *</Label>
                    <Select value={form.rent_period} onValueChange={v => setForm({...form, rent_period: v})}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Your Phone</Label>
                    <Input value={form.manager_phone} onChange={e => setForm({...form, manager_phone: e.target.value})} placeholder="+256 700 000000" className="mt-1" />
                  </div>
                  <div>
                    <Label>Your Email</Label>
                    <Input type="email" value={form.manager_email} onChange={e => setForm({...form, manager_email: e.target.value})} placeholder="manager@email.com" className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe the property…" className="mt-1" rows={3} />
                </div>

                <div>
                  <Label>Amenities</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {AMENITIES_LIST.map(a => (
                      <button
                        type="button"
                        key={a}
                        onClick={() => toggleAmenity(a)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                          form.amenities.includes(a)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border text-muted-foreground hover:border-primary'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full gradient-primary text-primary-foreground">Save Property</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-5 shadow-card">
              <div className={`${s.color} mb-2`}>{s.icon}</div>
              <div className="text-3xl font-display font-bold text-foreground">{s.val}</div>
              <div className="text-muted-foreground text-sm">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1 mb-6 w-fit">
          {(['properties', 'tenancies'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                activeTab === tab ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Properties tab */}
        {activeTab === 'properties' && (
          loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : properties.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((p, i) => (
                <div key={p.id} className="relative">
                  <PropertyCard property={p} index={i} />
                  <button
                    onClick={() => handleDeactivate(p.id)}
                    className="absolute top-2 right-2 bg-destructive/90 text-destructive-foreground text-xs px-2 py-1 rounded-md hover:bg-destructive"
                  >
                    Deactivate
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No properties yet</p>
              <p className="text-sm">Click "Add Property" to list your first property</p>
            </div>
          )
        )}

        {/* Tenancies tab */}
        {activeTab === 'tenancies' && (
          <div>
            {tenancies.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No tenancies found</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Property</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Period</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenancies.map(t => (
                      <tr key={t.id} className="border-t border-border hover:bg-secondary/50">
                        <td className="py-3 px-4 text-muted-foreground">{t.property_id.slice(0, 8)}…</td>
                        <td className="py-3 px-4 text-muted-foreground">{t.rent_start_date} → {t.rent_end_date}</td>
                        <td className="py-3 px-4 font-medium">UGX {t.rent_amount.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
