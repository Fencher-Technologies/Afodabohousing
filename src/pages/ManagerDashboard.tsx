import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { listPayments, updatePayment, PaymentData } from '@/services/payments';
import AvatarUpload from '@/components/AvatarUpload';
import {
  Plus, Building2, Users, DollarSign, CheckCircle, Clock, XCircle,
  Eye, RefreshCcw, UserPlus, Bell, Home, Upload,
  TrendingUp, AlertTriangle, Layers, ChevronRight, LayoutDashboard,
  Pencil, Trash2, LogOut, Menu, X, ArrowUpRight, BarChart2, Settings,
  Wrench, MessageCircle, ArrowLeft, KeyRound, Ban, Copy
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

type Property = Database['public']['Tables']['properties']['Row'];
type TenancyRow = Database['public']['Tables']['tenancies']['Row'];

const AMENITIES_LIST = ['Water', 'Electricity', 'WiFi', 'Parking', 'Security', 'Garden', 'Generator', 'DSTV', 'Borehole', 'Tiled Floors'];
const DISTRICTS_LIST = ['Kampala', 'Wakiso', 'Mukono', 'Mbarara', 'Gulu', 'Jinja', 'Entebbe', 'Mbale', 'Lira', 'Arua', 'Fort Portal', 'Masaka', 'Kabale', 'Hoima', 'Kasese', 'Soroti', 'Tororo'];

const statusBadge = (s: string) => ({
  pending: 'status-pending',
  uploaded: 'status-uploaded',
  confirmed: 'status-confirmed',
  rejected: 'status-rejected',
  active: 'status-confirmed',
  expired: 'status-pending',
  occupied: 'status-uploaded',
  available: 'status-confirmed',
  inactive: 'status-pending',
  terminated: 'status-rejected',
}[s] ?? 'status-pending');

type Tab = 'overview' | 'properties' | 'tenants' | 'payments' | 'requests' | 'account';

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'properties', label: 'Properties', icon: <Building2 className="h-4 w-4" /> },
  { id: 'tenants', label: 'Tenants', icon: <Users className="h-4 w-4" /> },
  { id: 'payments', label: 'Payments', icon: <DollarSign className="h-4 w-4" /> },
  { id: 'requests', label: 'Maintenance', icon: <Wrench className="h-4 w-4" /> },
  { id: 'account', label: 'Account', icon: <Settings className="h-4 w-4" /> },
];

