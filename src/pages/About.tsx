import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageHero from '@/components/PageHero';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import logoImg from '@/assets/axis-logo.png';
import heroBg from '@/assets/hero-bg.jpg';
import { Shield, Users, MapPin, Star, Award, Building2, HeartHandshake } from 'lucide-react';

const VALUES = [
  {
    icon: <Shield className="h-7 w-7" />,
    title: 'Trust and Transparency',
    desc: 'Every listing on Axis is reviewed before going live. We believe everyone deserves to know exactly what they are renting before committing.',
  },
  {
    icon: <HeartHandshake className="h-7 w-7" />,
    title: 'Community First',
    desc: 'We are built by people, for people. Our platform serves families, students, professionals and property owners everywhere.',
  },
  {
    icon: <Award className="h-7 w-7" />,
    title: 'Excellence in Service',
    desc: 'From seamless online payments to digital tenancy agreements, we set the standard for modern property management worldwide.',
  },
  {
    icon: <Building2 className="h-7 w-7" />,
    title: 'Nationwide Coverage',
    desc: 'We cover locations worldwide. Whether you are relocating for work, school or family, we have verified listings near you.',
  },
];

const TEAM = [
  { name: 'Axis Team', role: 'Founders', initials: 'AX', bg: 'bg-primary' },
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
      <PageHero
        overline="Our Story"
        title="Built for Everyone"
        subtitle="Axis was founded with a single mission: make finding and managing a home as simple, safe and dignified as possible."
        image={heroBg}
      />

      {/* Mission */}
      <section className="container py-20">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Our Mission</p>
            <h2 className="font-display text-4xl font-bold text-foreground mb-6 leading-tight">
              Connecting Tenants with Trusted House Managers
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-5">
              Millions of people relocate for work, education and family every year. Finding safe, verified and fairly priced accommodation should not be a struggle. We created Axis to solve exactly that.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Our platform connects tenants directly with verified house managers worldwide. No middlemen. No inflated fees. Just honest, transparent housing.
            </p>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {['Locations Covered', 'Verified Listings Only', 'Secure Online Payments', 'Digital Agreements'].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <span className="gold-square" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-card border border-border rounded-3xl p-8 shadow-card">
            <img src={logoImg} alt="Axis" className="h-24 w-24 mx-auto mb-6 rounded-2xl" />
            <div className="grid grid-cols-2 gap-5">
              {[
                { val: 'Global', label: 'Reach' },
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
                <div className="text-primary mb-4">{v.icon}</div>
                <div className="w-8 h-0.5 bg-gold mb-4" />
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
            A dedicated team working to transform how housing is found and managed worldwide.
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
            <h2 className="font-display text-4xl font-bold mb-4">Join Our Trusted Housing Community</h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
              Whether you are looking for a home or managing properties, Axis is the platform for you.
            </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90 font-semibold px-10" onClick={() => navigate('/signup')}>
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
