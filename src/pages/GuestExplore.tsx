import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import PropertyCard from '@/components/PropertyCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import Footer from '@/components/Footer';
import { Search, SlidersHorizontal, RotateCcw, Compass, MapPin } from 'lucide-react';
import { usePropertyBookmarks } from '@/hooks/usePropertyBookmarks';

const API = import.meta.env.VITE_API_URL || '';

const PROPERTY_TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'House', value: 'house' },
  { label: 'Studio', value: 'studio' },
  { label: 'Single Room', value: 'single_room' },
  { label: 'Shop / Office', value: 'shop' },
];

const BEDROOM_OPTIONS = [
  { label: 'Any', value: '' },
  { label: '1+', value: '1' },
  { label: '2+', value: '2' },
  { label: '3+', value: '3' },
  { label: '4+', value: '4' },
];

const BATHROOM_OPTIONS = [
  { label: 'Any', value: '' },
  { label: '1+', value: '1' },
  { label: '2+', value: '2' },
  { label: '3+', value: '3' },
];

const AMENITIES = [
  'water', 'electricity', 'parking', 'security', 'wifi',
  'furnished', 'garden', 'balcony', 'solar', 'borehole',
];

interface Property {
  id: string; title: string; status: string; property_type: string;
  rent_amount: number; rent_period: string;
  bedrooms: number; bathrooms: number; sitting_rooms: number;
  state: string | null; city: string | null; area: string | null;
  district?: string;
  images: string[] | null;
  amenities?: string[];
  beds?: number; baths?: number;
}

