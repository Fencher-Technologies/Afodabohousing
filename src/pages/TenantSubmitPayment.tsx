import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, CheckCircle, ShieldCheck, X } from 'lucide-react';
import { createVerification } from '@/services/payment-verifications';
import { supabase } from '@/integrations/supabase/client';
import { PESAPAL_CURRENCIES } from '@/config/currencies';

const METHODS = [
  { label: 'Cash', value: 'cash' },
  { label: 'Mobile Money (MTN/Airtel)', value: 'mobile_money' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Bank Deposit', value: 'bank' },
  { label: 'Cheque', value: 'check' },
  { label: 'Other', value: 'other' },
];

export default function TenantSubmitPayment() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
  const screenshotRef = useRef<HTMLInputElement>(null);

  async function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: 'Only image files allowed', variant: 'destructive' }); return; }
    setUploadingScreenshot(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `payment_proof_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { data, error } = await supabase.storage.from('payment-proofs').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('payment-proofs').getPublicUrl(path);
      setScreenshotUrl(publicUrl);
    } catch (err: any) { toast({ title: 'Upload failed', description: err.message, variant: 'destructive' }); }
    setUploadingScreenshot(false);
    if (screenshotRef.current) screenshotRef.current.value = '';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) { toast({ title: 'Invalid amount', variant: 'destructive' }); return; }
    if (!method) { toast({ title: 'Select payment method', variant: 'destructive' }); return; }
    setSending(true);
    try {
      await createVerification({
        amount: num, currency, payment_method: method,
        transaction_reference: reference || undefined,
        payment_date: paymentDate, notes: notes || undefined,
        screenshot_url: screenshotUrl || undefined,
      });
      setDone(true);
      toast({ title: 'Payment submitted for verification' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSending(false);
  };

  if (done) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-16">
        <Card className="text-center py-12">
          <CardContent className="space-y-4 pt-6">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-accent" />
            </div>
            <CardTitle className="text-xl">Payment Submitted</CardTitle>
            <CardDescription>Your payment has been submitted for verification. The manager will review it shortly.</CardDescription>
            <Button onClick={() => navigate('/dashboard/tenant')} className="gradient-primary text-primary-foreground">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <CardTitle className="font-display text-xl">Submit Payment Proof</CardTitle>
            </div>
            <CardDescription>Notify your manager about a payment you made outside the app.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Amount</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500000" required min={1} className="mt-1" />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>{METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference (optional)</Label>
                <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Transaction ID" className="mt-1" />
              </div>
              <div>
                <Label>Payment Date</Label>
                <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="mt-1" required />
              </div>
              <div>
                <Label>Screenshot (optional)</Label>
                <input ref={screenshotRef} type="file" accept="image/*" onChange={handleScreenshotUpload} className="hidden" />
                <div className="mt-1 flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => screenshotRef.current?.click()} disabled={uploadingScreenshot} className="gap-2">
                    <Upload className="h-4 w-4" /> {uploadingScreenshot ? 'Uploading...' : 'Upload Proof'}
                  </Button>
                  {screenshotUrl && (
                    <div className="flex items-center gap-2">
                      <img src={screenshotUrl} alt="" className="h-10 w-10 rounded object-cover border" />
                      <button type="button" onClick={() => setScreenshotUrl('')} className="text-destructive hover:text-destructive/80">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional information" className="mt-1" rows={3} />
              </div>
              <Button type="submit" disabled={sending} className="w-full gradient-primary text-primary-foreground gap-2">
                {sending ? 'Submitting...' : <><ShieldCheck className="h-4 w-4" /> Submit for Verification</>}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Your manager will review and confirm this payment.</p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}