import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Key, CheckCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

export default function ChangePin() {
  const nav = useNavigate();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPin !== confirmPin) { setError('PINs do not match'); return; }
    if (newPin.length < 4) { setError('PIN must be at least 4 digits'); return; }
    setLoading(true);
    try {
      const token = (await import('@/integrations/supabase/client')).supabase.auth.getSession().then(r => r.data.session?.access_token);
      const accessToken = await token;
      const res = await fetch(`${API}/auth/phone/change-pin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}) },
        body: JSON.stringify({ current_pin: currentPin, new_pin: newPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to change PIN');
      setSuccess(true);
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <Card className="shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 text-primary rounded-full p-3 w-fit mb-3">
            {success ? <CheckCircle className="h-6 w-6" /> : <Key className="h-6 w-6" />}
          </div>
          <CardTitle className="font-display text-xl">Change PIN</CardTitle>
          <CardDescription>Update your phone sign-in PIN</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 mb-4">{error}</p>}
          {success ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-success bg-success/10 rounded-lg p-3">PIN changed successfully</p>
              <Button className="w-full" onClick={() => nav('/account')}>Back to Account</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input type="password" placeholder="Current PIN" value={currentPin}
                onChange={e => setCurrentPin(e.target.value)} maxLength={6} required />
              <Input type="password" placeholder="New PIN" value={newPin}
                onChange={e => setNewPin(e.target.value)} maxLength={6} required />
              <Input type="password" placeholder="Confirm new PIN" value={confirmPin}
                onChange={e => setConfirmPin(e.target.value)} maxLength={6} required />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Change PIN
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
