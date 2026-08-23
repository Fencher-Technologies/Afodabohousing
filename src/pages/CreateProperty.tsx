import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import PropertyForm from '@/components/forms/PropertyForm';
import type { PropertyFormData } from '@/components/forms/PropertyForm';
import { cleanDbError } from '@/utils/dbError';

export default function CreateProperty() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (!['house_manager', 'super_admin'].includes(user.user_metadata?.role || '')) {
      supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (data?.role !== 'house_manager' && data?.role !== 'super_admin') navigate('/dashboard/tenant');
      });
    }
  }, [user, authLoading]);

  const handleSave = async (data: PropertyFormData) => {
    if (!user) return;
    const { error } = await supabase.from('properties').insert({
      owner_id: user.id, title: data.title, description: data.description || null,
      property_type: data.property_type, state: data.state || null,
      address: data.address || '', city: '', zip_code: '',
      bedrooms: data.bedrooms, sitting_rooms: data.sitting_rooms,
      bathrooms: data.bathrooms,
      // ponytail: live DB has monthly_rent only; backend coalesces legacy readers
      monthly_rent: data.monthly_rent,
      security_deposit: 0, square_feet: null,
      rent_currency: data.rent_currency, rent_period: data.rent_period,
      manager_phone: data.manager_phone || null,
      manager_email: data.manager_email || null, amenities: data.amenities,
      images: data.images.length > 0 ? data.images : null,
      latitude: data.latitude ? Number(data.latitude) : null,
      longitude: data.longitude ? Number(data.longitude) : null,
      country: data.country, region_id: data.region_id || null,
      status: 'available',
    });
    if (error) { toast({ title: 'Could not create property', description: cleanDbError(error), variant: 'destructive' }); return; }
    toast({ title: 'Property created!' });
    navigate('/dashboard/manager');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Add Property</h1>
            <p className="text-sm text-muted-foreground">List a new property for rent</p>
          </div>
        </div>
        <PropertyForm onSave={handleSave} onCancel={() => navigate('/dashboard/manager')} submitLabel="Create Property" />
      </div>
    </div>
  );
}
