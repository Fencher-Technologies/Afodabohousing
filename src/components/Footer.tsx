import { Link, useNavigate } from 'react-router-dom';
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
    { label: 'Contact Support', to: '/contact' },
    { label: 'Payment Tracking', to: '/dashboard/manager' },
  ],
  company: [
    { label: 'About Us', to: '/about' },
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms of Service', to: '/terms' },
    { label: 'Contact Support', to: '/contact' },
  ],
};

const DISTRICTS = [
  'Kampala', 'Wakiso', 'Mukono', 'Entebbe', 'Jinja', 'Mbarara',
  'Gulu', 'Lira', 'Arua', 'Fort Portal', 'Mbale', 'Masaka',
];

function ScrollLink({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) {
  const navigate = useNavigate();
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => navigate(to), 50);
  };
  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <ScrollLink to="/" className="flex items-center gap-3 mb-5">
              <img src={logoImg} alt="Afodabo Housing" className="h-12 w-12 object-contain rounded-lg" />
              <div>
                <div className="font-display font-bold text-xl text-primary-foreground leading-tight">Afodabo Housing</div>
                <div className="text-primary-foreground/60 text-xs">Uganda's Number One District Relocation App</div>
              </div>
            </ScrollLink>
            <p className="text-primary-foreground/70 text-sm leading-relaxed mb-6 max-w-xs">
              Connecting tenants with verified house managers across all states of Uganda. Find your perfect home, generate agreements, and manage rent in one platform.
            </p>
            <div className="space-y-2.5 text-sm">
              <a href="mailto:info@afodabohousing.com" className="flex items-center gap-2.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Mail className="h-4 w-4 text-accent shrink-0" />
                info@afodabohousing.com
              </a>
              <a href="tel:+256788100145" className="flex items-center gap-2.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Phone className="h-4 w-4 text-accent shrink-0" />
                +256 788 100 145
              </a>
              <div className="flex items-center gap-2.5 text-primary-foreground/70">
                <MapPin className="h-4 w-4 text-accent shrink-0" />
                Kampala, Uganda
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              {[
                { Icon: Facebook, href: 'https://facebook.com/afodabohousing', label: 'Facebook' },
                { Icon: Twitter, href: 'https://twitter.com/afodabohousing', label: 'Twitter' },
                { Icon: Instagram, href: 'https://instagram.com/afodabohousing', label: 'Instagram' },
                { Icon: Youtube, href: 'https://youtube.com/@afodabohousing', label: 'YouTube' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
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
                  <ScrollLink to={l.to} className="text-primary-foreground/65 hover:text-primary-foreground text-sm transition-colors">
                    {l.label}
                  </ScrollLink>
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
                  <ScrollLink to={l.to} className="text-primary-foreground/65 hover:text-primary-foreground text-sm transition-colors">
                    {l.label}
                  </ScrollLink>
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
                  <ScrollLink to={l.to} className="text-primary-foreground/65 hover:text-primary-foreground text-sm transition-colors">
                    {l.label}
                  </ScrollLink>
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
              <ScrollLink
                key={d}
                to={`/properties?state=${d}`}
                className="text-xs bg-primary-foreground/10 hover:bg-accent text-primary-foreground/70 hover:text-primary-foreground px-3 py-1.5 rounded-full transition-colors"
              >
                {d}
              </ScrollLink>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-primary-foreground/15 bg-primary/80">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 py-4 text-xs text-primary-foreground/55">
          <span>&copy; {new Date().getFullYear()} Afodabohousing Ltd. All rights reserved. Registered in Uganda.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent inline-block animate-pulse" />
              All systems operational
            </span>
            <span>·</span>
            <ScrollLink to="/privacy" className="hover:text-primary-foreground transition-colors">Privacy</ScrollLink>
            <span>·</span>
            <ScrollLink to="/terms" className="hover:text-primary-foreground transition-colors">Terms</ScrollLink>
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
