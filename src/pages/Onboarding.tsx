import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Building2, ChevronRight, ChevronLeft, Check, Home, User, Shield } from 'lucide-react';

const STEPS = [
  { title: 'Welcome', icon: Home },
  { title: 'Profile', icon: User },
  { title: 'Role', icon: Shield },
  { title: 'Done', icon: Check },
];

export default function Onboarding() {
  const { user, role, loading: authLoading, refreshRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<'tenant' | 'house_manager'>('tenant');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (role) navigate(getDashboard(role));
  }, [user, authLoading, role]);

  const getDashboard = (r: string) => {
    switch (r) {
      case 'super_admin': return '/dashboard/super-admin';
      case 'house_manager': return '/dashboard/manager';
      case 'tenant': return '/dashboard/tenant';
      default: return '/';
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    const updates: any = {};
    if (fullName) updates.full_name = fullName;
    if (phone) updates.phone = phone;

    if (Object.keys(updates).length > 0) {
      await supabase.from('profiles').upsert({ user_id: user.id, ...updates, updated_at: new Date().toISOString() });
    }
    if (selectedRole) {
      await supabase.from('profiles').update({ role: selectedRole }).eq('user_id', user.id);
    }
    setSaving(false);
    await refreshRole();
    toast({ title: 'Welcome to Afodabo Housing!' });
    navigate(getDashboard(selectedRole));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="flex items-center justify-center mb-8">
          <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  done ? 'bg-primary text-primary-foreground' :
                  active ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className={`text-xs font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {step === 0 && (
            <div className="text-center space-y-4">
              <div className="h-20 w-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
                <Building2 className="h-10 w-10 text-primary-foreground" />
              </div>
              <h2 className="font-bold text-2xl">Welcome to Afodabo Housing</h2>
              <p className="text-sm text-muted-foreground">Your all-in-one platform for renting and managing properties in Uganda. Let's get you set up in under a minute.</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-bold text-xl">Complete Your Profile</h2>
              <p className="text-sm text-muted-foreground">Help us personalise your experience.</p>
              <div>
                <p className="text-sm font-semibold mb-2">Full Name</p>
                <Input value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Your full name" className="rounded-lg h-11" />
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">Phone Number</p>
                <Input value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +256 700 000 000" className="rounded-lg h-11" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-bold text-xl">Choose Your Role</h2>
              <p className="text-sm text-muted-foreground">How will you use Afodabo Housing?</p>
              <div className="space-y-3">
                <button onClick={() => setSelectedRole('tenant')}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedRole === 'tenant' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}>
                  <p className="font-bold text-foreground">I'm a Tenant</p>
                  <p className="text-sm text-muted-foreground mt-1">Browse properties, pay rent, submit maintenance requests</p>
                </button>
                <button onClick={() => setSelectedRole('house_manager')}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedRole === 'house_manager' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}>
                  <p className="font-bold text-foreground">I'm a House Manager</p>
                  <p className="text-sm text-muted-foreground mt-1">List properties, manage tenants, track payments</p>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-4">
              <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <Check className="h-10 w-10 text-success" />
              </div>
              <h2 className="font-bold text-2xl">You're All Set!</h2>
              <p className="text-sm text-muted-foreground">
                {selectedRole === 'tenant'
                  ? 'Start browsing available properties and manage your rental life.'
                  : 'Start listing properties and managing tenants.'}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <Button variant="outline" className="flex-1 h-12 rounded-lg gap-2"
              onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button className="flex-1 h-12 rounded-lg gap-2 font-bold" onClick={() => setStep(s => s + 1)}>
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button className="flex-1 h-12 rounded-lg gap-2 font-bold" disabled={saving} onClick={handleComplete}>
              {saving ? 'Setting up...' : 'Get Started'} <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
