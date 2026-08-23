import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Home, MapPin, DollarSign, Image, Upload, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const API = import.meta.env.VITE_API_URL || '';

const CURRENCY_MAP: Record<string, string> = {
  UG: 'UGX', SD: 'SDG', CD: 'CDF', KE: 'KES', TZ: 'TZS', NG: 'NGN',
  GH: 'GHS', ZA: 'ZAR', RW: 'RWF', ET: 'ETB', CM: 'XAF', SS: 'SSP',
  MZ: 'MZN', ZM: 'ZMW', MW: 'MWK', BW: 'BWP', NA: 'NAD', SZ: 'SZL',
  LS: 'LSL', MU: 'MUR', SC: 'SCR', DJ: 'DJF', SO: 'SOS', BI: 'BIF',
  UZ: 'UZS', KZ: 'KZT', PK: 'PKR', IN: 'INR', PH: 'PHP', BD: 'BDT',
  LK: 'LKR', NP: 'NPR', MM: 'MMK', KH: 'KHR', VN: 'VND', TH: 'THB',
  MY: 'MYR', ID: 'IDR', SG: 'SGD', BN: 'BND', JP: 'JPY', CN: 'CNY',
  KR: 'KRW', TW: 'TWD', HK: 'HKD', AU: 'AUD', NZ: 'NZD', GB: 'GBP',
  US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP',
  CO: 'COP', PE: 'PEN', PY: 'PYG', UY: 'UYU', SE: 'SEK', NO: 'NOK',
  DK: 'DKK', CH: 'CHF', IS: 'ISK',
};

interface Country { iso2: string; name: string; }
interface Region { id: string; country_id: string; name: string; admin_level: string; geonames_id: string; }
const AMENITIES = ['Water', 'Electricity', 'WiFi', 'Parking', 'Security', 'Garden', 'Generator', 'DSTV', 'Borehole', 'Tiled Floors'];

export interface PropertyFormData {
  title: string; description: string; property_type: string; state: string;
  address: string; bedrooms: number; sitting_rooms: number;
  bathrooms: number; monthly_rent: number; rent_period: string;
  manager_phone: string; manager_email: string; amenities: string[];
  images: string[]; latitude: string; longitude: string;
  country: string; region_id: string; rent_currency: string;
}

interface Props {
  initialData?: Partial<PropertyFormData>;
  onSave: (data: PropertyFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  saving?: boolean;
}

export default function PropertyForm({ initialData, onSave, onCancel, submitLabel, saving }: Props) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [mapsUrl, setMapsUrl] = useState('');
  const [showMapsInput, setShowMapsInput] = useState(false);
  const [mapsError, setMapsError] = useState('');
  const [geoError, setGeoError] = useState('');

  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [deprecatedWarning, setDeprecatedWarning] = useState('');
  const [regionLabel, setRegionLabel] = useState('District');

  const [form, setForm] = useState<PropertyFormData>({
    title: '', description: '', property_type: 'Residential', state: '',
    address: '', bedrooms: 1, sitting_rooms: 1,
    bathrooms: 1, monthly_rent: 0, rent_period: 'monthly',
    manager_phone: '', manager_email: '', amenities: [], images: [],
    latitude: '', longitude: '',
    country: 'UG', region_id: '', rent_currency: 'UGX',
    ...initialData,
  });

