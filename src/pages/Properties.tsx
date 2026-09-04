import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import PageHero from '@/components/PageHero';
import PropertyCard from '@/components/PropertyCard';
import propertyFacade from '@/assets/property-1.jpg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, SlidersHorizontal, MapPin } from 'lucide-react';
import Footer from '@/components/Footer';
import { usePropertyBookmarks } from '@/hooks/usePropertyBookmarks';

const API = import.meta.env.VITE_API_URL || '';

interface Property {
  id: string; title: string; status: string; property_type: string;
  rent_amount: number; rent_period: string; bedrooms: number; bathrooms: number;
  sitting_rooms: number; state: string | null; city: string | null;
  area: string | null; images: string[] | null; description: string | null;
  amenities: string[] | null; address: string | null; created_at: string;
  region_id: string | null; country: string | null; rent_currency: string | null;
}

interface Region { id: string; name: string; country_id: string; }
interface Country { id: string; name: string; iso2: string; }

const CURRENCY_MAP: Record<string, string> = {
  UG: 'UGX', KE: 'KES', TZ: 'TZS', NG: 'NGN', GH: 'GHS', ZA: 'ZAR',
  RW: 'RWF', ET: 'ETB', SD: 'SDG', CD: 'CDF', CM: 'XAF', MZ: 'MZN',
  ZM: 'ZMW', MW: 'MWK', SS: 'SSP', US: 'USD', GB: 'GBP', EU: 'EUR',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  UGX: 'UGX', KES: 'KES', NGN: '₦', GHS: 'GH₵', TZS: 'TSh', ZAR: 'R', USD: '$', GBP: '£', EUR: '€',
};

export default function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [country, setCountry] = useState(searchParams.get('country') || '');
  const [regionId, setRegionId] = useState(searchParams.get('region_id') || '');
  const [state, setState] = useState(searchParams.get('state') || '');
  const [propType, setPropType] = useState(searchParams.get('type') || 'all');
  const [period, setPeriod] = useState(searchParams.get('period') || 'all');
  const [minPrice, setMinPrice] = useState(searchParams.get('min') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max') || '');
  const [stateInput, setStateInput] = useState(state);

  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState('UGX');

  const [priceFilters, setPriceFilters] = useState({ min: minPrice, max: maxPrice });
  useEffect(() => {
    const t = setTimeout(() => setPriceFilters({ min: minPrice, max: maxPrice }), 400);
    return () => clearTimeout(t);
  }, [minPrice, maxPrice]);

  // Load countries on mount
  useEffect(() => {
    fetch(`${API}/regions/countries`)
      .then(r => r.json())
      .then((data: Country[]) => setCountries(data.filter(c => !c.id.startsWith('deprecated-'))))
      .catch(() => {});
  }, []);

  // Load regions when country changes
  useEffect(() => {
    if (!country) { setRegions([]); return; }
    fetch(`${API}/regions/regions?country_id=${country}`)
      .then(r => r.json())
      .then((data: Region[]) => setRegions(data.filter(r => !r.id.startsWith('deprecated-'))))
      .catch(() => {});
  }, [country]);

  // Sync currency when country changes
  useEffect(() => {
    if (!country) { setSelectedCurrency('UGX'); return; }
    setSelectedCurrency(CURRENCY_MAP[country] || 'UGX');
  }, [country]);

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, regionId, state, propType, period, priceFilters.min, priceFilters.max]);

  const { bookmarks, toggle } = usePropertyBookmarks(properties.map(p => p.id));

  const fetchProperties = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (country) params.set('country', country);
    if (regionId) params.set('region_id', regionId);
    if (state) params.set('state', state);
    if (propType !== 'all') params.set('property_type', propType);
    if (period !== 'all') params.set('rent_period', period);
    if (priceFilters.min) params.set('min_price', priceFilters.min);
    if (priceFilters.max) params.set('max_price', priceFilters.max);
    params.set('limit', '50');

    try {
      const res = await fetch(`${API}/properties/public?${params}`);
      const data = await res.json();
      if (data.items) setProperties(data.items);
      if (data.total !== undefined) setTotal(data.total);
    } catch (e) {
      console.error('Failed to fetch properties:', e);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    setState(stateInput);
    const params: Record<string, string> = {};
    if (country) params.country = country;
    if (regionId) params.region_id = regionId;
    if (stateInput) params.state = stateInput;
    if (propType !== 'all') params.type = propType;
    if (period !== 'all') params.period = period;
    setSearchParams(params);
  };

  const clearFilters = () => {
    setCountry(''); setRegionId(''); setState(''); setPropType('all');
    setPeriod('all'); setMinPrice(''); setMaxPrice(''); setStateInput('');
    setSearchParams({});
  };

  const activeCountry = countries.find(c => c.id === country);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <PageHero
        overline="Verified Listings"
        title="Browse Properties"
        align="left"
        image={propertyFacade}
      >
        <div className="bg-card rounded-xl p-3 flex flex-col sm:flex-row gap-3 max-w-2xl mt-6">
          <div className="flex-1 flex items-center gap-2 px-3">
            <MapPin className="h-4 w-4 text-accent shrink-0" />
            <Input
              placeholder="State, city, or area…"
              value={stateInput}
              onChange={e => setStateInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="border-0 shadow-none focus-visible:ring-0 bg-transparent"
            />
          </div>
          <Button onClick={handleSearch} className="gradient-primary text-primary-foreground gap-2">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </PageHero>

      <div className="container py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 shrink-0">
            <div className="bg-card border border-border rounded-xl p-5 shadow-card sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </h3>
                <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-accent">Clear all</button>
              </div>

              <div className="space-y-5">
                <div>
                  <Label className="text-sm mb-2 block">Country</Label>
                  <Select value={country || 'all'} onValueChange={v => {
                    const val = v === 'all' ? '' : v;
                    setCountry(val);
                    setRegionId('');
                  }}>
                    <SelectTrigger><SelectValue placeholder="All Countries" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {countries.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {country && regions.length > 0 && (
                  <div>
                    <Label className="text-sm mb-2 block">Region</Label>
                    <Select value={regionId || 'all'} onValueChange={v => setRegionId(v === 'all' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="All Regions" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        {regions.map(r => (
                          <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-sm mb-2 block">State / District</Label>
                  <Input
                    placeholder="e.g. Kampala, Wakiso…"
                    value={stateInput}
                    onChange={e => setStateInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Property Type</Label>
                  <Select value={propType} onValueChange={setPropType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Residential">Residential</SelectItem>
                      <SelectItem value="Office Space">Office Space</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Rent Period</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Period</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">
                    Price Range ({CURRENCY_SYMBOLS[selectedCurrency] || selectedCurrency})
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={e => setMinPrice(e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={e => setMaxPrice(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>

                <Button onClick={fetchProperties} className="w-full gradient-primary text-primary-foreground">
                  Apply Filters
                </Button>
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <p className="text-muted-foreground text-sm mb-5">
              Showing <strong className="text-foreground">{total}</strong> properties
              {activeCountry ? ` in ${activeCountry.name}` : ''}
              {state ? ` — ${state}` : ''}
            </p>

            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => <div key={i} className="h-72 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : properties.length > 0 ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {properties.map((p, i) => <PropertyCard key={p.id} property={p} index={i} bookmarks={bookmarks} onToggleBookmark={toggle} />)}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No properties match your search</p>
                <p className="text-sm mt-1">Try adjusting your filters</p>
                <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
