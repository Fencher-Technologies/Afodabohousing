import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import Navbar from '@/components/Navbar';
import PropertyCard from '@/components/PropertyCard';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Shield, Home, MessageSquare, ArrowRight, CheckCircle, CreditCard, Bell, Star, TrendingUp } from 'lucide-react';
import heroBg from '@/assets/hero-bg.jpg';

type Property = Database['public']['Tables']['properties']['Row'];

const DEMO_ACCOUNTS = [
  { email: 'admin@afodabo.ug', role: 'Admin', badge: 'bg-accent/20 text-accent border-accent/30', desc: 'Full platform control' },
  { email: 'john@afodabo.ug', role: 'Manager (John)', badge: 'bg-primary/10 text-primary border-primary/30', desc: '3 properties listed' },
  { email: 'grace@afodabo.ug', role: 'Manager (Grace)', badge: 'bg-primary/10 text-primary border-primary/30', desc: 'Wakiso properties' },
  { email: 'sarah@afodabo.ug', role: 'Tenant (Sarah)', badge: 'bg-secondary text-secondary-foreground border-border', desc: 'Active tenancy' },
  { email: 'david@afodabo.ug', role: 'Tenant (David)', badge: 'bg-gold/20 text-foreground border-gold/30', desc: 'Rent due soon' },
];

const FEATURES = [
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Verified Listings',
    desc: 'Every property is reviewed and verified before going live. No fake or misleading listings, guaranteed.',
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: 'Direct Messaging',
    desc: 'Communicate directly with house managers without sharing personal numbers until you are ready.',
  },
  {
    icon: <Home className="h-6 w-6" />,
    title: 'Tenancy Management',
    desc: 'Digital agreements, rent tracking, payment history and reminders, all automated for you.',
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: 'Flexible Payments',
    desc: 'Pay rent via mobile money (MTN, Airtel) or card. Upload proof instantly. Automated SMS confirmation.',
  },
];

const DISTRICTS = ['Kampala', 'Wakiso', 'Mukono', 'Mbarara', 'Gulu', 'Jinja', 'Entebbe', 'Mbale', 'Lira', 'Arua'];

const HOW_IT_WORKS = [
  {
    step: '01',
    emoji: '🔍',
    title: 'Search by District',
    desc: 'Browse thousands of verified rentals filtered by district, type, number of rooms, price range and available amenities.',
  },
  {
    step: '02',
    emoji: '📞',
    title: 'Contact the Manager',
    desc: 'Message or call house managers directly from the listing. View photos, room details and get GPS directions via OpenStreetMap.',
  },
  {
    step: '03',
    emoji: '🏡',
    title: 'Move In and Manage',
    desc: 'Sign a digital tenancy agreement, pay rent via mobile money or card, receive SMS confirmations and track everything from your dashboard.',
  },
];

