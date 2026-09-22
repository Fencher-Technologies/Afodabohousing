import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { createProperty } from '@/lib/properties';
import { createRentalUnit } from '@/lib/rental-units';
import { UnitsEditor, type DraftUnit } from '@/components/UnitsEditor';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Crown } from 'lucide-react';
import PropertyForm from '@/components/forms/PropertyForm';
import type { PropertyFormData } from '@/components/forms/PropertyForm';
import { cleanDbError } from '@/utils/dbError';
import { getPropertyQuota, type PropertyQuota } from '@/services/subscriptions';
import { PlanLimitDialog } from '@/components/PlanLimitDialog';
import { planLimitFromError, type PlanLimitInfo } from '@/utils/planLimit';

export default function CreateProperty() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [units, setUnits] = useState<DraftUnit[]>([]);
  // The property's own rent and deposit become its first unit server-side;
  // these are any additional ones for a multi-unit building.
  const [currency, setCurrency] = useState('UGX');
  const [quota, setQuota] = useState<PropertyQuota | null>(null);
  const [planLimit, setPlanLimit] = useState<PlanLimitInfo | null>(null);
  // Double-submit guard: the button disables via `saving`, the ref guards
  // the handler itself (Enter key / repeat submit events in the same tick).
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    if (!['house_manager', 'super_admin'].includes(user.user_metadata?.role || '')) {
      supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (data?.role !== 'house_manager' && data?.role !== 'super_admin') navigate('/dashboard/tenant');
      });
    }
    // Warn before the form, not after it is filled in.
    getPropertyQuota().then(setQuota).catch(() => setQuota(null));
  }, [user, authLoading]);

  const handleSave = async (data: PropertyFormData) => {
    if (!user || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
    // A property is its units, so it must have at least one. There is no
    // property-level rent to fall back on any more.
    if (units.length === 0) {
      toast({ title: 'Add a unit', description: 'Add at least one unit with its rent.', variant: 'destructive' });
      return;
    }
    // Through the API so the backend creates this property's first unit from
    // the rent, deposit and rooms above. A property is its units.
    const { ok, id: newId, detail } = await createProperty({
      title: data.title, description: data.description || null,
      property_type: data.property_type, property_type_slug: data.property_type_slug || null, state: data.state || null,
      address: data.address || '', city: '', zip_code: '',
      bedrooms: units[0]?.bedrooms ?? 1, sitting_rooms: 1,
      bathrooms: units[0]?.bathrooms ?? 1,
      // Derived from the units, which are the source of truth. The
      // property-level columns stay populated so listing search and filters
      // keep working; the listing leads with the lowest unit rent.
      monthly_rent: Math.min(...units.map(u => u.rent_amount)),
      security_deposit: units[0]?.security_deposit ?? 0,
      rent_currency: data.rent_currency, rent_period: data.rent_period,
      manager_phone: data.manager_phone || null,
      manager_email: data.manager_email || null, amenities: data.amenities,
      images: data.images.length > 0 ? data.images : null,
      latitude: data.latitude ? Number(data.latitude) : null,
      longitude: data.longitude ? Number(data.longitude) : null,
      country: data.country, region_id: data.region_id || null,
    });
    if (!ok) {
      const limit = planLimitFromError(detail);
      if (limit) { setPlanLimit(limit); setSaving(false); getPropertyQuota().then(setQuota).catch(() => {}); return; }
      // Server quota errors arrive structured ({code, message, ...}); anything
      // else is a plain string. Never show "[object Object]".
      const msg = typeof detail === 'object' && detail !== null
        ? (detail.message || 'Could not create the property.')
        : (detail || 'Could not create the property.');
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      if (typeof detail === 'object' && detail !== null && detail.code === 'property_limit_reached') {
        getPropertyQuota().then(setQuota).catch(() => {});
      }
      return;
    }

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
        sitting_rooms: u.sitting_rooms ?? 1,
        kitchens: u.kitchens ?? 1,
          sitting_rooms: u.sitting_rooms ?? 1,
          kitchens: u.kitchens ?? 1,
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
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PlanLimitDialog info={planLimit} onClose={() => setPlanLimit(null)} />
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
        {quota && !quota.can_add_property ? (
          <div className="bg-card border border-destructive/30 rounded-xl p-6 shadow-sm text-center space-y-3">
            <Crown className="h-10 w-10 text-gold mx-auto" />
            <h2 className="font-display font-bold text-lg">
              {quota.has_active_subscription ? 'Property limit reached' : 'Subscription required'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {quota.has_active_subscription
                ? `Your ${quota.plan_name} plan allows ${quota.max_properties} properties and you have ${quota.properties_used}. Upgrade your subscription to list more properties.`
                : 'An active subscription is required to list properties.'}
            </p>
            <Button className="gap-2" onClick={() => navigate('/subscription')}>
              <Crown className="h-4 w-4" /> Upgrade subscription
            </Button>
          </div>
        ) : (
        <div className="space-y-6">
          <PropertyForm
            onSave={handleSave}
            onCancel={() => navigate('/dashboard/manager')}
            submitLabel="Create Property"
            saving={saving}
            onCurrencyChange={setCurrency}
          />
          <div className="bg-card border border-border rounded-xl p-5">
            <UnitsEditor units={units} currency={currency} onChange={setUnits} />
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
