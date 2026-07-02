'use client';

import { useState } from 'react';
import { useT, useAuth } from '@trade/ui';
import useSubsiteHref from '@/lib/useSubsiteHref';
import { SITE_URL } from '@/lib/constants';
import { useLocale } from 'next-intl';

export default function PricingPage() {
  const t = useT('Pricing');
  const tCheck = useT('Check');
  const subsiteHref = useSubsiteHref();
  const locale = useLocale();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [subLoading, setSubLoading] = useState(false);
  const [singleLoading, setSingleLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPrice = (price: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(price);

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      window.location.href = subsiteHref(`/login?redirect=/pricing`);
      return;
    }
    setSubLoading(true);
    setError('');
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ locale }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Checkout failed');
      }
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      setError(tCheck('checkoutError'));
      setSubLoading(false);
    }
  };

  const handleGetReport = () => {
    // Redirect to check page — user runs a check first, then pays for full report
    window.location.href = subsiteHref('/');
  };

  return (
    <div className="bg-bg-ice py-16">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-3xl font-bold text-primary-navy mb-4">{t('title')}</h1>
        <p className="text-gray-500 mb-12 max-w-2xl mx-auto">
          {t('subtitle')}
        </p>

        {error && (
          <div className="max-w-md mx-auto mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Free */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-lg font-semibold text-primary-navy">{t('free')}</h2>
            <p className="text-4xl font-bold text-primary-navy my-6">{formatPrice(0)}</p>
            <ul className="text-sm text-gray-500 space-y-3 mb-8">
              <li>{t('freeBullet1')}</li>
              <li>{t('freeBullet2')}</li>
              <li>{t('freeBullet3')}</li>
            </ul>
            <a
              href={subsiteHref('/')}
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
            <p className="text-4xl font-bold text-gold my-6">{formatPrice(1.99)}</p>
            <ul className="text-sm text-gray-500 space-y-3 mb-8">
              <li>{t('singleBullet1')}</li>
              <li>{t('singleBullet2')}</li>
              <li>{t('singleBullet3')}</li>
              <li>{t('singleBullet4')}</li>
            </ul>
            <button
              onClick={handleGetReport}
              disabled={singleLoading}
              className="inline-block w-full bg-gold hover:bg-gold/90 disabled:bg-gray-300 text-primary-navy font-semibold py-2.5 rounded-md transition-all"
            >
              {singleLoading ? tCheck('redirecting') || 'Redirecting...' : t('getReport')}
            </button>
          </div>

          {/* Monthly */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-lg font-semibold text-primary-navy">{t('monthly')}</h2>
            <p className="text-4xl font-bold text-primary-navy my-6">{formatPrice(9.9)}</p>
            <ul className="text-sm text-gray-500 space-y-3 mb-8">
              <li>{t('monthlyBullet1')}</li>
              <li>{t('monthlyBullet2')}</li>
              <li>{t('monthlyBullet3')}</li>
              <li>{t('monthlyBullet4')}</li>
            </ul>
            <button
              onClick={handleSubscribe}
              disabled={subLoading || authLoading}
              className="inline-block w-full border-2 border-primary-navy text-primary-navy font-semibold py-2.5 rounded-md hover:bg-primary-navy hover:text-white transition-all disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {subLoading ? tCheck('redirecting') || 'Redirecting...' : t('subscribe')}
            </button>
          </div>

          {/* Professional Service */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center flex flex-col">
            <h2 className="text-lg font-semibold text-primary-navy">{t('professional')}</h2>
            <p className="text-4xl font-bold text-primary-navy my-6 whitespace-nowrap">{formatPrice(500).replace(/[.,]00$/,'')}<span className="text-2xl">+</span></p>
            <ul className="text-sm text-gray-500 space-y-3 mb-8 flex-1">
              <li>{t('professionalBullet1')}</li>
              <li>{t('professionalBullet2')}</li>
              <li>{t('professionalBullet3')}</li>
              <li>{t('professionalBullet4')}</li>
            </ul>
            <a
              href={`${SITE_URL}/${locale}/packages/`}
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
