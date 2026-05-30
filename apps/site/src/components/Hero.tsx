'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { WHATSAPP_URL } from '@/lib/constants';

interface CtaItem {
  text: string;
  href: string;
  variant: 'primary' | 'secondary';
}

interface HeroProps {
  /** When provided, uses server-mode (props override translations). */
  title?: string;
  subtitle?: string;
  ctas?: CtaItem[];
}

export default function Hero({ title, subtitle, ctas }: HeroProps = {}) {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const t = useTranslations('Home');

  // Homepage mode: no props → use translations
  if (!title && !subtitle && !ctas) {
    return (
      <section className="bg-primary-navy text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            {t('heroTitle')}
          </h1>
          <p className="text-lg sm:text-xl text-white/80 mb-10 max-w-3xl mx-auto leading-relaxed">
            {t('heroSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-accent-gold hover:bg-accent-gold/90 text-primary-navy font-bold px-8 py-4 rounded-md text-lg transition-all hover:shadow-lg"
            >
              {t('heroCta')}
            </a>
            <Link
              href={`/${locale}/services`}
              className="inline-block border-2 border-white/40 hover:border-white text-white font-semibold px-8 py-4 rounded-md text-lg transition-all"
            >
              {t('heroExplore')}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Server-mode: props override
  return (
    <section className="py-16 bg-primary-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">{title}</h1>
        <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-8">{subtitle}</p>
        {ctas && ctas.length > 0 && (
          <div className="flex flex-wrap gap-4 justify-center">
            {ctas.map((cta, i) => {
              const base = 'inline-block font-semibold px-8 py-3 rounded-md transition-all hover:shadow-lg';
              if (cta.variant === 'primary') {
                return (
                  <a
                    key={i}
                    href={cta.href}
                    target={cta.href.startsWith('http') ? '_blank' : undefined}
                    rel={cta.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className={`${base} bg-accent-gold hover:bg-accent-gold/90 text-white`}
                  >
                    {cta.text}
                  </a>
                );
              }
              return (
                <Link key={i} href={cta.href} className={`${base} border-2 border-white/40 hover:border-white text-white`}>
                  {cta.text}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