export default function ManagerDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [properties, setProperties] = useState<Property[]>([]);
  const [leases, setLeases] = useState<(TenancyRow & { tenant_name?: string; tenant_phone?: string; tenant_user_id?: string; property_title?: string })[]>([]);
  const [payments, setPayments] = useState<(PaymentData & { tenant_name?: string; property_title?: string })[]>([]);
  const [maintenanceReqs, setMaintenanceReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [propDialogOpen, setPropDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deleteConfirmProperty, setDeleteConfirmProperty] = useState<Property | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [sendingAction, setSendingAction] = useState('');
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [selectedPropertyForUnit, setSelectedPropertyForUnit] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [profile, setProfile] = useState<{ photo_url: string | null; full_name: string | null; email: string; phone: string } | null>(null);
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [tenantFormData, setTenantFormData] = useState({
    full_name: '', phone: '', email: '', property_id: '',
    start_date: '', end_date: '', monthly_rent: 0,
  });
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [otpPassword, setOtpPassword] = useState<string | null>(null);
  const [copiedPwd, setCopiedPwd] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', property_type: 'Residential', state: '', city: '',
    area: '', address: '', bedrooms: 1, sitting_rooms: 1, kitchens: 1, bathrooms: 1,
    rent_amount: 0, rent_period: 'monthly', manager_phone: '', manager_email: '',
    amenities: [] as string[],
  });

  const [unitForm, setUnitForm] = useState({
    unit_number: '', floor_level: '', bedrooms: 1, bathrooms: 1, sitting_rooms: 0,
    kitchens: 1, rent_amount: 0, description: '',
  });

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const [agreementDialogOpen, setAgreementDialogOpen] = useState(false);
  const [agreementLease, setAgreementLease] = useState<any>(null);
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [uploadingAgreement, setUploadingAgreement] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [propsRes, tenancyRes, leaseRes, tenantRes, payRes, profileRes] = await Promise.all([
      supabase.from('properties').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tenancies').select('*').eq('manager_id', user.id).order('created_at', { ascending: false }),
      supabase.from('leases').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('tenants').select('id, first_name, last_name, phone, user_id').eq('owner_id', user.id),
      listPayments().catch(() => ({ items: [], total: 0 })),
      supabase.from('profiles').select('photo_url, full_name, email, phone').eq('user_id', user.id).single(),
    ]);

    const allPayments = payRes.items || [];

    const propMap: Record<string, string> = {};
    propsRes.data?.forEach(p => { propMap[p.id] = p.title; });

    const tenantMap: Record<string, { name: string; phone: string; user_id: string }> = {};
    tenantRes.data?.forEach(t => {
      tenantMap[t.id] = { name: (t.first_name || '') + ' ' + (t.last_name || ''), phone: t.phone || '', user_id: t.user_id || '' };
    });

    setProperties(propsRes.data || []);

    // Prefer tenancies (new schema), fallback to leases (old schema)
    const tenancyRows = tenancyRes.data || [];
    const leaseRows = leaseRes.data || [];
    const rawTenancies = tenancyRows.length > 0 ? tenancyRows : leaseRows;
    const isTenancies = tenancyRows.length > 0;

    const tenancyMap: Record<string, { property_id: string; tenant_id: string }> = {};
    rawTenancies.forEach(t => {
      tenancyMap[t.id] = { property_id: t.property_id, tenant_id: t.tenant_id };
    });
    // Also map lease IDs (payments may reference old leases.tenant_id)
    leaseRows.forEach(t => { tenancyMap[t.id] = { property_id: t.property_id, tenant_id: t.tenant_id }; });

    setLeases(rawTenancies.map(t => {
      const base = isTenancies
        ? { ...t, owner_id: (t as any).manager_id, monthly_rent: (t as any).rent_amount, start_date: (t as any).rent_start_date, end_date: (t as any).rent_end_date }
        : { ...t, owner_id: (t as any).owner_id, monthly_rent: (t as any).monthly_rent, start_date: (t as any).start_date, end_date: (t as any).end_date };
      return {
        ...base,
        tenant_name: tenantMap[t.tenant_id]?.name || '',
        tenant_phone: tenantMap[t.tenant_id]?.phone || '',
        tenant_user_id: tenantMap[t.tenant_id]?.user_id || '',
        property_title: propMap[t.property_id] || '',
      };
    }));
    if (profileRes.data) {
      setProfile({ photo_url: profileRes.data.photo_url, full_name: profileRes.data.full_name, email: profileRes.data.email, phone: profileRes.data.phone || '' });
    }
    setPayments(allPayments.map(p => ({
      ...p,
      tenant_name: tenantMap[p.tenant_id]?.name || '',
      property_title: propMap[tenancyMap[p.tenancy_id]?.property_id || ''] || '',
    })));

    // Fetch maintenance requests for manager's properties
    const propIds = propsRes.data?.map(p => p.id) || [];
    if (propIds.length > 0) {
      const { data: reqs } = await supabase.from('maintenance_requests').select('*').in('property_id', propIds).order('created_at', { ascending: false });
      setMaintenanceReqs((reqs || []).map(r => ({
        ...r,
        tenant_name: tenantMap[r.tenant_id]?.name || '',
        property_title: propMap[r.property_id] || '',
      })));
    }
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' }); return;
    }
    if (passwordForm.new.length < 6) {
      toast({ title: 'Password too short', description: 'Must be at least 6 characters.', variant: 'destructive' }); return;
    }
    setSendingAction('password');
    const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
    setSendingAction('');
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Password updated', description: 'Use your new password next time you sign in.' });
    setPasswordDialogOpen(false);
    setPasswordForm({ current: '', new: '', confirm: '' });
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
    const payload: Record<string, any> = {
      ...form, monthly_rent: Number(form.rent_amount),
      property_type: form.property_type,
      rent_period: form.rent_period,
    };
    delete payload.rent_amount; // DB column is monthly_rent
    delete payload.kitchens;    // not in DB
    delete payload.area;        // not in DB
    if (imageUrls.length > 0) payload.images = imageUrls;

    if (editingProperty) {
      const { error } = await supabase.from('properties').update(payload).eq('id', editingProperty.id);
      setUploading(false);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Property updated!', description: 'Your listing has been updated.' });
    } else {
      payload.owner_id = user.id;
      const { error } = await supabase.from('properties').insert(payload);
      setUploading(false);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Property published!', description: 'Your listing is now live.' });
    }
    setPropDialogOpen(false);
    setEditingProperty(null);
    setForm({ title: '', description: '', property_type: 'Residential', state: '', city: '', area: '', address: '', bedrooms: 1, sitting_rooms: 1, kitchens: 1, bathrooms: 1, rent_amount: 0, rent_period: 'monthly', manager_phone: '', manager_email: '', amenities: [] });
    setImageFiles([]);
    fetchData();
  };

  const handleEditProperty = (p: Property) => {
    setEditingProperty(p);
    setForm({
      title: p.title, description: p.description || '', property_type: p.property_type,
      state: p.state || p.city, city: p.city || '', area: p.area || '', address: p.address || '',
      bedrooms: p.bedrooms, sitting_rooms: p.sitting_rooms, kitchens: p.kitchens, bathrooms: p.bathrooms,
      rent_amount: p.rent_amount, rent_period: p.rent_period, manager_phone: p.manager_phone || '',
      manager_email: p.manager_email || '', amenities: p.amenities || [],
    });
    setImageFiles([]);
    setPropDialogOpen(true);
  };

  const handleDeleteProperty = async () => {
    if (!deleteConfirmProperty) return;
    setSendingAction(`delete-${deleteConfirmProperty.id}`);
    const { error } = await supabase.from('properties').delete().eq('id', deleteConfirmProperty.id);
    setSendingAction('');
    if (error) { toast({ title: 'Error deleting property', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Property deleted', description: 'The listing has been removed.' }); fetchData(); }
    setDeleteConfirmProperty(null);
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPropertyForUnit) return;
    setSendingAction('add-unit');
    const { error } = await supabase.from('rental_units').insert({
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
    setSelectedPropertyForUnit('');
  };

  const apiBase = import.meta.env.VITE_API_URL || '';
  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  };

  const handleCreateTenancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSendingAction('creating');
    setCreatedPassword(null);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}/admin/create-tenant`, {
        method: 'POST', headers,
        body: JSON.stringify({
          email: tenantFormData.email,
          full_name: tenantFormData.full_name,
          phone: tenantFormData.phone || null,
          property_id: tenantFormData.property_id || null,
          rent_start_date: tenantFormData.start_date || null,
          rent_end_date: tenantFormData.end_date || null,
          rent_amount: tenantFormData.monthly_rent || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to create tenant');
      }
      const data = await res.json();
      setCreatedPassword(data.temporary_password);
      toast({ title: 'Tenant created!', description: `Account created for ${tenantFormData.email}` });
      setTenantFormData({ full_name: '', phone: '', email: '', property_id: '', start_date: '', end_date: '', monthly_rent: 0 });
      try { await fetchData(); } catch (e) { console.error('fetchData after create failed', e); }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSendingAction('');
  };

  const handleConfirmPayment = async (payment: PaymentData) => {
    setSendingAction(`confirm-${payment.id}`);
    try {
      await updatePayment(payment.id!, { status: 'confirmed', paid_date: new Date().toISOString().split('T')[0] });
      const { data: profile } = await supabase.from('profiles').select('phone').eq('user_id', payment.tenant_id).single();
      if (profile?.phone) await sendSMS(profile.phone, `Payment CONFIRMED! UGX ${(payment.amount || 0).toLocaleString()} has been confirmed. - Afodabo Housing`);
      toast({ title: 'Payment confirmed', description: 'Tenant notified via SMS.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSendingAction(''); fetchData();
  };

  const handleRejectPayment = async (payment: PaymentData) => {
    setSendingAction(`reject-${payment.id}`);
    try {
      await updatePayment(payment.id!, { status: 'rejected' });
      const { data: profile } = await supabase.from('profiles').select('phone').eq('user_id', payment.tenant_id).single();
      if (profile?.phone) await sendSMS(profile.phone, `Your rent payment (UGX ${(payment.amount || 0).toLocaleString()}) was rejected. - Afodabo Housing`);
      toast({ title: 'Payment rejected', description: 'Tenant notified via SMS.', variant: 'destructive' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSendingAction(''); fetchData();
  };

  const handleUploadAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreementLease || !agreementFile) return;
    setUploadingAgreement(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast({ title: 'Not authenticated', variant: 'destructive' }); return; }
      const formData = new FormData();
      formData.append('file', agreementFile);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/agreements/${agreementLease.id}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      if (res.ok) {
        toast({ title: 'Agreement uploaded' });
        setAgreementDialogOpen(false);
        setAgreementFile(null);
      } else {
        const err = await res.json();
        toast({ title: 'Upload failed', description: err.detail || 'Unknown error', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Upload failed', description: 'Network error', variant: 'destructive' });
    }
    setUploadingAgreement(false);
  };

  const sendRentReminder = async (lease: typeof leases[0]) => {
    if (!lease.tenant_phone) { toast({ title: 'No phone number for this tenant', variant: 'destructive' }); return; }
    setSendingAction(`remind-${lease.id}`);
    const days = differenceInDays(new Date(lease.end_date), new Date());
    await sendSMS(lease.tenant_phone, `RENT REMINDER: Your rent of UGX ${(lease.monthly_rent || 0).toLocaleString()} is due ${days > 0 ? `in ${days} days` : 'TODAY'}! Please pay on Afodabo Housing. Contact: ${user?.email}`);
    toast({ title: 'Reminder sent!', description: `SMS reminder sent to ${lease.tenant_name}` });
    setSendingAction('');
  };

  const toggleAmenity = (a: string) =>
    setForm(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a] }));

  const occupied = properties.filter(p => p.status === 'occupied').length;
  const available = properties.filter(p => p.status === 'available').length;
  const pendingPayments = payments.filter(p => p.status === 'uploaded');
  const confirmedRevenue = payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0);
  const dueSoonTenancies = leases.filter(l => {
    if (l.status !== 'active') return false;
    const d = differenceInDays(new Date(l.end_date), new Date());
    return d <= 14 && d >= 0;
  });

  const statCards = [
    { label: 'Total Listings', val: properties.length, sub: `${available} available · ${occupied} occupied`, icon: <Building2 className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/10', trend: null },
    { label: 'Active Tenants', val: leases.filter(t => t.status === 'active').length, sub: `${dueSoonTenancies.length} rent due soon`, icon: <Users className="h-5 w-5" />, color: 'text-accent', bg: 'bg-accent/10', trend: null },
    { label: 'Revenue Confirmed', val: `UGX ${confirmedRevenue >= 1000000 ? (confirmedRevenue / 1000000).toFixed(1) + 'M' : confirmedRevenue.toLocaleString()}`, sub: `${pendingPayments.length} awaiting review`, icon: <DollarSign className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/10', trend: null },
  ];

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex flex-col h-full ${mobile ? '' : 'w-60 shrink-0'}`}>
      {/* Brand */}
      <div className="px-5 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-display font-bold text-base shadow">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sidebar-foreground font-semibold text-sm truncate">{user?.email?.split('@')[0]}</p>
            <p className="text-sidebar-foreground/50 text-xs">House Manager</p>
          </div>
        </div>
      </div>
      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const badge = item.id === 'payments' ? pendingPayments.length : 0;
          return (
            <button
              key={item.id}
              onClick={() => { setTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === item.id
                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'}`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {badge > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${tab === item.id ? 'bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground' : 'bg-sidebar-primary/30 text-sidebar-primary'}`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {/* Quick actions */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <button
          onClick={() => { setShowTenantForm(true); setSidebarOpen(false); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all"
        >
          <UserPlus className="h-4 w-4" /><span>Add Tenant</span>
        </button>
        <button
          onClick={() => {
            setForm({ title: '', description: '', property_type: 'Residential', state: '', city: '', area: '', address: '', bedrooms: 1, sitting_rooms: 1, kitchens: 1, bathrooms: 1, rent_amount: 0, rent_period: 'monthly', manager_phone: profile?.phone || '', manager_email: profile?.email || '', amenities: [] });
            setEditingProperty(null);
            setPropDialogOpen(true); setSidebarOpen(false);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-sidebar-primary hover:bg-sidebar-accent transition-all"
        >
          <Plus className="h-4 w-4" /><span>Add Property</span>
        </button>
      </div>
      <div className="px-3 pb-3">
        <button onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="h-4 w-4" /><span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border min-h-[calc(100vh-64px)] sticky top-16 self-start h-[calc(100vh-64px)] overflow-y-auto w-60 shrink-0">
          <Sidebar />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-sidebar flex flex-col shadow-xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-sidebar-border">
                <span className="text-sidebar-foreground font-display font-bold">Menu</span>
                <button onClick={() => setSidebarOpen(false)} className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Sidebar mobile />
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-64px)]">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors">
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <h1 className="font-display font-bold text-xl text-foreground capitalize">{tab === 'overview' ? 'Dashboard' : tab}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Property Manager · Afodabohousing</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={fetchData} disabled={loading} className="gap-2 h-8 text-xs">
              <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {showTenantForm ? (
              <div className="max-w-2xl mx-auto">
                <button onClick={() => setShowTenantForm(false)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                  <ArrowLeft className="h-4 w-4" /> Back to Tenants
                </button>
                <h2 className="font-display font-bold text-2xl mb-1">Add Tenant</h2>
                <p className="text-sm text-muted-foreground mb-8">Create a tenant account with a temporary password.</p>
                {createdPassword ? (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                      <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-emerald-800">Tenant Account Created</p>
                      <p className="text-xs text-emerald-600 mt-1">Share this temporary password with the tenant</p>
                    </div>
                    <div className="bg-muted rounded-xl p-4">
                      <label className="text-xs font-medium text-muted-foreground">Temporary Password</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono select-all">{createdPassword}</code>
                        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(createdPassword); setCopiedPwd(true); }} className="shrink-0 gap-1.5">
                          {copiedPwd ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedPwd ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                    <Button className="w-full" variant="outline" onClick={() => { setShowTenantForm(false); setTab('tenants'); setCreatedPassword(null); setCopiedPwd(false); fetchData(); }}>
                      Done
                    </Button>
                  </div>
                ) : (
                <form onSubmit={handleCreateTenancy} className="space-y-6">
                  <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                    <h3 className="font-display font-semibold text-base">Personal Details</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <Label>Full Name</Label>
                        <Input value={tenantFormData.full_name} onChange={e => setTenantFormData(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. John Mugisha" required className="mt-1" />
                      </div>
                      <div>
                        <Label>WhatsApp Phone</Label>
                        <div className="relative mt-1">
                          <Input value={tenantFormData.phone} onChange={e => setTenantFormData(f => ({ ...f, phone: e.target.value }))} placeholder="+256 788 100145" required className="pl-9" />
                          <MessageCircle className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                        </div>
                      </div>
                      <div>
                        <Label>Email Address</Label>
                        <Input type="email" value={tenantFormData.email} onChange={e => setTenantFormData(f => ({ ...f, email: e.target.value }))} placeholder="tenant@example.com" required className="mt-1" />
                      </div>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                    <h3 className="font-display font-semibold text-base">Property & Lease Details</h3>
                    <div>
                      <Label>Assigned Property</Label>
                      <Select value={tenantFormData.property_id} onValueChange={v => {
                        const p = properties.find(pr => pr.id === v);
                        setTenantFormData(f => ({ ...f, property_id: v, monthly_rent: p?.monthly_rent || p?.rent_amount || 0 }));
                      }}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select property..." /></SelectTrigger>
                        <SelectContent>
                          {properties.filter(p => p.status !== 'inactive').map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.title} — {p.status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Start Date</Label><Input type="date" value={tenantFormData.start_date} onChange={e => setTenantFormData(f => ({ ...f, start_date: e.target.value }))} required className="mt-1" /></div>
                      <div><Label>End Date</Label><Input type="date" value={tenantFormData.end_date} onChange={e => setTenantFormData(f => ({ ...f, end_date: e.target.value }))} required className="mt-1" /></div>
                      <div><Label>Monthly Rent (UGX)</Label><Input type="number" value={tenantFormData.monthly_rent || ''} onChange={e => setTenantFormData(f => ({ ...f, monthly_rent: Number(e.target.value) }))} className="mt-1" /></div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={sendingAction === 'creating'} className="gradient-primary text-primary-foreground">
                      {sendingAction === 'creating' ? 'Creating...' : 'Create Tenant'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowTenantForm(false)}>Cancel</Button>
                  </div>
                </form>
                )}
              </div>
            ) : (
            <>
            {/* Alerts */}
            {pendingPayments.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="bg-primary/10 rounded-xl p-2 shrink-0"><DollarSign className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{pendingPayments.length} payment proof{pendingPayments.length > 1 ? 's' : ''} awaiting your review</p>
                  <p className="text-xs text-muted-foreground">Review and confirm or reject to notify tenants</p>
                </div>
                <Button size="sm" className="gradient-primary text-primary-foreground shrink-0 gap-1 text-xs h-8" onClick={() => setTab('payments')}>
                  Review <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            {dueSoonTenancies.length > 0 && (
              <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-start gap-3">
                <div className="bg-accent/10 rounded-xl p-2 shrink-0"><AlertTriangle className="h-4 w-4 text-accent" /></div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm mb-2">{dueSoonTenancies.length} tenant{dueSoonTenancies.length > 1 ? 's' : ''} with rent expiring within 14 days</p>
                  <div className="flex flex-wrap gap-2">
                    {dueSoonTenancies.map(t => {
                      const d = differenceInDays(new Date(t.end_date), new Date());
                      return (
                        <div key={t.id} className="flex items-center gap-1.5 bg-card rounded-lg px-3 py-1 border border-border text-xs">
                          <span className="font-semibold">{t.tenant_name}</span>
                          <Badge className={`text-xs py-0 ${d <= 7 ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'}`}>{d}d</Badge>
                          <button className="text-accent hover:text-accent/80 font-medium ml-1" onClick={() => sendRentReminder(t)} disabled={sendingAction === `remind-${t.id}`}>
                            {sendingAction === `remind-${t.id}` ? '...' : 'Remind'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div className="space-y-6">
                {/* Stat Cards */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  {statCards.map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-2xl p-5 shadow-card hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`${s.bg} ${s.color} w-10 h-10 rounded-xl flex items-center justify-center`}>{s.icon}</div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-2xl font-display font-bold text-foreground">{loading ? <div className="h-7 w-16 bg-muted animate-pulse rounded" /> : s.val}</div>
                      <div className="text-sm font-semibold text-foreground mt-1">{s.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Revenue Breakdown */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    <div className="flex items-center gap-2 mb-5">
                      <BarChart2 className="h-5 w-5 text-primary" />
                      <h3 className="font-display font-semibold text-base">Revenue Breakdown</h3>
                    </div>
                    {[
                      { label: 'Confirmed', val: payments.filter(p => p.status === 'confirmed').reduce((s, p) => s + p.amount, 0), color: 'bg-accent', textColor: 'text-accent' },
                      { label: 'Awaiting Review', val: payments.filter(p => p.status === 'uploaded').reduce((s, p) => s + p.amount, 0), color: 'bg-primary', textColor: 'text-primary' },
                      { label: 'Pending Upload', val: payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0), color: 'bg-muted-foreground', textColor: 'text-muted-foreground' },
                    ].map(r => {
                      const total = payments.reduce((s, p) => s + p.amount, 0);
                      const pct = total > 0 ? Math.round((r.val / total) * 100) : 0;
                      return (
                        <div key={r.label} className="mb-4">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-sm text-muted-foreground">{r.label}</span>
                            <span className={`text-sm font-bold ${r.textColor}`}>UGX {(r.val || 0).toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${r.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pending Payments Queue */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-accent" />
                        <h3 className="font-display font-semibold text-base">Payment Queue</h3>
                      </div>
                      {pendingPayments.length > 0 && (
                        <Badge className="bg-accent/10 text-accent border border-accent/20 text-xs">{pendingPayments.length} pending</Badge>
                      )}
                    </div>
                    {pendingPayments.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="h-10 w-10 text-accent/40 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm font-medium">All caught up!</p>
                        <p className="text-muted-foreground text-xs mt-1">No payments awaiting review</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingPayments.slice(0, 4).map(p => (
                          <div key={p.id} className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {(p.tenant_name || 'T').charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{p.tenant_name || 'Tenant'}</p>
                              <p className="text-xs text-muted-foreground">UGX {(p.amount || 0).toLocaleString()} · {format(new Date(p.created_at), 'MMM dd')}</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <Button size="sm" className="gradient-primary text-primary-foreground h-7 w-7 p-0" disabled={!!sendingAction} onClick={() => handleConfirmPayment(p)}>
                                <CheckCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 w-7 p-0" disabled={!!sendingAction} onClick={() => handleRejectPayment(p)}>
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {pendingPayments.length > 4 && (
                          <button onClick={() => setTab('payments')} className="w-full text-xs text-center text-primary hover:underline py-1">
                            View all {pendingPayments.length} pending →
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Property Status */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-accent" />
                        <h3 className="font-display font-semibold text-base">Properties</h3>
                      </div>
                      <button onClick={() => setTab('properties')} className="text-xs text-primary hover:underline flex items-center gap-1">
                        Manage <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-accent/5 rounded-xl p-3 text-center"><span className="text-lg font-bold text-accent">{available}</span><p className="text-xs text-muted-foreground">Available</p></div>
                      <div className="bg-primary/5 rounded-xl p-3 text-center"><span className="text-lg font-bold text-primary">{occupied}</span><p className="text-xs text-muted-foreground">Occupied</p></div>
                    </div>
                    {properties.length === 0 ? (
                      <div className="text-center py-8">
                        <Building2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm font-medium">No properties yet</p>
                        <Button size="sm" className="mt-3 gradient-primary text-primary-foreground text-xs" onClick={() => setPropDialogOpen(true)}>
                          <Plus className="h-3 w-3 mr-1" /> Add First Property
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {properties.slice(0, 5).map(p => (
                          <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                            <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                              <Home className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
                              <p className="text-xs text-muted-foreground">{p.state || p.city} · UGX {(p.rent_amount || 0).toLocaleString()}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize shrink-0 ${statusBadge(p.status)}`}>{p.status}</span>
                            <button onClick={() => navigate(`/dashboard/manager/boost/${p.id}`)} className="text-xs text-primary hover:underline font-medium shrink-0 ml-1">
                              Boost
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Overdue Tenants */}
                  <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <h3 className="font-display font-semibold text-base">Overdue</h3>
                      </div>
                      {leases.filter(l => l.is_overdue).length > 0 && (
                        <Badge className="bg-destructive/10 text-destructive border border-destructive/20 text-xs">{leases.filter(l => l.is_overdue).length} overdue</Badge>
                      )}
                    </div>
                    {leases.filter(l => l.is_overdue).length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="h-10 w-10 text-accent/40 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm font-medium">All caught up!</p>
                        <p className="text-muted-foreground text-xs mt-1">No overdue balances</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {leases.filter(l => l.is_overdue).slice(0, 5).map(t => (
                          <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                            <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                              <DollarSign className="h-4 w-4 text-destructive" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{t.tenant_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{t.property_title || ''}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-destructive">UGX {(t.balance_due || 0).toLocaleString()}</p>
                              {t.end_date && (
                                <p className={`text-xs font-semibold ${differenceInDays(new Date(t.end_date), new Date()) < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {differenceInDays(new Date(t.end_date), new Date()) < 0 ? `${Math.abs(differenceInDays(new Date(t.end_date), new Date()))}d past` : `${differenceInDays(new Date(t.end_date), new Date())}d left`}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* PROPERTIES */}
            {tab === 'properties' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-xl">My Properties</h2>
                    <p className="text-sm text-muted-foreground">{properties.length} listings · {available} available · {occupied} occupied</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setUnitDialogOpen(true)}>
                      <Layers className="h-3.5 w-3.5" /> Add Unit
                    </Button>
                    <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5 text-xs h-8" onClick={() => setPropDialogOpen(true)}>
                      <Plus className="h-3.5 w-3.5" /> Add Property
                    </Button>
                  </div>
                </div>
                {properties.length === 0 ? (
                  <div className="text-center py-24 bg-card border border-border rounded-2xl">
                    <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
                    <p className="text-xl font-display font-bold text-foreground">No properties listed yet</p>
                    <p className="text-sm mt-2 text-muted-foreground">Click "Add Property" to publish your first listing</p>
                    <Button className="mt-4 gradient-primary text-primary-foreground" onClick={() => setPropDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Add Property
                    </Button>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-secondary border-b border-border">
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Property</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Location</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Rent / Period</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                            <th className="text-left py-3 px-4 font-semibold text-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {properties.map(p => (
                            <tr key={p.id} className="border-b border-border hover:bg-muted/30 transition-colors last:border-0">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <Home className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-foreground truncate max-w-[200px]">{p.title}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{p.property_type.replace('_', ' ')}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-muted-foreground">{p.state || p.city}{p.area ? ` · ${p.area}` : ''}</td>
                              <td className="py-3.5 px-4">
                                  <span className="font-bold text-foreground">UGX {(p.rent_amount || 0).toLocaleString()}</span>
                                <span className="text-xs text-muted-foreground ml-1 capitalize">/{p.rent_period.slice(0, 2)}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(p.status)}`}>{p.status}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                 <div className="flex gap-1.5 flex-wrap">
                                   <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate(`/properties/${p.id}`)}>
                                     <Eye className="h-3 w-3" />View
                                   </Button>
                                   <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleEditProperty(p)}>
                                     <Pencil className="h-3 w-3" />Edit
                                   </Button>
                                   <Button
                                     size="sm"
                                     variant={p.status !== 'inactive' ? 'secondary' : 'default'}
                                     className={`h-7 text-xs ${p.status === 'inactive' ? 'gradient-primary text-primary-foreground' : ''}`}
                                     disabled={!!sendingAction}
                                     onClick={async () => {
                                       setSendingAction(p.id);
                                       await supabase.from('properties').update({ status: p.status !== 'inactive' ? 'inactive' : 'available' }).eq('id', p.id);
                                       toast({ title: p.status !== 'inactive' ? 'Property deactivated' : 'Property activated' });
                                       setSendingAction(''); fetchData();
                                     }}
                                   >
                                     {sendingAction === p.id ? '...' : p.status !== 'inactive' ? 'Deactivate' : 'Activate'}
                                   </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate(`/dashboard/manager/boost/${p.id}`)}>
                                    <TrendingUp className="h-3 w-3" />Boost
                                  </Button>
                                  <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => setDeleteConfirmProperty(p)}>
                                    <Trash2 className="h-3 w-3" />Delete
                                  </Button>
                                 </div>
                               </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TENANCIES */}
            {tab === 'tenants' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-xl">Tenants</h2>
                    <p className="text-sm text-muted-foreground">{leases.filter(t => t.status === 'active').length} active · {leases.filter(t => t.status !== 'active').length} historical</p>
                  </div>
                  <Button size="sm" className="gradient-primary text-primary-foreground gap-1.5 text-xs h-8" onClick={() => setShowTenantForm(true)}>
                    <UserPlus className="h-3.5 w-3.5" /> Add Tenant
                  </Button>
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold">Tenant</th>
                          <th className="text-left py-3 px-4 font-semibold">Property</th>
                          <th className="text-left py-3 px-4 font-semibold">Rent</th>
                          <th className="text-left py-3 px-4 font-semibold">Expires</th>
                          <th className="text-left py-3 px-4 font-semibold">Status</th>
                          <th className="text-left py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leases.length === 0 ? (
                          <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="font-display font-semibold text-foreground">No tenants linked yet</p>
                            <p className="text-xs mt-1">Click "Add Tenant" to register a new tenant</p>
                          </td></tr>
                        ) : leases.map(t => {
                          const days = differenceInDays(new Date(t.end_date), new Date());
                          return (
                            <tr key={t.id} className="hover:bg-muted/20 transition-colors border-b border-border/30">
                              <td className="py-3.5 px-4">
                                <div className="text-sm font-semibold text-foreground">{t.tenant_name || 'Unknown'}</div>
                                <div className="text-xs text-muted-foreground">{t.tenant_phone || ''}</div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="text-sm text-foreground">{t.property_title || '-'}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-bold text-foreground">UGX {(t.monthly_rent || 0).toLocaleString()}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="text-sm text-foreground">{format(new Date(t.end_date), 'MMM dd, yyyy')}</div>
                                <div className={`text-xs font-semibold ${days < 0 ? 'text-destructive' : days <= 7 ? 'text-destructive' : days <= 14 ? 'text-accent' : 'text-muted-foreground'}`}>
                                  {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(t.status)}`}>{t.status}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex gap-1.5">
                                  {t.tenant_phone && (
                                    <a href={`https://wa.me/${t.tenant_phone.replace(/[^0-9]/g, '')}`}
                                      target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors">
                                      WhatsApp
                                    </a>
                                  )}
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={sendingAction === `remind-${t.id}`} onClick={() => sendRentReminder(t)}>
                                    <Bell className="h-3 w-3" />{sendingAction === `remind-${t.id}` ? '...' : 'Remind'}
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                    onClick={() => { setAgreementLease(t); setAgreementFile(null); setAgreementDialogOpen(true); }}>
                                    <Upload className="h-3 w-3" /> Agreement
                                  </Button>
                                  {t.tenant_user_id && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                      disabled={sendingAction === `otp-${t.id}`}
                                      onClick={async () => {
                                        setSendingAction(`otp-${t.id}`);
                                        try {
                                          const h = await getHeaders();
                                          const r = await fetch(`${apiBase}/admin/reset-tenant-password`, {
                                            method: 'POST', headers: h,
                                            body: JSON.stringify({ user_id: t.tenant_user_id }),
                                          });
                                          if (!r.ok) throw new Error(((await r.json().catch(() => ({}))).detail || r.statusText));
                                          const d = await r.json();
                                          setOtpPassword(d.temporary_password);
                                          toast({ title: 'New OTP generated' });
                                        } catch (err: any) { toast({ title: 'OTP Error', description: err.message, variant: 'destructive' }); }
                                        setSendingAction('');
                                      }}>
                                      <KeyRound className="h-3 w-3" />{sendingAction === `otp-${t.id}` ? '...' : 'OTP'}
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                                    disabled={sendingAction === `deact-${t.id}`}
                              onClick={async () => {
                                setSendingAction(`deact-${t.id}`);
                                const { error } = await supabase.from('leases').update({ status: 'inactive' }).eq('id', t.id);
                                if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                                else { toast({ title: 'Tenancy deactivated' }); fetchData(); }
                                setSendingAction('');
                              }}>
                                    <Ban className="h-3 w-3" />{sendingAction === `deact-${t.id}` ? '...' : 'Deactivate'}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* PAYMENTS */}
            {tab === 'payments' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-xl">Payments</h2>
                    <p className="text-sm text-muted-foreground">{payments.length} records · {pendingPayments.length} awaiting review</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    {[
                      { label: 'Confirmed', val: payments.filter(p => p.status === 'confirmed').length, color: 'text-accent' },
                      { label: 'Pending', val: pendingPayments.length, color: 'text-primary' },
                      { label: 'Rejected', val: payments.filter(p => p.status === 'rejected').length, color: 'text-destructive' },
                    ].map(s => (
                      <div key={s.label} className="bg-card border border-border rounded-xl px-3 py-1.5 text-center">
                        <div className={`font-bold ${s.color}`}>{s.val}</div>
                        <div className="text-muted-foreground text-xs">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold">Tenant</th>
                          <th className="text-left py-3 px-4 font-semibold">Amount</th>
                          <th className="text-left py-3 px-4 font-semibold">Period</th>
                          <th className="text-left py-3 px-4 font-semibold">Date</th>
                          <th className="text-left py-3 px-4 font-semibold">Notes</th>
                          <th className="text-left py-3 px-4 font-semibold">Status</th>
                          <th className="text-left py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.length === 0 ? (
                          <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">
                            <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="font-display font-semibold text-foreground">No payments yet</p>
                          </td></tr>
                        ) : payments.map(p => (
                          <tr key={p.id} className={`border-b border-border hover:bg-muted/30 transition-colors last:border-0 ${p.status === 'uploaded' ? 'bg-primary/3' : ''}`}>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-secondary text-muted-foreground font-bold text-xs flex items-center justify-center shrink-0">
                                  {(p.tenant_name || 'T').charAt(0)}
                                </div>
                                <span className="font-semibold text-foreground">{p.tenant_name || 'Unknown'}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-foreground">UGX {(p.amount || 0).toLocaleString()}</td>
                            <td className="py-3.5 px-4 text-muted-foreground text-xs">{p.period_start} – {p.period_end}</td>
                            <td className="py-3.5 px-4 text-muted-foreground text-xs">{format(new Date(p.created_at), 'MMM dd, yyyy')}</td>
                            <td className="py-3.5 px-4 text-muted-foreground text-xs max-w-[160px] truncate">{p.notes || '—'}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${statusBadge(p.status)}`}>{p.status}</span>
                            </td>
                            <td className="py-3.5 px-4">
                              {p.status === 'uploaded' ? (
                                <div className="flex gap-1.5">
                                  <Button size="sm" className="gradient-primary text-primary-foreground h-7 text-xs gap-1" disabled={!!sendingAction} onClick={() => handleConfirmPayment(p)}>
                                    <CheckCircle className="h-3 w-3" />Confirm
                                  </Button>
                                  <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" disabled={!!sendingAction} onClick={() => handleRejectPayment(p)}>
                                    <XCircle className="h-3 w-3" />Reject
                                  </Button>
                                </div>
                              ) : p.proof_url ? (
                                <a href={p.proof_url} target="_blank" rel="noopener noreferrer">
                                  <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"><Eye className="h-3 w-3" />Proof</Button>
                                </a>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* REQUESTS */}
            {tab === 'requests' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-xl">Maintenance Requests</h2>
                    <p className="text-sm text-muted-foreground">{maintenanceReqs.filter(r => r.status === 'open' || r.status === 'in_progress').length} open · {maintenanceReqs.filter(r => r.status === 'resolved' || r.status === 'completed').length} resolved</p>
                  </div>
                </div>
                {maintenanceReqs.length === 0 ? (
                  <div className="text-center py-24 bg-card border border-border rounded-2xl">
                    <Wrench className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
                    <p className="text-xl font-display font-bold text-foreground">No maintenance requests</p>
                    <p className="text-sm mt-2 text-muted-foreground">Tenants haven't submitted any requests yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {maintenanceReqs.map(r => {
                      const days = differenceInDays(new Date(r.created_at), new Date());
                      return (
                        <div key={r.id} className="bg-card border border-border rounded-2xl p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                                  r.priority === 'high' ? 'bg-destructive' :
                                  r.priority === 'medium' ? 'bg-gold' : 'bg-success'
                                }`} />
                                <p className="font-semibold text-foreground">{r.title}</p>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.description}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                                <span>{r.property_title || 'Unknown property'}</span>
                                {r.tenant_name && <span>· {r.tenant_name}</span>}
                                <span>· {r.created_at ? format(new Date(r.created_at), 'MMM dd, yyyy') : ''}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusBadge(r.status === 'completed' ? 'confirmed' : r.status)}`}>
                                {r.status === 'completed' ? 'Resolved' : r.status === 'in_progress' ? 'In progress' : r.status}
                              </span>
                              <div className="flex gap-1.5">
                                {r.status === 'open' && (
                                  <Button size="sm" className="gradient-primary text-primary-foreground h-7 text-xs gap-1"
                                    disabled={sendingAction === `start-${r.id}`}
                                    onClick={async () => {
                                      setSendingAction(`start-${r.id}`);
                                      await supabase.from('maintenance_requests').update({ status: 'in_progress' }).eq('id', r.id);
                                      toast({ title: 'Request marked in progress' });
                                      setSendingAction(''); fetchData();
                                    }}>
                                    <Clock className="h-3 w-3" /> Start
                                  </Button>
                                )}
                                {(r.status === 'open' || r.status === 'in_progress') && (
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                    disabled={sendingAction === `done-${r.id}`}
                                    onClick={async () => {
                                      setSendingAction(`done-${r.id}`);
                                      await supabase.from('maintenance_requests').update({ status: 'completed', completed_date: new Date().toISOString().split('T')[0] }).eq('id', r.id);
                                      toast({ title: 'Request resolved' });
                                      setSendingAction(''); fetchData();
                                    }}>
                                    <CheckCircle className="h-3 w-3" /> Resolve
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* PROFILE */}
            {tab === 'account' && (
              <div className="max-w-lg">
                <h2 className="font-display font-bold text-xl mb-6">Profile</h2>
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                  <AvatarUpload
                    userId={user?.id || ''}
                    photoUrl={profile?.photo_url || null}
                    fullName={profile?.full_name || ''}
                    email={profile?.email || user?.email || ''}
                    size="xl"
                    onUpdate={(url) => setProfile(p => p ? { ...p, photo_url: url } : p)}
                  />
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                      <p className="text-sm font-semibold text-foreground">{profile?.full_name || '—'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Email</label>
                      <p className="text-sm font-semibold text-foreground">{profile?.email || user?.email || '—'}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setPasswordDialogOpen(true)}>
                    Change Password
                  </Button>
                </div>
              </div>
            )}
            </>)}
          </div>
        </main>
      </div>

      {/* Add / Edit Property Dialog */}
      <Dialog open={propDialogOpen} onOpenChange={o => { setPropDialogOpen(o); if (!o) setEditingProperty(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editingProperty ? 'Edit Property' : 'List New Property'}</DialogTitle>
            <DialogDescription>{editingProperty ? 'Update your listing details below.' : 'Fill in the details to publish your listing on Afodabohousing.'}</DialogDescription>
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
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Office Space">Office Space</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>State / District</Label>
                <Select value={form.state} onValueChange={v => setForm({ ...form, state: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select location..." /></SelectTrigger>
                  <SelectContent>{DISTRICTS_LIST.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
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
              <div className="mt-1 border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => fileRef.current?.click()}>
                {imageFiles.length > 0 ? (
                  <div className="space-y-1">
                    {imageFiles.map(f => <p key={f.name} className="text-sm text-primary font-medium">{f.name}</p>)}
                    <p className="text-xs text-muted-foreground mt-2">Click to add more</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload property photos</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => setImageFiles(Array.from(e.target.files || []))} />
            </div>
            <Button type="submit" disabled={uploading} className="w-full gradient-primary text-primary-foreground">
              {uploading ? 'Saving...' : editingProperty ? 'Save Changes' : 'Publish Listing'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Unit Dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Add Rental Unit</DialogTitle>
            <DialogDescription>Add an individual rentable unit to a multi-unit property.</DialogDescription>
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
              <div><Label>Unit Number / Name</Label><Input value={unitForm.unit_number} onChange={e => setUnitForm(f => ({ ...f, unit_number: e.target.value }))} placeholder="e.g. A1, 2B, Room 5" required className="mt-1" /></div>
              <div><Label>Floor Level</Label><Input value={unitForm.floor_level} onChange={e => setUnitForm(f => ({ ...f, floor_level: e.target.value }))} placeholder="e.g. Ground, 1st" className="mt-1" /></div>
              <div><Label>Bedrooms</Label><Input type="number" min={0} value={unitForm.bedrooms} onChange={e => setUnitForm(f => ({ ...f, bedrooms: Number(e.target.value) }))} className="mt-1" /></div>
              <div><Label>Bathrooms</Label><Input type="number" min={0} value={unitForm.bathrooms} onChange={e => setUnitForm(f => ({ ...f, bathrooms: Number(e.target.value) }))} className="mt-1" /></div>
              <div><Label>Sitting Rooms</Label><Input type="number" min={0} value={unitForm.sitting_rooms} onChange={e => setUnitForm(f => ({ ...f, sitting_rooms: Number(e.target.value) }))} className="mt-1" /></div>
              <div><Label>Kitchens</Label><Input type="number" min={0} value={unitForm.kitchens} onChange={e => setUnitForm(f => ({ ...f, kitchens: Number(e.target.value) }))} className="mt-1" /></div>
              <div className="col-span-2"><Label>Rent Amount (UGX)</Label><Input type="number" min={0} value={unitForm.rent_amount || ''} onChange={e => setUnitForm(f => ({ ...f, rent_amount: Number(e.target.value) }))} required placeholder="e.g. 450000" className="mt-1" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={unitForm.description} onChange={e => setUnitForm(f => ({ ...f, description: e.target.value }))} rows={2} className="mt-1" placeholder="Any specific details about this unit..." /></div>
            <Button type="submit" disabled={sendingAction === 'add-unit' || !selectedPropertyForUnit} className="w-full gradient-primary text-primary-foreground">
              {sendingAction === 'add-unit' ? 'Adding...' : 'Add Unit'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Change Password</DialogTitle>
            <DialogDescription>Update your account password.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
            <div>
              <Label>New Password</Label>
              <Input type="password" minLength={6} value={passwordForm.new} onChange={e => setPasswordForm(f => ({ ...f, new: e.target.value }))} required placeholder="At least 6 characters" className="mt-1" />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input type="password" minLength={6} value={passwordForm.confirm} onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} required placeholder="Repeat the new password" className="mt-1" />
            </div>
            <Button type="submit" disabled={sendingAction === 'password'} className="w-full gradient-primary text-primary-foreground">
              {sendingAction === 'password' ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Agreement Dialog */}
      <Dialog open={agreementDialogOpen} onOpenChange={o => { if (!o) { setAgreementDialogOpen(false); setAgreementFile(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Tenancy Agreement</DialogTitle>
            <DialogDescription>
              Upload a signed agreement PDF or image for {agreementLease?.tenant_name || 'this tenant'}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUploadAgreement} className="space-y-4 mt-4">
            <div>
              <Label>Agreement Document</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
                onChange={e => setAgreementFile(e.target.files?.[0] || null)}
                required className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">PDF or image files accepted</p>
            </div>
            <Button type="submit" disabled={!agreementFile || uploadingAgreement} className="w-full">
              {uploadingAgreement ? 'Uploading...' : 'Upload Agreement'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Property Confirmation */}
      <AlertDialog open={!!deleteConfirmProperty} onOpenChange={o => { if (!o) setDeleteConfirmProperty(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{deleteConfirmProperty?.title}</strong>?
              This will remove it from all listings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteProperty}
              disabled={sendingAction.startsWith('delete-')}
            >
              {sendingAction.startsWith('delete-') ? 'Deleting...' : 'Delete Property'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!otpPassword} onOpenChange={o => { if (!o) setOtpPassword(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New One-Time Password</DialogTitle>
            <DialogDescription>Share this temporary password with the tenant. They can change it after logging in.</DialogDescription>
          </DialogHeader>
          <div className="bg-muted rounded-xl p-4 mt-2">
            <label className="text-xs font-medium text-muted-foreground">Temporary Password</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono select-all">{otpPassword}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(otpPassword || ''); toast({ title: 'Copied!' }); }} className="shrink-0 gap-1.5">
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          </div>
          <Button className="w-full" variant="outline" onClick={() => setOtpPassword(null)}>Done</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
