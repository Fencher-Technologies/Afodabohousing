import { Link, useNavigate } from 'react-router-dom';
import logoImg from '@/assets/axis-lockup-white.png';
import { Mail, Phone, MapPin, MessageCircle, Facebook, Twitter, Instagram, Youtube, Smartphone, Apple } from 'lucide-react';

const APP_LINKS = {
  android: 'https://drive.google.com/drive/folders/1rWCINlslmwcj0sphOExgVSfg4i2dGZsq?usp=sharing',
  ios: 'https://drive.google.com/drive/folders/14wuFtQkrOrRtoH2lr0D1QK3bnQL64VPq?usp=sharing',
};

const LINKS = {
  tenants: [
    { label: 'Browse Properties', to: '/properties' },
    { label: 'How It Works', to: '/#how-it-works' },
    { label: 'Register as Tenant', to: '/signup' },
    { label: 'Tenant Dashboard', to: '/dashboard/tenant' },
  ],
  managers: [
    { label: 'List Your Property', to: '/signup' },
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">

          {/* Brand column */}
          <div className="lg:col-span-2">
            <ScrollLink to="/" className="inline-block mb-5">
              <img src={logoImg} alt="Axis Housing" className="h-16 w-auto" />
            </ScrollLink>
            <p className="text-primary-foreground/70 text-sm leading-relaxed mb-6 max-w-xs">
              Connecting tenants with verified house managers worldwide. Find your perfect home, generate agreements, and manage rent in one platform.
            </p>
            <div className="space-y-2.5 text-sm">
              <a href="mailto:info@axishousings.com" className="flex items-center gap-2.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Mail className="h-4 w-4 text-gold-light shrink-0" />
                info@axishousings.com
              </a>
              <a href="tel:+256776191117" className="flex items-center gap-2.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Phone className="h-4 w-4 text-gold-light shrink-0" />
                +256 776 191 117
              </a>
              <a href="https://wa.me/256789590007" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <MessageCircle className="h-4 w-4 text-gold-light shrink-0" />
                WhatsApp: +256 789 590 007
              </a>
              <div className="flex items-center gap-2.5 text-primary-foreground/70">
                <MapPin className="h-4 w-4 text-gold-light shrink-0" />
                Kampala, Uganda
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              {[
                { Icon: Facebook, href: 'https://facebook.com/axishousing', label: 'Facebook' },
                { Icon: Twitter, href: 'https://twitter.com/axishousing', label: 'Twitter' },
                { Icon: Instagram, href: 'https://instagram.com/axishousing', label: 'Instagram' },
                { Icon: Youtube, href: 'https://youtube.com/@axishousing', label: 'YouTube' },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="h-9 w-9 rounded-full bg-primary-foreground/15 text-primary-foreground hover:bg-gold hover:text-primary flex items-center justify-center transition-colors"
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

          {/* Get the App */}
          <div>
            <h4 className="font-display font-semibold text-primary-foreground mb-4 text-base">Get the App</h4>
            <p className="text-primary-foreground/65 text-sm mb-4">
              Manage your home on the go with the Axis mobile app.
            </p>
            <div className="space-y-2.5">
              <a
                href={APP_LINKS.android}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-3.5 py-2.5 hover:bg-gold hover:text-primary hover:border-gold transition-colors group"
              >
                <Smartphone className="h-6 w-6 shrink-0 text-gold-light group-hover:text-primary transition-colors" />
                <span className="leading-tight">
                  <span className="block text-[11px] uppercase tracking-wide text-primary-foreground/60 group-hover:text-primary/70 transition-colors">Download for</span>
                  <span className="block text-sm font-semibold">Android</span>
                </span>
              </a>
              <a
                href={APP_LINKS.ios}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-3.5 py-2.5 hover:bg-gold hover:text-primary hover:border-gold transition-colors group"
              >
                <Apple className="h-6 w-6 shrink-0 text-gold-light group-hover:text-primary transition-colors" />
                <span className="leading-tight">
                  <span className="block text-[11px] uppercase tracking-wide text-primary-foreground/60 group-hover:text-primary/70 transition-colors">Download for</span>
                  <span className="block text-sm font-semibold">iOS</span>
                </span>
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom bar */}
      <div className="border-t border-primary-foreground/15 bg-primary/80">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 py-4 text-xs text-primary-foreground/55">
          <span>&copy; {new Date().getFullYear()} ECOSOPAT CO LTD. All rights reserved.</span>
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
              <a href="mailto:info@axishousings.com" className="hover:text-primary-foreground transition-colors">
              info@axishousings.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
