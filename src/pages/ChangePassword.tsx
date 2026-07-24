import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, KeyRound, Save } from 'lucide-react';

export default function ChangePassword() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) { navigate('/login'); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' }); return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Must be at least 6 characters.', variant: 'destructive' }); return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' }); return;
    }
    toast({ title: 'Password updated successfully' });
    navigate('/account');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/account')} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Change Password</h1>
            <p className="text-sm text-muted-foreground">Update your account password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
          <div>
            <p className="text-sm font-semibold mb-2">New Password</p>
            <Input type="password" minLength={6} value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required placeholder="At least 6 characters" className="rounded-lg h-11" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Confirm New Password</p>
            <Input type="password" minLength={6} value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required placeholder="Repeat the new password" className="rounded-lg h-11" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-lg h-11"
              onClick={() => navigate('/account')}>Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 rounded-lg h-11 font-bold gap-2">
              <KeyRound className="h-4 w-4" /> {saving ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
