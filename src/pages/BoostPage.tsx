import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, TrendingUp, CheckCircle, Loader2 } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const DURATION_OPTIONS = [
  { days: 7, label: '7 days', price: 15000 },
  { days: 14, label: '14 days', price: 25000 },
  { days: 30, label: '30 days', price: 45000 },
];

export default function BoostPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [duration, setDuration] = useState(7);
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!id) return;
    supabase.from('properties').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { toast({ title: 'Property not found', variant: 'destructive' }); navigate('/dashboard/manager'); return; }
      setProperty(data);
      setPhone(data.manager_phone || '');
      setLoading(false);
    });
  }, [id]);

  const price = DURATION_OPTIONS.find(d => d.days === duration)?.price || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { toast({ title: 'Phone number required', variant: 'destructive' }); return; }
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${API}/boosts/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ property_id: id, duration_days: duration, phone_number: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Boost initiation failed');
      setDone(true);
      toast({ title: 'Boost initiated!', description: 'Check your phone for the payment prompt.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setSending(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center h-[80vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-8">
        <button onClick={() => navigate('/dashboard/manager')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        {done ? (
          <Card className="text-center py-12">
            <CardContent className="space-y-4 pt-6">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-accent" />
              </div>
              <CardTitle className="text-xl">Boost Request Sent!</CardTitle>
              <CardDescription>
                A payment request of <strong>UGX {price.toLocaleString()}</strong> has been pushed to <strong>{phone}</strong>.
                Enter your mobile money PIN to confirm.
              </CardDescription>
              <Button onClick={() => navigate('/dashboard/manager')} className="mt-4 gradient-primary text-primary-foreground">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="font-display text-xl">Boost Listing</CardTitle>
              </div>
              <CardDescription>Promote your property to the top of search results.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-secondary rounded-xl p-4 mb-6">
                <p className="font-semibold text-foreground">{property?.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{property?.state || property?.city} · UGX {(property?.rent_amount || 0).toLocaleString()}/mo</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label>Boost Duration</Label>
                  <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map(d => (
                        <SelectItem key={d.days} value={String(d.days)}>
                          {d.label} — UGX {d.price.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Mobile Money Number</Label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+256 788 100 145"
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">You'll receive a payment prompt on this number.</p>
                </div>

                <Button type="submit" disabled={sending} className="w-full gradient-primary text-primary-foreground gap-2">
                  {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><TrendingUp className="h-4 w-4" /> Boost for UGX {price.toLocaleString()}</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
