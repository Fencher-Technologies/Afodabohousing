import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import TenancyForm from '@/components/forms/TenancyForm';
import type { TenancyFormData } from '@/components/forms/TenancyForm';

export default function ManagerCreateTenancy() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    if (!user) return;
    const { data } = await supabase.from('properties').select('*').eq('owner_id', user.id).eq('status', 'available');
    setProperties(data || []);
    setLoading(false);
  };

  const handleSave = async (data: TenancyFormData) => {
    if (!user) return;
    if (!data.tenant_id) {
      toast({ title: 'Tenant required', description: 'Please find and select a tenant by email first', variant: 'destructive' });
      return;
    }
    const payload: Record<string, any> = {
      property_id: data.property_id,
      tenant_id: data.tenant_id,
      owner_id: user.id,
      start_date: data.start_date,
      end_date: data.end_date,
      monthly_rent: parseFloat(data.monthly_rent) || 0,
      status: 'active',
    };
    if (data.rent_deposit) payload.security_deposit = parseFloat(data.rent_deposit);
    if (data.unit_label) payload.unit_label = data.unit_label;

    const { error } = await supabase.from('leases').insert(payload);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Tenancy created successfully' });
    navigate('/dashboard/manager/tenancies');
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
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">New Tenancy</h1>
            <p className="text-sm text-muted-foreground">Create a new lease agreement</p>
          </div>
        </div>
        <TenancyForm mode="create" onSave={handleSave} onCancel={() => navigate('/dashboard/manager/tenancies')}
          properties={properties} />
      </div>
    </div>
  );
}
