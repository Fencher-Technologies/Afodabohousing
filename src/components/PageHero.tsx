import type { CSSProperties, ReactNode } from 'react';
import heroBg from '@/assets/hero-bg.jpg';

/* ---------------------------------------------------------------------------
 * PageHero — shared photographic page header.
 *
 * Every interior page gets the same cinematic treatment: a burgundy-duotone
 * photograph that slowly settles (Ken Burns), a charcoal-to-deep-burgundy
 * shade gradient for legibility, drifting beam lines echoing the logo arrow,
 * and a gold mini-title with rule prefix instead of a pill.
 * ------------------------------------------------------------------------ */

interface PageHeroProps {
  title: string;
  subtitle?: string;
  overline?: string;
  /** Hero photograph; defaults to the aerial hills shot. */
  image?: string;
  align?: 'center' | 'left';
  /** Search bars, buttons etc. render under the copy. */
  children?: ReactNode;
}

export default function PageHero({
  title,
  subtitle,
  overline,
  image = heroBg,
  align = 'center',
  children,
}: PageHeroProps) {
  const centered = align === 'center';

  return (
    <section className="page-hero">
      {/* Duotone photograph */}
      <div className="duotone-wrap absolute inset-0 overflow-hidden">
        <img
          src={image}
          alt=""
          className="duotone-img kenburns h-full w-full object-cover"
        />
      </div>
      <div className="page-hero-shade" />

      {/* Beam lines */}
      <span
        className="beam"
        style={{ top: '18%', left: '-12%', width: '55%', '--beam-rot': '-16deg', '--beam-dur': '17s', '--beam-op': '0.28' } as CSSProperties}
      />
      <span
        className="beam"
        style={{ top: '48%', right: '-15%', width: '48%', '--beam-rot': '-32deg', '--beam-dur': '22s', '--beam-delay': '-7s', '--beam-op': '0.2' } as CSSProperties}
      />
      <span
        className="beam"
        style={{ bottom: '12%', left: '8%', width: '40%', '--beam-rot': '-22deg', '--beam-dur': '19s', '--beam-delay': '-12s', '--beam-op': '0.24' } as CSSProperties}
      />

      <div className={`relative z-10 container py-20 md:py-24 ${centered ? 'text-center' : ''}`}>
        {overline && (
          <p className={`mini-title ${centered ? 'mini-title-centered' : ''}`}>{overline}</p>
        )}
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p
            className={`text-primary-foreground/85 text-lg md:text-xl leading-relaxed ${
              centered ? 'max-w-2xl mx-auto' : 'max-w-2xl'
            }`}
          >
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
