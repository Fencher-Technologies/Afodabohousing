import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentSubscription } from '@/services/subscriptions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User, Mail, Phone, Building2, LogOut, ChevronRight, KeyRound, Edit3, Crown,
  Info, ShieldCheck, FileText, Headphones, Users, TrendingUp, ChevronDown,
} from 'lucide-react';

export default function Account() {
  const { user, role, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    loadData();
  }, [user, authLoading]);

  async function loadData() {
    if (!user) return;
    const { data: p } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    setProfile(p);
    if (p?.role === 'house_manager') {
      try {
        const sub = await getCurrentSubscription();
        if (sub) setSubscription(sub);
      } catch { /* subscription card stays hidden */ }
    }
    setLoading(false);
  }

  function initBg(id: string) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
    const hues = [155, 42, 24, 200, 340, 48, 260, 30];
    return `hsl(${hues[Math.abs(h) % hues.length]}, 47%, 35%)`;
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

  const isManager = role === 'house_manager' || role === 'super_admin';
  const isTenant = role === 'tenant';
  const dashboardRoute = role === 'super_admin' ? '/dashboard/super-admin'
    : role === 'house_manager' ? '/dashboard/manager'
    : role === 'tenant' ? '/dashboard/tenant' : '/';
  const isActive = subscription?.status === 'active';
  const emailDisplay = user?.email?.startsWith('phone_') ? (profile?.phone || user?.email) : user?.email;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Account</h1>
            <p className="text-sm text-muted-foreground">Manage your profile and settings</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(dashboardRoute)} className="gap-2">
            <Building2 className="h-4 w-4" /> Dashboard
          </Button>
        </div>

        {/* Profile Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="" className="h-20 w-20 rounded-2xl object-cover ring-2 ring-border" />
            ) : (
              <div className="h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white ring-2 ring-border"
                style={{ backgroundColor: initBg(user?.id || '') }}>
                {initials(profile?.full_name || '', user?.email || '')}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-xl text-foreground truncate">
                  {profile?.full_name || user?.email?.split('@')[0]}
                </p>
                {user?.email_confirmed_at && (
                  <Badge variant="outline" className="text-[10px] h-5 px-2 border-success/30 text-success bg-success/5">Verified</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{emailDisplay}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className="text-[10px] h-5 px-2 border-border text-primary bg-muted/60 capitalize">
                  {role?.replace(/_/g, ' ') || 'User'}
                </Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 gap-2 rounded-lg"
              onClick={() => navigate('/account/edit')}>
              <Edit3 className="h-4 w-4" /> Edit
            </Button>
          </div>
        </div>

        {/* Subscription Card (manager only) */}
        {isManager && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Crown className="h-5 w-5 text-gold" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Subscription</p>
                <p className="text-sm font-bold text-foreground">{subscription?.plan_name || 'No plan'}</p>
              </div>
              <Badge className={isActive ? 'bg-muted text-success border-success/20' : 'bg-muted text-destructive border-destructive/20'}>
                {isActive ? 'Active' : 'Expired'}
              </Badge>
            </div>
            {isActive && subscription && (
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Expires</p>
                  <p className="text-sm font-semibold">{new Date(subscription.expires_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Days left</p>
                  <p className={`text-sm font-semibold ${subscription.days_remaining <= 14 ? 'text-destructive' : subscription.days_remaining <= 60 ? 'text-gold' : 'text-success'}`}>
                    {subscription.days_remaining} days
                  </p>
                </div>
              </div>
            )}
            {isActive && subscription && (
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full transition-all ${subscription.days_remaining > 60 ? 'bg-success' : subscription.days_remaining > 14 ? 'bg-gold' : 'bg-destructive'}`}
                    style={{ width: `${Math.min(100, Math.round((subscription.days_remaining / 365) * 100))}%` }} />
                </div>
            )}
            {!isActive && (
              <Button variant="outline" size="sm" className="w-full rounded-lg gap-2" onClick={() => navigate('/subscription')}>
                <TrendingUp className="h-4 w-4" /> Renew Now
              </Button>
            )}
          </div>
        )}

        {/* Manage section (manager only) */}
        {isManager && (
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 px-1">Manage</p>
            <div className="bg-card border border-border rounded-xl shadow-sm divide-y divide-border">
              <button onClick={() => navigate('/dashboard/manager')}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Properties</p>
                  <p className="text-xs text-muted-foreground">Manage your property listings</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
              <button onClick={() => navigate('/dashboard/manager/tenancies')}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Tenancies</p>
                  <p className="text-xs text-muted-foreground">View and manage tenancies</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
              <button onClick={() => navigate('/dashboard/manager/reports')}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Reports</p>
                  <p className="text-xs text-muted-foreground">View reports and analytics</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
              <button onClick={() => navigate('/subscription')}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Subscription</p>
                  <p className="text-xs text-muted-foreground">Manage your subscription plan</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* Settings */}
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 px-1">Settings</p>
          <div className="bg-card border border-border rounded-xl shadow-sm divide-y divide-border">
            <button onClick={() => navigate('/account/edit')}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Edit Profile</p>
                <p className="text-xs text-muted-foreground">Update your name, phone and photo</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
            <button onClick={() => navigate('/account/change-password')}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Change Password</p>
                <p className="text-xs text-muted-foreground">Update your account password</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
            <button onClick={() => navigate('/account/change-pin')}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Change PIN</p>
                <p className="text-xs text-muted-foreground">Update your phone sign-in PIN</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        </div>

        {/* Support & Policies */}
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 px-1">Support & Policies</p>
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <button onClick={() => navigate('/about')}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors border-b border-border">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">About Axis</p>
                <p className="text-xs text-muted-foreground">Learn about the platform</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
              <button onClick={() => window.location.href = 'mailto:support@axishousing.com'}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors border-b border-border">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Headphones className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Contact Support</p>
                <p className="text-xs text-muted-foreground">Get help with your account</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
            <button onClick={() => navigate('/privacy')}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors border-b border-border">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Privacy Policy</p>
                <p className="text-xs text-muted-foreground">How we handle your data</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
            <button onClick={() => navigate('/terms')}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Terms of Service</p>
                <p className="text-xs text-muted-foreground">Platform terms and conditions</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          </div>
        </div>

        {/* Sign Out */}
        <button onClick={() => { signOut().then(() => navigate('/')); }}
          className="w-full flex items-center justify-center gap-2 py-4 bg-card border border-destructive/20 rounded-xl text-destructive hover:bg-destructive/5 transition-colors">
          <LogOut className="h-5 w-5" />
          <span className="font-semibold">Sign Out</span>
        </button>

        <p className="text-xs text-muted-foreground text-center">Axis v1.0.0</p>
      </div>
    </div>
  );
}
