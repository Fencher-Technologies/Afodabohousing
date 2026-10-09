import { Link, useNavigate } from 'react-router-dom';
import logoImg from '@/assets/axis-logo-official.png';
import type { ComponentType, SVGProps } from 'react';
import { Mail, Phone, MapPin, MessageCircle, Clock, Globe, Facebook, Instagram, Youtube, Smartphone, Apple } from 'lucide-react';
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_E164,
  WHATSAPP_DISPLAY,
  WHATSAPP_LINK,
  OFFICE_ADDRESS_LINE,
  WORK_HOURS_WEEKDAYS,
  WORK_HOURS_SATURDAY,
  SOCIAL_LINKS,
} from '@/config/contact';
import { APP_LINKS } from '@/config/app-links';

type IconType = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

/** lucide ships no X, TikTok or KingsChat glyph, so those are drawn inline. */
const XIcon: IconType = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
  </svg>
);

const TikTokIcon: IconType = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-1.83-2.48V9.74a5.72 5.72 0 1 0 4.92 5.66V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.24-1.48Z" />
  </svg>
);

const KingsChatIcon: IconType = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 2a10 10 0 0 0-8.66 15L2 22l5.2-1.3A10 10 0 1 0 12 2Zm-3.6 6h1.9v3.1L13.1 8h2.4l-3.3 3.5 3.5 4.5h-2.4l-2.4-3.2-.6.6V16H8.4V8Z" />
  </svg>
);

const SOCIAL_ICONS: Record<string, IconType> = {
  Facebook,
  Instagram,
  X: XIcon,
  TikTok: TikTokIcon,
  YouTube: Youtube,
  KingsChat: KingsChatIcon,
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
              <span className="inline-flex items-center rounded-xl bg-white px-5 py-4 shadow-sm">
                <img src={logoImg} alt="Axis Housing" className="h-16 w-auto" />
              </span>
            </ScrollLink>
            <p className="text-primary-foreground/70 text-sm leading-relaxed mb-6 max-w-xs">
              Connecting tenants with verified house managers worldwide. Find your perfect home, generate agreements, and manage rent in one platform.
            </p>
            <div className="space-y-2.5 text-sm">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Mail className="h-4 w-4 text-gold-light shrink-0" />
                {SUPPORT_EMAIL}
              </a>
              <a href={`tel:${SUPPORT_PHONE_E164}`} className="flex items-center gap-2.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Phone className="h-4 w-4 text-gold-light shrink-0" />
                {SUPPORT_PHONE_DISPLAY}
              </a>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <MessageCircle className="h-4 w-4 text-gold-light shrink-0" />
                WhatsApp: {WHATSAPP_DISPLAY}
              </a>
              <div className="flex items-start gap-2.5 text-primary-foreground/70">
                <MapPin className="h-4 w-4 text-gold-light shrink-0 mt-0.5" />
                {OFFICE_ADDRESS_LINE}
              </div>
              <div className="flex items-start gap-2.5 text-primary-foreground/70">
                <Clock className="h-4 w-4 text-gold-light shrink-0 mt-0.5" />
                <span>
                  {WORK_HOURS_WEEKDAYS}
                  <br />
                  {WORK_HOURS_SATURDAY}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-6">
              {SOCIAL_LINKS.map(({ name, url }) => {
                const Icon = SOCIAL_ICONS[name] ?? Globe;
                return (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    title={name}
                    className="h-9 w-9 rounded-full bg-primary-foreground/15 text-primary-foreground hover:bg-gold hover:text-primary flex items-center justify-center transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
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
              <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-primary-foreground transition-colors">
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