  useEffect(() => {
    fetch(`${API}/regions/countries`)
      .then(r => r.json())
      .then((data: Country[]) => setCountries(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.country) { setRegions([]); return; }
    setLoadingRegions(true);
    setDeprecatedWarning('');
    fetch(`${API}/regions/regions?country_id=${form.country}&active_only=true`)
      .then(r => r.json())
      .then((data: Region[]) => {
        setRegions(data);
        if (data.length > 0) {
          const label = data[0].admin_level || 'District';
          setRegionLabel(label.charAt(0).toUpperCase() + label.slice(1));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRegions(false));
  }, [form.country]);

  useEffect(() => {
    if (!form.region_id || regions.length === 0) return;
    const selected = regions.find(r => r.id === form.region_id);
    if (!selected) {
      setDeprecatedWarning('This region has been updated or reorganized. Please reselect from the list.');
    }
  }, [form.region_id, regions]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('phone, email').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (!data) return;
        setForm(f => ({
          ...f,
          manager_phone: f.manager_phone || data.phone || '',
          manager_email: f.manager_email || data.email || '',
        }));
      });
    });
  }, []);

  const handleCountryChange = (iso: string) => {
    const currency = CURRENCY_MAP[iso] || 'USD';
    setForm(f => ({ ...f, country: iso, region_id: '', rent_currency: currency }));
    setDeprecatedWarning('');
  };

  const toggleAmenity = (a: string) => {
    setForm(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a] }));
  };

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: 'Only image files allowed', variant: 'destructive' }); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `property_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { data, error } = await supabase.storage.from('property-images').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('property-images').getPublicUrl(path);
      setForm(f => ({ ...f, images: [...f.images, publicUrl] }));
    } catch (err: any) { toast({ title: 'Upload failed', description: err.message, variant: 'destructive' }); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  function removeImage(url: string) {
    setForm(f => ({ ...f, images: f.images.filter(i => i !== url) }));
  }

  const parseGoogleMapsLink = (url: string) => {
    // @lat,lng (standard)
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) { const lat = parseFloat(atMatch[1]), lng = parseFloat(atMatch[2]); if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }; }
    // ?q=lat,lng
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) { const lat = parseFloat(qMatch[1]), lng = parseFloat(qMatch[2]); if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }; }
    // ?query=lat,lng
    const queryMatch = url.match(/[?&]query=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (queryMatch) { const lat = parseFloat(queryMatch[1]), lng = parseFloat(queryMatch[2]); if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }; }
    // ?ll=lat,lng
    const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch) { const lat = parseFloat(llMatch[1]), lng = parseFloat(llMatch[2]); if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }; }
    // /maps/@lat,lng
    const mapsAtMatch = url.match(/maps\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (mapsAtMatch) { const lat = parseFloat(mapsAtMatch[1]), lng = parseFloat(mapsAtMatch[2]); if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }; }
    // ?center=lat,lng
    const centerMatch = url.match(/[?&]center=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (centerMatch) { const lat = parseFloat(centerMatch[1]), lng = parseFloat(centerMatch[2]); if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }; }
    // !3d lat !4d lng (Google data format)
    const dataMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (dataMatch) { const lat = parseFloat(dataMatch[1]), lng = parseFloat(dataMatch[2]); if (!isNaN(lat) && !isNaN(lng)) return { lat, lng }; }
    return null;
  };

  const handleParseMapsUrl = async () => {
    let url = mapsUrl.trim();
    if (!url) { setMapsError('Please paste a Google Maps link.'); return; }
    // Resolve short links via backend (avoids CORS)
    if (url.includes('goo.gl') || url.includes('maps.app.goo') || url.includes('maps.google.com')) {
      try {
        const r = await fetch(`${API}/regions/resolve-url?url=${encodeURIComponent(url)}`);
        const data = await r.json();
        if (data.url) url = data.url;
      } catch { /* try parsing original URL */ }
    }
    const r = parseGoogleMapsLink(url);
    if (!r) { setMapsError('Could not find coordinates. Open the link in Google Maps and copy the full URL from the address bar.'); return; }
    setForm(f => ({ ...f, latitude: String(r.lat), longitude: String(r.lng) }));
    setMapsUrl(''); setShowMapsInput(false); setMapsError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.country) { toast({ title: 'Country is required', variant: 'destructive' }); return; }
    if (!form.region_id) { toast({ title: `${regionLabel} is required`, variant: 'destructive' }); return; }
    if (!form.latitude || !form.longitude) { setGeoError('Please add property location via Maps URL or enter coordinates manually.'); return; }
    setGeoError('');
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> Basic Info</h2>
        <div>
          <p className="text-sm font-semibold mb-2">Property Title</p>
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required placeholder="e.g. Spacious 3-Bedroom House in Ntinda" className="rounded-lg h-11" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2">Type</p>
            <select value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))}
              className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="Residential">Residential</option>
              <option value="Office Space">Office Space</option>
            </select>
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Rent Period</p>
            <select value={form.rent_period} onChange={e => setForm(f => ({ ...f, rent_period: e.target.value }))}
              className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold mb-2">Description</p>
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3} placeholder="Describe the property, surroundings, access..." className="rounded-lg" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Location</h2>

        <div>
          <p className="text-sm font-semibold mb-2">Country</p>
          <select value={form.country} onChange={e => handleCountryChange(e.target.value)}
            className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm" required>
            <option value="">Select country...</option>
            {countries.map(c => <option key={c.iso2} value={c.iso2}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">{regionLabel}</p>
          <select value={form.region_id} onChange={e => setForm(f => ({ ...f, region_id: e.target.value }))}
            className="w-full h-11 rounded-lg border border-input bg-background px-3 text-sm" required
            disabled={!form.country || loadingRegions}>
            <option value="">{loadingRegions ? 'Loading...' : `Select ${regionLabel.toLowerCase()}...`}</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {deprecatedWarning && (
            <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {deprecatedWarning}
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">Property Location</p>
          <div className="flex gap-2">
            <Input value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} placeholder="Latitude" className="flex-1 rounded-lg h-11" />
            <Input value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} placeholder="Longitude" className="flex-1 rounded-lg h-11" />
            <button type="button" onClick={() => setShowMapsInput(!showMapsInput)} className="px-3 h-11 rounded-lg border border-input bg-background text-sm text-muted-foreground hover:border-primary whitespace-nowrap">
              Maps URL
            </button>
          </div>
          {showMapsInput && (
            <div className="flex gap-2 mt-2">
              <Input value={mapsUrl} onChange={e => { setMapsUrl(e.target.value); setMapsError(''); }} placeholder="Paste Google Maps link..." className="flex-1 rounded-lg h-11" />
              <button type="button" onClick={handleParseMapsUrl} className="px-4 h-11 rounded-lg bg-primary text-primary-foreground text-sm">Parse</button>
            </div>
          )}
          {mapsError && <p className="text-xs text-red-500 mt-1">{mapsError}</p>}
          {geoError && <p className="text-xs text-red-500 mt-1">{geoError}</p>}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> Rooms</h2>
        <div className="grid grid-cols-4 gap-4">
          {(['bedrooms', 'sitting_rooms', 'bathrooms'] as const).map(field => (
            <div key={field}>
              <p className="text-sm font-semibold mb-2 capitalize">{field.replace('_', ' ')}</p>
              <Input type="number" min={0} value={form[field]} onChange={e => setForm(f2 => ({ ...f2, [field]: Number(e.target.value) }))}
                className="rounded-lg h-11" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Pricing</h2>
        <div>
          <p className="text-sm font-semibold mb-2">Rent Amount ({form.rent_currency || 'UGX'})</p>
          <Input type="number" min={0} value={form.monthly_rent || ''} onChange={e => setForm(f => ({ ...f, monthly_rent: Number(e.target.value) }))}
            required placeholder="e.g. 500000" className="rounded-lg h-11" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><Image className="h-4 w-4 text-primary" /> Photos</h2>
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
            <Upload className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
          {form.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {form.images.map(url => (
                <div key={url} className="relative group">
                  <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover border" />
                  <button type="button" onClick={() => removeImage(url)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
        <h2 className="font-bold text-sm flex items-center gap-2"><Image className="h-4 w-4 text-primary" /> Amenities & Contact</h2>
        <div>
          <p className="text-sm font-semibold mb-2">Amenities</p>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map(a => (
              <button key={a} type="button" onClick={() => toggleAmenity(a)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${form.amenities.includes(a) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground hover:border-primary'}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2">Contact Phone</p>
            <Input value={form.manager_phone} onChange={e => setForm(f => ({ ...f, manager_phone: e.target.value }))}
              placeholder="+256 788 100145" className="rounded-lg h-11" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2">Contact Email</p>
            <Input type="email" value={form.manager_email} onChange={e => setForm(f => ({ ...f, manager_email: e.target.value }))}
              placeholder="manager@example.com" className="rounded-lg h-11" />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1 rounded-lg h-12" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving} className="flex-1 rounded-lg h-12 font-bold gap-2">
          <Save className="h-4 w-4" /> {saving ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
