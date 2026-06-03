"use client";

import { useT } from '@trade/ui';
import useSubsiteHref from '@/lib/useSubsiteHref';

const toolIds = [
  { id: "gacc", icon: "🍷" },
  { id: "label", icon: "🏷️" },
  { id: "ccc", icon: "🔒" },
  { id: "nmpa", icon: "💄" },
  { id: "crossborder", icon: "🛒" },
  { id: "trademark", icon: "🛡️" },
] as const;

export default function HomePage() {
  const t = useT('Home');
  const tCheck = useT('Check');
  const subsiteHref = useSubsiteHref();

  return (
    <div className="bg-bg-ice">
      {/* Hero */}
      <section className="bg-primary-navy text-white py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {t('heroTitle')}
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            {t('heroSubtitle')}
          </p>
        </div>
      </section>

      {/* Service Cards */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {toolIds.map(({ id, icon }) => {
            const titleKey = `reportModule${id.charAt(0).toUpperCase() + id.slice(1)}` as const;
            const descKey = `${id}Desc` as const;
            return (
              <a
                key={id}
                href={subsiteHref(`/check/${id}`)}
                className="block bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gold/50 transition-all p-6 group"
              >
                <div className="text-3xl mb-3">{icon}</div>
                <h2 className="font-semibold text-primary-navy text-lg mb-2 group-hover:text-gold transition-colors">
                  {tCheck(titleKey)}
                </h2>
                <p className="text-sm text-gray-500 mb-4">{tCheck(descKey)}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{t('startFree')}</span>
                  <span className="font-bold text-gold">$1.99</span>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-12 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-primary-navy mb-8">{t('howItWorks')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="w-10 h-10 bg-gold text-primary-navy rounded-full flex items-center justify-center font-bold mx-auto">
                  {i}
                </div>
                <h3 className="font-semibold text-primary-navy">{t(`step${i}Title`)}</h3>
                <p className="text-sm text-gray-500">{t(`step${i}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-primary-navy mb-8">{t('simplePricing')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-bold text-lg text-primary-navy">{t('free')}</h3>
              <p className="text-3xl font-bold text-primary-navy my-4">$0</p>
              <p className="text-sm text-gray-500">{t('freeDesc')}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border-2 border-gold p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary-navy text-xs font-semibold px-3 py-1 rounded-full">
                {t('popular')}
              </div>
              <h3 className="font-bold text-lg text-primary-navy">{t('single')}</h3>
              <p className="text-3xl font-bold text-gold my-4">$1.99</p>
              <p className="text-sm text-gray-500">{t('singleDesc')}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="font-bold text-lg text-primary-navy">{t('monthly')}</h3>
              <p className="text-3xl font-bold text-primary-navy my-4">$9.9</p>
              <p className="text-sm text-gray-500">{t('monthlyDesc')}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
