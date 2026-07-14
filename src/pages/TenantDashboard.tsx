import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer';
import { useToast } from '@/hooks/use-toast';
import {
  Home, MapPin, Phone, ChevronRight, Building2, Clock, Image, Settings, LogOut
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

type Tab = 'home' | 'settings';

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home className="h-5 w-5" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

export default function TenantDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>('home');
  const [activeLease, setActiveLease] = useState<any>(null);
  const [tenantRecord, setTenantRecord] = useState<any>(null);
  const [managerProfile, setManagerProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });
  const [sendingPassword, setSendingPassword] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const tenantResult = await supabase.from('tenants').select('*, leases!inner(*, properties(*))').eq('user_id', user.id).maybeSingle();
    const tenant = tenantResult.data;
    setTenantRecord(tenant);
    const lease = tenant?.leases?.[0] || null;
    setActiveLease(lease);

    if (lease?.owner_id) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', lease.owner_id).maybeSingle();
      setManagerProfile(profile);
    }
    setLoading(false);
  };

  const daysLeft = activeLease ? differenceInDays(new Date(activeLease.end_date), new Date()) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0;
  const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14;

  const property = activeLease?.properties;

  const activityFeed: any[] = [];

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' }); return;
    }
    if (passwordForm.new.length < 6) {
      toast({ title: 'Password too short', description: 'Must be at least 6 characters.', variant: 'destructive' }); return;
    }
    setSendingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
    setSendingPassword(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Password updated', description: 'Use your new password next time you sign in.' });
    setPasswordDialogOpen(false);
    setPasswordForm({ new: '', confirm: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-16">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Building2 className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-foreground truncate">
              {property?.title || 'My Dashboard'}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {property?.state ? `${property.state} · UGX ${(property.monthly_rent || property.rent_amount || 0).toLocaleString()}/mo` : 'No active lease'}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {/* HOME TAB */}
        {tab === 'home' && (
          <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
            {/* Lease Status Card */}
            {activeLease ? (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Current Lease</p>
                    <h2 className="text-lg font-bold mt-0.5">{property?.title || 'Property'}</h2>
                    {property && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5" /> {property.state}{property.area ? ` · ${property.area}` : ''}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isOverdue ? 'bg-destructive/10 text-destructive' :
                    isDueSoon ? 'bg-accent/10 text-accent' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : 'Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-muted/50 rounded-xl p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Rent</p>
                    <p className="text-base font-bold mt-0.5">UGX {activeLease.monthly_rent?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Days Left</p>
                    <p className={`text-base font-bold mt-0.5 ${isOverdue ? 'text-destructive' : ''}`}>
                      {daysLeft !== null ? (isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">End Date</p>
                    <p className="text-sm font-semibold mt-0.5">{activeLease.end_date ? format(new Date(activeLease.end_date), 'MMM dd') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                    <p className="text-sm font-semibold mt-0.5 text-primary">UGX {activeLease.monthly_rent?.toLocaleString()}</p>
                  </div>
                </div>

                {daysLeft !== null && daysLeft <= 30 && (
                  <button className="w-full mt-3 text-sm font-semibold text-primary bg-primary/5 border border-primary/20 rounded-xl py-2.5 hover:bg-primary/10 transition-colors">
                    Request Renewal
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
                <Building2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-lg font-bold">No active lease</h3>
                <p className="text-sm text-muted-foreground mt-1">Contact your house manager to set up your lease.</p>
              </div>
            )}

            {/* Activity Feed */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Recent Activity
              </h3>
              {activityFeed.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>
              ) : (
                <div className="space-y-0">
                  {activityFeed.map(item => (
                    <div key={item.id} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                        item.isUnread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{format(new Date(item.date), 'MMM dd')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Property Snapshot */}
            {property && (
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Image className="h-4 w-4 text-primary" /> Your Home
                </h3>
                {property.images && property.images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-3">
                    {property.images.slice(0, 5).map((url: string, i: number) => (
                      <img key={i} src={url} alt={`${property.title} ${i + 1}`}
                        className="h-24 w-36 object-cover rounded-xl shrink-0" />
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Bedrooms</p>
                    <p className="font-bold">{property.bedrooms}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Bathrooms</p>
                    <p className="font-bold">{property.bathrooms}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-bold capitalize">{property.property_type?.replace('_', ' ')}</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">District</p>
                    <p className="font-bold">{property.state}</p>
                  </div>
                </div>
                {property.amenities && property.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {property.amenities.map((a: string) => (
                      <span key={a} className="text-xs bg-primary/5 text-primary px-2.5 py-1 rounded-full font-medium">{a}</span>
                    ))}
                  </div>
                )}
                {property.manager_phone && (
                  <a href={`https://wa.me/${property.manager_phone.replace(/[^0-9]/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary font-semibold mt-3 pt-3 border-t border-border">
                    <Phone className="h-4 w-4" /> Chat on WhatsApp · {property.manager_phone}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="p-4 space-y-4 max-w-lg mx-auto w-full">
            {/* Profile Card */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-2xl gradient-primary flex items-center justify-center text-primary-foreground font-display font-bold text-xl shadow-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-base truncate">{user?.email?.split('@')[0]}</p>
                  <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-card border border-border rounded-2xl shadow-sm divide-y divide-border">
              <button
                onClick={() => setPasswordDialogOpen(true)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
              >
                <Settings className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Change Password</p>
                  <p className="text-xs text-muted-foreground">Update your account password</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => supabase.auth.signOut().then(() => navigate('/'))}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">Sign Out</p>
                  <p className="text-xs text-muted-foreground">Log out of your account</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-card border-t border-border">
        <div className="max-w-lg mx-auto flex">
          {NAV_ITEMS.map(item => (
            <button key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                tab === item.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      {/* Change Password Dialog */}
      <Drawer open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Change Password</DrawerTitle>
            <DrawerDescription>Update your account password.</DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleChangePassword} className="px-4 pb-6 space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">New Password</p>
              <Input type="password" minLength={6} value={passwordForm.new}
                onChange={e => setPasswordForm(f => ({ ...f, new: e.target.value }))}
                required placeholder="At least 6 characters" className="rounded-xl h-11" />
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Confirm New Password</p>
              <Input type="password" minLength={6} value={passwordForm.confirm}
                onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
                required placeholder="Repeat the new password" className="rounded-xl h-11" />
            </div>
            <div className="flex gap-3">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1 rounded-xl h-11">Cancel</Button>
              </DrawerClose>
              <Button type="submit" disabled={sendingPassword}
                className="flex-1 rounded-xl h-11 font-bold">
                {sendingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
