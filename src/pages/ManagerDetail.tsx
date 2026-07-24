import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import AvatarUpload from '@/components/AvatarUpload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft, Building2, Users, Calendar, Clock, Activity,
  Shield, Home,
} from 'lucide-react';

type ManagerProfile = {
  user_id: string; email: string; full_name: string | null;
  photo_url: string | null; role: string; status: string;
  created_at: string | null;
};

type AssignedProperty = {
  id: string; title: string; status: string;
  unit_count: number; occupied_units: number;
};

type ActivityEntry = {
  id: string; action: string; timestamp: string; type: string;
};

const now = new Date();

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  suspended: 'text-red-700 bg-red-50 border-red-200',
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
};

const MOCK_ACTIVITY: ActivityEntry[] = [
  { id: '1', action: 'Added new property: Kololo Heights', timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(), type: 'property' },
  { id: '2', action: 'Confirmed payment of UGX 450,000 from Grace Akello', timestamp: new Date(now.getTime() - 5 * 3600000).toISOString(), type: 'payment' },
  { id: '3', action: 'Signed lease for Ntinda Apts — Unit 3B', timestamp: new Date(now.getTime() - 24 * 3600000).toISOString(), type: 'lease' },
  { id: '4', action: 'Created maintenance request: Plumbing issue at Bukoto', timestamp: new Date(now.getTime() - 2 * 24 * 3600000).toISOString(), type: 'maintenance' },
  { id: '5', action: 'Sent rent reminder to 3 tenants', timestamp: new Date(now.getTime() - 3 * 24 * 3600000).toISOString(), type: 'reminder' },
];

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
  const [loading, setLoading] = useState(true);
  const [suspending, setSuspending] = useState(false);

  const isSuperAdmin = role === 'super_admin';

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    const [profileRes, propsRes, tenanciesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', id).single(),
      supabase.from('properties').select('id, title, status').eq('owner_id', id),
      supabase.from('tenancies').select('id, property_id, status').eq('manager_id', id),
    ]);

    if (profileRes.data) {
      setProfile({
        user_id: profileRes.data.user_id,
        email: profileRes.data.email,
        full_name: profileRes.data.full_name,
        photo_url: profileRes.data.photo_url,
        role: profileRes.data.role || '',
        status: profileRes.data.status,
        created_at: profileRes.data.created_at,
      });
    }

    const props = propsRes.data || [];
    const tenancies = tenanciesRes.data || [];

    const occupiedByProperty: Record<string, number> = {};
    tenancies.forEach(t => {
      if (t.status === 'active') {
        occupiedByProperty[t.property_id] = (occupiedByProperty[t.property_id] || 0) + 1;
      }
    });

    setProperties(props.map(p => ({
      id: p.id,
      title: p.title,
      status: p.status,
      unit_count: 1,
      occupied_units: occupiedByProperty[p.id] || 0,
    })));

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

  const activeTenants = properties.reduce((s, p) => s + p.occupied_units, 0);
  const totalUnits = properties.reduce((s, p) => s + p.unit_count, 0);

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
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Properties Managed', value: properties.length, icon: <Building2 className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/10' },
            { label: 'Active Tenants', value: activeTenants, icon: <Users className="h-5 w-5" />, color: 'text-accent', bg: 'bg-accent/10' },
            { label: 'Date Joined', value: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '—', icon: <Calendar className="h-5 w-5" />, color: 'text-sky-600', bg: 'bg-sky-50' },
            { label: 'Last Active', value: 'Today', icon: <Clock className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className={`${s.bg} ${s.color} w-9 h-9 rounded-xl flex items-center justify-center mb-3`}>{s.icon}</div>
              <div className="text-xl md:text-2xl font-display font-bold">{s.value}</div>
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
              {properties.map(p => {
                const occPct = p.unit_count > 0 ? Math.round((p.occupied_units / p.unit_count) * 100) : 0;
                return (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                      <Home className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.unit_count} unit{p.unit_count !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground text-xs">{p.occupied_units}/{p.unit_count} occupied</span>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${occPct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-foreground w-8 text-right">{occPct}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity Log */}
        <div className="bg-card border border-border rounded-2xl shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="font-display font-semibold text-base">Activity Log</h3>
          </div>
          {/* TODO: Replace mock data with real activity_log table queries */}
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {MOCK_ACTIVITY.map(entry => (
              <div key={entry.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                <div className="h-7 w-7 rounded-lg bg-primary/5 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">{entry.action}</p>
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
