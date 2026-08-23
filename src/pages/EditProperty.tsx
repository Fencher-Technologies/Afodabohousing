import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import PropertyForm from '@/components/forms/PropertyForm';
import type { PropertyFormData } from '@/components/forms/PropertyForm';
import { cleanDbError } from '@/utils/dbError';

export default function EditProperty() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [initialData, setInitialData] = useState<Partial<PropertyFormData> | undefined>();

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (id) fetchProperty();
  }, [user, authLoading, id]);

  const fetchProperty = async () => {
    if (!user || !id) return;
    const { data, error } = await supabase.from('properties').select('*').eq('id', id).maybeSingle();
    if (error || !data) {
      toast({ title: 'Error', description: 'Property not found', variant: 'destructive' });
      navigate('/dashboard/manager'); return;
    }
    setInitialData({
      title: data.title || '', description: data.description || '',
      property_type: data.property_type || 'Residential', state: data.state || '',
      address: data.address || '',
      bedrooms: data.bedrooms || 1, sitting_rooms: data.sitting_rooms || 1,
      bathrooms: data.bathrooms || 1,
      monthly_rent: data.monthly_rent || 0, rent_period: data.rent_period || 'monthly',
      manager_phone: data.manager_phone || '', manager_email: data.manager_email || '',
      amenities: data.amenities || [],
      images: data.images || [],
      latitude: data.latitude ? String(data.latitude) : '',
      longitude: data.longitude ? String(data.longitude) : '',
      country: data.country || 'UG',
      region_id: data.region_id || '',
      rent_currency: data.rent_currency || 'UGX',
    });
    setLoading(false);
  };

  const handleSave = async (data: PropertyFormData) => {
    if (!id) return;
    const { error } = await supabase.from('properties').update({
      title: data.title, description: data.description || null,
      property_type: data.property_type, state: data.state,
      address: data.address || null, bedrooms: data.bedrooms, sitting_rooms: data.sitting_rooms,
      bathrooms: data.bathrooms,
      // ponytail: live DB has monthly_rent only; backend coalesces legacy readers
      monthly_rent: data.monthly_rent,
      rent_currency: data.rent_currency, rent_period: data.rent_period,
      manager_phone: data.manager_phone || null,
      manager_email: data.manager_email || null, amenities: data.amenities,
      images: data.images.length > 0 ? data.images : null,
      latitude: data.latitude ? Number(data.latitude) : null,
      longitude: data.longitude ? Number(data.longitude) : null,
      country: data.country, region_id: data.region_id || null,
    }).eq('id', id);
    if (error) { toast({ title: 'Could not update property', description: cleanDbError(error), variant: 'destructive' }); return; }
    toast({ title: 'Property updated!' });
    navigate('/dashboard/manager');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl">Edit Property</h1>
            <p className="text-sm text-muted-foreground">{initialData?.title}</p>
          </div>
        </div>
        <PropertyForm initialData={initialData} onSave={handleSave} onCancel={() => navigate('/dashboard/manager')} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