export default function HomePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDistrict, setSearchDistrict] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [stats, setStats] = useState({ properties: 0, tenancies: 0, users: 0 });
  const navigate = useNavigate();

  useEffect(() => { fetchProperties(); fetchStats(); }, [searchDistrict, filterType]);

  const fetchProperties = async () => {
    setLoading(true);
    let query = supabase.from('properties').select('*').eq('status', 'available').order('created_at', { ascending: false });
    if (searchDistrict && searchDistrict !== 'all') query = query.ilike('district', `%${searchDistrict}%`);
    if (filterType && filterType !== 'all') query = query.eq('property_type', filterType as Database['public']['Enums']['property_type']);
    const { data } = await query.limit(9);
    if (data) setProperties(data);
    setLoading(false);
  };

  const fetchStats = async () => {
    const [pRes, tRes, uRes] = await Promise.all([
      supabase.from('properties').select('id', { count: 'exact', head: true }),
      supabase.from('tenancies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('user_roles').select('id', { count: 'exact', head: true }),
    ]);
    setStats({ properties: pRes.count || 0, tenancies: tRes.count || 0, users: uRes.count || 0 });
  };

  const handleSearch = () => setSearchDistrict(searchInput);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section
        className="relative min-h-[660px] flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <Badge className="bg-accent text-accent-foreground mb-4 text-xs font-semibold tracking-widest uppercase px-4 py-1.5">
            Uganda's Number One District Relocation Housing App
          </Badge>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-primary-foreground mb-6 leading-tight tracking-tight">
            Find Your Perfect<br />
            <span className="text-gold">Home in Uganda</span>
          </h1>
          <p className="text-primary-foreground/85 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Search verified rentals across all 135 districts. Connect with trusted house managers, sign digital agreements and manage rent elegantly.
          </p>

          {/* Search bar */}
          <div className="bg-card rounded-2xl shadow-2xl p-3 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
            <div className="flex-1 flex items-center gap-3 px-4">
              <MapPin className="h-5 w-5 text-accent shrink-0" />
              <Input
                placeholder="Enter district, city or area..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-foreground placeholder:text-muted-foreground text-base"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-44 border-0 border-l sm:border-l border-border rounded-none sm:rounded-none bg-transparent">
                <SelectValue placeholder="Any type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="house">House</SelectItem>
                <SelectItem value="apartment">Apartment</SelectItem>
                <SelectItem value="self_contained">Self-Contained</SelectItem>
                <SelectItem value="room">Single Room</SelectItem>
                <SelectItem value="studio">Studio</SelectItem>
                <SelectItem value="bungalow">Bungalow</SelectItem>
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

          {/* Popular districts */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {DISTRICTS.map(d => (
              <button
                key={d}
                onClick={() => { setSearchInput(d); setSearchDistrict(d); }}
                className="text-xs text-primary-foreground/70 hover:text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 px-3 py-1.5 rounded-full transition-all"
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-primary py-12">
        <div className="container grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val: stats.properties > 0 ? `${stats.properties}+` : '10+', label: 'Active Listings', sub: 'Verified and ready' },
            { val: '135', label: 'Districts Covered', sub: 'All across Uganda' },
            { val: stats.tenancies > 0 ? `${stats.tenancies}+` : '2+', label: 'Active Tenancies', sub: 'Happy tenants' },
            { val: stats.users > 0 ? `${stats.users}+` : '5+', label: 'Registered Users', sub: 'Growing community' },
          ].map(s => (
            <div key={s.label} className="space-y-1">
              <div className="text-gold text-4xl font-display font-bold">{s.val}</div>
              <div className="text-primary-foreground font-semibold text-sm">{s.label}</div>
              <div className="text-primary-foreground/60 text-xs">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO ACCOUNTS */}
      <section className="bg-secondary/60 border-b border-border py-10" id="demo">
        <div className="container">
          <div className="text-center mb-6">
            <h2 className="font-display text-xl font-bold text-foreground">Explore the Platform with Demo Accounts</h2>
            <p className="text-muted-foreground text-sm mt-1.5">
              Click any account below, then sign in with password:{' '}
              <code className="bg-card px-2.5 py-1 rounded-lg border border-border font-mono font-bold text-primary">
                Demo@1234
              </code>
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {DEMO_ACCOUNTS.map(a => (
              <button
                key={a.email}
                onClick={() => navigate('/login')}
                className={`border rounded-2xl px-5 py-3.5 text-left hover:shadow-md transition-all group min-w-[180px] ${a.badge}`}
              >
                <div className="font-bold text-sm">{a.role}</div>
                <div className="font-mono text-xs opacity-70 mt-0.5">{a.email}</div>
                <div className="text-xs mt-1 opacity-60 group-hover:opacity-90 transition-opacity">{a.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PROPERTIES */}
      <section className="container py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-2">Browse Listings</p>
            <h2 className="font-display text-4xl font-bold text-foreground leading-tight">
              {searchDistrict ? `Homes in ${searchDistrict}` : 'Available Properties'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {properties.length} {properties.length !== 1 ? 'properties' : 'property'} matching your search
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/properties')} className="gap-2 self-start md:self-auto">
            View All Properties
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

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
            <p className="text-xl font-display font-semibold text-foreground">No properties found</p>
            <p className="text-sm mt-2">Try searching a different district or clearing filters</p>
            <Button className="mt-5 gradient-primary text-primary-foreground" onClick={() => { setSearchDistrict(''); setSearchInput(''); setFilterType('all'); }}>
              Clear Filters
            </Button>
          </div>
        )}
      </section>

      {/* WHY AFODABOHOUSING */}
      <section className="bg-secondary py-20" id="why">
        <div className="container">
          <div className="text-center mb-14">
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-2">Why Choose Us</p>
            <h2 className="font-display text-4xl font-bold text-foreground">
              Built for Every Ugandan
            </h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-lg">
              Whether you are looking for a home or managing properties, Afodabohousing gives you the tools to succeed.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => (
              <div
                key={f.title}
                className="bg-card rounded-2xl p-8 shadow-card border border-border hover:shadow-lg hover:-translate-y-1 transition-all group"
              >
                <div className="text-primary mb-4 bg-primary/10 rounded-xl w-12 h-12 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  {f.icon}
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container py-20" id="how-it-works">
        <div className="text-center mb-14">
          <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-2">Simple Process</p>
          <h2 className="font-display text-4xl font-bold text-foreground">How It Works</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto">Three easy steps to your new home</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-px bg-border" />
          {HOW_IT_WORKS.map(s => (
            <div key={s.step} className="bg-card border border-border rounded-2xl p-8 text-center shadow-card relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                Step {s.step}
              </div>
              <div className="text-5xl mb-5 mt-2">{s.emoji}</div>
              <h3 className="font-display text-xl font-bold text-foreground mb-3">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES CALLOUT */}
      <section className="bg-secondary py-16">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Bell className="h-6 w-6" />,
                title: 'SMS Notifications',
                desc: 'Receive instant SMS alerts for rent reminders, payment confirmations and important account updates.',
              },
              {
                icon: <CreditCard className="h-6 w-6" />,
                title: 'Mobile Money and Cards',
                desc: 'Pay rent via MTN Mobile Money, Airtel Money, Visa or Mastercard. All major Ugandan payment methods accepted.',
              },
              {
                icon: <MapPin className="h-6 w-6" />,
                title: 'OpenStreetMap Directions',
                desc: 'Get precise GPS directions to any listed property using OpenStreetMap. No extra apps needed.',
              },
            ].map(f => (
              <div key={f.title} className="bg-card border border-border rounded-2xl p-7 shadow-card flex gap-4 items-start">
                <div className="bg-primary/10 text-primary rounded-xl p-3 shrink-0">{f.icon}</div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground mb-1.5">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container py-20">
        <div className="text-center mb-12">
          <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-2">What Ugandans Say</p>
          <h2 className="font-display text-4xl font-bold text-foreground">Trusted Across Uganda</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: 'Namukasa Grace', role: 'House Manager, Wakiso', quote: 'I listed my 3 properties in under 10 minutes. Tenants contact me directly and I confirm payments instantly. Excellent platform.', rating: 5 },
            { name: 'Ssekandi James', role: 'Tenant, Kampala', quote: 'Found my apartment in Bukoto within two days. The map feature made it easy to check the location before visiting. Very convenient.', rating: 5 },
            { name: 'Auma Christine', role: 'Tenant, Gulu', quote: 'Even in Gulu we have listings! I was relocating from Kampala and Afodabohousing made the search stress-free. Highly recommend.', rating: 5 },
          ].map(t => (
            <div key={t.name} className="bg-card border border-border rounded-2xl p-7 shadow-card">
              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => <Star key={i} className="h-4 w-4 text-gold fill-current" />)}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5 italic">"{t.quote}"</p>
              <div>
                <p className="font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="gradient-primary rounded-3xl p-12 text-center text-primary-foreground">
          <h2 className="font-display text-4xl font-bold mb-4">Ready to Find Your Home?</h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
            Join thousands of Ugandans who have found their perfect home through Afodabohousing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gold text-gold-foreground hover:bg-gold/90 font-semibold px-10"
              onClick={() => navigate('/register')}
            >
              Get Started Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 font-semibold px-10"
              onClick={() => navigate('/properties')}
            >
              Browse Properties
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
