import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import logoImg from '@/assets/logo.png';
import heroBg from '@/assets/hero-bg.jpg';
import { Shield, Users, MapPin, Star, CheckCircle, Award, Building2, HeartHandshake } from 'lucide-react';

const VALUES = [
  {
    icon: <Shield className="h-7 w-7" />,
    title: 'Trust and Transparency',
    desc: 'Every listing on Afodabo Housing is reviewed before going live. We believe every Ugandan deserves to know exactly what they are renting before committing.',
  },
  {
    icon: <HeartHandshake className="h-7 w-7" />,
    title: 'Community First',
    desc: 'We are built by Ugandans, for Ugandans. Our platform serves families, students, professionals and property owners from Kampala to Arua.',
  },
  {
    icon: <Award className="h-7 w-7" />,
    title: 'Excellence in Service',
    desc: 'From seamless online payments to digital tenancy agreements, we set the standard for modern property management in East Africa.',
  },
  {
    icon: <Building2 className="h-7 w-7" />,
    title: 'Nationwide Coverage',
    desc: 'We cover all states of Uganda. Whether you are relocating for work, school or family, we have verified listings near you.',
  },
];

const TEAM = [
  { name: 'Afodabo Team', role: 'Founders', initials: 'AT', bg: 'bg-primary' },
  { name: 'Support Desk', role: 'Customer Care', initials: 'SD', bg: 'bg-accent' },
  { name: 'Tech Team', role: 'Engineering', initials: 'TT', bg: 'bg-primary' },
  { name: 'Field Agents', role: 'Property Verification', initials: 'FA', bg: 'bg-accent' },
];

export default function AboutPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section
        className="relative py-28 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 gradient-hero" />
        <div className="relative z-10 container text-center text-primary-foreground">
          <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Our Story</p>
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-5 leading-tight">
            Built for Every Ugandan
          </h1>
          <p className="text-primary-foreground/85 text-xl max-w-2xl mx-auto leading-relaxed">
            Afodabo Housing was founded with a single mission: make finding and managing a home in Uganda as simple, safe and dignified as possible.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="container py-20">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Our Mission</p>
            <h2 className="font-display text-4xl font-bold text-foreground mb-6 leading-tight">
              Connecting Tenants with Trusted House Managers
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-5">
              Millions of Ugandans relocate for work, education and family every year. Finding safe, verified and fairly priced accommodation should not be a struggle. We created Afodabo Housing to solve exactly that.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Our platform connects tenants directly with verified house managers across all states of Uganda. No middlemen. No inflated fees. Just honest, transparent housing.
            </p>
            <div className="flex flex-wrap gap-3">
              {['135 Districts Covered', 'Verified Listings Only', 'Secure Online Payments', 'Digital Agreements'].map(f => (
                <span key={f} className="flex items-center gap-2 bg-secondary border border-border rounded-full px-4 py-2 text-sm font-medium text-foreground">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-8 shadow-card">
            <img src={logoImg} alt="Afodabo Housing" className="h-24 w-24 mx-auto mb-6 rounded-2xl" />
            <div className="grid grid-cols-2 gap-5">
              {[
                { val: '135+', label: 'Districts' },
                { val: '100%', label: 'Verified' },
                { val: 'UGX', label: 'Local Currency' },
                { val: '24/7', label: 'Support' },
              ].map(s => (
                <div key={s.label} className="text-center bg-secondary rounded-2xl py-5">
                  <div className="text-3xl font-display font-bold text-primary">{s.val}</div>
                  <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-secondary py-20">
        <div className="container">
          <div className="text-center mb-14">
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-2">What We Stand For</p>
            <h2 className="font-display text-4xl font-bold text-foreground">Our Core Values</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="bg-card border border-border rounded-2xl p-7 shadow-card hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="bg-primary/10 text-primary rounded-xl w-14 h-14 flex items-center justify-center mb-5">
                  {v.icon}
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-3">{v.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="container py-20">
        <div className="text-center mb-14">
          <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-2">The People</p>
          <h2 className="font-display text-4xl font-bold text-foreground">Behind the Platform</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-lg">
            A dedicated team of Ugandans working to transform how housing is found and managed across the country.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {TEAM.map(m => (
            <div key={m.name} className="bg-card border border-border rounded-2xl p-6 text-center shadow-card">
              <div className={`${m.bg} text-primary-foreground w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl font-display font-bold`}>
                {m.initials}
              </div>
              <div className="font-semibold text-foreground text-sm">{m.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="gradient-primary rounded-3xl p-12 text-center text-primary-foreground">
          <h2 className="font-display text-4xl font-bold mb-4">Join Uganda's Trusted Housing Community</h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
            Whether you are looking for a home or managing properties, Afodabo Housing is the platform for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 font-semibold px-10" onClick={() => navigate('/register')}>
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 font-semibold px-10" onClick={() => navigate('/properties')}>
              Browse Properties
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
