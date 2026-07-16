import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import PropertyCard from '@/components/PropertyCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, SlidersHorizontal, MapPin } from 'lucide-react';
import Footer from '@/components/Footer';

const API = import.meta.env.VITE_API_URL || '';

interface Property {
  id: string; title: string; status: string; property_type: string;
  rent_amount: number; rent_period: string; bedrooms: number; bathrooms: number;
  sitting_rooms: number; state: string | null; city: string | null;
  area: string | null; images: string[] | null; description: string | null;
  amenities: string[] | null; address: string | null; created_at: string;
}

const UGANDA_STATES = [
  'All States', 'Central', 'Eastern', 'Western', 'Northern', 'North Eastern', 'South Western', 'Buganda', 'Kigezi',
  'Ankole', 'Toro', 'Busoga', 'Lango', 'Acholi', 'Karamoja', 'West Nile', 'Bunyoro', 'Tooro',
];

export default function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [state, setState] = useState(searchParams.get('state') || '');
  const [propType, setPropType] = useState(searchParams.get('type') || 'all');
  const [period, setPeriod] = useState(searchParams.get('period') || 'all');
  const [minPrice, setMinPrice] = useState(searchParams.get('min') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max') || '');
  const [stateInput, setStateInput] = useState(state);

  useEffect(() => {
    fetchProperties();
  }, [state, propType, period, minPrice, maxPrice]);

  const fetchProperties = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (state) params.set('state', state);
    if (propType !== 'all') params.set('property_type', propType);
    if (period !== 'all') params.set('rent_period', period);
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);
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
    if (stateInput) params.state = stateInput;
    if (propType !== 'all') params.type = propType;
    if (period !== 'all') params.period = period;
    setSearchParams(params);
  };

  const clearFilters = () => {
    setState(''); setPropType('all'); setPeriod('all');
    setMinPrice(''); setMaxPrice(''); setStateInput('');
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Page Header */}
      <div className="bg-primary py-10">
        <div className="container">
          <h1 className="font-display text-3xl font-bold text-primary-foreground mb-4">Browse Properties</h1>
          {/* Search row */}
          <div className="bg-card rounded-xl p-3 flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="flex-1 flex items-center gap-2 px-3">
              <MapPin className="h-4 w-4 text-accent shrink-0" />
              <Input
                placeholder="State or city…"
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
        </div>
      </div>

      <div className="container py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters sidebar */}
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
                  <Label className="text-sm mb-2 block">State</Label>
                  <Select value={state || 'all'} onValueChange={v => setState(v === 'all' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent>
                      {UGANDA_STATES.map(s => (
                        <SelectItem key={s} value={s === 'All States' ? 'all' : s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label className="text-sm mb-2 block">Price Range (UGX)</Label>
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

          {/* Results */}
          <div className="flex-1">
            <p className="text-muted-foreground text-sm mb-5">
              Showing <strong className="text-foreground">{total}</strong> properties
              {state ? ` in ${state}` : ' across Uganda'}
            </p>

            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => <div key={i} className="h-72 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : properties.length > 0 ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {properties.map((p, i) => <PropertyCard key={p.id} property={p} index={i} />)}
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