export default function GuestExplore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // search / filters
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState(searchParams.get('state') || '');
  const [propertyType, setPropertyType] = useState(searchParams.get('type') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max') || '');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce price inputs so typing doesn't fire a request per keystroke.
  const [debouncedPrice, setDebouncedPrice] = useState({ min: minPrice, max: maxPrice });
  useEffect(() => {
    const t = setTimeout(() => setDebouncedPrice({ min: minPrice, max: maxPrice }), 400);
    return () => clearTimeout(t);
  }, [minPrice, maxPrice]);

  const { bookmarks, toggle } = usePropertyBookmarks(properties.map(p => p.id));

  // backend-side filters → API params
  const apiParams = useMemo(() => ({
    state: district || undefined,
    property_type: propertyType || undefined,
    min_price: debouncedPrice.min ? Number(debouncedPrice.min) : undefined,
    max_price: debouncedPrice.max ? Number(debouncedPrice.max) : undefined,
  }), [district, propertyType, debouncedPrice.min, debouncedPrice.max]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (apiParams.state) params.set('state', apiParams.state);
    if (apiParams.property_type) params.set('property_type', apiParams.property_type);
    if (apiParams.min_price) params.set('min_price', String(apiParams.min_price));
    if (apiParams.max_price) params.set('max_price', String(apiParams.max_price));
    params.set('limit', '50');

    try {
      const res = await fetch(`${API}/properties/public?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProperties(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
    setLoading(false);
  }, [apiParams]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  // client-side filters
  const filtered = useMemo(() => {
    let result = properties;
    const q = query.toLowerCase().trim();
    if (q) {
      result = result.filter(
        p => (p.title?.toLowerCase() || '').includes(q)
          || (p.district || p.state || '').toLowerCase().includes(q)
          || (p.area || '').toLowerCase().includes(q),
      );
    }
    const minBeds = bedrooms ? Number(bedrooms) : 0;
    const minBaths = bathrooms ? Number(bathrooms) : 0;
    if (minBeds) result = result.filter(p => (p.beds ?? p.bedrooms ?? 0) >= minBeds);
    if (minBaths) result = result.filter(p => (p.baths ?? p.bathrooms ?? 0) >= minBaths);
    if (selectedAmenities.length) {
      result = result.filter(p =>
        selectedAmenities.every(a => (p.amenities ?? []).includes(a)),
      );
    }
    return result;
  }, [properties, query, bedrooms, bathrooms, selectedAmenities]);

  const districtOptions = useMemo(() => {
    const set = new Set<string>()
    properties.forEach(p => { if (p.state) set.add(p.state); if (p.district) set.add(p.district as string) })
    return Array.from(set).sort().slice(0, 50)
  }, [properties])

  const hasActiveFilters = !!district || !!propertyType || !!minPrice || !!maxPrice
    || !!bedrooms || !!bathrooms || selectedAmenities.length > 0;

  const resetFilters = () => {
    setDistrict(''); setPropertyType(''); setMinPrice(''); setMaxPrice('');
    setBedrooms(''); setBathrooms(''); setSelectedAmenities([]);
    setSearchParams({});
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(a => a.includes(amenity) ? a.filter(x => x !== amenity) : [...a, amenity]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="bg-primary py-12 sm:py-16">
        <div className="container">
          <div className="inline-flex items-center gap-1.5 bg-accent/20 text-accent text-xs font-semibold uppercase tracking-wider rounded-full px-3.5 py-1.5 mb-3">
            <Compass className="h-3.5 w-3.5" />
            Global Rental Marketplace
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-primary-foreground leading-tight">
            Find Your Perfect Home
          </h1>
          <p className="text-primary-foreground/70 mt-1.5 text-sm sm:text-base max-w-lg">
            Browse verified rental properties worldwide
          </p>

          {/* Search bar */}
          <div className="bg-card rounded-xl p-2.5 flex items-center gap-2 mt-6 max-w-xl shadow-sm border border-border/50">
            <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
            <Input
              placeholder="Search by name, area, district…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0 bg-transparent"
            />
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="container py-6 sm:py-8">
        {/* Filter toggle */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
              showFilters
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground border-border hover:bg-secondary'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Filters'}
            {hasActiveFilters && !showFilters && (
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            )}
          </button>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {loading
              ? <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent animate-pulse" />Finding homes…</span>
              : <span><strong className="text-foreground">{filtered.length}</strong> {filtered.length === 1 ? 'home' : 'homes'} found</span>
            }
            {hasActiveFilters && (
              <button onClick={resetFilters} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-card border border-border rounded-xl p-4 sm:p-5 mb-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              {/* Location — searchable */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Location — type "ka" for Kampala, etc.</label>
                <Input list="district-suggestions" placeholder="City, area, or district — type to filter" value={district} onChange={e => setDistrict(e.target.value)} />
                <datalist id="district-suggestions">
                  {districtOptions.map(d => <option key={d} value={d} />)}
                </datalist>
              </div>

              {/* Property type */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Property Type</label>
                <Select value={propertyType || 'all'} onValueChange={v => setPropertyType(v === 'all' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value || 'all'}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min price */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Min Price</label>
                <Input type="number" placeholder="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
              </div>

              {/* Max price */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Max Price</label>
                <Input type="number" placeholder="Any" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
              </div>

              {/* Bedrooms */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Min Bedrooms</label>
                <Select value={bedrooms || 'any'} onValueChange={v => setBedrooms(v === 'any' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    {BEDROOM_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value || 'any'}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bathrooms */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Min Bathrooms</label>
                <Select value={bathrooms || 'any'} onValueChange={v => setBathrooms(v === 'any' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    {BATHROOM_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value || 'any'}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map(a => {
                  const active = selectedAmenities.includes(a);
                  return (
                    <button
                      key={a}
                      onClick={() => toggleAmenity(a)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors border ${
                        active
                          ? 'bg-accent text-accent-foreground border-accent'
                          : 'bg-background text-muted-foreground border-border hover:bg-secondary'
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 pt-3 border-t border-border">
                <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-muted-foreground">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset All Filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-72 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Compass className="h-6 w-6 text-destructive" />
            </div>
            <p className="text-lg font-semibold text-foreground">Could not load properties</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{error}</p>
            <Button onClick={fetchProperties} variant="outline">Retry</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Compass className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground">No properties found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filters</p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={resetFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((p, i) => <PropertyCard key={p.id} property={p} index={i} bookmarks={bookmarks} onToggleBookmark={toggle} />)}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
