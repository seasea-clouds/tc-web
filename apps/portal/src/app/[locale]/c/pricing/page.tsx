'use client';

import { useT } from '@trade/ui';
import useSubsiteHref from '@/lib/useSubsiteHref';

export default function PricingPage() {
  const t = useT('Pricing');
  const subsiteHref = useSubsiteHref();

  return (
    <div className="bg-bg-ice py-16">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-3xl font-bold text-primary-navy mb-4">{t('title')}</h1>
        <p className="text-gray-500 mb-12 max-w-2xl mx-auto">
          {t('subtitle')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Free */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-lg font-semibold text-primary-navy">{t('free')}</h2>
            <p className="text-4xl font-bold text-primary-navy my-6">{t('freePrice')}</p>
            <ul className="text-sm text-gray-500 space-y-3 mb-8">
              <li>{t('freeBullet1')}</li>
              <li>{t('freeBullet2')}</li>
              <li>{t('freeBullet3')}</li>
            </ul>
            <a
              href={subsiteHref('/check/gacc')}
              className="inline-block w-full border-2 border-primary-navy text-primary-navy font-semibold py-2.5 rounded-md hover:bg-primary-navy hover:text-white transition-all"
            >
              {t('startFree')}
            </a>
          </div>

          {/* Single */}
          <div className="bg-white rounded-lg shadow-sm border-2 border-gold p-8 text-center relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-primary-navy text-xs font-semibold px-4 py-1 rounded-full">
              {t('popular')}
            </div>
            <h2 className="text-lg font-semibold text-primary-navy">{t('single')}</h2>
            <p className="text-4xl font-bold text-gold my-6">{t('singlePrice')}</p>
            <ul className="text-sm text-gray-500 space-y-3 mb-8">
              <li>{t('singleBullet1')}</li>
              <li>{t('singleBullet2')}</li>
              <li>{t('singleBullet3')}</li>
              <li>{t('singleBullet4')}</li>
            </ul>
            <button className="inline-block w-full bg-gold hover:bg-gold/90 text-primary-navy font-semibold py-2.5 rounded-md transition-all">
              {t('getReport')}
            </button>
          </div>

          {/* Monthly */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-lg font-semibold text-primary-navy">{t('monthly')}</h2>
            <p className="text-4xl font-bold text-primary-navy my-6">{t('monthlyPrice')}</p>
            <ul className="text-sm text-gray-500 space-y-3 mb-8">
              <li>{t('monthlyBullet1')}</li>
              <li>{t('monthlyBullet2')}</li>
              <li>{t('monthlyBullet3')}</li>
              <li>{t('monthlyBullet4')}</li>
            </ul>
            <button className="inline-block w-full border-2 border-primary-navy text-primary-navy font-semibold py-2.5 rounded-md hover:bg-primary-navy hover:text-white transition-all">
              {t('subscribe')}
            </button>
          </div>

          {/* Professional Service */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center flex flex-col">
            <h2 className="text-lg font-semibold text-primary-navy">{t('professional')}</h2>
            <p className="text-4xl font-bold text-primary-navy my-6">{t('professionalPrice')}</p>
            <ul className="text-sm text-gray-500 space-y-3 mb-8 flex-1">
              <li>{t('professionalBullet1')}</li>
              <li>{t('professionalBullet2')}</li>
              <li>{t('professionalBullet3')}</li>
              <li>{t('professionalBullet4')}</li>
            </ul>
            <a
              href={subsiteHref('/packages/')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full bg-primary-navy hover:bg-primary-navy/90 text-white font-semibold py-2.5 rounded-md transition-all"
            >
              {t('learnMore')}
            </a>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-8 max-w-lg mx-auto">
          {t('footnote')}
        </p>
      </div>
    </div>
  );
}
