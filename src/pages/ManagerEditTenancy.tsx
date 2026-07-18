import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save } from 'lucide-react';

export default function ManagerEditTenancy() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    start_date: '',
    end_date: '',
    monthly_rent: '',
    rent_deposit: '',
    status: 'active',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (id) fetchLease();
  }, [user, authLoading, id]);

  const fetchLease = async () => {
    if (!user || !id) return;
    const { data, error } = await supabase.from('leases').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      toast({ title: 'Error', description: 'Tenancy not found', variant: 'destructive' });
      navigate('/dashboard/manager/tenancies');
      return;
    }
    setForm({
      start_date: data.start_date?.split('T')[0] || '',
      end_date: data.end_date?.split('T')[0] || '',
      monthly_rent: String(data.monthly_rent || ''),
      rent_deposit: String(data.rent_deposit || ''),
      status: data.status || 'active',
    });
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from('leases').update({
      start_date: form.start_date,
      end_date: form.end_date,
      monthly_rent: parseFloat(form.monthly_rent),
      rent_deposit: form.rent_deposit ? parseFloat(form.rent_deposit) : null,
      status: form.status,
    }).eq('id', id);
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Tenancy updated' });
    navigate(`/dashboard/manager/tenancies/${id}`);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/manager/tenancies/${id}`)} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Edit Tenancy</h1>
            <p className="text-sm text-muted-foreground">Update lease terms</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold mb-2">Start Date</p>
              <Input type="date" value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                required className="rounded-lg h-11" />
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">End Date</p>
              <Input type="date" value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                required className="rounded-lg h-11" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold mb-2">Monthly Rent (UGX)</p>
              <Input type="number" min="0" value={form.monthly_rent}
                onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))}
                required className="rounded-lg h-11" />
            </div>
            <div>
              <p className="text-sm font-semibold mb-2">Deposit (UGX, optional)</p>
              <Input type="number" min="0" value={form.rent_deposit}
                onChange={e => setForm(f => ({ ...f, rent_deposit: e.target.value }))}
                className="rounded-lg h-11" />
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Status</p>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-lg h-11"
              onClick={() => navigate(`/dashboard/manager/tenancies/${id}`)}>Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1 rounded-lg h-11 font-bold gap-2">
              <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
