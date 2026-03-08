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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Building2, Users, DollarSign, CheckCircle, Clock, XCircle,
  Eye, RefreshCcw, UserPlus, Bell, Home, Upload, MessageSquare,
  PhoneCall, CreditCard, TrendingUp, Pencil, Send, AlertTriangle,
  BarChart3, Layers, ArrowUpRight, ChevronRight
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

type Property = Database['public']['Tables']['properties']['Row'];
type Tenancy = Database['public']['Tables']['tenancies']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

const AMENITIES_LIST = ['Water', 'Electricity', 'WiFi', 'Parking', 'Security', 'Garden', 'Generator', 'DSTV', 'Borehole', 'Tiled Floors'];
const DISTRICTS_LIST = ['Kampala', 'Wakiso', 'Mukono', 'Mbarara', 'Gulu', 'Jinja', 'Entebbe', 'Mbale', 'Lira', 'Arua', 'Fort Portal', 'Masaka', 'Kabale', 'Hoima', 'Kasese', 'Soroti', 'Tororo'];

const statusClass = (s: string) => ({
  pending: 'bg-secondary text-foreground border border-border',
  uploaded: 'bg-primary/10 text-primary border border-primary/20',
  confirmed: 'bg-accent/10 text-accent border border-accent/20',
  rejected: 'bg-destructive/10 text-destructive border border-destructive/20',
  active: 'bg-accent/10 text-accent border border-accent/20',
  expired: 'bg-secondary text-muted-foreground border border-border',
  occupied: 'bg-primary/10 text-primary border border-primary/20',
  available: 'bg-accent/10 text-accent border border-accent/20',
  inactive: 'bg-muted text-muted-foreground border border-border',
}[s] || 'bg-muted text-muted-foreground');

