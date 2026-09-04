import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import AvatarUpload from '@/components/AvatarUpload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft, Building2, Users, Calendar, Activity,
  Shield, Home, Sparkles,
} from 'lucide-react';

type ManagerProfile = {
  user_id: string; email: string; full_name: string | null;
  photo_url: string | null; role: string; status: string;
  created_at: string | null;
  property_count: number;
  tenants_count: number;
  overdue_tenants: number;
  total_outstanding: number;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_id: string | null;
  subscription_days_remaining: number;
  boosted_count: number;
  activity: { timestamp: string; kind: string; title: string }[];
};

type AssignedProperty = {
  id: string; title: string; status: string;
  property_type: string | null; city: string | null;
  monthly_rent: number | null; bedrooms: number | null;
  bathrooms: number | null; is_boosted: boolean;
};

type ActivityEntry = {
  timestamp: string; kind: string; title: string;
};

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  suspended: 'text-red-700 bg-red-50 border-red-200',
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
};

const now = new Date();

function timeAgo(iso: string): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ManagerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ManagerProfile | null>(null);
  const [properties, setProperties] = useState<AssignedProperty[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspending, setSuspending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmAmount, setConfirmAmount] = useState('');

  const isSuperAdmin = role === 'super_admin';

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/admin/users/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Failed to load manager');
      const data = await res.json();
      setProfile({
        user_id: data.user_id,
        email: data.email || '',
        full_name: data.full_name,
        photo_url: data.photo_url,
        role: data.role || '',
        status: data.status || 'active',
        created_at: data.created_at,
        property_count: data.property_count || 0,
        tenants_count: data.tenants_count || 0,
        overdue_tenants: data.overdue_tenants || 0,
        total_outstanding: data.total_outstanding || 0,
        subscription_plan: data.subscription_plan || null,
        subscription_status: data.subscription_status || null,
        subscription_id: data.subscription_id || null,
        subscription_days_remaining: data.subscription_days_remaining || 0,
        boosted_count: data.boosted_count || 0,
      });
      setProperties(data.properties || []);
      setActivity(data.activity || []);
    } catch (err) {
      toast({ title: 'Error loading manager', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleToggleStatus = async () => {
    if (!profile) return;
    setSuspending(true);
    const newStatus = profile.status === 'active' ? 'suspended' : 'active';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/admin/users/${profile.user_id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: `Manager ${newStatus}` });
      setProfile(p => p ? { ...p, status: newStatus } : p);
    } catch {
      toast({ title: 'Error updating status', variant: 'destructive' });
    }
    setSuspending(false);
  };

  const handleConfirmSubscription = async () => {
    if (!profile?.subscription_id) return;
    const paid = Number(confirmAmount);
    if (!paid || paid <= 0) {
      toast({ title: 'Enter the paid amount', variant: 'destructive' });
      return;
    }
    setConfirming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/admin/subscriptions/${profile.subscription_id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ paid_amount: paid }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: 'Subscription activated' });
      fetchData();
    } catch {
      toast({ title: 'Confirm failed: amount mismatch or subscription not pending', variant: 'destructive' });
    }
    setConfirming(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6 max-w-5xl mx-auto">
        <div className="h-6 w-24 bg-muted rounded animate-pulse" />
        <div className="flex items-center gap-4 mb-6">
          <div className="h-24 w-24 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-xl font-bold">Manager not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard/super-admin')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      </div>
    );
  }

  const subBadge = profile.subscription_status === 'completed'
    ? profile.subscription_days_remaining > 0
      ? `${profile.subscription_days_remaining} day${profile.subscription_days_remaining === 1 ? '' : 's'} left`
      : 'Expired'
    : profile.subscription_plan
      ? `${profile.subscription_plan} · ${profile.subscription_status || 'pending'}`
      : '—';

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Back */}
        <button onClick={() => navigate('/dashboard/super-admin')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Managers
        </button>

        {/* Header */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-6">
            {isSuperAdmin ? (
              <AvatarUpload
                userId={profile.user_id}
                photoUrl={profile.photo_url}
                fullName={profile.full_name || ''}
                email={profile.email}
                size="xl"
                onUpdate={(url) => setProfile(p => p ? { ...p, photo_url: url } : p)}
              />
            ) : (
              <Avatar className="h-24 w-24 text-2xl ring-2 ring-border shrink-0">
                <AvatarImage src={profile.photo_url || undefined} alt={profile.full_name || profile.email} />
                <AvatarFallback className="bg-muted text-muted-foreground font-display font-bold">
                  {profile.full_name ? profile.full_name.split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase() : profile.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display font-bold text-2xl">{profile.full_name || 'Unnamed'}</h1>
                <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[profile.status] || 'bg-muted text-muted-foreground border-border'}`}>
                  {profile.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
              <div className="flex items-center gap-2 mt-4">
                <Button
                  size="sm"
                  variant={profile.status === 'active' ? 'destructive' : 'default'}
                  className="h-8 text-xs"
                  onClick={handleToggleStatus}
                  disabled={suspending}
                >
                  {suspending ? '...' : profile.status === 'active' ? 'Suspend' : 'Reactivate'}
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                  <Shield className="h-3.5 w-3.5" /> Edit
                </Button>
              </div>
              {profile.subscription_id && profile.subscription_status === 'pending' && (
                <div className="flex items-center gap-2 mt-3">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Paid amount"
                    value={confirmAmount}
                    onChange={e => setConfirmAmount(e.target.value)}
                    className="h-8 w-44 text-xs"
                  />
                  <Button size="sm" variant="default" className="h-8 text-xs gap-1" onClick={handleConfirmSubscription} disabled={confirming}>
                    <Sparkles className="h-3.5 w-3.5" /> {confirming ? '...' : 'Confirm Payment'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Properties', value: profile.property_count, icon: <Building2 className="h-5 w-5" />, color: 'text-primary', bg: 'bg-muted' },
            { label: 'Tenants', value: profile.tenants_count, icon: <Users className="h-5 w-5" />, color: 'text-accent', bg: 'bg-muted' },
            { label: 'Boosted Properties', value: profile.boosted_count, icon: <Sparkles className="h-5 w-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Subscription', value: subBadge, icon: <Calendar className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className={`${s.bg} ${s.color} w-9 h-9 rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
              <div className={`text-xl md:text-2xl font-display font-bold ${String(s.value).length > 12 ? 'text-lg' : ''}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Properties section */}
        <div className="bg-card border border-border rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-display font-semibold text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Assigned Properties
            </h3>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
              <Home className="h-3 w-3" /> Assign Property
            </Button>
          </div>
          {properties.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="font-display font-semibold text-foreground">No properties assigned</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">This manager hasn't been assigned any properties yet.</p>
              <Button size="sm" variant="outline" className="gap-1">
                <Home className="h-3.5 w-3.5" /> Assign Property
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {properties.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-accent shrink-0">
                    <Home className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground text-sm truncate">{p.title}</p>
                      {p.is_boosted && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 border border-amber-200 rounded-full px-1.5 py-0.5">
                          <Sparkles className="h-2.5 w-2.5" /> Boosted
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[p.city, p.property_type, p.bedrooms ? `${p.bedrooms} bed` : '', p.bathrooms ? `${p.bathrooms} bath` : ''].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm shrink-0">
                    <span className="font-semibold text-foreground">
                      {p.monthly_rent ? `${Math.round(p.monthly_rent).toLocaleString()}` : '—'}
                    </span>
                    <Badge variant={p.status === 'occupied' || p.status === 'rented' ? 'default' : 'secondary'} className="capitalize">
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="bg-card border border-border rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold text-base">Activity Log</h3>
          </div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {activity.length === 0 && (
              <p className="px-5 py-3 text-sm text-muted-foreground">No activity yet</p>
            )}
            {activity.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                <div className="h-7 w-7 rounded-lg bg-muted/60 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">{entry.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(entry.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
