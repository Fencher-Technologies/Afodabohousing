import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Phone, Key, CheckCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

function phoneWarning(val: string): string | null {
  if (!val) return null;
  const cleaned = val.replace(/[+\d]/g, '');
  if (cleaned.length > 0) return 'Only digits and leading + allowed, no spaces or symbols';
  return null;
}

export default function ForgotPin() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [phoneWarn, setPhoneWarn] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function sendOtp() {
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send OTP');
      setStep(2);
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  async function verifyOtp() {
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid OTP');
      setVerifyToken(data.verify_token);
      setStep(3);
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  async function resetPin() {
    setError(''); setMessage('');
    if (newPin !== confirmPin) { setError('PINs do not match'); return; }
    if (newPin.length < 4) { setError('PIN must be at least 4 digits'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/phone/forgot-pin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, verify_token: verifyToken, new_pin: newPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to reset PIN');
      setMessage(data.message || 'PIN reset successfully');
      setStep(4);
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-16 px-4">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 text-primary rounded-full p-3 w-fit mb-3">
              {step === 4 ? <CheckCircle className="h-6 w-6" /> : <Key className="h-6 w-6" />}
            </div>
            <CardTitle className="font-display text-xl">Reset PIN</CardTitle>
            <CardDescription>
              {step === 1 && 'Enter your phone number to receive a reset code'}
              {step === 2 && 'Enter the OTP sent to your phone'}
              {step === 3 && 'Choose a new PIN'}
              {step === 4 && 'Your PIN has been reset'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 mb-4">{error}</p>}
            {message && <p className="text-sm text-success bg-success/10 rounded-lg p-3 mb-4">{message}</p>}

            {step === 1 && (
              <div className="space-y-4">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="tel" placeholder="+256 7XX XXX XXX" value={phone}
                    onChange={e => { setPhone(e.target.value); setPhoneWarn(phoneWarning(e.target.value)); }}
                    className="pl-9" />
                </div>
                {phoneWarn && <p className="text-xs text-destructive">{phoneWarn}</p>}
                <Button className="w-full" onClick={sendOtp} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send OTP
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Remember your PIN? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} />
                <Button className="w-full" onClick={verifyOtp} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Verify OTP
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Input type="password" placeholder="New PIN" value={newPin} onChange={e => setNewPin(e.target.value)} maxLength={6} />
                <Input type="password" placeholder="Confirm new PIN" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} maxLength={6} />
                <Button className="w-full" onClick={resetPin} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Reset PIN
                </Button>
              </div>
            )}

            {step === 4 && (
              <Button className="w-full" onClick={() => nav('/login')}>Go to Sign In</Button>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
