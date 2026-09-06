import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { apiGet } from '@/services/api';
import Navbar from '@/components/Navbar';
import PropertyCard from '@/components/PropertyCard';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { isMobileDevice } from '@/lib/utils';
import {
  Search, MapPin, Shield, Home, MessageSquare, ArrowRight, ArrowUpRight,
  CreditCard, Star, Smartphone, Download, Building2,
  Wallet, MapPinned, BellRing, User, Users,
} from 'lucide-react';
import heroMain from '@/assets/hero-main.jpg';
import heroBg from '@/assets/hero-bg.jpg';
import property3 from '@/assets/property-3.jpg';
import showcaseInterior from '@/assets/showcase-interior.jpg';

const API = import.meta.env.VITE_API_URL || '';
interface Country { iso2: string; name: string; }
interface Region { id: string; country_id: string; name: string; admin_level: string; }

interface Property {
  id: string; title: string; status: string; property_type: string;
  rent_amount: number; rent_period: string; bedrooms: number; bathrooms: number;
  sitting_rooms: number; state: string | null; city: string | null;
  area: string | null; images: string[] | null; monthly_rent?: number;
}

/* ---------------------------------------------------------------------------
 * Scroll reveal — elements rise and settle as they enter the viewport.
 * ------------------------------------------------------------------------ */
function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible');
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ ['--reveal-delay' as string]: `${delay}s` }}>
      {children}
    </div>
  );
}

const WHY_AXIS = [
  {
    icon: <Shield className="h-5 w-5" />,
    title: 'Verified Listings',
    desc: 'Every property is reviewed and verified before going live. No fake or misleading listings, guaranteed.',
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: 'Direct Messaging',
    desc: 'Communicate directly with house managers without sharing personal numbers until you are ready.',
  },
  {
    icon: <Home className="h-5 w-5" />,
    title: 'Tenancy Management',
    desc: 'Digital agreements, rent tracking, payment history and reminders, all automated for you.',
  },
  {
    icon: <CreditCard className="h-5 w-5" />,
    title: 'Flexible Payments',
    desc: 'Pay rent via mobile money (MTN, Airtel) or card. Upload proof instantly. Automated SMS confirmation.',
  },
];

