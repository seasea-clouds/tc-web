import { Check, Star } from 'lucide-react';
import Link from 'next/link';
import { getNumberedItems } from '@/lib/utils';
import { WHATSAPP_URL } from '@/lib/constants';

interface PackageCardsProps {
  t: { (key: string): string; has(key: string): boolean };
  locale: string;
}

export default function PackageCards({ t, locale }: PackageCardsProps) {
  const packages = [
    {
      name: t('basicName'),
      desc: t('basicDesc'),
      priceFrom: t('basicPriceFrom'),
      items: getNumberedItems(t, 'basicItems'),
      cta: t('basicCta'),
      popular: false,
      packageKey: 'basic',
    },
    {
      name: t('advancedName'),
      desc: t('advancedDesc'),
      priceFrom: t('advancedPriceFrom'),
      items: getNumberedItems(t, 'advancedItems'),
      cta: t('advancedCta'),
      popular: true,
      packageKey: 'advanced',
    },
    {
      name: t('premiumName'),
      desc: t('premiumDesc'),
      priceFrom: t('premiumPriceFrom'),
      items: getNumberedItems(t, 'premiumItems'),
      cta: t('premiumCta'),
      popular: false,
      packageKey: 'premium',
    },
  ];

  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {packages.map((pkg, i) => (
        <div
          key={i}
          className={`relative bg-white rounded-lg shadow-md p-8 flex flex-col ${
            pkg.popular ? 'ring-2 ring-accent-gold shadow-xl scale-105' : ''
          }`}
        >
          {pkg.popular && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent-gold text-white text-sm font-semibold px-4 py-1 rounded-full flex items-center gap-1">
              <Star className="w-4 h-4 fill-current" />
              {t('popular')}
            </div>
          )}
          <h3 className="text-xl font-bold text-primary-navy mb-2">{pkg.name}</h3>
          <p className="text-text-muted text-sm mb-3">{pkg.desc}</p>
          {pkg.priceFrom && (
            <div className="mb-4">
              <span className="text-2xl font-bold text-accent-gold">{pkg.priceFrom}</span>
              <p className="text-xs text-text-muted mt-1">{t('customPricing')}</p>
            </div>
          )}
          <ul className="space-y-3 mb-8 flex-grow">
            {pkg.items.map((item, j) => (
              <li key={j} className="flex items-start gap-2 text-sm text-text-charcoal">
                <Check className="w-4 h-4 text-accent-green flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`block text-center font-semibold px-6 py-3 rounded-md transition-all ${
              pkg.popular
                ? 'bg-accent-gold hover:bg-accent-gold/90 text-white'
                : 'bg-bg-ice hover:bg-gray-200 text-primary-navy'
            }`}
          >
            {pkg.cta}
          </a>
          <Link
            href={`/${locale}/quote/?package=${pkg.packageKey}`}
            className="block text-center font-medium px-6 py-2.5 mt-3 rounded-md border-2 border-primary-navy text-primary-navy hover:bg-primary-navy hover:text-white transition-all text-sm"
          >
            {t('getStarted')}
          </Link>
        </div>
      ))}
    </div>
  );
}
