'use client';

import { useT } from '@trade/ui';
import useSubsiteHref from '@/lib/useSubsiteHref';
import ToolCard from '@/components/ToolCard';
import { toolCategories } from '@/data/tools';

export default function HomePage() {
  const t = useT('Home');
  const tCheck = useT('Check');
  const tPricing = useT('Pricing');
  const subsiteHref = useSubsiteHref();

  return (
    <div className="bg-bg-ice">
      {/* Hero — 漏斗顶部 */}
      <section className="bg-primary-navy text-white py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {t('heroTitle')}
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto mb-6">
            {t('heroSubtitle')}
          </p>
          <p className="text-gold text-sm font-semibold">
            {t('allFree')}
          </p>
        </div>
      </section>

      {/* Tool categories — 由 tools.ts 驱动 */}
      {toolCategories.map((cat) => (
        <section key={cat.id} className="max-w-6xl mx-auto px-4 py-12">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-primary-navy">
              {tCheck(cat.titleKey as any)}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {tCheck(cat.descKey as any)}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cat.tools.map((tool) => (
              <ToolCard
                key={tool.id}
                icon={tool.icon}
                title={tCheck(tool.titleKey as any)}
                desc={tCheck(tool.descKey as any)}
                href={subsiteHref(`/check/${tool.id}`)}
                badge={tool.badge}
                ctaLabel={t('free')}
              />
            ))}
          </div>
        </section>
      ))}

      {/* How It Works — 漏斗中部 */}
      <section className="bg-white py-12 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-primary-navy mb-2">{t('howItWorks')}</h2>
          <p className="text-sm text-gray-500 mb-8">{t('howItWorksSub')}</p>
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

      {/* Pricing — 漏斗底部 */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-primary-navy mb-2">{tPricing('title')}</h2>
          <p className="text-sm text-gray-500 mb-8">{tPricing('subtitle')}</p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Free */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center flex flex-col">
              <h3 className="font-bold text-lg text-primary-navy">{tPricing('free')}</h3>
              <p className="text-3xl font-bold text-green-600 my-4">{tPricing('freePrice')}</p>
              <ul className="text-sm text-gray-500 space-y-2 mb-6 flex-1">
                <li>{tPricing('freeBullet1')}</li>
                <li>{tPricing('freeBullet2')}</li>
                <li>{tPricing('freeBullet3')}</li>
              </ul>
              <a
                href={subsiteHref('/check/gacc')}
                className="w-full border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-semibold py-2 rounded-md transition-all text-sm"
              >
                {tPricing('startFree')}
              </a>
            </div>

            {/* Single */}
            <div className="bg-white rounded-lg shadow-sm border-2 border-gold p-6 text-center relative flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary-navy text-xs font-semibold px-3 py-1 rounded-full">
                {tPricing('popular')}
              </div>
              <h3 className="font-bold text-lg text-primary-navy">{tPricing('single')}</h3>
              <p className="text-3xl font-bold text-gold my-4">{tPricing('singlePrice')}</p>
              <ul className="text-sm text-gray-500 space-y-2 mb-6 flex-1">
                <li>{tPricing('singleBullet1')}</li>
                <li>{tPricing('singleBullet2')}</li>
                <li>{tPricing('singleBullet3')}</li>
              </ul>
              <button className="w-full bg-gold hover:bg-gold/90 text-primary-navy font-semibold py-2 rounded-md transition-all text-sm">
                {tPricing('getReport')}
              </button>
            </div>

            {/* Monthly */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center flex flex-col">
              <h3 className="font-bold text-lg text-primary-navy">{tPricing('monthly')}</h3>
              <p className="text-3xl font-bold text-primary-navy my-4">{tPricing('monthlyPrice')}</p>
              <ul className="text-sm text-gray-500 space-y-2 mb-6 flex-1">
                <li>{tPricing('monthlyBullet1')}</li>
                <li>{tPricing('monthlyBullet2')}</li>
                <li>{tPricing('monthlyBullet4')}</li>
              </ul>
              <button className="w-full border-2 border-primary-navy text-primary-navy hover:bg-primary-navy hover:text-white font-semibold py-2 rounded-md transition-all text-sm">
                {tPricing('subscribe')}
              </button>
            </div>

            {/* Expert */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center flex flex-col">
              <h3 className="font-bold text-lg text-primary-navy">{tPricing('professional')}</h3>
              <p className="text-3xl font-bold text-primary-navy my-4">{tPricing('professionalPrice')}</p>
              <ul className="text-sm text-gray-500 space-y-2 mb-6 flex-1">
                <li>{tPricing('professionalBullet1')}</li>
                <li>{tPricing('professionalBullet2')}</li>
                <li>{tPricing('professionalBullet3')}</li>
              </ul>
              <a
                href={subsiteHref('/pricing')}
                className="w-full bg-primary-navy hover:bg-primary-navy/90 text-white font-semibold py-2 rounded-md transition-all text-sm"
              >
                {tPricing('learnMore')}
              </a>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-6">{tPricing('footnote')}</p>
        </div>
      </section>
    </div>
  );
}