type Tab = 'overview' | 'properties' | 'tenancies' | 'payments' | 'messages';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [tenancies, setTenancies] = useState<(Tenancy & { tenant_name?: string; tenant_phone?: string; property_title?: string })[]>([]);
  const [payments, setPayments] = useState<(Payment & { tenant_name?: string; property_title?: string })[]>([]);
  const [messages, setMessages] = useState<(Message & { sender_name?: string; property_title?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [propDialogOpen, setPropDialogOpen] = useState(false);
  const [tenancyDialogOpen, setTenancyDialogOpen] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [sendingAction, setSendingAction] = useState('');
  const [replyDialog, setReplyDialog] = useState<{ open: boolean; receiverId: string; name: string; propertyId?: string }>({ open: false, receiverId: '', name: '' });
  const [replyText, setReplyText] = useState('');
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [selectedPropertyForUnit, setSelectedPropertyForUnit] = useState('');

  const [form, setForm] = useState({
    title: '', description: '', property_type: 'house', district: '', city: '',
    area: '', address: '', bedrooms: 1, sitting_rooms: 1, kitchens: 1, bathrooms: 1,
    rent_amount: 0, rent_period: 'monthly', manager_phone: '', manager_email: '',
    amenities: [] as string[],
  });

  const [unitForm, setUnitForm] = useState({
    unit_number: '', floor_level: '', bedrooms: 1, bathrooms: 1, sitting_rooms: 0,
    kitchens: 1, rent_amount: 0, description: '',
  });

  const [tenancyForm, setTenancyForm] = useState({
    property_id: '', tenant_email: '', rent_start_date: '', rent_end_date: '',
    rent_amount: 0, rent_period: 'monthly',
  });

  const [smsForm, setSmsForm] = useState({ phone: '', message: '' });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [propsRes, tenRes, payRes, msgRes] = await Promise.all([
      supabase.from('properties').select('*').eq('manager_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tenancies').select('*').eq('manager_id', user.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('manager_id', user.id).order('created_at', { ascending: false }),
      supabase.from('messages').select('*').eq('receiver_id', user.id).order('created_at', { ascending: false }),
    ]);

    const myTenancies = tenRes.data || [];
    const myPayments = payRes.data || [];
    const myMessages = msgRes.data || [];

    const uniqueIds = [...new Set([
      ...myTenancies.map(t => t.tenant_id),
      ...myPayments.map(p => p.tenant_id),
      ...myMessages.map(m => m.sender_id),
    ])];

    const profileMap: Record<string, { name: string; phone: string }> = {};
    if (uniqueIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, phone').in('user_id', uniqueIds);
      profiles?.forEach(p => { profileMap[p.user_id] = { name: p.full_name || 'Unknown', phone: p.phone || '' }; });
    }

    const propMap: Record<string, string> = {};
    propsRes.data?.forEach(p => { propMap[p.id] = p.title; });

    setProperties(propsRes.data || []);
    setTenancies(myTenancies.map(t => ({
      ...t,
      tenant_name: profileMap[t.tenant_id]?.name,
      tenant_phone: profileMap[t.tenant_id]?.phone,
      property_title: propMap[t.property_id],
    })));
    setPayments(myPayments.map(p => ({
      ...p,
      tenant_name: profileMap[p.tenant_id]?.name,
      property_title: propMap[myTenancies.find(t => t.id === p.tenancy_id)?.property_id || ''],
    })));
    setMessages(myMessages.map(m => ({
      ...m,
      sender_name: profileMap[m.sender_id]?.name,
      property_title: m.property_id ? propMap[m.property_id] : undefined,
    })));
    setLoading(false);
  };

  const sendSMS = async (phone: string, message: string) => {
    if (!phone) return;
    try { await supabase.functions.invoke('send-sms', { body: { phone, message } }); }
    catch (e) { console.log('SMS failed (non-blocking):', e); }
  };

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUploading(true);
    let imageUrls: string[] = [];
    for (const file of imageFiles) {
      const ext = file.name.split('.').pop();
      const path = `properties/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data } = await supabase.storage.from('property-images').upload(path, file);
      if (data) {
        const { data: urlData } = supabase.storage.from('property-images').getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }
    }
    const { error } = await supabase.from('properties').insert({
      ...form, manager_id: user.id, images: imageUrls,
      rent_amount: Number(form.rent_amount),
      property_type: form.property_type as Database['public']['Enums']['property_type'],
      rent_period: form.rent_period as Database['public']['Enums']['rent_period'],
    });
    setUploading(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Property published!', description: 'Your listing is now live.' });
    setPropDialogOpen(false);
    setForm({ title: '', description: '', property_type: 'house', district: '', city: '', area: '', address: '', bedrooms: 1, sitting_rooms: 1, kitchens: 1, bathrooms: 1, rent_amount: 0, rent_period: 'monthly', manager_phone: '', manager_email: '', amenities: [] });
    setImageFiles([]);
    fetchData();
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyForUnit) return;
    setSendingAction('add-unit');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('rental_units').insert({
      property_id: selectedPropertyForUnit,
      unit_number: unitForm.unit_number,
      floor_level: unitForm.floor_level || null,
      bedrooms: unitForm.bedrooms,
      bathrooms: unitForm.bathrooms,
      sitting_rooms: unitForm.sitting_rooms,
      kitchens: unitForm.kitchens,
      rent_amount: Number(unitForm.rent_amount),
      description: unitForm.description || null,
      status: 'available',
    });
    setSendingAction('');
    if (error) { toast({ title: 'Error adding unit', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Unit added!', description: `Unit ${unitForm.unit_number} is now listed.` });
    setUnitDialogOpen(false);
    setUnitForm({ unit_number: '', floor_level: '', bedrooms: 1, bathrooms: 1, sitting_rooms: 0, kitchens: 1, rent_amount: 0, description: '' });
  };

  const handleCreateTenancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSendingAction('creating');
    const { data: tenantId } = await supabase.rpc('get_user_id_by_email', { _email: tenancyForm.tenant_email });
    if (!tenantId) {
      toast({ title: 'Tenant not found', description: 'No registered account for that email.', variant: 'destructive' });
      setSendingAction(''); return;
    }
    const prop = properties.find(p => p.id === tenancyForm.property_id);
    const { error } = await supabase.from('tenancies').insert({
      property_id: tenancyForm.property_id, tenant_id: tenantId, manager_id: user.id,
      rent_start_date: tenancyForm.rent_start_date, rent_end_date: tenancyForm.rent_end_date,
      rent_amount: Number(tenancyForm.rent_amount) || prop?.rent_amount || 0,
      rent_period: tenancyForm.rent_period as Database['public']['Enums']['rent_period'],
      status: 'active',
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setSendingAction(''); return; }
    await supabase.from('properties').update({ status: 'occupied' }).eq('id', tenancyForm.property_id);
    const { data: tenantProfile } = await supabase.from('profiles').select('phone').eq('user_id', tenantId).single();
    if (tenantProfile?.phone) {
      await sendSMS(tenantProfile.phone, `Welcome to ${prop?.title || 'your new home'}! Your tenancy with Afodabohousing has been activated. Rent: UGX ${(Number(tenancyForm.rent_amount) || prop?.rent_amount || 0).toLocaleString()}. Contact: +256788100145`);
    }
    toast({ title: 'Tenancy created!', description: 'Tenant linked and notified via SMS.' });
    setTenancyDialogOpen(false);
    setSendingAction('');
    fetchData();
  };

  const handleConfirmPayment = async (payment: Payment) => {
    setSendingAction(payment.id);
    const { error } = await supabase.from('payments').update({ status: 'confirmed', receipt_url: `receipt-${payment.id}` }).eq('id', payment.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); setSendingAction(''); return; }
    const { data: profile } = await supabase.from('profiles').select('phone').eq('user_id', payment.tenant_id).single();
    if (profile?.phone) await sendSMS(profile.phone, `Payment CONFIRMED! UGX ${payment.amount.toLocaleString()} for ${format(new Date(payment.period_start), 'MMM yyyy')} has been confirmed by your house manager. - Afodabohousing`);
    toast({ title: 'Payment confirmed', description: 'Tenant notified via SMS.' });
    setSendingAction(''); fetchData();
  };

  const handleRejectPayment = async (payment: Payment) => {
    setSendingAction(`reject-${payment.id}`);
    const { error } = await supabase.from('payments').update({ status: 'rejected' }).eq('id', payment.id);
    if (error) { toast({ title: 'Error', variant: 'destructive' }); setSendingAction(''); return; }
    const { data: profile } = await supabase.from('profiles').select('phone').eq('user_id', payment.tenant_id).single();
    if (profile?.phone) await sendSMS(profile.phone, `Your rent payment proof (UGX ${payment.amount.toLocaleString()}) was rejected. Please re-upload a clearer proof. Contact: ${user?.email} - Afodabohousing`);
    toast({ title: 'Payment rejected', description: 'Tenant notified via SMS.', variant: 'destructive' });
    setSendingAction(''); fetchData();
  };

  const handleSendBulkSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingAction('sms');
    try {
      await supabase.functions.invoke('send-sms', { body: { phone: smsForm.phone, message: smsForm.message } });
      toast({ title: 'SMS sent!', description: `Message delivered to ${smsForm.phone}` });
      setSmsDialogOpen(false); setSmsForm({ phone: '', message: '' });
    } catch { toast({ title: 'SMS failed', variant: 'destructive' }); }
    setSendingAction('');
  };

  const sendRentReminder = async (tenancy: typeof tenancies[0]) => {
    if (!tenancy.tenant_phone) { toast({ title: 'No phone number', variant: 'destructive' }); return; }
    setSendingAction(`remind-${tenancy.id}`);
    const days = differenceInDays(new Date(tenancy.rent_end_date), new Date());
    await sendSMS(tenancy.tenant_phone, `RENT REMINDER: Your rent of UGX ${tenancy.rent_amount.toLocaleString()} is due ${days > 0 ? `in ${days} days` : 'TODAY'}! Please pay and upload proof on Afodabohousing. - ${user?.email}`);
    toast({ title: 'Reminder sent!', description: `SMS reminder sent to ${tenancy.tenant_name}` });
    setSendingAction('');
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !replyText.trim()) return;
    setSendingAction('reply');
    await supabase.from('messages').insert({
      sender_id: user.id, receiver_id: replyDialog.receiverId,
      content: replyText, property_id: replyDialog.propertyId || null,
    });
    toast({ title: 'Message sent!' });
    setReplyDialog({ open: false, receiverId: '', name: '' });
    setReplyText(''); setSendingAction(''); fetchData();
  };

  const markMessageRead = async (msgId: string) => {
    await supabase.from('messages').update({ is_read: true }).eq('id', msgId);
    fetchData();
  };

  const toggleAmenity = (a: string) =>
    setForm(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a] }));

  const occupied = properties.filter(p => p.status === 'occupied').length;
  const available = properties.filter(p => p.status === 'available').length;
  const pendingPayments = payments.filter(p => p.status === 'uploaded');
  const unreadMessages = messages.filter(m => !m.is_read).length;
  const confirmedRevenue = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);
  const dueSoonTenancies = tenancies.filter(t => {
    if (t.status !== 'active') return false;
    const d = differenceInDays(new Date(t.rent_end_date), new Date());
    return d <= 14 && d >= 0;
  });

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'properties', label: 'Properties', badge: properties.length },
    { id: 'tenancies', label: 'Tenants', badge: tenancies.filter(t => t.status === 'active').length },
    { id: 'payments', label: 'Payments', badge: pendingPayments.length || undefined },
    { id: 'messages', label: 'Messages', badge: unreadMessages || undefined },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Dashboard shell */}
      <div className="border-b border-border bg-card/50">
        <div className="container max-w-7xl py-6 px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-display font-bold text-xl shadow-md">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-accent font-semibold text-xs uppercase tracking-widest">Property Manager</p>
                <h1 className="font-display text-2xl font-bold text-foreground">Manager Dashboard</h1>
                <p className="text-muted-foreground text-sm">{user?.email}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 h-9">
                <RefreshCcw className="h-3.5 w-3.5" />
                Refresh
              </Button>

              {/* Send SMS */}
              <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 h-9" size="sm">
                    <PhoneCall className="h-3.5 w-3.5" />
                    Send SMS
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-display text-xl">Send SMS Message</DialogTitle>
                    <DialogDescription>Send a custom SMS to any phone number.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSendBulkSMS} className="space-y-4 mt-4">
                    <div>
                      <Label>Phone Number</Label>
                      <Input value={smsForm.phone} onChange={e => setSmsForm(f => ({ ...f, phone: e.target.value }))} placeholder="+256 700 000000" required className="mt-1" />
                    </div>
                    <div>
                      <Label>Message</Label>
                      <Textarea value={smsForm.message} onChange={e => setSmsForm(f => ({ ...f, message: e.target.value }))} rows={4} required className="mt-1" maxLength={160} />
                      <p className="text-xs text-muted-foreground mt-1">{smsForm.message.length}/160</p>
                    </div>
                    <Button type="submit" disabled={sendingAction === 'sms'} className="w-full gradient-primary text-primary-foreground">
                      {sendingAction === 'sms' ? 'Sending...' : 'Send SMS'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Add Tenant */}
              <Dialog open={tenancyDialogOpen} onOpenChange={setTenancyDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 h-9" size="sm">
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Tenant
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-display text-xl">Create Tenancy Agreement</DialogTitle>
                    <DialogDescription>Link a registered tenant to one of your properties.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateTenancy} className="space-y-4 mt-4">
                    <div>
                      <Label>Property</Label>
                      <Select value={tenancyForm.property_id} onValueChange={v => {
                        const p = properties.find(pr => pr.id === v);
                        setTenancyForm(f => ({ ...f, property_id: v, rent_amount: p?.rent_amount || 0, rent_period: p?.rent_period || 'monthly' }));
                      }}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select property..." /></SelectTrigger>
                        <SelectContent>
                          {properties.filter(p => p.status !== 'inactive').map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.title} ({p.status})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Tenant Email</Label>
                      <Input type="email" value={tenancyForm.tenant_email} onChange={e => setTenancyForm(f => ({ ...f, tenant_email: e.target.value }))} placeholder="tenant@example.com" required className="mt-1" />
                      <p className="text-xs text-muted-foreground mt-1">Tenant must already have an Afodabohousing account</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Start Date</Label><Input type="date" value={tenancyForm.rent_start_date} onChange={e => setTenancyForm(f => ({ ...f, rent_start_date: e.target.value }))} required className="mt-1" /></div>
                      <div><Label>End Date</Label><Input type="date" value={tenancyForm.rent_end_date} onChange={e => setTenancyForm(f => ({ ...f, rent_end_date: e.target.value }))} required className="mt-1" /></div>
                      <div><Label>Rent Amount (UGX)</Label><Input type="number" value={tenancyForm.rent_amount || ''} onChange={e => setTenancyForm(f => ({ ...f, rent_amount: Number(e.target.value) }))} className="mt-1" /></div>
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
                    <Button type="submit" disabled={sendingAction === 'creating'} className="w-full gradient-primary text-primary-foreground">
                      {sendingAction === 'creating' ? 'Creating...' : 'Create Tenancy and Notify Tenant'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Add Property */}
              <Dialog open={propDialogOpen} onOpenChange={setPropDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary text-primary-foreground gap-2 h-9" size="sm">
                    <Plus className="h-3.5 w-3.5" />
                    Add Property
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-display text-xl">List New Property</DialogTitle>
                    <DialogDescription>Fill in the details to publish your listing.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddProperty} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Property Title</Label>
                        <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Spacious 3-Bedroom House in Ntinda" className="mt-1" />
                      </div>
                      <div>
                        <Label>Property Type</Label>
                        <Select value={form.property_type} onValueChange={v => setForm({ ...form, property_type: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="house">House</SelectItem>
                            <SelectItem value="apartment">Apartment</SelectItem>
                            <SelectItem value="self_contained">Self-Contained</SelectItem>
                            <SelectItem value="room">Single Room</SelectItem>
                            <SelectItem value="studio">Studio</SelectItem>
                            <SelectItem value="bungalow">Bungalow</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>District</Label>
                        <Select value={form.district} onValueChange={v => setForm({ ...form, district: v })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select district..." /></SelectTrigger>
                          <SelectContent>
                            {DISTRICTS_LIST.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g. Kampala City" className="mt-1" /></div>
                      <div><Label>Area / Neighbourhood</Label><Input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="e.g. Ntinda, Bukoto" className="mt-1" /></div>
                      <div className="col-span-2"><Label>Full Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Plot 45, Road name..." className="mt-1" /></div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {(['bedrooms', 'sitting_rooms', 'kitchens', 'bathrooms'] as const).map(f => (
                        <div key={f}>
                          <Label className="text-xs capitalize">{f.replace('_', ' ')}</Label>
                          <Input type="number" min={0} value={(form as unknown as Record<string, number>)[f]} onChange={e => setForm({ ...form, [f]: Number(e.target.value) })} className="mt-1" />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Rent Amount (UGX)</Label><Input type="number" min={0} value={form.rent_amount || ''} onChange={e => setForm({ ...form, rent_amount: Number(e.target.value) })} required className="mt-1" placeholder="e.g. 500000" /></div>
                      <div>
                        <Label>Rent Period</Label>
                        <Select value={form.rent_period} onValueChange={v => setForm({ ...form, rent_period: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Your Phone</Label><Input value={form.manager_phone} onChange={e => setForm({ ...form, manager_phone: e.target.value })} placeholder="+256 788 100145" className="mt-1" /></div>
                      <div><Label>Contact Email</Label><Input type="email" value={form.manager_email} onChange={e => setForm({ ...form, manager_email: e.target.value })} placeholder="you@email.com" className="mt-1" /></div>
                    </div>
                    <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1" placeholder="Describe the property, surroundings, access..." /></div>
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
                    <div>
                      <Label>Property Photos</Label>
                      <div
                        className="mt-1 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors"
                        onClick={() => fileRef.current?.click()}
                      >
                        {imageFiles.length > 0 ? (
                          <div className="space-y-1">
                            {imageFiles.map(f => <p key={f.name} className="text-sm text-primary font-medium">Photo: {f.name}</p>)}
                            <p className="text-xs text-muted-foreground mt-2">Click to add more</p>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Click to upload property photos (JPG, PNG)</p>
                          </>
                        )}
                      </div>
                      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => setImageFiles(Array.from(e.target.files || []))} />
                    </div>
                    <Button type="submit" disabled={uploading} className="w-full gradient-primary text-primary-foreground">
                      {uploading ? 'Uploading and Publishing...' : 'Publish Listing'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Add Unit Dialog */}
              <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 h-9" size="sm">
                    <Layers className="h-3.5 w-3.5" />
                    Add Unit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-display text-xl">Add Rental Unit</DialogTitle>
                    <DialogDescription>Add an individual rentable unit to one of your multi-unit properties.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddUnit} className="space-y-4 mt-4">
                    <div>
                      <Label>Property</Label>
                      <Select value={selectedPropertyForUnit} onValueChange={setSelectedPropertyForUnit}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select property..." /></SelectTrigger>
                        <SelectContent>
                          {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Unit Number</Label><Input value={unitForm.unit_number} onChange={e => setUnitForm(f => ({ ...f, unit_number: e.target.value }))} placeholder="e.g. A1, 2B" required className="mt-1" /></div>
                      <div><Label>Floor Level</Label><Input value={unitForm.floor_level} onChange={e => setUnitForm(f => ({ ...f, floor_level: e.target.value }))} placeholder="e.g. Ground, 1st" className="mt-1" /></div>
                      <div><Label>Bedrooms</Label><Input type="number" min={0} value={unitForm.bedrooms} onChange={e => setUnitForm(f => ({ ...f, bedrooms: Number(e.target.value) }))} className="mt-1" /></div>
                      <div><Label>Bathrooms</Label><Input type="number" min={0} value={unitForm.bathrooms} onChange={e => setUnitForm(f => ({ ...f, bathrooms: Number(e.target.value) }))} className="mt-1" /></div>
                      <div><Label>Sitting Rooms</Label><Input type="number" min={0} value={unitForm.sitting_rooms} onChange={e => setUnitForm(f => ({ ...f, sitting_rooms: Number(e.target.value) }))} className="mt-1" /></div>
                      <div><Label>Kitchens</Label><Input type="number" min={0} value={unitForm.kitchens} onChange={e => setUnitForm(f => ({ ...f, kitchens: Number(e.target.value) }))} className="mt-1" /></div>
                      <div className="col-span-2"><Label>Rent Amount (UGX)</Label><Input type="number" min={0} value={unitForm.rent_amount || ''} onChange={e => setUnitForm(f => ({ ...f, rent_amount: Number(e.target.value) }))} required placeholder="e.g. 450000" className="mt-1" /></div>
                    </div>
                    <div><Label>Unit Description</Label><Textarea value={unitForm.description} onChange={e => setUnitForm(f => ({ ...f, description: e.target.value }))} rows={2} className="mt-1" placeholder="Any specific notes about this unit..." /></div>
                    <Button type="submit" disabled={sendingAction === 'add-unit' || !selectedPropertyForUnit} className="w-full gradient-primary text-primary-foreground">
                      {sendingAction === 'add-unit' ? 'Adding...' : 'Add Unit'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl py-6 px-4">
        {/* Alerts */}
        {pendingPayments.length > 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">{pendingPayments.length} payment{pendingPayments.length > 1 ? 's' : ''} awaiting your review</p>
              <p className="text-sm text-muted-foreground">Review and confirm or reject payment proofs</p>
            </div>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => setTab('payments')}>
              Review
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}

        {dueSoonTenancies.length > 0 && (
          <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-accent" />
              <p className="font-semibold text-foreground text-sm">{dueSoonTenancies.length} tenant{dueSoonTenancies.length > 1 ? 's' : ''} with rent expiring soon</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {dueSoonTenancies.map(t => {
                const days = differenceInDays(new Date(t.rent_end_date), new Date());
                return (
                  <div key={t.id} className="flex items-center gap-2 bg-card rounded-xl px-3 py-1.5 border border-border">
                    <span className="text-sm font-semibold text-foreground">{t.tenant_name}</span>
                    <Badge className={`text-xs ${days <= 7 ? 'bg-destructive/10 text-destructive border border-destructive/30' : 'bg-accent/10 text-accent border border-accent/30'}`}>
                      {days}d left
                    </Badge>
                    <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 px-2 text-accent hover:bg-accent/10" disabled={sendingAction === `remind-${t.id}`} onClick={() => sendRentReminder(t)}>
                      <Bell className="h-3 w-3" />SMS
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: <Building2 className="h-5 w-5" />, label: 'Total Listings', val: properties.length, sub: `${available} available`, color: 'text-primary', bg: 'bg-primary/10' },
            { icon: <Home className="h-5 w-5" />, label: 'Occupied Units', val: occupied, sub: `${tenancies.filter(t => t.status === 'active').length} active tenancies`, color: 'text-accent', bg: 'bg-accent/10' },
            { icon: <DollarSign className="h-5 w-5" />, label: 'Revenue Confirmed', val: `UGX ${(confirmedRevenue / 1000000).toFixed(1)}M`, sub: `${pendingPayments.length} pending`, color: 'text-primary', bg: 'bg-primary/10' },
            { icon: <MessageSquare className="h-5 w-5" />, label: 'Unread Messages', val: unreadMessages, sub: `${messages.length} total`, color: unreadMessages > 0 ? 'text-accent' : 'text-muted-foreground', bg: unreadMessages > 0 ? 'bg-accent/10' : 'bg-muted' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-5 shadow-card hover:shadow-md transition-shadow">
              <div className={`${s.bg} ${s.color} rounded-xl w-10 h-10 flex items-center justify-center mb-3`}>{s.icon}</div>
              <div className="text-2xl font-display font-bold text-foreground">{loading ? '...' : s.val}</div>
              <div className="text-sm font-semibold text-foreground mt-0.5">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${t.id === 'payments' || t.id === 'messages' ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-display font-semibold text-lg mb-5 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Revenue Overview
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Confirmed Payments', val: payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0), color: 'text-accent' },
                  { label: 'Pending Review', val: payments.filter(p => p.status === 'uploaded').reduce((s, p) => s + p.amount, 0), color: 'text-primary' },
                  { label: 'Total Pipeline', val: payments.filter(p => ['confirmed', 'uploaded'].includes(p.status)).reduce((s, p) => s + p.amount, 0), color: 'text-foreground' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{r.label}</span>
                    <span className={`font-bold font-display ${r.color}`}>UGX {r.val.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-display font-semibold text-lg mb-5 flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Awaiting Review
              </h3>
              {pendingPayments.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-10 w-10 text-accent mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground text-sm">All payments reviewed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPayments.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-primary/5 rounded-xl px-4 py-3 border border-primary/10">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{p.tenant_name}</p>
                        <p className="text-xs text-muted-foreground">UGX {p.amount.toLocaleString()} - {format(new Date(p.created_at), 'MMM dd')}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="gradient-primary text-primary-foreground h-7 text-xs" disabled={!!sendingAction} onClick={() => handleConfirmPayment(p)}>
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={!!sendingAction} onClick={() => handleRejectPayment(p)}>
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Properties */}
            {properties.length > 0 && (
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-lg">Your Listings</h3>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setTab('properties')}>
                    View all <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {properties.slice(0, 3).map((p, i) => <PropertyCard key={p.id} property={p} index={i} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Properties */}
        {tab === 'properties' && (
          <div>
            {properties.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground">
                <Building2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-xl font-display font-bold text-foreground">No properties listed yet</p>
                <p className="text-sm mt-2">Click "Add Property" to publish your first listing</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {properties.map((p, i) => (
                  <div key={p.id} className="relative group">
                    <PropertyCard property={p} index={i} />
                    <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="outline" className="h-7 text-xs bg-card/90 backdrop-blur-sm gap-1 shadow" onClick={() => navigate(`/properties/${p.id}`)}>
                        <Eye className="h-3 w-3" />View
                      </Button>
                      <Button
                        size="sm"
                        variant={p.status !== 'inactive' ? 'destructive' : 'default'}
                        className={`h-7 text-xs shadow ${p.status === 'inactive' ? 'gradient-primary text-primary-foreground' : ''}`}
                        disabled={!!sendingAction}
                        onClick={async () => {
                          setSendingAction(p.id);
                          await supabase.from('properties').update({ status: p.status !== 'inactive' ? 'inactive' : 'available' }).eq('id', p.id);
                          toast({ title: p.status !== 'inactive' ? 'Property deactivated' : 'Property activated' });
                          setSendingAction(''); fetchData();
                        }}
                      >
                        {p.status !== 'inactive' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tenancies */}
        {tab === 'tenancies' && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg">Active Tenancies</h3>
              <Badge className="bg-accent/10 text-accent border border-accent/30">{tenancies.filter(t => t.status === 'active').length} active</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Tenant</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Property</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Rent</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Expires</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenancies.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No tenancies found</td></tr>
                  ) : tenancies.map(t => {
                    const days = differenceInDays(new Date(t.rent_end_date), new Date());
                    return (
                      <tr key={t.id} className="border-t border-border hover:bg-secondary/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground">{t.tenant_name || 'Unknown'}</div>
                          {t.tenant_phone && <div className="text-xs text-muted-foreground">{t.tenant_phone}</div>}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-sm">{t.property_title || 'Unknown'}</td>
                        <td className="py-3 px-4 font-bold text-foreground">UGX {t.rent_amount.toLocaleString()}<span className="text-xs text-muted-foreground font-normal ml-1 capitalize">/{t.rent_period.slice(0, 2)}</span></td>
                        <td className="py-3 px-4">
                          <div className="text-sm">{format(new Date(t.rent_end_date), 'MMM dd, yyyy')}</div>
                          <div className={`text-xs font-semibold ${days < 0 ? 'text-destructive' : days <= 7 ? 'text-destructive' : days <= 14 ? 'text-accent' : 'text-muted-foreground'}`}>
                            {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusClass(t.status)}`}>{t.status}</span>
                        </td>
                        <td className="py-3 px-4">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={sendingAction === `remind-${t.id}`} onClick={() => sendRentReminder(t)}>
                            <Bell className="h-3 w-3" />
                            Remind
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments */}
        {tab === 'payments' && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg">Payment Records</h3>
              <Badge className={`${pendingPayments.length > 0 ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-muted text-muted-foreground'}`}>{pendingPayments.length} pending</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Tenant</th>
                    <th className="text-left py-3 px-4 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Notes</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No payment records</td></tr>
                  ) : payments.map(p => (
                    <tr key={p.id} className={`border-t border-border hover:bg-secondary/50 transition-colors ${p.status === 'uploaded' ? 'bg-primary/5' : ''}`}>
                      <td className="py-3 px-4 font-semibold text-foreground">{p.tenant_name || 'Unknown'}</td>
                      <td className="py-3 px-4 font-bold text-foreground">UGX {p.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{format(new Date(p.created_at), 'MMM dd, yyyy')}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs max-w-[180px] truncate">{p.notes || 'None'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusClass(p.status)}`}>{p.status}</span>
                      </td>
                      <td className="py-3 px-4">
                        {p.status === 'uploaded' ? (
                          <div className="flex gap-2">
                            <Button size="sm" className="gradient-primary text-primary-foreground h-7 text-xs gap-1" disabled={!!sendingAction} onClick={() => handleConfirmPayment(p)}>
                              <CheckCircle className="h-3 w-3" />Confirm
                            </Button>
                            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" disabled={!!sendingAction} onClick={() => handleRejectPayment(p)}>
                              <XCircle className="h-3 w-3" />Reject
                            </Button>
                          </div>
                        ) : p.proof_url ? (
                          <a href={p.proof_url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"><Eye className="h-3 w-3" />View</Button>
                          </a>
                        ) : <span className="text-xs text-muted-foreground">No proof</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Messages */}
        {tab === 'messages' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-semibold text-lg">Inbox</h3>
              <Badge className="bg-primary/10 text-primary border border-primary/30">{unreadMessages} unread</Badge>
            </div>
            {messages.length === 0 ? (
              <div className="text-center py-24 text-muted-foreground">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-xl font-display font-bold text-foreground">No messages yet</p>
                <p className="text-sm mt-2">Messages from tenants will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map(m => (
                  <div
                    key={m.id}
                    className={`bg-card border rounded-2xl p-5 transition-all ${!m.is_read ? 'border-primary/40 bg-primary/5 shadow-sm' : 'border-border'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="h-8 w-8 rounded-full gradient-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                            {(m.sender_name || 'T').charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground text-sm">{m.sender_name || 'Tenant'}</span>
                            {m.property_title && <span className="text-xs text-muted-foreground ml-2">re: {m.property_title}</span>}
                          </div>
                          {!m.is_read && <Badge className="bg-primary text-primary-foreground text-xs">New</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed ml-10">{m.content}</p>
                        <p className="text-xs text-muted-foreground/60 mt-1.5 ml-10">{format(new Date(m.created_at), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {!m.is_read && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markMessageRead(m.id)}>Mark read</Button>
                        )}
                        <Button
                          size="sm"
                          className="gradient-primary text-primary-foreground h-7 text-xs gap-1"
                          onClick={() => {
                            setReplyDialog({ open: true, receiverId: m.sender_id, name: m.sender_name || 'Tenant', propertyId: m.property_id || undefined });
                            if (!m.is_read) markMessageRead(m.id);
                          }}
                        >
                          <Send className="h-3 w-3" />Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reply Dialog */}
      <Dialog open={replyDialog.open} onOpenChange={o => setReplyDialog(d => ({ ...d, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Reply to {replyDialog.name}</DialogTitle>
            <DialogDescription>Send a message reply to this tenant.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReply} className="space-y-4 mt-4">
            <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={4} required placeholder="Type your reply..." className="mt-1" />
            <Button type="submit" disabled={sendingAction === 'reply'} className="w-full gradient-primary text-primary-foreground">
              {sendingAction === 'reply' ? 'Sending...' : 'Send Reply'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
