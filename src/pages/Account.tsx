import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Building2, LogOut, ChevronRight, KeyRound, Edit3, Camera } from 'lucide-react';

export default function Account() {
  const { user, role, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    loadProfile();
  }, [user, authLoading]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    setProfile(data);
    setLoading(false);
  };

  function initBg(id: string) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
    const hues = [14, 182, 200, 340, 48, 260, 30];
    return `hsl(${hues[Math.abs(h) % hues.length]}, 50%, 45%)`;
  }

  function initials(name: string, email: string) {
    if (name) {
      const parts = name.trim().split(/\s+/);
      return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const dashboardRoute = role === 'super_admin' ? '/dashboard/super-admin'
    : role === 'house_manager' ? '/dashboard/manager'
    : role === 'tenant' ? '/dashboard/tenant'
    : '/';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl">Account</h1>
            <p className="text-sm text-muted-foreground">Manage your profile and settings</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(dashboardRoute)} className="gap-2">
            <Building2 className="h-4 w-4" /> Dashboard
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {profile?.photo_url ? (
              <div className="relative">
                <img src={profile.photo_url} alt="" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-border" />
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <Camera className="h-3.5 w-3.5" />
                </div>
              </div>
            ) : (
              <div className="h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white ring-2 ring-border"
                style={{ backgroundColor: initBg(user?.id || '') }}>
                {initials(profile?.full_name || '', user?.email || '')}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xl text-foreground truncate">
                {profile?.full_name || user?.email?.split('@')[0]}
              </p>
              <p className="text-sm text-muted-foreground capitalize">{role?.replace(/_/g, ' ') || 'User'}</p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 gap-2 rounded-lg"
              onClick={() => navigate('/account/edit')}>
              <Edit3 className="h-4 w-4" /> Edit
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm divide-y divide-border">
          <div className="p-5">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3">Contact Information</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-semibold truncate">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-semibold">{profile?.phone || 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm divide-y divide-border">
          <button onClick={() => navigate('/account/change-password')}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <KeyRound className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Change Password</p>
              <p className="text-xs text-muted-foreground">Update your account password</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
          <button onClick={() => navigate(dashboardRoute)}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Back to Dashboard</p>
              <p className="text-xs text-muted-foreground">Return to your role dashboard</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
          <button onClick={() => { signOut().then(() => navigate('/')); }}
            className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-destructive/5 transition-colors">
            <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <LogOut className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">Sign Out</p>
              <p className="text-xs text-muted-foreground">Log out of your account</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
