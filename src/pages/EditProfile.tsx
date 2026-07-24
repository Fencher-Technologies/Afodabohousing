import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditProfile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    loadProfile();
  }, [user, authLoading]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (data) {
      setFullName(data.full_name || '');
      setPhone(data.phone || '');
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({
      user_id: user.id,
      full_name: fullName,
      phone: phone,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Profile updated' });
    navigate('/account');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/account')} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Edit Profile</h1>
            <p className="text-sm text-muted-foreground">Update your personal information</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
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
          <div>
            <p className="text-sm font-semibold mb-2">Email</p>
            <Input value={user?.email || ''} disabled className="rounded-lg h-11 bg-muted/50"
              placeholder="Email cannot be changed" />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-lg h-11"
              onClick={() => navigate('/account')}>Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 rounded-lg h-11 font-bold gap-2">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
