'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { industries } from '@/data/industries';

export default function IndustriesPreview() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const t = useTranslations('Home');

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-navy mb-4">{t('industriesTitle')}</h2>
          <p className="text-lg text-text-muted max-w-2xl mx-auto">{t('industriesSubtitle')}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {industries.map((ind) => (
            <Link
              key={ind.slug}
              href={`/${locale}/industries/${ind.slug}`}
              className="flex flex-col items-center p-5 bg-bg-ice rounded-lg hover:shadow-md hover:bg-accent-blue/10 transition-all group"
            >
              <span className="text-3xl mb-2">{ind.emoji}</span>
              <span className="text-sm font-semibold text-primary-navy text-center group-hover:text-accent-blue transition-colors leading-tight">
                {t(`industry.${ind.slug.replace(/-/g, '')}`)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