const ROLES = [
  {
    icon: <User className="h-5 w-5" />,
    title: 'Tenants',
    points: [
      'Browse and bookmark verified properties',
      'Pay rent via MTN/Airtel or card',
      'Track payments and tenancy progress',
      'Request maintenance and get updates',
      'Sign agreements digitally',
    ],
  },
  {
    icon: <Building2 className="h-5 w-5" />,
    title: 'House Managers',
    points: [
      'List properties with GPS and photos',
      'Manage tenants, leases, and units',
      'Review and confirm payments instantly',
      'Send SMS rent reminders automatically',
      'Export CSV/XLSX/PDF reports',
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Free Users',
    points: [
      'Browse all properties with full details',
      'Save bookmarks and compare listings',
      'Contact managers directly via phone/email',
      'Get GPS directions to any property',
      'Free to join — no commitment needed',
    ],
  },
];

const STEPS = [
  {
    numeral: '01',
    title: 'Search by Location',
    desc: 'Browse thousands of verified rentals filtered by state, type, number of rooms, price range and available amenities.',
  },
  {
    numeral: '02',
    title: 'Contact the Manager',
    desc: 'Message or call house managers directly from the listing. View photos, room details and get GPS directions via OpenStreetMap.',
  },
  {
    numeral: '03',
    title: 'Move In and Manage',
    desc: 'Sign a digital tenancy agreement, pay rent via mobile money or card, receive SMS confirmations and track everything from your dashboard.',
  },
];

const CALLOUTS = [
  {
    icon: <BellRing className="h-5 w-5" />,
    title: 'SMS Notifications',
    desc: 'Instant SMS alerts for rent reminders, payment confirmations and account updates.',
  },
  {
    icon: <Wallet className="h-5 w-5" />,
    title: 'Mobile Money & Cards',
    desc: 'MTN Mobile Money, Airtel Money, Visa or Mastercard. All major Ugandan payment methods.',
  },
  {
    icon: <MapPinned className="h-5 w-5" />,
    title: 'OpenStreetMap Directions',
    desc: 'Precise GPS directions to any listed property using OpenStreetMap. No extra apps needed.',
  },
];

const TESTIMONIALS = [
  { name: 'Namukasa Grace', role: 'House Manager, Wakiso', quote: 'I listed my 3 properties in under 10 minutes. Tenants contact me directly and I confirm payments instantly. Excellent platform.', rating: 5 },
  { name: 'Ssekandi James', role: 'Tenant, Kampala', quote: 'Found my apartment in Bukoto within two days. The map feature made it easy to check the location before visiting. Very convenient.', rating: 5 },
  { name: 'Auma Christine', role: 'Tenant, Gulu', quote: 'Even in Gulu we have listings! I was relocating from Kampala and Axis made the search stress-free. Highly recommend.', rating: 5 },
];

const FALLBACK_LOCATIONS = ['Kampala', 'Wakiso', 'Entebbe', 'Jinja', 'Mbarara', 'Gulu', 'Mbale', 'Arua', 'Fort Portal', 'Masaka'];
const MARQUEE_LOCATIONS = ['Luzira', 'Lira', 'Kampala', 'Masaka', 'Mbarara', 'Mbale', 'Gulu', 'Arua', 'Kigali', 'Dodoma', 'Kisumu', 'Nairobi'];

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [stats, setStats] = useState({ properties: 0, tenancies: 0, users: 0, locations: 0 });
  const [popularLocations, setPopularLocations] = useState<string[]>([]);
  const navigate = useNavigate();

  const [selectedCountry, setSelectedCountry] = useState('UG');
  const [selectedRegion, setSelectedRegion] = useState('__all__');
  const [areaInput, setAreaInput] = useState('');
  const [countries, setCountries] = useState<Country[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionLabel, setRegionLabel] = useState('District');
  const [loadingRegions, setLoadingRegions] = useState(false);

  useEffect(() => {
    fetch(`${API}/regions/countries`)
      .then(r => r.json())
      .then((data: Country[]) => setCountries(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCountry) { setRegions([]); return; }
    setLoadingRegions(true);
    fetch(`${API}/regions/regions?country_id=${selectedCountry}&active_only=true`)
      .then(r => r.json())
      .then((data: Region[]) => {
        setRegions(data);
        setSelectedRegion('__all__');
        if (data.length > 0) {
          const label = data[0].admin_level || 'District';
          setRegionLabel(label.charAt(0).toUpperCase() + label.slice(1));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRegions(false));
  }, [selectedCountry]);

  useEffect(() => { fetchProperties(); }, [selectedCountry, selectedRegion, areaInput, filterType]);
  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchPopularLocations(); }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '9' });
      if (selectedCountry) params.set('country', selectedCountry);
      if (selectedRegion && selectedRegion !== '__all__') params.set('region_id', selectedRegion);
      if (areaInput) params.set('state', areaInput);
      if (filterType && filterType !== 'all') params.set('property_type', filterType);
      const res = await apiGet<{ items: any[]; total: number }>(`/properties/public?${params}`);
      setProperties(res.items.map((p: any) => ({ ...p, rent_amount: p.monthly_rent || p.rent_amount })));
    } catch { setProperties([]); }
    setLoading(false);
  };

  const fetchStats = async () => {
    // Preferred: backend public-stats endpoint (service role → real totals
    // even though RLS blocks anonymous counts on leases/profiles).
    try {
      const s = await apiGet<{ properties: number; tenancies: number; users: number; locations: number }>('/properties/public-stats');
      setStats({
        properties: s.properties || 0,
        tenancies: s.tenancies || 0,
        users: s.users || 0,
        locations: s.locations || 0,
      });
      return;
    } catch { /* fall through to direct Supabase counts */ }
    const [pRes, lRes, uRes, cityRes] = await Promise.all([
      supabase.from('properties').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('leases').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('properties').select('city').eq('is_active', true).not('city', 'is', null).limit(2000),
    ]);
    const locations = new Set(
      ((cityRes.data as any[]) || []).map(d => (d.city || '').trim()).filter(Boolean)
    ).size;
    setStats({ properties: pRes.count || 0, tenancies: lRes.count || 0, users: uRes.count || 0, locations });
  };

  const fetchPopularLocations = async () => {
    try {
      const { data } = await supabase
        .from('properties')
        .select('city')
        .eq('is_active', true)
        .not('city', 'is', null)
        .limit(2000);
      const counts: Record<string, number> = {};
      ((data as any[]) || []).forEach(r => {
        const c = (r.city || '').trim();
        if (c) counts[c] = (counts[c] || 0) + 1;
      });
      const top = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([c]) => c);
      setPopularLocations(top);
    } catch {
      setPopularLocations([]);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedCountry) params.set('country', selectedCountry);
    if (selectedRegion && selectedRegion !== '__all__') params.set('region_id', selectedRegion);
    if (areaInput.trim()) params.set('state', areaInput.trim());
    if (filterType && filterType !== 'all') params.set('type', filterType);
    navigate(`/properties?${params.toString()}`);
  };

  const handleChipClick = (city: string) => {
    setAreaInput(city);
    // try to auto-select a matching region
    const match = regions.find(r => r.name.toLowerCase() === city.toLowerCase());
    if (match) setSelectedRegion(match.id);
  };

  const marqueeLocations = MARQUEE_LOCATIONS;
  const chipLocations = popularLocations.length > 0 ? popularLocations : FALLBACK_LOCATIONS;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ============================================================
          HERO — full-bleed duotone photography, drifting beam lines
          ============================================================ */}
      <section className="relative min-h-[94vh] flex items-end overflow-hidden duotone-wrap">
        <img
          src={heroMain}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover duotone-img"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D1322] via-[#131B2E]/80 to-[#090E1A]/60" />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-8 pb-14 pt-40">
          <Reveal>
            <p className="flex items-center gap-3 text-cream/70 text-xs sm:text-sm font-semibold tracking-[0.28em] uppercase mb-6">
              <ArrowUpRight className="h-4 w-4 text-gold" strokeWidth={2.5} />
              Axis Housing — Housing Made Easy
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="font-display text-cream text-[13.5vw] sm:text-7xl lg:text-[92px] leading-[0.98] tracking-tight text-balance max-w-4xl">
              Find a home that<br className="hidden sm:block" />
              <span className="italic text-gold"> fits your life.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="text-cream/70 text-lg sm:text-xl mt-6 max-w-xl leading-relaxed">
              Search verified rentals, connect with trusted house managers, sign digital agreements and manage rent — all in one place.
            </p>
          </Reveal>

          {/* Search — kept functional, restyled */}
          <Reveal delay={0.24}>
            <div className="bg-card rounded-2xl shadow-2xl p-3 flex flex-col sm:flex-row gap-2 max-w-3xl mt-10">
              <div className="w-full sm:w-40">
                <SearchableSelect
                  options={countries.map(c => ({ value: c.iso2, label: c.name }))}
                  value={selectedCountry}
                  onValueChange={setSelectedCountry}
                  placeholder="Country"
                  emptyText="No country matches."
                />
              </div>

              <div className="w-full sm:w-48">
                <SearchableSelect
                  options={[{ value: '__all__', label: `All ${regionLabel}s` }, ...regions.map(r => ({ value: r.id, label: r.name }))]}
                  value={selectedRegion}
                  onValueChange={setSelectedRegion}
                  placeholder={loadingRegions ? 'Loading…' : regionLabel}
                  emptyText="No district matches."
                  disabled={loadingRegions || regions.length === 0}
                />
              </div>

              <div className="flex-1 flex items-center gap-3 px-4">
                <MapPin className="h-5 w-5 text-accent shrink-0" />
                <Input
                  placeholder="Area, city or neighbourhood…"
                  value={areaInput}
                  onChange={e => setAreaInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-foreground placeholder:text-muted-foreground text-base"
                />
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-40 border-0 border-l sm:border-l border-border rounded-none sm:rounded-none bg-transparent h-12">
                  <SelectValue placeholder="Any type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Office Space">Office Space</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleSearch}
                className="gradient-primary text-primary-foreground px-8 h-12 font-semibold gap-2 rounded-xl text-base"
              >
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.32}>
            <div className="mt-5 flex flex-wrap gap-2">
              {chipLocations.slice(0, 6).map(d => (
                <button
                  key={d}
                  onClick={() => handleChipClick(d)}
                  className="text-xs border border-cream/30 text-cream/70 hover:text-cream hover:border-cream/60 px-3 py-1.5 rounded-full transition-colors font-medium"
                >
                  {d}
                </button>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          LOCATION MARQUEE
          ============================================================ */}
      <section className="bg-primary py-4 overflow-hidden border-y border-[#0D1322]">
        <div className="marquee-track">
          {[0, 1].map(copy => (
            <span key={copy} className="inline-flex items-center" aria-hidden={copy === 1}>
              {marqueeLocations.map((loc, i) => (
                <span key={`${copy}-${i}`} className="inline-flex items-center">
                  <span className="text-cream font-display text-lg mx-6">{loc}</span>
                  <ArrowUpRight className="h-4 w-4 text-gold" strokeWidth={2.5} />
                </span>
              ))}
            </span>
          ))}
        </div>
      </section>

      {/* ============================================================
          STATS — deep burgundy band, hairline-divided serif numbers
          ============================================================ */}
      <section className="relative bg-[#0D1322] overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-16 grid grid-cols-2 md:grid-cols-4 gap-y-10">
          {[
            { val: stats.properties > 0 ? `${stats.properties}+` : '10+', label: 'Active Listings', sub: 'Verified and ready' },
            { val: stats.locations > 0 ? `${stats.locations}+` : '10+', label: 'Locations Covered', sub: 'Worldwide' },
            { val: stats.tenancies > 0 ? `${stats.tenancies}+` : '2+', label: 'Active Tenancies', sub: 'Happy tenants' },
            { val: stats.users > 0 ? `${stats.users}+` : '5+', label: 'Registered Users', sub: 'Growing community' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className={i > 0 ? 'md:border-l rule-cream md:pl-8' : ''}>
              <div className="space-y-1.5">
                <div className="text-gold text-5xl lg:text-6xl font-display">{s.val}</div>
                <div className="text-cream font-semibold text-sm">{s.label}</div>
                <div className="text-cream/70 text-xs">{s.sub}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================================
          PROPERTIES
          ============================================================ */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
        <Reveal>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-accent font-semibold text-xs uppercase tracking-[0.25em]">Browse Listings</span>
            <span className="h-px flex-1 bg-foreground/15" />
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-display text-4xl sm:text-5xl text-foreground leading-tight">
                {areaInput ? `Homes in ${areaInput}` : selectedRegion !== '__all__' ? `Homes in ${regions.find(r => r.id === selectedRegion)?.name || ''}` : 'Available Properties'}
              </h2>
              <p className="text-muted-foreground mt-3">
                {properties.length} {properties.length !== 1 ? 'properties' : 'property'} matching your search
              </p>
            </div>
            <button
              onClick={() => navigate('/properties')}
              className="link-reveal text-accent font-semibold inline-flex items-center gap-1.5 self-start md:self-auto"
            >
              View all properties <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </Reveal>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl h-80 animate-pulse border border-border" />
            ))}
          </div>
        ) : properties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((p, i) => <PropertyCard key={p.id} property={p} index={i} />)}
          </div>
        ) : (
          <div className="text-center py-24 text-muted-foreground">
            <Home className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-xl font-display text-foreground">No properties found</p>
            <p className="text-sm mt-2">Try searching a different state or clearing filters</p>
            <Button className="mt-5 gradient-primary text-primary-foreground" onClick={() => { setSelectedCountry('UG'); setSelectedRegion(''); setAreaInput(''); setFilterType('all'); }}>
              Clear Filters
            </Button>
          </div>
        )}
      </section>

      {/* ============================================================
          WHY AXIS — sticky editorial heading + hairline feature list
          ============================================================ */}
      <section className="bg-secondary pattern-rose rose-photo border-y border-border" id="why">
        <div className="rose-photo-bg"><img src={heroBg} alt="" /></div>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-24 grid lg:grid-cols-5 gap-14">
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-28">
              <Reveal>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-accent font-semibold text-xs uppercase tracking-[0.25em]">Why Axis</span>
                  <span className="h-px w-16 bg-foreground/15" />
                </div>
                <h2 className="font-display text-4xl sm:text-5xl text-foreground leading-[1.05] text-balance">
                  Everything about renting, finally in one place.
                </h2>
                <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
                  Whether you are looking for a home or managing properties, Axis gives you the tools to do it properly.
                </p>
                <button
                  onClick={() => navigate('/signup')}
                  className="link-reveal text-accent font-semibold inline-flex items-center gap-1.5 mt-8"
                >
                  Create a free account <ArrowRight className="h-4 w-4" />
                </button>
                <img
                  src={showcaseInterior}
                  alt="A bright Axis-managed apartment interior in black and white"
                  loading="lazy"
                  className="mt-10 w-full aspect-[4/3] object-cover rounded-2xl border border-border shadow-card grayscale contrast-[1.06]"
                />
              </Reveal>
            </div>
          </div>
          <div className="lg:col-span-3">
            {WHY_AXIS.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <div className={`flex gap-6 py-7 ${i > 0 ? 'border-t rule-ink' : ''}`}>
                  <div className="text-primary pt-1 shrink-0">{f.icon}</div>
                  <div>
                    <h3 className="font-display text-2xl text-foreground mb-2">{f.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SHOWCASE — duotone interior photography + brand manifesto
          ============================================================ */}
      <section className="grid lg:grid-cols-2">
        <div className="relative min-h-[340px] lg:min-h-[520px] duotone-wrap overflow-hidden">
          <img src={showcaseInterior} alt="A bright Axis-managed apartment interior" className="absolute inset-0 w-full h-full object-cover duotone-img" />
        </div>
        <div className="relative bg-[#0D1322] overflow-hidden flex items-center">
            <div className="relative px-6 sm:px-12 py-16 lg:py-24 max-w-xl">
            <Reveal>
              <p className="flex items-center gap-3 text-cream/70 text-xs font-semibold tracking-[0.28em] uppercase mb-6">
                <ArrowUpRight className="h-4 w-4 text-gold" strokeWidth={2.5} />
                The Axis Standard
              </p>
              <p className="font-display text-cream text-3xl sm:text-4xl leading-snug text-balance">
                “A home is not a transaction. It is where your life happens — finding it should feel that way.”
              </p>
              <p className="text-cream/70 mt-6 leading-relaxed">
                That belief shapes every listing we verify, every agreement we digitise and every payment we track.
              </p>
              <button
                onClick={() => navigate('/about')}
                className="link-reveal text-gold font-semibold inline-flex items-center gap-1.5 mt-8"
              >
                More about Axis <ArrowRight className="h-4 w-4" />
              </button>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================================================
          ROLES — charcoal band, hairline-divided columns
          ============================================================ */}
      <section className="bg-foreground text-background" id="benefits">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-24">
          <Reveal>
            <div className="flex items-center gap-4 mb-3">
              <span className="text-gold font-semibold text-xs uppercase tracking-[0.25em]">Tailored for You</span>
              <span className="h-px flex-1 bg-background/20" />
            </div>
            <h2 className="font-display text-4xl sm:text-5xl leading-tight mb-16 max-w-xl">
              Get started in minutes.
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-10 md:gap-0">
            {ROLES.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.08} className={`md:px-10 ${i > 0 ? 'md:border-l border-background/20' : 'md:pl-0'}`}>
                <div className="text-gold mb-5">{r.icon}</div>
                <h3 className="font-display text-2xl mb-5">{r.title}</h3>
                <ul className="space-y-3">
                  {r.points.map(p => (
                    <li key={p} className="flex items-start gap-3 text-sm text-background/70 leading-relaxed">
                      <ArrowUpRight className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" strokeWidth={2.5} />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS — oversized outline numerals, hairline rhythm
          ============================================================ */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-24" id="how-it-works">
        <Reveal>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-accent font-semibold text-xs uppercase tracking-[0.25em]">Simple Process</span>
            <span className="h-px flex-1 bg-foreground/15" />
          </div>
          <h2 className="font-display text-4xl sm:text-5xl text-foreground leading-tight mb-16 max-w-xl">
            How it works
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-12 md:gap-10">
          {STEPS.map((s, i) => (
            <Reveal key={s.numeral} delay={i * 0.08}>
              <div className="border-t rule-ink pt-8">
                <div className="step-numeral text-7xl lg:text-8xl select-none">{s.numeral}</div>
                <h3 className="font-display text-2xl text-foreground mt-6 mb-3">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-[15px]">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================================
          SERVICE CALLOUTS — hairline row
          ============================================================ */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 grid md:grid-cols-3">
          {CALLOUTS.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06} className={`py-12 md:px-10 ${i > 0 ? 'border-t md:border-t-0 md:border-l rule-ink' : 'md:pl-0'}`}>
              <div className="text-primary mb-4">{f.icon}</div>
              <h3 className="font-display text-xl text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================================
          TESTIMONIALS — serif pull quotes
          ============================================================ */}
      <section className="bg-secondary pattern-rose rose-photo border-y border-border">
        <div className="rose-photo-bg"><img src={property3} alt="" /></div>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-24">
          <Reveal>
            <div className="flex items-center gap-4 mb-3">
              <span className="text-accent font-semibold text-xs uppercase tracking-[0.25em]">What Our Users Say</span>
              <span className="h-px flex-1 bg-foreground/15" />
            </div>
            <h2 className="font-display text-4xl sm:text-5xl text-foreground leading-tight mb-16">
              Trusted across Uganda
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-12 md:gap-10">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.08}>
                <figure className="border-t rule-ink pt-8">
                  <div className="flex gap-1 mb-5">
                    {[...Array(t.rating)].map((_, j) => <Star key={j} className="h-4 w-4 text-gold fill-current" />)}
                  </div>
                  <blockquote className="font-display text-xl text-foreground leading-relaxed">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6">
                    <p className="font-semibold text-foreground text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.role}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* APK DOWNLOAD */}
      {isMobileDevice() && <section className="max-w-6xl mx-auto px-5 sm:px-8 py-16">
        <div className="relative bg-primary rounded-3xl overflow-hidden">
            <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center gap-8">
            <div className="bg-cream/10 text-cream rounded-2xl p-5 shrink-0">
              <Smartphone className="h-12 w-12" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-display text-3xl text-cream mb-2">Get the Axis App</h2>
              <p className="text-cream/70 text-sm max-w-lg">
                Download our Android app for a faster experience. Browse properties, pay rent, message managers, and manage your tenancy on the go.
              </p>
            </div>
            <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 font-semibold shrink-0 gap-2"
              onClick={() => window.open(import.meta.env.VITE_MOBILE_APK_URL || '#', '_blank')}>
              <Download className="h-5 w-5" /> Download APK
            </Button>
          </div>
        </div>
      </section>}

      {/* ============================================================
          CTA — burgundy, beams, gold action
          ============================================================ */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-24">
        <div className="relative gradient-primary rounded-3xl overflow-hidden">
            <div className="relative px-6 py-16 md:p-20 text-center">
            <Reveal>
              <p className="flex items-center justify-center gap-3 text-cream/70 text-xs font-semibold tracking-[0.28em] uppercase mb-6">
                <ArrowUpRight className="h-4 w-4 text-gold" strokeWidth={2.5} />
                Axis Housing
              </p>
              <h2 className="font-display text-4xl sm:text-5xl text-cream leading-tight text-balance max-w-2xl mx-auto">
                Ready to find your home?
              </h2>
              <p className="text-cream/70 text-lg mt-5 mb-10 max-w-xl mx-auto">
                Join thousands of people who have found their perfect home through Axis.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-gold text-gold-foreground hover:bg-gold/90 font-semibold px-10"
                  onClick={() => navigate('/signup')}
                >
                  Get Started Free
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-cream/40 text-cream hover:bg-cream/10 font-semibold px-10"
                  onClick={() => navigate('/properties')}
                >
                  Browse Properties
                </Button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
