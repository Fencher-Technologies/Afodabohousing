import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import AvatarUpload from '@/components/AvatarUpload';
import { PasswordInput } from '@/components/ui/password-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Phone, Lock, Link, Loader2 } from 'lucide-react';
import { PhoneInput } from '@/components/ui/phone-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/utils/currencies';

const API = import.meta.env.VITE_API_URL || '';

export default function EditProfile() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState(DEFAULT_CURRENCY);
  const [role, setRole] = useState<string | null>(null);

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
      setEmail(data.email || user?.email || '');
      setPhotoUrl(data.photo_url || null);
      setDisplayCurrency(data.display_currency || DEFAULT_CURRENCY);
      setRole(data.role || null);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    // UPDATE, not upsert: this row must already exist (UNIQUE(user_id)).
    // An upsert without onConflict targets the PK (id), which the payload
    // lacks, so it INSERTs a duplicate row instead of updating — and a
    // duplicate breaks single-row reads downstream. Email is owned by auth
    // and read-only here, so it stays out of the payload entirely. A blank
    // phone is stored as NULL: Postgres allows many NULLs under
    // UNIQUE(phone) but only one ''.
    const trimmedPhone = phone.trim();
    const { data, error } = await supabase.from('profiles').update({
      full_name: fullName.trim(), phone: trimmedPhone ? trimmedPhone : null,
      display_currency: displayCurrency,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id).select();
    setSaving(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    if (!data || data.length === 0) {
      toast({ title: 'Error', description: 'Profile not found. Please contact support.', variant: 'destructive' });
      return;
    }
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
          <div className="flex justify-center">
            <AvatarUpload
              userId={user?.id || ''}
              photoUrl={photoUrl}
              fullName={fullName}
              email={user?.email || ''}
              size="xl"
              onUpdate={(url) => setPhotoUrl(url)}
            />
          </div>
          <div>
            <Label>Full Name</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Your full name" className="rounded-lg h-11 mt-1.5" />
          </div>
          <div>
            <Label>Phone Number</Label>
            <PhoneInput value={phone} onChange={setPhone} className="mt-1.5" />
          </div>
          {(role === 'house_manager' || role === 'super_admin') && (
            <div>
              <Label>Currency for totals</Label>
              <SearchableSelect
                options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} - ${c.name}` }))}
                value={displayCurrency}
                onValueChange={setDisplayCurrency}
                placeholder="Select currency..."
                emptyText="No currency matches."
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Dashboard and report totals are shown in this currency, converted at current
                exchange rates. Each property keeps its own currency for rent, payments and receipts.
              </p>
            </div>
          )}

          <div>
            <Label>Email</Label>
            <Input value={email} disabled className="rounded-lg h-11 mt-1.5 bg-muted/50" />
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

      </div>
    </div>
  );
}
