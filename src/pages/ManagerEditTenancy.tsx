import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import TenancyForm from '@/components/forms/TenancyForm';
import type { TenancyFormData } from '@/components/forms/TenancyForm';

export default function ManagerEditTenancy() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<Partial<TenancyFormData> | undefined>();

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
    setInitialData({
      start_date: data.start_date?.split('T')[0] || '',
      end_date: data.end_date?.split('T')[0] || '',
      monthly_rent: String(data.monthly_rent || ''),
      rent_deposit: String(data.rent_deposit || ''),
      status: data.status || 'active',
    });
    setLoading(false);
  };

  const handleSave = async (data: TenancyFormData) => {
    if (!id) return;
    const { error } = await supabase.from('leases').update({
      start_date: data.start_date, end_date: data.end_date,
      monthly_rent: parseFloat(data.monthly_rent),
      rent_deposit: data.rent_deposit ? parseFloat(data.rent_deposit) : null,
      status: data.status,
    }).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
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
        <TenancyForm mode="edit" initialData={initialData} onSave={handleSave} onCancel={() => navigate(`/dashboard/manager/tenancies/${id}`)} />
      </div>
    </div>
  );
}
