import { useState, useEffect, useRef } from 'react';
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
import {
  Plus, Building2, Users, DollarSign, CheckCircle, Clock, XCircle,
  Eye, RefreshCcw, UserPlus, FileText, Bell, Home
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

type Property = Database['public']['Tables']['properties']['Row'];
type Tenancy = Database['public']['Tables']['tenancies']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

const AMENITIES_LIST = ['Water', 'Electricity', 'WiFi', 'Parking', 'Security', 'Garden', 'Generator', 'DSTV'];

const statusColor: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  uploaded: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  active: 'bg-green-100 text-green-800',
  expired: 'bg-yellow-100 text-yellow-700',
  occupied: 'bg-blue-100 text-blue-800',
  available: 'bg-green-100 text-green-700',
};

type Tab = 'properties' | 'tenancies' | 'payments';

export default function ManagerDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenancies, setTenancies] = useState<(Tenancy & { tenant_name?: string })[]>([]);
  const [payments, setPayments] = useState<(Payment & { tenant_name?: string; property_title?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [propDialogOpen, setPropDialogOpen] = useState(false);
  const [tenancyDialogOpen, setTenancyDialogOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('properties');

  const [form, setForm] = useState({
    title: '', description: '', property_type: 'house', district: '', city: '',
    area: '', address: '', bedrooms: 1, sitting_rooms: 1, kitchens: 1, bathrooms: 1,
    rent_amount: 0, rent_period: 'monthly', manager_phone: '', manager_email: '',
    amenities: [] as string[],
  });

  const [tenancyForm, setTenancyForm] = useState({
    property_id: '', tenant_email: '', rent_start_date: '', rent_end_date: '',
    rent_amount: 0, rent_period: 'monthly',
  });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [propsRes, tenRes, payRes] = await Promise.all([
      supabase.from('properties').select('*').eq('manager_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tenancies').select('*').eq('manager_id', user.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('manager_id', user.id).order('created_at', { ascending: false }),
    ]);

    const myTenancies = tenRes.data || [];
    const myPayments = payRes.data || [];

    // Enrich with tenant names
    const uniqueTenantIds = [...new Set([...myTenancies.map(t => t.tenant_id), ...myPayments.map(p => p.tenant_id)])];
    const profileMap: Record<string, string> = {};
    if (uniqueTenantIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', uniqueTenantIds);
      profiles?.forEach(p => { profileMap[p.user_id] = p.full_name || 'Unknown'; });
    }

    const propMap: Record<string, string> = {};
    propsRes.data?.forEach(p => { propMap[p.id] = p.title; });

    setProperties(propsRes.data || []);
    setTenancies(myTenancies.map(t => ({ ...t, tenant_name: profileMap[t.tenant_id] })));
    setPayments(myPayments.map(p => ({
      ...p,
      tenant_name: profileMap[p.tenant_id],
      property_title: propMap[myTenancies.find(t => t.id === p.tenancy_id)?.property_id || ''],
    })));
    setLoading(false);
  };

  const toggleAmenity = (a: string) =>
    setForm(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a] }));

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
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '✓ Property listed!', description: 'Your listing is now live to tenants.' });
    setPropDialogOpen(false);
    setForm({ title: '', description: '', property_type: 'house', district: '', city: '', area: '', address: '', bedrooms: 1, sitting_rooms: 1, kitchens: 1, bathrooms: 1, rent_amount: 0, rent_period: 'monthly', manager_phone: '', manager_email: '', amenities: [] });
    fetchData();
  };

  const handleCreateTenancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    // Lookup tenant by email
    const { data: tenantId } = await supabase.rpc('get_user_id_by_email', { _email: tenancyForm.tenant_email });
    if (!tenantId) {
      toast({ title: 'Tenant not found', description: 'No account found for that email.', variant: 'destructive' });
      return;
    }
    const prop = properties.find(p => p.id === tenancyForm.property_id);
    const { error } = await supabase.from('tenancies').insert({
      property_id: tenancyForm.property_id,
      tenant_id: tenantId,
      manager_id: user.id,
      rent_start_date: tenancyForm.rent_start_date,
      rent_end_date: tenancyForm.rent_end_date,
      rent_amount: Number(tenancyForm.rent_amount) || prop?.rent_amount || 0,
      rent_period: tenancyForm.rent_period as Database['public']['Enums']['rent_period'],
      status: 'active',
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    // Mark property as occupied
    await supabase.from('properties').update({ status: 'occupied' }).eq('id', tenancyForm.property_id);
    toast({ title: '✓ Tenancy created!', description: 'Tenant has been linked to the property.' });
    setTenancyDialogOpen(false);
    fetchData();
  };

  const handleConfirmPayment = async (paymentId: string) => {
    const { error } = await supabase.from('payments').update({ status: 'confirmed', receipt_url: 'generated' }).eq('id', paymentId);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: '✓ Payment confirmed!', description: 'Receipt has been issued to the tenant.' });
    fetchData();
  };

  const handleRejectPayment = async (paymentId: string) => {
    const { error } = await supabase.from('payments').update({ status: 'rejected' }).eq('id', paymentId);
    if (error) { toast({ title: 'Error', variant: 'destructive' }); return; }
    toast({ title: 'Payment rejected', description: 'Tenant has been notified.', variant: 'destructive' });
    fetchData();
  };

  const handleDeactivate = async (id: string) => {
    await supabase.from('properties').update({ status: 'inactive' }).eq('id', id);
    toast({ title: 'Property deactivated' });
    fetchData();
  };

  const handleReactivate = async (id: string) => {
    await supabase.from('properties').update({ status: 'available' }).eq('id', id);
    toast({ title: 'Property reactivated!' });
    fetchData();
  };

  // Due-to-pay alert
  const dueSoonTenancies = tenancies.filter(t => {
    if (t.status !== 'active') return false;
    const days = differenceInDays(new Date(t.rent_end_date), new Date());
    return days <= 14 && days >= 0;
  });

  const occupied = properties.filter(p => p.status === 'occupied').length;
  const available = properties.filter(p => p.status === 'available').length;
  const pendingPayments = payments.filter(p => p.status === 'uploaded');

  const stats = [
    { icon: <Building2 className="h-5 w-5" />, label: 'Total Properties', val: properties.length, color: 'text-primary' },
    { icon: <CheckCircle className="h-5 w-5" />, label: 'Available', val: available, color: 'text-green-600' },
    { icon: <Home className="h-5 w-5" />, label: 'Occupied', val: occupied, color: 'text-accent' },
    { icon: <Clock className="h-5 w-5" />, label: 'Payments to Review', val: pendingPayments.length, color: pendingPayments.length > 0 ? 'text-accent' : 'text-muted-foreground' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">House Manager Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your properties, tenants and payments</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
            </Button>
            {/* Create Tenancy */}
            <Dialog open={tenancyDialogOpen} onOpenChange={setTenancyDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add Tenant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">Create Tenancy Agreement</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTenancy} className="space-y-4 mt-4">
                  <div>
                    <Label>Property *</Label>
                    <Select value={tenancyForm.property_id} onValueChange={v => {
                      const p = properties.find(pr => pr.id === v);
                      setTenancyForm(f => ({ ...f, property_id: v, rent_amount: p?.rent_amount || 0, rent_period: p?.rent_period || 'monthly' }));
                    }}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select property…" /></SelectTrigger>
                      <SelectContent>
                        {properties.filter(p => p.status !== 'inactive').map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.title} ({p.status})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tenant Email *</Label>
                    <Input type="email" value={tenancyForm.tenant_email} onChange={e => setTenancyForm(f => ({ ...f, tenant_email: e.target.value }))} placeholder="tenant@email.com" required className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">Tenant must already have an Afodabohousing account</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Start Date *</Label>
                      <Input type="date" value={tenancyForm.rent_start_date} onChange={e => setTenancyForm(f => ({ ...f, rent_start_date: e.target.value }))} required className="mt-1" />
                    </div>
                    <div>
                      <Label>End Date *</Label>
                      <Input type="date" value={tenancyForm.rent_end_date} onChange={e => setTenancyForm(f => ({ ...f, rent_end_date: e.target.value }))} required className="mt-1" />
                    </div>
                    <div>
                      <Label>Rent Amount (UGX)</Label>
                      <Input type="number" value={tenancyForm.rent_amount || ''} onChange={e => setTenancyForm(f => ({ ...f, rent_amount: Number(e.target.value) }))} className="mt-1" />
                    </div>
                    <div>
                      <Label>Period</Label>
                      <Select value={tenancyForm.rent_period} onValueChange={v => setTenancyForm(f => ({ ...f, rent_period: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full gradient-primary text-primary-foreground">Create Tenancy</Button>
                </form>
              </DialogContent>
            </Dialog>
            {/* Add Property */}
            <Dialog open={propDialogOpen} onOpenChange={setPropDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground gap-2">
                  <Plus className="h-4 w-4" />
                  Add Property
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">List New Property</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddProperty} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Title *</Label>
                      <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. 3-Bedroom House in Kampala" className="mt-1" />
                    </div>
                    <div>
                      <Label>Property Type *</Label>
                      <Select value={form.property_type} onValueChange={v => setForm({ ...form, property_type: v })}>
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
                      <Input value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} required placeholder="e.g. Kampala" className="mt-1" />
                    </div>
                    <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="mt-1" /></div>
                    <div><Label>Area / Neighborhood</Label><Input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} className="mt-1" /></div>
                    <div className="col-span-2"><Label>Full Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="mt-1" /></div>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {(['bedrooms', 'sitting_rooms', 'kitchens', 'bathrooms'] as const).map(f => (
                      <div key={f}>
                        <Label className="text-xs capitalize">{f.replace('_', ' ')}</Label>
                        <Input type="number" min={0} value={(form as any)[f]} onChange={e => setForm({ ...form, [f]: Number(e.target.value) })} className="mt-1" />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Rent Amount (UGX) *</Label><Input type="number" min={0} value={form.rent_amount || ''} onChange={e => setForm({ ...form, rent_amount: Number(e.target.value) })} required className="mt-1" /></div>
                    <div>
                      <Label>Rent Period *</Label>
                      <Select value={form.rent_period} onValueChange={v => setForm({ ...form, rent_period: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Your Phone</Label><Input value={form.manager_phone} onChange={e => setForm({ ...form, manager_phone: e.target.value })} className="mt-1" /></div>
                    <div><Label>Your Email</Label><Input type="email" value={form.manager_email} onChange={e => setForm({ ...form, manager_email: e.target.value })} className="mt-1" /></div>
                  </div>
                  <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1" /></div>
                  <div>
                    <Label>Amenities</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {AMENITIES_LIST.map(a => (
                        <button type="button" key={a} onClick={() => toggleAmenity(a)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-all ${form.amenities.includes(a) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary'}`}>
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full gradient-primary text-primary-foreground">Publish Listing</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Rent Due Alert */}
        {dueSoonTenancies.length > 0 && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-5 w-5 text-accent" />
              <p className="font-semibold text-foreground">{dueSoonTenancies.length} tenant{dueSoonTenancies.length > 1 ? 's' : ''} due to pay rent soon</p>
            </div>
            {dueSoonTenancies.map(t => {
              const days = differenceInDays(new Date(t.rent_end_date), new Date());
              return (
                <div key={t.id} className="text-sm text-muted-foreground ml-7">
                  <span className="font-medium text-foreground">{t.tenant_name}</span> — rent expires in <strong>{days} day{days !== 1 ? 's' : ''}</strong> ({format(new Date(t.rent_end_date), 'MMM dd')})
                </div>
              );
            })}
          </div>
        )}

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
          {([
            { id: 'properties', label: `Properties (${properties.length})` },
            { id: 'tenancies', label: `Tenants (${tenancies.length})` },
            { id: 'payments', label: `Payments ${pendingPayments.length > 0 ? `(${pendingPayments.length} pending)` : ''}` },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id as Tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Properties Tab */}
        {tab === 'properties' && (
          loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : properties.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((p, i) => (
                <div key={p.id} className="relative group">
                  <PropertyCard property={p} index={i} />
                  <div className="absolute bottom-4 left-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="outline" className="flex-1 bg-card" onClick={() => navigate(`/properties/${p.id}`)}>
                      <Eye className="h-3.5 w-3.5 mr-1" />View
                    </Button>
                    {p.status === 'inactive' ? (
                      <Button size="sm" className="flex-1 gradient-primary text-primary-foreground" onClick={() => handleReactivate(p.id)}>Reactivate</Button>
                    ) : (
                      <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleDeactivate(p.id)}>Deactivate</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No properties yet</p>
              <p className="text-sm">Click "Add Property" to list your first one</p>
            </div>
          )
        )}

        {/* Tenancies Tab */}
        {tab === 'tenancies' && (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Tenant</th>
                    <th className="text-left py-3 px-4 font-semibold">Rent Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Period</th>
                    <th className="text-left py-3 px-4 font-semibold">Rent End</th>
                    <th className="text-left py-3 px-4 font-semibold">Days Left</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tenancies.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No tenants yet. Click "Add Tenant" to create a tenancy.</td></tr>
                  ) : tenancies.map(t => {
                    const days = differenceInDays(new Date(t.rent_end_date), new Date());
                    return (
                      <tr key={t.id} className="border-t border-border hover:bg-secondary/50">
                        <td className="py-3 px-4 font-medium text-foreground">{t.tenant_name || 'Unknown'}</td>
                        <td className="py-3 px-4 font-medium">UGX {t.rent_amount.toLocaleString()}</td>
                        <td className="py-3 px-4 capitalize text-muted-foreground">{t.rent_period}</td>
                        <td className="py-3 px-4 text-muted-foreground">{format(new Date(t.rent_end_date), 'MMM dd, yyyy')}</td>
                        <td className="py-3 px-4">
                          <span className={`font-semibold text-sm ${days <= 7 ? 'text-destructive' : days <= 14 ? 'text-accent' : 'text-foreground'}`}>
                            {days >= 0 ? `${days}d` : 'Overdue'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[t.status] || ''}`}>{t.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {tab === 'payments' && (
          <div className="space-y-4">
            {/* Pending payments banner */}
            {pendingPayments.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="font-semibold text-blue-800 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {pendingPayments.length} payment{pendingPayments.length > 1 ? 's' : ''} awaiting your review
                </p>
              </div>
            )}
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Tenant</th>
                      <th className="text-left py-3 px-4 font-semibold">Amount (UGX)</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Notes</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No payments yet.</td></tr>
                    ) : payments.map(p => (
                      <tr key={p.id} className="border-t border-border hover:bg-secondary/50">
                        <td className="py-3 px-4 font-medium">{p.tenant_name || 'Unknown'}</td>
                        <td className="py-3 px-4 font-semibold">{p.amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">{format(new Date(p.created_at), 'MMM dd, yyyy')}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs max-w-[180px] truncate">{p.notes || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor[p.status] || ''}`}>{p.status}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {p.proof_url && (
                              <a href={p.proof_url} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline" className="gap-1"><Eye className="h-3 w-3" />Proof</Button>
                              </a>
                            )}
                            {p.status === 'uploaded' && (
                              <>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1" onClick={() => handleConfirmPayment(p.id)}>
                                  <CheckCircle className="h-3.5 w-3.5" /> Confirm
                                </Button>
                                <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleRejectPayment(p.id)}>
                                  <XCircle className="h-3.5 w-3.5" /> Reject
                                </Button>
                              </>
                            )}
                            {p.status === 'confirmed' && p.receipt_url && (
                              <Button size="sm" variant="outline" className="gap-1">
                                <FileText className="h-3.5 w-3.5" />Receipt
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
