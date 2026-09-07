import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { createProperty } from '@/lib/properties';
import { createRentalUnit } from '@/lib/rental-units';
import { UnitsEditor, type DraftUnit } from '@/components/UnitsEditor';
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
  const [units, setUnits] = useState<DraftUnit[]>([]);
  // The property's own rent and deposit become its first unit server-side;
  // these are any additional ones for a multi-unit building.
  const [currency, setCurrency] = useState('UGX');

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
    // Through the API so the backend creates this property's first unit from
    // the rent, deposit and rooms above. A property is its units.
    const { ok, id: newId, detail } = await createProperty({
      title: data.title, description: data.description || null,
      property_type: data.property_type, state: data.state || null,
      address: data.address || '', city: '', zip_code: '',
      bedrooms: data.bedrooms, sitting_rooms: data.sitting_rooms,
      bathrooms: data.bathrooms,
      monthly_rent: data.monthly_rent,
      security_deposit: 0,
      rent_currency: data.rent_currency, rent_period: data.rent_period,
      manager_phone: data.manager_phone || null,
      manager_email: data.manager_email || null, amenities: data.amenities,
      images: data.images.length > 0 ? data.images : null,
      latitude: data.latitude ? Number(data.latitude) : null,
      longitude: data.longitude ? Number(data.longitude) : null,
      country: data.country, region_id: data.region_id || null,
    });
    if (!ok) { toast({ title: 'Error', description: detail || 'Could not create the property.', variant: 'destructive' }); return; }

    // Any extra units the manager added while filling the form.
    if (newId && units.length > 0) {
      const failed: string[] = [];
      for (const u of units) {
        const r = await createRentalUnit({
          property_id: newId,
          unit_number: u.unit_number,
          floor_level: u.floor_level || null,
          bedrooms: u.bedrooms,
          bathrooms: u.bathrooms,
          rent_amount: u.rent_amount,
          security_deposit: u.security_deposit ?? 0,
        });
        if (!r.ok) failed.push(u.unit_number);
      }
      if (failed.length > 0) {
        toast({
          title: 'Property created',
          description: `These units could not be saved: ${failed.join(', ')}. Add them from Edit Property.`,
          variant: 'destructive',
        });
        navigate('/dashboard/manager');
        return;
      }
    }
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
        <div className="space-y-6">
          <PropertyForm
            onSave={handleSave}
            onCancel={() => navigate('/dashboard/manager')}
            submitLabel="Create Property"
            onCurrencyChange={setCurrency}
          />
          <div className="bg-card border border-border rounded-xl p-5">
            <UnitsEditor units={units} currency={currency} onChange={setUnits} />
          </div>
        </div>
      </div>
    </div>
  );
}
