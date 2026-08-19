import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Phone, Lock, Link, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

export default function EditProfile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [linkPhone, setLinkPhone] = useState('');
  const [linkPin, setLinkPin] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [linkStep, setLinkStep] = useState<'form' | 'otp'>('form');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');

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
      user_id: user.id, full_name: fullName, phone: phone,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Profile updated' });
  };

  const handleLinkSendOtp = async () => {
    if (!linkPhone.trim()) { setLinkError('Enter a phone number'); return; }
    setLinkLoading(true); setLinkError('');
    try {
      const res = await fetch(`${API}/auth/phone/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: linkPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send OTP');
      setLinkStep('otp');
    } catch (e: any) { setLinkError(e.message) } finally { setLinkLoading(false) }
  };

  const handleLinkVerify = async () => {
    if (otp.length < 4) { setLinkError('Enter the verification code'); return; }
    setLinkLoading(true); setLinkError('');
    try {
      const res = await fetch(`${API}/auth/phone/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: linkPhone.trim(), otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Verification failed');
      setVerifyToken(data.verify_token);
      await doLinkPhone(data.verify_token);
    } catch (e: any) { setLinkError(e.message) } finally { setLinkLoading(false) }
  };

  const doLinkPhone = async (vt: string) => {
    if (linkPin.length < 4) { setLinkError('PIN must be at least 4 digits'); return; }
    if (!linkPassword) { setLinkError('Enter your current password'); return; }
    setLinkLoading(true); setLinkError('');
    try {
      const token = await supabase.auth.getSession().then(r => r.data.session?.access_token);
      const res = await fetch(`${API}/auth/phone/link`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ phone: linkPhone.trim(), pin: linkPin, current_password: linkPassword, verify_token: vt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to link phone');
      toast({ title: 'Phone Linked', description: 'You can now sign in with your phone and PIN.' });
      setLinkStep('form'); setLinkPhone(''); setLinkPin(''); setLinkPassword(''); setOtp('');
    } catch (e: any) { setLinkError(e.message) } finally { setLinkLoading(false) }
  };

  const isPhoneLinked = !!phone;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-xl font-bold">Edit Profile</h1>
            <p className="text-sm text-muted-foreground">Update your personal information</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
          <div>
            <Label>Full Name</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Your full name" className="rounded-lg h-11 mt-1.5" />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +256 700 000 000" className="rounded-lg h-11 mt-1.5" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled className="rounded-lg h-11 mt-1.5 bg-muted/50" />
            <p className="text-xs text-muted-foreground mt-1 italic">Email cannot be changed</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-lg h-11"
              onClick={() => navigate('/account')}>Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 rounded-lg h-11 font-bold gap-2">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>

        {/* Phone Sign-In Section */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="font-display text-base font-bold mb-1">Phone Sign-In</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {isPhoneLinked
              ? 'Your phone is linked. You can change your PIN in account settings.'
              : 'Link a phone number to sign in with your phone and PIN.'}
          </p>

          {linkError && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 mb-4">{linkError}</p>}

          {!isPhoneLinked && linkStep === 'form' && (
            <div className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="+256 7XX XXX XXX" value={linkPhone}
                  onChange={e => setLinkPhone(e.target.value)} className="pl-9 h-11 rounded-lg" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <PasswordInput placeholder="Create PIN (4-6 digits)" value={linkPin}
                  onChange={e => setLinkPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="pl-9 h-11 rounded-lg" maxLength={6} />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <PasswordInput placeholder="Your current email password" value={linkPassword}
                  onChange={e => setLinkPassword(e.target.value)} className="pl-9 h-11 rounded-lg" />
              </div>
              <Button onClick={handleLinkSendOtp} disabled={linkLoading} className="w-full rounded-lg h-11 gap-2">
                {linkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link className="h-4 w-4" />}
                Send Verification Code
              </Button>
            </div>
          )}

          {!isPhoneLinked && linkStep === 'otp' && (
            <div className="space-y-4">
              <div className="relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Verification Code" value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="pl-9 h-11 rounded-lg" maxLength={6} />
              </div>
              <Button onClick={handleLinkVerify} disabled={linkLoading} className="w-full rounded-lg h-11 gap-2">
                {linkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Verify & Link Phone
              </Button>
            </div>
          )}

          {isPhoneLinked && (
            <Button variant="outline" className="w-full rounded-lg h-11 gap-2" onClick={() => navigate('/account/change-pin')}>
              <Lock className="h-4 w-4" /> Change PIN
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
