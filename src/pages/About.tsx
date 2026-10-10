import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PageHero from '@/components/PageHero';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import logoImg from '@/assets/axis-logo-official.png';
import heroBg from '@/assets/hero-bg.jpg';
import property1 from '@/assets/property-1.jpg';
import { Shield, Users, MapPin, Star, Award, Building2, HeartHandshake } from 'lucide-react';
import { useSeo } from '@/lib/seo';
import {
  ABOUT_AXIS_BLURB,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_E164,
  WHATSAPP_DISPLAY,
  WHATSAPP_LINK,
  OFFICE_ADDRESS_LINE,
  WORK_HOURS_WEEKDAYS,
  WORK_HOURS_SATURDAY,
} from '@/config/contact';

/**
 * Services and benefits are drawn from the business statement Axis publishes
 * about itself, so the page says what the company says rather than marketing
 * copy invented here.
 */
const SERVICES = [
  {
    title: 'Direct tenant and landlord matching',
    desc: 'Potential tenants are linked straight to property owners and managers, with no agent in between and no fee for making the connection.',
  },
  {
    title: 'Digital tenant management',
    desc: 'Managers run their tenancies from one place: tenants, units, occupancy and rent status, with visibility and access to every property they hold.',
  },
  {
    title: 'Rent status notifications',
    desc: 'Tenants are told where their rent stands, and managers are told which tenants have fallen due, so neither side has to chase the other.',
  },
  {
    title: 'Electronic receipts',
    desc: 'Every confirmed payment produces a receipt showing the amount, the effective date and the exact period the rent covers.',
  },
  {
    title: 'Tenancy agreements',
    desc: 'Agreements are generated, reviewed and approved in the platform. A tenant can request changes with comments before signing.',
  },
  {
    title: 'Payment tracking',
    desc: 'A running ledger of what has been paid, what is owed and what has been paid in advance, per tenancy.',
  },
];

/** The outcomes the business states the platform delivers. */
const BENEFITS = [
  'Minimises financial losses',
  'Promotes accountability and transparency',
  'Overcomes geographical barriers in tenant management',
  'Provides legal protection',
  'Warrants value for money',
  'Affordable, safe and hassle free',
];

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

export default function AboutPage() {
  useSeo({
    title: 'About Axis Housing',
    description:
      'Axis Housing connects house seekers with verified rentals and gives property managers the tools to run them: listings, tenancy agreements, rent tracking and receipts.',
    path: '/about',
    keywords: ['about Axis Housing', 'property management platform', 'rental marketplace'],
  });

  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <PageHero
        overline="About Us"
        title="Built for Everyone"
        subtitle="Axis was founded with a single mission: make finding and managing a home as simple, safe and dignified as possible."
        image={heroBg}
      />

      {/* Mission */}
      <section className="container py-20">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Our Vision</p>
            <h2 className="font-display text-4xl font-bold text-foreground mb-6 leading-tight">
              Housing Made Easy, Anywhere
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              A world where finding a home, and managing one, is equally simple wherever you
              are. Distance should not decide whether a landlord can look after a property or
              whether a tenant is treated fairly.
            </p>

            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Our Mission</p>
            <h3 className="font-display text-2xl font-bold text-foreground mb-4 leading-tight">
              Linking tenants directly to property owners
            </h3>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              To proffer practical solutions in the housing space by linking potential tenants
              directly to property owners and managers affordably, safely and hassle free, and
              to help managers run their tenancies with ease and convenience, with visibility
              and access to every property they hold.
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
            <img src={logoImg} alt="Axis Housing" className="h-20 w-auto mx-auto mb-6" />
            <div className="grid grid-cols-2 gap-5">
              {[
                { val: 'Global', label: 'Reach' },
                { val: '100%', label: 'Verified' },
                { val: 'Any', label: 'Currency' },
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

      {/* About Axis */}
      <section className="container py-20">
        <div className="max-w-3xl mx-auto">
          <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Support &amp; Policies</p>
          <h2 className="font-display text-4xl font-bold text-foreground mb-6">About Axis</h2>
          <p className="text-foreground text-lg leading-relaxed mb-5 font-medium">
            {ABOUT_AXIS_BLURB}
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Axis is a digital application that seeks to proffer practical solutions in the housing space by linking potential tenants directly to property owners/managers affordably, safely and hustle free. Through our online platform, we help property managers to better manage their tenants with ease and convenience, providing both visibility and access to their properties. By doing so, we minimize financial losses, promote accountability and transparency, overcome geographical barriers in tenant management, provide legal protection, and warrant value for money.
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="bg-secondary py-20">
        <div className="container">
          <div className="text-center mb-14">
            <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-2">What We Do</p>
            <h2 className="font-display text-4xl font-bold text-foreground">Services We Offer</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map(s => (
              <div key={s.title} className="bg-card border border-border rounded-2xl p-7 shadow-card">
                <div className="w-8 h-0.5 bg-gold mb-4" />
                <h3 className="font-display text-lg font-bold text-foreground mb-3">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container py-20">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-2">Why It Matters</p>
          <h2 className="font-display text-4xl font-bold text-foreground">Benefits</h2>
        </div>
        <ul className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-x-10 gap-y-4">
          {BENEFITS.map(b => (
            <li key={b} className="flex items-start gap-3 text-foreground">
              <span className="gold-square mt-2 shrink-0" />
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Contact */}
      <section className="container pb-4">
        <div className="max-w-3xl mx-auto bg-card border border-border rounded-3xl p-8 shadow-card">
          <p className="text-accent font-semibold text-sm uppercase tracking-widest mb-3">Contact Support</p>
          <h2 className="font-display text-2xl font-bold text-foreground mb-5">Talk to the Axis team</h2>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <div>
              <dt className="text-muted-foreground mb-0.5">Email</dt>
              <dd>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                  {SUPPORT_EMAIL}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-0.5">Phone</dt>
              <dd>
                <a href={`tel:${SUPPORT_PHONE_E164}`} className="font-semibold text-foreground hover:text-primary transition-colors">
                  {SUPPORT_PHONE_DISPLAY}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-0.5">WhatsApp</dt>
              <dd>
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:text-primary transition-colors">
                  {WHATSAPP_DISPLAY}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-0.5">Address</dt>
              <dd className="font-semibold text-foreground">{OFFICE_ADDRESS_LINE}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground mb-0.5">Work hours</dt>
              <dd className="font-semibold text-foreground">
                {WORK_HOURS_WEEKDAYS} &middot; {WORK_HOURS_SATURDAY}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Values */}
      <section className="bg-secondary pattern-rose rose-photo py-20">
        <div className="rose-photo-bg"><img src={property1} alt="" /></div>
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
