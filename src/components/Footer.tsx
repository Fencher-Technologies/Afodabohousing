import { Link } from 'react-router-dom';
import logoImg from '@/assets/logo.png';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const LINKS = {
  tenants: [
    { label: 'Browse Properties', to: '/properties' },
    { label: 'How It Works', to: '/#how-it-works' },
    { label: 'Register as Tenant', to: '/register' },
    { label: 'Tenant Dashboard', to: '/dashboard/tenant' },
  ],
  managers: [
    { label: 'List Your Property', to: '/register' },
    { label: 'Manager Dashboard', to: '/dashboard/manager' },
    { label: 'Manage Tenants', to: '/dashboard/manager' },
    { label: 'Payment Tracking', to: '/dashboard/manager' },
  ],
  company: [
    { label: 'About Us', to: '#' },
    { label: 'Privacy Policy', to: '#' },
    { label: 'Terms of Service', to: '#' },
    { label: 'Contact Support', to: '#' },
  ],
};

const DISTRICTS = [
  'Kampala', 'Wakiso', 'Mukono', 'Entebbe', 'Jinja', 'Mbarara',
  'Gulu', 'Lira', 'Arua', 'Fort Portal', 'Mbale', 'Masaka',
];

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Main footer content */}
      <div className="container py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-5">
              <img src={logoImg} alt="Afodabohousing" className="h-12 w-12 object-contain rounded-lg" />
              <div>
                <div className="font-display font-bold text-xl text-primary-foreground leading-tight">Afodabohousing</div>
                <div className="text-primary-foreground/60 text-xs">Uganda's #1 District Relocation App</div>
              </div>
            </Link>
            <p className="text-primary-foreground/70 text-sm leading-relaxed mb-6 max-w-xs">
              Connecting tenants with verified house managers across all 135 districts of Uganda. Find your perfect home, generate agreements, and manage rent — all in one platform.
            </p>
            {/* Contact info */}
            <div className="space-y-2.5 text-sm">
              <a href="mailto:info@afodabohousing.com" className="flex items-center gap-2.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Mail className="h-4 w-4 text-accent shrink-0" />
                info@afodabohousing.com
              </a>
              <a href="tel:+256700000000" className="flex items-center gap-2.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Phone className="h-4 w-4 text-accent shrink-0" />
                +256 700 000 000
              </a>
              <div className="flex items-center gap-2.5 text-primary-foreground/70">
                <MapPin className="h-4 w-4 text-accent shrink-0" />
                Kampala, Uganda
              </div>
            </div>
            {/* Social links */}
            <div className="flex items-center gap-3 mt-6">
              {[
                { Icon: Facebook, href: '#', label: 'Facebook' },
                { Icon: Twitter, href: '#', label: 'Twitter' },
                { Icon: Instagram, href: '#', label: 'Instagram' },
                { Icon: Youtube, href: '#', label: 'YouTube' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="h-9 w-9 rounded-full bg-primary-foreground/10 hover:bg-accent flex items-center justify-center transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* For Tenants */}
          <div>
            <h4 className="font-display font-semibold text-primary-foreground mb-4 text-base">For Tenants</h4>
            <ul className="space-y-2.5">
              {LINKS.tenants.map(l => (
                <li key={l.label}>
                  <Link to={l.to} className="text-primary-foreground/65 hover:text-primary-foreground text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Managers */}
          <div>
            <h4 className="font-display font-semibold text-primary-foreground mb-4 text-base">For Managers</h4>
            <ul className="space-y-2.5">
              {LINKS.managers.map(l => (
                <li key={l.label}>
                  <Link to={l.to} className="text-primary-foreground/65 hover:text-primary-foreground text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold text-primary-foreground mb-4 text-base">Company</h4>
            <ul className="space-y-2.5">
              {LINKS.company.map(l => (
                <li key={l.label}>
                  <Link to={l.to} className="text-primary-foreground/65 hover:text-primary-foreground text-sm transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Popular Districts */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/15">
          <h4 className="font-display font-semibold text-primary-foreground/80 mb-4 text-sm uppercase tracking-widest">
            Popular Districts
          </h4>
          <div className="flex flex-wrap gap-2">
            {DISTRICTS.map(d => (
              <Link
                key={d}
                to={`/properties?district=${d}`}
                className="text-xs bg-primary-foreground/10 hover:bg-accent text-primary-foreground/70 hover:text-primary-foreground px-3 py-1.5 rounded-full transition-colors"
              >
                {d}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-primary-foreground/15 bg-primary/80">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 py-4 text-xs text-primary-foreground/55">
          <span>© {new Date().getFullYear()} Afodabohousing Ltd. All rights reserved. Registered in Uganda.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent inline-block animate-pulse" />
              All systems operational
            </span>
            <span>·</span>
            <a href="mailto:info@afodabohousing.com" className="hover:text-primary-foreground transition-colors">
              info@afodabohousing.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
