import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import Navbar from '@/components/Navbar';
import PropertyCard from '@/components/PropertyCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, SlidersHorizontal, Loader2 } from 'lucide-react';
import heroBg from '@/assets/hero-bg.jpg';

type Property = Database['public']['Tables']['properties']['Row'];

const DEMO_ACCOUNTS = [
  { email: 'admin@afodabo.ug', role: 'Admin', color: 'bg-accent/20 text-accent border-accent/30' },
  { email: 'john@afodabo.ug', role: 'House Manager', color: 'bg-primary/10 text-primary border-primary/30' },
  { email: 'grace@afodabo.ug', role: 'House Manager', color: 'bg-primary/10 text-primary border-primary/30' },
  { email: 'sarah@afodabo.ug', role: 'Tenant', color: 'bg-secondary text-secondary-foreground border-border' },
  { email: 'david@afodabo.ug', role: 'Tenant (rent due)', color: 'bg-orange-50 text-orange-700 border-orange-200' },
];

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDistrict, setSearchDistrict] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => { fetchProperties(); }, [searchDistrict, filterType, filterPeriod]);

  const fetchProperties = async () => {
    setLoading(true);
    let query = supabase.from('properties').select('*').eq('status', 'available').order('created_at', { ascending: false });
    if (searchDistrict && searchDistrict !== 'all') query = query.ilike('district', `%${searchDistrict}%`);
    if (filterType && filterType !== 'all') query = query.eq('property_type', filterType as Database['public']['Enums']['property_type']);
    if (filterPeriod && filterPeriod !== 'all') query = query.eq('rent_period', filterPeriod as Database['public']['Enums']['rent_period']);
    const { data } = await query.limit(12);
    if (data) setProperties(data);
    setLoading(false);
  };

  const handleSearch = () => setSearchDistrict(searchInput);

  const stats = [
    { value: '45+', label: 'Districts Covered' },
    { value: '12', label: 'Active Listings' },
    { value: '2', label: 'Active Tenancies' },
    { value: 'UGX 1', label: 'Annual Subscription' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative min-h-[580px] flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }}>
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <p className="text-accent font-semibold tracking-widest uppercase text-sm mb-3 animate-fade-in">Uganda's #1 District Relocation Housing App</p>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-primary-foreground mb-6 text-balance animate-fade-up leading-tight">
            Find Your Perfect Home in Any Uganda District
          </h1>
          <p className="text-primary-foreground/80 text-lg mb-10 max-w-2xl mx-auto">
            Search verified rentals across Uganda. Connect with house managers, generate agreements, and manage rent — all in one app.
          </p>
          <div className="bg-card rounded-xl shadow-lg p-3 flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto animate-fade-up">
            <div className="flex-1 flex items-center gap-2 px-3">
              <MapPin className="h-5 w-5 text-accent shrink-0" />
              <Input
                placeholder="Enter district or city (e.g. Kampala)…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button onClick={handleSearch} className="gradient-primary text-primary-foreground px-8 h-11 font-semibold gap-2">
              <Search className="h-4 w-4" />Search
            </Button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-primary py-10">
        <div className="container grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <div className="text-gold text-3xl font-display font-bold">{s.value}</div>
              <div className="text-primary-foreground/80 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO ACCOUNTS */}
      <section className="bg-secondary py-10 border-b border-border">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="font-display text-xl font-bold text-foreground">🎯 Try the Demo Accounts</h2>
            <p className="text-muted-foreground text-sm mt-1">All accounts use password: <code className="bg-card px-2 py-0.5 rounded border border-border font-mono font-bold">Demo@1234</code></p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {DEMO_ACCOUNTS.map(a => (
              <button
                key={a.email}
                onClick={() => navigate(`/login`)}
                className={`border rounded-lg px-4 py-3 text-left hover:shadow-md transition-all ${a.color}`}
              >
                <div className="font-semibold text-sm">{a.role}</div>
                <div className="font-mono text-xs opacity-80 mt-0.5">{a.email}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PROPERTIES */}
      <section className="container py-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">
              {searchDistrict ? `Properties in ${searchDistrict}` : 'Available Properties'}
            </h2>
            <p className="text-muted-foreground mt-1">{properties.length} properties found</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Property type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="self_contained">Self-Contained</SelectItem>
                <SelectItem value="room">Room</SelectItem>
                <SelectItem value="studio">Studio</SelectItem>
                <SelectItem value="bungalow">Bungalow</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Rent period" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-card rounded-lg h-72 animate-pulse border border-border" />)}
          </div>
        ) : properties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((p, i) => <PropertyCard key={p.id} property={p} index={i} />)}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-5xl mb-4">🏠</p>
            <p className="text-lg font-medium">No properties found</p>
            <p className="text-sm mt-1">Try adjusting your search filters</p>
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-secondary py-16">
        <div className="container text-center">
          <h2 className="font-display text-3xl font-bold text-foreground mb-3">How Afodabohousing Works</h2>
          <p className="text-muted-foreground mb-12 max-w-xl mx-auto">Simple, transparent, built for Uganda</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '🔍', title: 'Search by District', desc: 'Browse verified properties filtered by district, type, rooms, price and amenities.' },
              { icon: '📞', title: 'Contact House Manager', desc: 'Call or message directly. Get GPS directions to any listed property.' },
              { icon: '📝', title: 'Move In & Manage', desc: 'Generate tenancy agreements, upload payment proofs, track rent due dates.' },
            ].map(step => (
              <div key={step.title} className="bg-card rounded-xl p-8 shadow-card">
                <div className="text-5xl mb-4">{step.icon}</div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-primary text-primary-foreground py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-display font-bold text-lg">Afodabohousing</div>
          <p className="text-primary-foreground/70 text-sm text-center">© {new Date().getFullYear()} Afodabohousing. Uganda's District Relocation Housing Platform.</p>
          <div className="flex gap-6 text-sm text-primary-foreground/70">
            <a href="#" className="hover:text-primary-foreground">Privacy</a>
            <a href="#" className="hover:text-primary-foreground">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
